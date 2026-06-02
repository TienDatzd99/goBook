import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import './CheckoutPage.css';
import AddressDropdown from '../components/AddressDropdown';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://gobook.up.railway.app' : 'http://localhost:3001');

function formatPrice(n) { return Number(n).toLocaleString('vi-VN') + '₫'; }

function buildVietQrUrl(orderCode, amount) {
  const addInfo = encodeURIComponent(orderCode || '');
  const accountName = encodeURIComponent('LE TIEN DAT');
  return `https://img.vietqr.io/image/vietcombank-1054599581-compact2.png?amount=${Math.max(0, Number(amount) || 0)}&addInfo=${addInfo}&accountName=${accountName}`;
}

// ── Success screen ──
function SuccessScreen({ result, onContinueShopping }) {
  const isCOD = result.payment_method === 'cod';
  const isBank = result.payment_method === 'bank';
  const isMomo = result.payment_method === 'momo';
  const isVietqr = result.payment_method === 'vietqr';
  const needsQrPayment = (isBank || isVietqr) && !(result.status === 'confirmed' || result.payment_status === 'paid');

  const [isPaid, setIsPaid] = useState(result.status === 'confirmed' || result.payment_status === 'paid');

  useEffect(() => {
    if ((isBank || isVietqr) && !isPaid) {
      const interval = setInterval(async () => {
        try {
          // Prefer PayOS check-payment if paymentLinkId available
          if (result.paymentLinkId && result.payment_method === 'vietqr') {
            const checkRes = await fetch(`${API_BASE}/api/payment/payos/check-payment/${encodeURIComponent(result.paymentLinkId)}`);
            const checkData = await checkRes.json();
            if ((checkData.success && checkData.code) || checkData.status === 'PAID') {
              setIsPaid(true);
              clearInterval(interval);
              return;
            }
          }
          
          // Fallback to order status check
          const res = await fetch(`${API_BASE}/api/payment/status/${result.code}`);
          const data = await res.json();
          if (data.status === 'confirmed' || data.payment_status === 'paid') {
            setIsPaid(true);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isBank, isVietqr, isPaid, result.code, result.paymentLinkId, result.payment_method]);

  const bankInfo = {
    accountName: 'LE TIEN DAT',
    bankName: 'PayOS VietQR',
    accountNumber: '1054599581',
    amount: result.total,
    content: result.code,
  };

  const qrUrl = isVietqr ? `https://img.vietqr.io/image/vietcombank-1054599581-compact2.png?amount=${result.total}&addInfo=${result.code}&accountName=LE%20TIEN%20DAT` : null;

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-logo">
          <Link to="/" style={{ textDecoration: 'none', color: '#c92127', fontSize: 24, fontWeight: 800 }}>goBook</Link>
        </div>
        <div className="checkout-layout">
          {/* Left Column */}
          <div className="checkout-left">
            <div className="checkout-block success-header-block" style={{ background: isPaid ? '#e8f5e9' : (needsQrPayment ? '#fff8e1' : '#fff') }}>
              <span className={`status-badge ${isPaid ? 'paid' : (!isCOD ? '' : '')}`}>
                {isPaid ? 'Đã thanh toán' : (needsQrPayment ? 'Chờ quét QR' : (isCOD ? 'Chờ xác nhận' : 'Chờ thanh toán'))}
              </span>
              <h2>Đơn hàng #{result.code}</h2>
              <div className="success-header-notice" style={{ color: isPaid ? '#2e7d32' : '#111' }}>
                <span style={{ fontSize: 18 }}>✓</span> {isPaid ? 'Thanh toán thành công' : (needsQrPayment ? 'Quét mã QR để thanh toán' : 'Đặt hàng thành công')}
              </div>
            </div>

            <div className="checkout-block">
              <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 12 }}>
                {needsQrPayment ? 'Thanh toán qua QR' : (isCOD ? 'Thanh toán khi nhận hàng' : 'Chờ thanh toán')}
              </h3>
              <table className="payment-details-table">
                <tbody>
                  <tr><td>Tổng đơn</td><td>{formatPrice(result.total)}</td></tr>
                  <tr><td>Cần thanh toán</td><td style={{ color: '#c92127', fontSize: 15 }}>{formatPrice(result.total)}</td></tr>
                  <tr><td>Phương thức</td>
                    <td>
                      {isCOD && 'Thanh toán tiền mặt khi giao hàng (COD)'}
                      {isBank && 'Chuyển khoản qua ngân hàng'}
                      {isVietqr && 'Chuyển khoản qua QR - VietQR của PayOS'}
                      {isMomo && 'Thanh toán MoMo'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {needsQrPayment && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 16, background: '#fffdf5' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: '#c92127' }}>Quét mã QR để hoàn tất thanh toán</div>
                    <div style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.5 }}>
                      Mở app ngân hàng và quét mã bên dưới, hoặc chuyển khoản đúng số tiền và nội dung đơn hàng để hệ thống tự động xác nhận.
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Nội dung chuyển khoản</div>
                    <table className="payment-details-table">
                      <tbody>
                        <tr><td>Tài khoản</td><td>{bankInfo.accountName}</td></tr>
                        <tr><td>Ngân hàng</td><td>{bankInfo.bankName}</td></tr>
                        <tr><td>Số tài khoản</td><td style={{ fontWeight: 800, color: '#1565c0' }}>{bankInfo.accountNumber}</td></tr>
                        <tr><td>Nội dung</td><td style={{ fontWeight: 800, color: '#c92127' }}>{bankInfo.content}</td></tr>
                        <tr><td>Số tiền</td><td style={{ fontWeight: 800, color: '#c92127' }}>{formatPrice(bankInfo.amount)}</td></tr>
                      </tbody>
                    </table>
                    {qrUrl && (
                      <div className="qr-code-box" style={{ marginTop: 16 }}>
                        <img src={qrUrl} alt="PayOS VietQR" />
                        <span style={{ fontSize: 12, color: '#01579b', fontWeight: 600 }}>Quét mã Napas 247</span>
                      </div>
                    )}
                    {!qrUrl && (
                      <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: '#f5f5f5', color: '#666', fontSize: 13 }}>
                        Đơn hàng chuyển khoản ngân hàng sẽ được xác nhận sau khi hệ thống nhận được giao dịch.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {needsQrPayment && (
              <div className="checkout-block">
                <div className="upload-row">
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Hình ảnh chuyển khoản</div>
                    <div className="upload-desc">Tải lên ảnh chụp màn hình chuyển khoản của bạn để chúng tôi dễ dàng xác minh giao dịch của bạn nhé</div>
                  </div>
                  <button className="btn-upload">Tải lên</button>
                </div>
              </div>
            )}

            <div className="checkout-block">
              <span className="status-badge" style={{ background: '#fff3e0', color: '#e65100' }}>Đang chuẩn bị hàng</span>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Giao hàng tận nơi</div>
            </div>

            <div className="checkout-block">
              <h3>Địa chỉ nhận hàng</h3>
              <div className="address-summary">
                <strong>{result.customer_name} | {result.phone}</strong>
                {result.email && <div>{result.email}</div>}
                <div>{result.address}</div>
                {result.city && <div>{result.city}</div>}
              </div>
            </div>

            <div className="checkout-block invoice-block">
              <h3>Hoá đơn điện tử</h3>
              <button className="btn-invoice">Yêu cầu xuất {'>'}</button>
            </div>
          </div>

          {/* Right Column (Cart items and total duplicate) */}
          <div className="checkout-right">
            <div className="checkout-block">
              <h3>Giỏ hàng</h3>
              <div className="checkout-items">
                {result.snapshot_items?.map(item => (
                  <div key={item.id} className="checkout-item" style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0', display: 'flex' }}>
                    <img src={item.image} alt={item.name} className="checkout-item-img" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                    <div className="checkout-item-info" style={{ flex: 1, paddingLeft: 12 }}>
                      <div className="checkout-item-name" style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>Số lượng: {item.quantity}</div>
                    </div>
                    <div className="checkout-item-action">
                      <div className="checkout-item-price" style={{ fontSize: 14, fontWeight: 600, color: '#c92127' }}>{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="checkout-block">
              <h3>Tóm tắt đơn hàng</h3>
              <div className="summary-lines">
                <div className="summary-line"><span>Tổng tiền hàng</span><span>{formatPrice(result.subtotal || result.total)}</span></div>
                <div className="summary-line"><span>Phí vận chuyển</span><span>{result.shipping_fee > 0 ? formatPrice(result.shipping_fee) : '-'}</span></div>
                <div className="summary-line total"><span>Tổng thanh toán</span><span>{formatPrice(result.total)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QrPaymentScreen({ result, onBackEdit }) {
  const isBank = result.payment_method === 'bank';
  const isVietqr = result.payment_method === 'vietqr';
  const isPaid = result.status === 'confirmed' || result.payment_status === 'paid';
  const payosCheckoutUrl = result.payosCheckoutUrl || result.checkoutUrl || null;
  const payosQrCode = result.payosQrCode || result.qrCode || null;
  const hasPayOSLink = Boolean(payosCheckoutUrl || payosQrCode);
  const fallbackQrUrl = buildVietQrUrl(result.code, result.total);
  let displayedQrUrl = null;
  if (payosQrCode) {
    // PayOS có thể trả về URL hoặc trả về payload EMV (chuỗi),
    // nếu là payload thì chuyển thành URL ảnh QR thông qua qrserver
    if (/^https?:\/\//i.test(payosQrCode)) {
      displayedQrUrl = payosQrCode;
    } else {
      displayedQrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(payosQrCode)}&size=360x360`;
    }
  } else if (!hasPayOSLink) {
    displayedQrUrl = fallbackQrUrl;
  }

  const [paid, setPaid] = useState(isPaid);

  useEffect(() => {
    if (paid) return;
    if (!isBank && !isVietqr) return;

    const interval = setInterval(async () => {
      try {
        // Prefer PayOS check-payment endpoint if paymentLinkId available
        if (result.paymentLinkId && result.payment_method === 'vietqr') {
          const checkRes = await fetch(`${API_BASE}/api/payment/payos/check-payment/${encodeURIComponent(result.paymentLinkId)}`);
          const checkData = await checkRes.json();
          // If check says confirmed or PayOS status is PAID, mark as paid
          if ((checkData.success && checkData.code) || checkData.status === 'PAID') {
            setPaid(true);
            clearInterval(interval);
            return;
          }
        }
        
        // Fallback to order status check
        const res = await fetch(`${API_BASE}/api/payment/status/${result.code}`);
        const data = await res.json();
        if (data.status === 'confirmed' || data.payment_status === 'paid') {
          setPaid(true);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [paid, isBank, isVietqr, result.code, result.paymentLinkId, result.payment_method]);

  const bankInfo = {
    accountName: 'LE TIEN DAT',
    bankName: 'Chuyển khoản dự phòng',
    accountNumber: '1054599581',
    amount: result.total,
    content: result.code,
  };

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-logo" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!paid && (
            <button 
              onClick={() => onBackEdit && onBackEdit()}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                color: '#c92127',
                fontWeight: 600,
                fontSize: 14,
                padding: 0
              }}
              title="Quay lại để chỉnh sửa"
            >
              <ArrowLeft size={18} /> Quay lại
            </button>
          )}
          <Link to="/" style={{ textDecoration: 'none', color: '#c92127', fontSize: 24, fontWeight: 800 }}>goBook</Link>
        </div>

        <div className="checkout-layout">
          <div className="checkout-left">
            <div className="checkout-block success-header-block" style={{ background: paid ? '#e8f5e9' : '#fff8e1' }}>
              <span className={`status-badge ${paid ? 'paid' : ''}`}>{paid ? 'Đã thanh toán' : 'Chờ quét QR'}</span>
              <h2>Đơn hàng #{result.code}</h2>
              <div className="success-header-notice" style={{ color: paid ? '#2e7d32' : '#c77700' }}>
                <span style={{ fontSize: 18 }}>{paid ? '✓' : '⏳'}</span> {paid ? 'Thanh toán thành công' : 'Đơn hàng đã tạo. Quét mã QR bên dưới để thanh toán.'}
              </div>
            </div>

            {!paid && (
              <div className="checkout-block">
                <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 12 }}>{hasPayOSLink ? 'Thanh toán qua PayOS' : 'Thanh toán qua QR dự phòng'}</h3>
                <div style={{ border: '1px solid #e0e0e0', borderRadius: 12, padding: 16, background: '#fffdf5' }}>
                  {result.payosError && (
                    <div style={{ marginBottom: 12, padding: 12, borderRadius: 8, background: '#fff1f0', color: '#b71c1c', fontSize: 13, fontWeight: 600 }}>
                      {result.payosError}
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.5 }}>
                    {hasPayOSLink
                      ? 'Mở trang PayOS hoặc quét mã QR PayOS bên dưới. Đơn hàng sẽ tự chuyển sang đã thanh toán sau khi PayOS xác nhận giao dịch.'
                      : 'Mở app ngân hàng và quét mã QR dự phòng bên dưới. Đơn hàng sẽ tự chuyển sang đã thanh toán sau khi hệ thống xác nhận giao dịch.'}
                  </div>
                  {hasPayOSLink ? (
                    <table className="payment-details-table">
                      <tbody>
                        <tr><td>Cổng thanh toán</td><td>PayOS</td></tr>
                        <tr><td>Nội dung</td><td style={{ fontWeight: 800, color: '#c92127' }}>{bankInfo.content}</td></tr>
                        <tr><td>Số tiền</td><td style={{ fontWeight: 800, color: '#c92127' }}>{formatPrice(bankInfo.amount)}</td></tr>
                      </tbody>
                    </table>
                  ) : (
                    <table className="payment-details-table">
                      <tbody>
                        <tr><td>Tài khoản</td><td>{bankInfo.accountName}</td></tr>
                        <tr><td>Cổng thanh toán</td><td>{bankInfo.bankName}</td></tr>
                        <tr><td>Số tài khoản</td><td style={{ fontWeight: 800, color: '#1565c0' }}>{bankInfo.accountNumber}</td></tr>
                        <tr><td>Nội dung</td><td style={{ fontWeight: 800, color: '#c92127' }}>{bankInfo.content}</td></tr>
                        <tr><td>Số tiền</td><td style={{ fontWeight: 800, color: '#c92127' }}>{formatPrice(bankInfo.amount)}</td></tr>
                      </tbody>
                    </table>
                  )}
                  {displayedQrUrl ? (
                    <div className="qr-code-box" style={{ marginTop: 16 }}>
                      <img src={displayedQrUrl} alt={hasPayOSLink ? 'PayOS QR' : 'QR dự phòng'} />
                      <span style={{ fontSize: 12, color: '#01579b', fontWeight: 600 }}>{hasPayOSLink ? 'Quét mã PayOS' : 'Quét mã QR dự phòng'}</span>
                    </div>
                  ) : payosCheckoutUrl ? (
                    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <a href={payosCheckoutUrl} target="_blank" rel="noreferrer" className="btn-place-order" style={{ textAlign: 'center', textDecoration: 'none' }}>
                        Mở trang thanh toán PayOS
                      </a>
                      <div style={{ padding: 16, borderRadius: 10, background: '#f5f5f5', color: '#666', fontSize: 13 }}>
                        PayOS chưa trả về ảnh QR, nhưng vẫn có trang thanh toán chính thức để hoàn tất giao dịch.
                      </div>
                    </div>
                  ) : (
                    <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: '#f5f5f5', color: '#666', fontSize: 13 }}>
                      Không lấy được dữ liệu QR từ PayOS, nên đang hiển thị mã QR dự phòng.
                    </div>
                  )}
                </div>
              </div>
            )}

            {paid && (
              <div className="checkout-block">
                <div style={{ padding: 24, background: '#e8f5e9', borderRadius: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
                  <h2 style={{ color: '#2e7d32', margin: 0, marginBottom: 8 }}>Thanh toán thành công!</h2>
                  <p style={{ color: '#555', marginBottom: 16 }}>
                    Đơn hàng của bạn đã được xác nhận. Hệ thống đang chuẩn bị hàng để giao đến bạn.
                  </p>
                  <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link to="/" className="btn-place-order" style={{ textDecoration: 'none', display: 'inline-block', background: '#c92127', color: '#fff', padding: '10px 24px', borderRadius: 8, fontWeight: 600 }}>
                      ← Quay về trang chủ
                    </Link>
                    <Link to="/tra-cuu-don-hang" className="btn-place-order" style={{ textDecoration: 'none', display: 'inline-block', background: '#f5f5f5', color: '#333', padding: '10px 24px', borderRadius: 8, fontWeight: 600 }}>
                      Theo dõi đơn hàng →
                    </Link>
                    <button 
                      onClick={() => {
                        onContinueShopping?.();
                        navigate('/');
                      }}
                      style={{ textDecoration: 'none', display: 'inline-block', background: '#fff', color: '#c92127', padding: '10px 24px', borderRadius: 8, fontWeight: 600, border: '2px solid #c92127', cursor: 'pointer' }}
                    >
                      🛍️ Tiếp tục mua hàng
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!paid && (
              <div className="checkout-block">
                <div className="upload-row">
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>Hình ảnh chuyển khoản</div>
                    <div className="upload-desc">Tải lên ảnh chụp màn hình chuyển khoản của bạn để chúng tôi dễ dàng xác minh giao dịch của bạn nhé</div>
                  </div>
                  <button className="btn-upload">Tải lên</button>
                </div>
              </div>
            )}

            <div className="checkout-block">
              <span className="status-badge" style={{ background: '#fff3e0', color: '#e65100' }}>Đang chuẩn bị hàng</span>
              <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Giao hàng tận nơi</div>
            </div>

            <div className="checkout-block">
              <h3>Địa chỉ nhận hàng</h3>
              <div className="address-summary">
                <strong>{result.customer_name} | {result.phone}</strong>
                {result.email && <div>{result.email}</div>}
                <div>{result.address}</div>
                {result.city && <div>{result.city}</div>}
              </div>
            </div>
          </div>

          <div className="checkout-right">
            <div className="checkout-block">
              <h3>Giỏ hàng</h3>
              <div className="checkout-items">
                {result.snapshot_items?.map(item => (
                  <div key={item.id} className="checkout-item" style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f0f0f0', display: 'flex' }}>
                    <img src={item.image} alt={item.name} className="checkout-item-img" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 6 }} />
                    <div className="checkout-item-info" style={{ flex: 1, paddingLeft: 12 }}>
                      <div className="checkout-item-name" style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>Số lượng: {item.quantity}</div>
                    </div>
                    <div className="checkout-item-action">
                      <div className="checkout-item-price" style={{ fontSize: 14, fontWeight: 600, color: '#c92127' }}>{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="checkout-block">
              <h3>Tóm tắt đơn hàng</h3>
              <div className="summary-lines">
                <div className="summary-line"><span>Tổng tiền hàng</span><span>{formatPrice(result.subtotal || result.total)}</span></div>
                <div className="summary-line"><span>Phí vận chuyển</span><span>{result.shipping_fee > 0 ? formatPrice(result.shipping_fee) : '-'}</span></div>
                <div className="summary-line total"><span>Tổng thanh toán</span><span>{formatPrice(result.total)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main CheckoutPage
// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { items: allItems, freeShipThreshold, removeItems, clearCart } = useCart();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedIds = location.state?.selectedIds;
  const fromPage = location.state?.from; // Lưu trang trước (ví dụ: /gio-hang, /product/xyz)
  const paymentOrderId = location.state?.paymentOrderId; // Nếu từ payment screen, user muốn tạo order mới
  
  const items = selectedIds ? allItems.filter(i => selectedIds.includes(i.id)) : allItems;
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const DEFAULT_SHIPPING_FEE = parseInt(import.meta.env.VITE_DEFAULT_SHIPPING_FEE || '30000', 10);
  const shippingFee = total >= freeShipThreshold ? 0 : DEFAULT_SHIPPING_FEE;
  // Prefer GHN-calculated fee when available
  const [form, setForm] = useState({
    name: user?.name || '', phone: '', email: user?.email || '',
    address: '', city: '', district: '', note: '',
    ghn_to_district_id: null, ghn_to_ward_code: null, ghn_province_id: null,
  });

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddressMode, setNewAddressMode] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({ name: '', phone: '', address: '', is_default: false });
  const [ghnShippingFee, setGhnShippingFee] = useState(null);
  const [ghnShippingLoading, setGhnShippingLoading] = useState(false);
  const [addrErrors, setAddrErrors] = useState({});

  // Validation functions for address
  const validateAddrName = (name) => {
    if (!name.trim()) return 'Vui lòng nhập tên người nhận';
    if (!/^[a-zA-ZÀ-ỿ\s]+$/.test(name)) return 'Tên không được chứa số hoặc ký tự đặc biệt';
    if (name.trim().length < 2) return 'Tên phải có ít nhất 2 ký tự';
    return '';
  };

  const validateAddrPhone = (phone) => {
    if (!phone.trim()) return 'Vui lòng nhập số điện thoại';
    if (!/^0[0-9]{9}$/.test(phone.replace(/\s/g, ''))) return 'Số điện thoại phải có 10 chữ số, bắt đầu từ 0';
    return '';
  };

  const handleAddrNameChange = (e) => {
    const value = e.target.value;
    setNewAddrForm({...newAddrForm, name: value});
    if (addrErrors.name) setAddrErrors({...addrErrors, name: validateAddrName(value)});
  };

  const handleAddrPhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setNewAddrForm({...newAddrForm, phone: value});
    if (addrErrors.phone) setAddrErrors({...addrErrors, phone: validateAddrPhone(value)});
  };

  useEffect(() => {
    if (user) {
      fetch(`${API_BASE}/api/users/me/addresses`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json())
        .then(data => {
           if (Array.isArray(data) && data.length > 0) {
             setAddresses(data);
             const def = data.find(a => a.is_default) || data[0];
             setSelectedAddressId(def.id);
           }
        })
        .catch(console.error);
    }
  }, [user, getToken]);

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const nameError = validateAddrName(newAddrForm.name);
    const phoneError = validateAddrPhone(newAddrForm.phone);
    
    const newErrors = {};
    if (nameError) newErrors.name = nameError;
    if (phoneError) newErrors.phone = phoneError;
    if (!newAddrForm.address || newAddrForm.address.trim().length < 5) newErrors.address = 'Địa chỉ phải có ít nhất 5 ký tự';
    if (!newAddrForm.ghn_to_district_id || !newAddrForm.ghn_to_ward_code) {
      newErrors.city = 'Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã từ danh sách';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setAddrErrors(newErrors);
      alert('Vui lòng sửa các lỗi trên form');
      return;
    }

    const fullAddress = `${newAddrForm.address}, ${newAddrForm.city}`;
    try {
      const res = await fetch(`${API_BASE}/api/users/me/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          name: newAddrForm.name,
          phone: newAddrForm.phone,
          address: fullAddress,
          is_default: newAddrForm.is_default ? 1 : 0,
          province_id: newAddrForm.ghn_province_id || null,
          district_id: newAddrForm.ghn_to_district_id || null,
          ward_code: newAddrForm.ghn_to_ward_code || null,
          district: newAddrForm.districtName || ''
        })
      });
      if (res.ok) {
        const r2 = await fetch(`${API_BASE}/api/users/me/addresses`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const d2 = await r2.json();
        setAddresses(d2);
        const newest = d2.find(a => a.name === newAddrForm.name && a.address === fullAddress) || d2[d2.length - 1];
        if (newest) setSelectedAddressId(newest.id);
        setNewAddressMode(false);
        setNewAddrForm({ name: '', phone: '', address: '', city: '', is_default: false });
        setAddrErrors({});
        setShowAddressModal(false);
      } else {
        const err = await res.json();
        alert(err.error || 'Lỗi thêm địa chỉ');
      }
    } catch (err) {
      console.error(err);
      alert('Lỗi kết nối');
    }
  };

  const [voucher, setVoucher] = useState('');
  const [voucherResult, setVoucherResult] = useState(null);
  const [voucherError, setVoucherError] = useState('');
  // Default payment method: prefer bank for transfers
  const [payment, setPayment] = useState(import.meta.env.VITE_DEFAULT_PAYMENT_METHOD || 'bank');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);
  const [isEditingFromPayment, setIsEditingFromPayment] = useState(false);
  const creatingPayosLinkRef = useRef(false); // Prevent double-call to /payos/create

  // Nếu từ payment screen, flag là đang edit
  useEffect(() => {
    if (paymentOrderId && orderResult === null) {
      setIsEditingFromPayment(true);
    }
  }, [paymentOrderId, orderResult]);

  const discount = voucherResult?.discount || 0;
  // Use subtotal BEFORE discount to determine free shipping (keep behavior consistent with cart)
  const actualShipping = total >= freeShipThreshold ? 0 : (ghnShippingFee != null ? ghnShippingFee : shippingFee);
  const remainingForFreeShip = Math.max(0, freeShipThreshold - (total - discount));
  const actualTotal = total - discount + actualShipping;

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const applyVoucher = async () => {
    if (!voucher.trim()) return;
    setVoucherError('');
    try {
      const res = await fetch(`${API_BASE}/api/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucher, order_value: total }),
      });
      const data = await res.json();
      if (!res.ok) { setVoucherError(data.error || 'Mã không hợp lệ'); setVoucherResult(null); return; }
      setVoucherResult({ code: voucher.toUpperCase(), discount: data.discount });
    } catch {
      setVoucherError('Không thể kiểm tra voucher. Thử lại sau.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Resolve which data to send based on whether user is logged in and selected an address
    let orderData = { ...form };

    // If user is logged in but hasn't selected a saved address, auto-save the address
    if (user && !selectedAddressId && form.name && form.phone && form.address) {
      try {
        const createRes = await fetch(`${API_BASE}/api/users/me/addresses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({
            name: form.name,
            phone: form.phone,
            address: form.address,
            is_default: 0,
            province_id: form.ghn_province_id || null,
            district_id: form.ghn_to_district_id || null,
            ward_code: form.ghn_to_ward_code || null,
            district: form.district || ''
          })
        });
        if (createRes.ok) {
          const newAddrs = await fetch(`${API_BASE}/api/users/me/addresses`, { headers: { Authorization: `Bearer ${getToken()}` } }).then(r => r.json());
          setAddresses(newAddrs);
          const newest = newAddrs.find(a => a.name === form.name && a.address === form.address) || newAddrs[newAddrs.length-1];
          if (newest) {
            setSelectedAddressId(newest.id);
            orderData.name = newest.name || orderData.name;
            orderData.phone = newest.phone || orderData.phone;
            orderData.address = newest.address || orderData.address;
            orderData.ghn_to_district_id = newest.district_id || orderData.ghn_to_district_id;
            orderData.ghn_to_ward_code = newest.ward_code || orderData.ghn_to_ward_code;
          }
        }
      } catch (err) {
        console.error('Auto-save address failed', err);
      }
    }

    if (user && addresses.length > 0 && selectedAddressId) {
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);
      if (selectedAddr) {
        if (!selectedAddr.district_id || !selectedAddr.ward_code) {
          setError('Địa chỉ đã lưu thiếu thông tin Tỉnh/Thành, Quận/Huyện, Phường/Xã từ hệ thống mới. Vui lòng thêm lại địa chỉ mới để tiếp tục.');
          return;
        }
        orderData.name = selectedAddr.name;
        orderData.phone = selectedAddr.phone;
        orderData.address = selectedAddr.address;
        orderData.city = '';
        orderData.district = '';
        orderData.ghn_to_district_id = selectedAddr.district_id;
        orderData.ghn_to_ward_code = selectedAddr.ward_code;
      }
    } else {
      if (!form.name || !form.phone || !form.address) {
        setError('Vui lòng điền đầy đủ thông tin giao hàng.');
        return;
      }
      if (!form.ghn_to_district_id || !form.ghn_to_ward_code) {
        setError('Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, và Phường/Xã từ danh sách.');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: orderData.name,
          phone: orderData.phone,
          email: orderData.email,
          address: orderData.address,
          city: orderData.city,
          district: orderData.district,
          ghn_to_district_id: orderData.ghn_to_district_id || form.ghn_to_district_id || null,
          ghn_to_ward_code: orderData.ghn_to_ward_code || form.ghn_to_ward_code || null,
          note: orderData.note,
          payment_method: payment,
          user_id: user?.id || null,
          voucher_code: voucherResult?.code || null,
          items: items.map(i => ({
            id: i.id,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
            image: i.image || '',
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Đặt hàng thất bại'); return; }

      data.snapshot_items = items;
      data.shipping_fee = actualShipping;
      data.subtotal = total;
      data.customer_name = orderData.name;
      data.phone = orderData.phone;
      data.email = orderData.email;
      data.address = orderData.address;
      data.city = orderData.city;

      if (payment === 'vietqr') {
        // Prevent double-call to /payos/create
        if (creatingPayosLinkRef.current) {
          console.warn('PayOS create already in progress, skipping double-call');
          return;
        }
        creatingPayosLinkRef.current = true;

        try {
          const payosRes = await fetch(`${API_BASE}/api/payment/payos/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderId, orderCode: data.code }),
          });
          const payosData = await payosRes.json();

          if (payosRes.ok && payosData.success !== false) {
            data.payosCheckoutUrl = payosData.checkoutUrl || null;
            data.payosQrCode = payosData.qrCode || null;
            data.paymentLinkId = payosData.paymentLinkId || null;
            data.payment_status = 'unpaid';
            data.status = 'pending';
            if (!data.payosQrCode && !data.payosCheckoutUrl) {
              data.payosError = 'PayOS không trả về QR/checkoutUrl, đang dùng QR dự phòng.';
              data.payosQrCode = buildVietQrUrl(data.code, actualTotal);
            }
          } else {
            const fallbackMessage = payosRes.status === 404
              ? 'Không tìm thấy đơn hàng để tạo link PayOS hoặc endpoint chưa sẵn sàng.'
              : 'Không tạo được link PayOS';
            data.payosError = payosData.error || fallbackMessage;
            data.payosQrCode = buildVietQrUrl(data.code, actualTotal);
          }
        } finally {
          creatingPayosLinkRef.current = false;
        }
      }

      setOrderResult(data);

    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (orderResult) {
    const handleBackEdit = () => {
      // User quay lại từ payment screen, reset orderResult để quay lại form
      setOrderResult(null);
      setIsEditingFromPayment(true);
      window.scrollTo(0, 0);
    };

    const handleContinueShopping = () => {
      // Clear cart items when user continues shopping after success
      if (selectedIds) removeItems(selectedIds);
      else clearCart();
    };
    
    if (orderResult.payment_method === 'bank' || orderResult.payment_method === 'vietqr') {
      return <QrPaymentScreen result={orderResult} onBackEdit={handleBackEdit} />;
    }
    return <SuccessScreen result={orderResult} onContinueShopping={handleContinueShopping} />;
  }

  if (items.length === 0) {
    return (
      <div className="checkout-page" style={{ textAlign: 'center', paddingTop: 100 }}>
        <h2>Không có sản phẩm nào để thanh toán</h2>
        <Link to="/gio-hang" className="btn-place-order" style={{ display: 'inline-block', width: 'auto', marginTop: 16, textDecoration: 'none' }}>Về giỏ hàng</Link>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-logo" style={{ display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'flex-start' }}>
          {fromPage && (
            <button 
              onClick={() => navigate(fromPage)}
              style={{ 
                background: 'none', 
                border: 'none', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8,
                color: '#c92127',
                fontWeight: 600,
                fontSize: 14,
                padding: 0
              }}
              title="Quay lại"
            >
              <ArrowLeft size={18} /> Quay lại
            </button>
          )}
          <Link to="/" style={{ textDecoration: 'none', color: '#c92127', fontSize: 24, fontWeight: 800 }}>goBook</Link>
        </div>
        
        <div className="checkout-layout">
          {/* ── Left Column ── */}
          <div className="checkout-left">
            {!user && (
              <div className="checkout-login-prompt">
                <span>Đăng nhập để mua hàng tiện lợi và nhận nhiều ưu đãi hơn nữa</span>
                <Link to="/dang-nhap" className="btn-login-prompt">Đăng nhập</Link>
              </div>
            )}

            <div className="checkout-block">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0 }}>Thông tin giao hàng</h3>
                {user && addresses.length > 0 && (
                  <button type="button" className="btn-invoice" style={{ color: '#c92127', fontWeight: 600 }} onClick={() => setShowAddressModal(true)}>
                    Thay đổi địa chỉ
                  </button>
                )}
              </div>
              {user ? (
                addresses.length > 0 && selectedAddressId ? (
                  <div className="address-item selected">
                    <div className="address-item-name">{addresses.find(a => a.id === selectedAddressId)?.name}</div>
                    <div className="address-item-phone">{addresses.find(a => a.id === selectedAddressId)?.phone}</div>
                    <div className="address-item-desc">{addresses.find(a => a.id === selectedAddressId)?.address}</div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ marginBottom: 12, color: '#777' }}>Bạn chưa có địa chỉ nhận hàng nào</div>
                    <button type="button" className="btn-login-prompt" onClick={() => { setNewAddressMode(true); setShowAddressModal(true); }}>
                      + Thêm địa chỉ mới
                    </button>
                  </div>
                )
              ) : (
                <div className="checkout-form">
                  <div className="form-group">
                    <input className="form-control" name="name" value={form.name} onChange={handleChange} placeholder="Nhập họ và tên" />
                  </div>
                  <div className="form-group">
                    <input className="form-control" name="phone" value={form.phone} onChange={handleChange} placeholder="Nhập số điện thoại" />
                  </div>
                  <div className="form-group">
                    <input className="form-control" name="email" value={form.email} onChange={handleChange} placeholder="Nhập email (không bắt buộc)" />
                  </div>
                  <div className="form-group">
                    <input className="form-control" value="Vietnam" readOnly style={{ background: '#f9f9f9', color: '#777' }} placeholder="Quốc gia" />
                  </div>
                  <div className="form-group">
                    <input className="form-control" name="address" value={form.address} onChange={handleChange} placeholder="Địa chỉ cụ thể (Số nhà, tòa nhà)" />
                  </div>
                  <div className="form-group" style={{ zIndex: 100 }}>
                    <AddressDropdown
                      value={form.city}
                      onSelect={async (sel) => {
                        setForm(f => ({ ...f,
                          city: sel.display,
                          district: sel.districtName,
                          ghn_province_id: sel.provinceId,
                          ghn_to_district_id: sel.districtId,
                          ghn_to_ward_code: sel.wardCode,
                        }));
                        // Calculate shipping fee via backend GHN proxy
                        try {
                          setGhnShippingLoading(true);
                          const weight = Math.max(500, items.reduce((s,i)=>s + (i.quantity||1)*500, 0));
                          const res = await fetch(`${API_BASE}/api/shipping/ghn/fee`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ to_district_id: sel.districtId, to_ward_code: sel.wardCode, weight }),
                          });
                          const d = await res.json();
                          if (res.ok && d.data && d.data.fee && d.data.service_fee) {
                            // GHN v2 fee structure may vary; try common fields
                            const fee = d.data.service_fee || d.data.fee || (d.data[0] && d.data[0].total) || 0;
                            setGhnShippingFee(Number(fee) || 0);
                          } else if (d.code === 200 && d.data && d.data.total) {
                            setGhnShippingFee(Number(d.data.total) || 0);
                          } else {
                            setGhnShippingFee(null);
                          }
                        } catch (err) {
                          console.error('GHN fee error', err);
                          setGhnShippingFee(null);
                        } finally { setGhnShippingLoading(false); }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="checkout-block">
              <h3>Phương thức giao hàng</h3>
              <div className="shipping-method-box">
                <label className="radio-option" style={{ margin: 0 }}>
                  <input type="radio" checked readOnly style={{ accentColor: '#c92127' }} />
                  <div className="radio-label" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span>Giao hàng tận nơi</span>
                    <span style={{ fontWeight: 600 }}>{actualShipping > 0 ? formatPrice(actualShipping) : 'Miễn phí'}</span>
                  </div>
                </label>
                {remainingForFreeShip > 0 ? (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#1565c0' }}>
                    Còn <strong style={{ color: '#c92127' }}>{formatPrice(remainingForFreeShip)}</strong> để được miễn phí vận chuyển
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#2e7d32' }}>Bạn đã đủ điều kiện miễn phí vận chuyển 🎉</div>
                )}
              </div>
            </div>

            <div className="checkout-block">
              <h3>Phương thức thanh toán</h3>
              <div className="radio-group">
                <label className="radio-option">
                  <input type="radio" name="payment" value="cod" checked={payment === 'cod'} onChange={() => setPayment('cod')} />
                  <div className="radio-label">
                    <span>💵 Thanh toán khi giao hàng (COD)</span>
                  </div>
                </label>
                {payment === 'cod' && (
                  <div style={{ fontSize: 12, color: '#555', padding: '0 0 16px 30px', lineHeight: 1.5 }}>
                    Quý khách nhận hàng và thanh toán tiền mặt trực tiếp cho Nhân viên giao hàng theo giá trị ghi trên đơn hàng.
                  </div>
                )}
                
                <label className="radio-option">
                  <input type="radio" name="payment" value="bank" checked={payment === 'bank'} onChange={() => setPayment('bank')} />
                  <div className="radio-label">
                    <span>🏦 Chuyển khoản qua ngân hàng</span>
                  </div>
                </label>
                
                <label className="radio-option">
                  <input type="radio" name="payment" value="vietqr" checked={payment === 'vietqr'} onChange={() => setPayment('vietqr')} />
                  <div className="radio-label">
                    <span>📷 Chuyển khoản qua QR - VietQR của PayOS</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="checkout-block invoice-block">
              <h3>Hoá đơn điện tử</h3>
              <button className="btn-invoice">Yêu cầu xuất {'>'}</button>
            </div>

            <div className="checkout-block">
              <input className="form-control" name="note" value={form.note} onChange={handleChange} placeholder="Ghi chú đơn hàng" />
            </div>
          </div>

          {/* ── Right Column ── */}
          <div className="checkout-right">
            <div className="checkout-block">
              <h3>Giỏ hàng</h3>
              <div className="checkout-items">
                {items.map(item => (
                  <div key={item.id} className="checkout-item">
                    <img src={item.image} alt={item.name} className="checkout-item-img" />
                    <div className="checkout-item-info">
                      <div className="checkout-item-name">{item.name}</div>
                      <div className="checkout-item-variant">Default Title</div>
                      <div style={{ fontSize: 12, color: '#777', marginTop: 4 }}>Số lượng: {item.quantity}</div>
                    </div>
                    <div className="checkout-item-action">
                      <button className="checkout-item-delete">🗑️</button>
                      <div className="checkout-item-price">{formatPrice(item.price * item.quantity)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="checkout-block">
              <h3>Mã khuyến mãi</h3>
              <div className="voucher-input-group">
                <input 
                  className="form-control" 
                  placeholder="Nhập mã khuyến mãi" 
                  value={voucher}
                  onChange={e => { setVoucher(e.target.value.toUpperCase()); setVoucherResult(null); setVoucherError(''); }}
                />
                <button className="btn-apply" onClick={applyVoucher}>Áp dụng</button>
              </div>
              {voucherResult && <div className="voucher-success">Áp dụng mã thành công! Giảm: {formatPrice(voucherResult.discount)}</div>}
              {voucherError && <div className="voucher-error">{voucherError}</div>}
            </div>

            <div className="checkout-block">
              <h3>Tóm tắt đơn hàng</h3>
              <div className="summary-lines">
                <div className="summary-line"><span>Tổng tiền hàng</span><span>{formatPrice(total)}</span></div>
                {discount > 0 && <div className="summary-line"><span>Giảm giá</span><span>-{formatPrice(discount)}</span></div>}
                <div className="summary-line"><span>Phí vận chuyển</span><span>{actualShipping > 0 ? formatPrice(actualShipping) : '-'}</span></div>
                <div className="summary-line total"><span>Tổng thanh toán</span><span>{formatPrice(actualTotal)}</span></div>
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="btn-place-order" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Đặt hàng'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Address Modal ── */}
      {showAddressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{newAddressMode ? 'Thêm địa chỉ mới' : 'Chọn địa chỉ giao hàng'}</h3>
              <button onClick={() => { setShowAddressModal(false); setNewAddressMode(false); }} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            
            {newAddressMode ? (
              <form onSubmit={handleAddNewAddress}>
                <div className="form-group">
                  <input 
                    className="form-control" 
                    placeholder="Họ và tên (không chứa số hoặc ký tự đặc biệt)" 
                    value={newAddrForm.name} 
                    onChange={handleAddrNameChange}
                    required 
                  />
                  {addrErrors.name && <span style={{color: '#d32f2f', fontSize: '12px'}}>{addrErrors.name}</span>}
                </div>
                <div className="form-group">
                  <input 
                    className="form-control" 
                    type="tel" 
                    placeholder="0xxxxxxxxx (10 chữ số)" 
                    value={newAddrForm.phone} 
                    onChange={handleAddrPhoneChange}
                    required 
                    maxLength="10"
                  />
                  {addrErrors.phone && <span style={{color: '#d32f2f', fontSize: '12px'}}>{addrErrors.phone}</span>}
                </div>
                <div className="form-group">
                  <input 
                    className="form-control" 
                    placeholder="Địa chỉ cụ thể (Số nhà, tòa nhà)" 
                    value={newAddrForm.address} 
                    onChange={e => setNewAddrForm({...newAddrForm, address: e.target.value})} 
                    required 
                  />
                  {addrErrors.address && <span style={{color: '#d32f2f', fontSize: '12px'}}>{addrErrors.address}</span>}
                </div>
                <div className="form-group">
                  <AddressDropdown
                    value={newAddrForm.city || ''}
                    onSelect={sel => setNewAddrForm(f => ({...f, city: sel.display, districtName: sel.districtName, ghn_province_id: sel.provinceId, ghn_to_district_id: sel.districtId, ghn_to_ward_code: sel.wardCode }))}
                  />
                  {addrErrors.city && <span style={{color: '#d32f2f', fontSize: '12px'}}>{addrErrors.city}</span>}
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="modal-is-default" checked={newAddrForm.is_default} onChange={e => setNewAddrForm({...newAddrForm, is_default: e.target.checked})} style={{ width: 'auto', accentColor: '#c92127' }} />
                  <label htmlFor="modal-is-default" style={{ margin: 0, fontSize: 14 }}>Đặt làm địa chỉ mặc định</label>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button type="button" className="btn-login-prompt" style={{ flex: 1, textAlign: 'center' }} onClick={() => {
                    setNewAddressMode(false);
                    setAddrErrors({});
                  }}>Hủy</button>
                  <button type="submit" className="btn-apply" style={{ flex: 1, padding: '12px 16px' }}>Lưu địa chỉ</button>
                </div>
              </form>
            ) : (
              <div>
                {addresses.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#777', margin: '20px 0' }}>Bạn chưa lưu địa chỉ nào.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {addresses.map(addr => (
                      <div key={addr.id} className={`address-item ${selectedAddressId === addr.id ? 'selected' : ''}`} onClick={() => { setSelectedAddressId(addr.id); setShowAddressModal(false); }}>
                        <div className="address-item-name">{addr.name} {addr.is_default ? <span style={{ background: '#ffebee', color: '#c92127', fontSize: 11, padding: '2px 6px', borderRadius: 4, marginLeft: 8, fontWeight: 'normal' }}>Mặc định</span> : null}</div>
                        <div className="address-item-phone">{addr.phone}</div>
                        <div className="address-item-desc">{addr.address}</div>
                        {selectedAddressId === addr.id && <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#c92127', fontWeight: 'bold' }}>✓</div>}
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" className="btn-login-prompt" style={{ width: '100%', textAlign: 'center' }} onClick={async () => {
                  // Prefill new address modal with Hà Nội / Hà Đông / Mộ Lao
                  const pre = { name: '', phone: '', address: '', is_default: false, city: 'Phường Mộ Lao, Quận Hà Đông, Hà Nội', districtName: 'Quận Hà Đông', ghn_province_id: 201, ghn_to_district_id: 1542, ghn_to_ward_code: '1B1514' };
                  setNewAddrForm(pre);
                  // Also set main form so checkout shows calculated fee
                  setForm(f => ({ ...f, city: pre.city, district: pre.districtName, ghn_province_id: pre.ghn_province_id, ghn_to_district_id: pre.ghn_to_district_id, ghn_to_ward_code: pre.ghn_to_ward_code }));
                  // calculate fee
                  try {
                    setGhnShippingLoading(true);
                    const weight = Math.max(500, items.reduce((s,i)=>s + (i.quantity||1)*500, 0));
                    const res = await fetch(`${API_BASE}/api/shipping/ghn/fee`, {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ to_district_id: pre.ghn_to_district_id, to_ward_code: pre.ghn_to_ward_code, weight }),
                    });
                    const d = await res.json();
                    if (res.ok && d.data && (d.data.service_fee || d.data.fee || d.data.total)) {
                      const fee = d.data.service_fee || d.data.fee || d.data.total || (d.data[0] && d.data[0].total) || 0;
                      setGhnShippingFee(Number(fee) || 0);
                    } else {
                      setGhnShippingFee(null);
                    }
                  } catch (err) {
                    console.error('GHN fee prefill error', err);
                    setGhnShippingFee(null);
                  } finally { setGhnShippingLoading(false); }
                  setNewAddressMode(true);
                }}>
                  + Thêm địa chỉ mới
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
