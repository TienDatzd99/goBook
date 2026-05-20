import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './CheckoutPage.css';
import AddressDropdown from '../components/AddressDropdown';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://gobook.up.railway.app' : 'http://localhost:3001');

function formatPrice(n) { return Number(n).toLocaleString('vi-VN') + '₫'; }

// ── Success screen ──
function SuccessScreen({ result }) {
  const isCOD = result.payment_method === 'cod';
  const isBank = result.payment_method === 'bank';
  const isMomo = result.payment_method === 'momo';
  const isVietqr = result.payment_method === 'vietqr';

  const [isPaid, setIsPaid] = useState(result.status === 'confirmed' || result.payment_status === 'paid');

  useEffect(() => {
    if ((isBank || isVietqr) && !isPaid) {
      const interval = setInterval(() => {
        fetch(`${API_BASE}/api/payment/status/${result.code}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'confirmed' || data.payment_status === 'paid') {
              setIsPaid(true);
              clearInterval(interval);
            }
          })
          .catch(console.error);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isBank, isVietqr, isPaid, result.code]);

  const bankInfo = {
    accountName: 'LE TIEN DAT',
    bankName: 'Vietcombank',
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
            <div className="checkout-block success-header-block" style={{ background: isPaid ? '#e8f5e9' : (isCOD ? '#fff8e1' : '#fff') }}>
              <span className={`status-badge ${isPaid ? 'paid' : (!isCOD ? '' : '')}`}>
                {isPaid ? 'Đã thanh toán' : (isCOD ? 'Chờ xác nhận' : 'Chờ thanh toán')}
              </span>
              <h2>Đơn hàng #{result.code}</h2>
              <div className="success-header-notice" style={{ color: isPaid ? '#2e7d32' : '#111' }}>
                <span style={{ fontSize: 18 }}>✓</span> {isPaid ? 'Thanh toán thành công' : 'Đặt hàng thành công'}
              </div>
            </div>

            <div className="checkout-block">
              <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: 12 }}>
                {isCOD ? 'Thanh toán khi nhận hàng' : 'Chờ thanh toán'}
              </h3>
              <table className="payment-details-table">
                <tbody>
                  <tr><td>Tổng đơn</td><td>{formatPrice(result.total)}</td></tr>
                  <tr><td>Cần thanh toán</td><td style={{ color: '#c92127', fontSize: 15 }}>{formatPrice(result.total)}</td></tr>
                  <tr><td>Phương thức</td>
                    <td>
                      {isCOD && 'Thanh toán tiền mặt khi giao hàng (COD)'}
                      {isBank && 'Chuyển khoản qua ngân hàng'}
                      {isVietqr && 'Chuyển khoản qua QR - Vietcombank'}
                      {isMomo && 'Thanh toán MoMo'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {(!isPaid && (isBank || isVietqr)) && (
                <div style={{ marginTop: 16 }}>
                  <button className="btn-login-prompt" style={{ width: '100%', marginBottom: 16 }}>Thanh toán</button>
                  <div style={{ border: '1px solid #e0e0e0', borderRadius: 8, padding: 12 }}>
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
                      <div className="qr-code-box">
                        <img src={qrUrl} alt="VietQR" />
                        <span style={{ fontSize: 12, color: '#01579b', fontWeight: 600 }}>Quét mã Napas 247</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(!isPaid && (isBank || isVietqr)) && (
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

// ─────────────────────────────────────────────────────────────────────────────
// Main CheckoutPage
// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { items: allItems, freeShipThreshold, removeItems, clearCart } = useCart();
  const { user, getToken } = useAuth();
  const location = useLocation();

  const selectedIds = location.state?.selectedIds;
  const items = selectedIds ? allItems.filter(i => selectedIds.includes(i.id)) : allItems;
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const DEFAULT_SHIPPING_FEE = parseInt(import.meta.env.VITE_DEFAULT_SHIPPING_FEE || '30000', 10);
  const shippingFee = total >= freeShipThreshold ? 0 : DEFAULT_SHIPPING_FEE;

  const [form, setForm] = useState({
    name: user?.name || '', phone: '', email: user?.email || '',
    address: '', city: '', district: '', note: '',
  });

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddressMode, setNewAddressMode] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({ name: '', phone: '', address: '', is_default: false });

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
    if (!newAddrForm.name || !newAddrForm.phone || !newAddrForm.address || !newAddrForm.city) return alert('Vui lòng điền đủ thông tin');
    const fullAddress = `${newAddrForm.address}, ${newAddrForm.city}`;
    try {
      const res = await fetch(`${API_BASE}/api/users/me/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name: newAddrForm.name, phone: newAddrForm.phone, address: fullAddress, is_default: newAddrForm.is_default ? 1 : 0 })
      });
      if (res.ok) {
        const r2 = await fetch(`${API_BASE}/api/users/me/addresses`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const d2 = await r2.json();
        setAddresses(d2);
        const newest = d2.find(a => a.name === newAddrForm.name && a.address === fullAddress) || d2[d2.length - 1];
        if (newest) setSelectedAddressId(newest.id);
        setNewAddressMode(false);
        setNewAddrForm({ name: '', phone: '', address: '', city: '', is_default: false });
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

  const discount = voucherResult?.discount || 0;
  // Use subtotal BEFORE discount to determine free shipping (keep behavior consistent with cart)
  const actualShipping = total >= freeShipThreshold ? 0 : shippingFee;
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
    
    if (user && addresses.length > 0 && selectedAddressId) {
      const selectedAddr = addresses.find(a => a.id === selectedAddressId);
      if (selectedAddr) {
        orderData.name = selectedAddr.name;
        orderData.phone = selectedAddr.phone;
        orderData.address = selectedAddr.address;
        orderData.city = '';
        orderData.district = '';
      }
    } else {
      if (!form.name || !form.phone || !form.address) { 
        setError('Vui lòng điền đầy đủ thông tin giao hàng.'); 
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

      // Remove checked out items
      if (selectedIds) removeItems(selectedIds);
      else clearCart();

      // Show success screen (skip VNPay/MoMo redirect for this new UI, just show success directly)
      data.snapshot_items = items;
      data.shipping_fee = actualShipping;
      data.subtotal = total;
      data.customer_name = orderData.name;
      data.phone = orderData.phone;
      data.email = orderData.email;
      data.address = orderData.address;
      data.city = orderData.city;
      setOrderResult(data);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (orderResult) return <SuccessScreen result={orderResult} />;

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
        <div className="checkout-logo">
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
                    <AddressDropdown value={form.city} onChange={val => setForm({...form, city: val})} />
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
                    <span>📷 Chuyển khoản qua QR - Vietcombank</span>
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
                  <input className="form-control" placeholder="Họ và tên" value={newAddrForm.name} onChange={e => setNewAddrForm({...newAddrForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <input className="form-control" type="tel" placeholder="Số điện thoại" value={newAddrForm.phone} onChange={e => setNewAddrForm({...newAddrForm, phone: e.target.value})} required />
                </div>
                <div className="form-group">
                  <input className="form-control" placeholder="Địa chỉ cụ thể (Số nhà, tòa nhà)" value={newAddrForm.address} onChange={e => setNewAddrForm({...newAddrForm, address: e.target.value})} required />
                </div>
                <div className="form-group">
                  <AddressDropdown value={newAddrForm.city || ''} onChange={val => setNewAddrForm({...newAddrForm, city: val})} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="modal-is-default" checked={newAddrForm.is_default} onChange={e => setNewAddrForm({...newAddrForm, is_default: e.target.checked})} style={{ width: 'auto', accentColor: '#c92127' }} />
                  <label htmlFor="modal-is-default" style={{ margin: 0, fontSize: 14 }}>Đặt làm địa chỉ mặc định</label>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button type="button" className="btn-login-prompt" style={{ flex: 1, textAlign: 'center' }} onClick={() => setNewAddressMode(false)}>Hủy</button>
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
                <button type="button" className="btn-login-prompt" style={{ width: '100%', textAlign: 'center' }} onClick={() => setNewAddressMode(true)}>
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
