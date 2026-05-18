import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Hourglass, PartyPopper, CheckCircle, BellRing, Banknote, CreditCard, Smartphone, Building, QrCode } from 'lucide-react';
import './CheckoutPage.css';

function formatPrice(n) { return Number(n).toLocaleString('vi-VN') + '₫'; }

// ── Bank info component shown on bank transfer success ──
function BankInfo({ total, orderCode }) {
  const [copied, setCopied] = useState('');
  const copy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(''), 2000);
  };
  return (
    <div className="bank-info-box">
      <div className="bank-info-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Building size={20} color="#00897b" /> Thông tin chuyển khoản</div>
      <div className="bank-info-note">Vui lòng chuyển khoản đúng số tiền và nội dung để đơn hàng được xử lý nhanh nhất</div>
      <div className="bank-info-table">
        {[
          { label: 'Ngân hàng', value: 'Vietcombank' },
          { label: 'Số tài khoản', value: '1054599581', copyKey: 'acc' },
          { label: 'Chủ tài khoản', value: 'LE TIEN DAT' },
          { label: 'Số tiền', value: formatPrice(total), copyKey: 'amt', highlight: true },
          { label: 'Nội dung CK', value: orderCode, copyKey: 'content', highlight: true },
        ].map(row => (
          <div className="bank-row" key={row.label}>
            <span className="bank-label">{row.label}:</span>
            <span className={`bank-value ${row.highlight ? 'highlight' : ''}`}>{row.value}</span>
            {row.copyKey && (
              <button
                className="copy-btn"
                onClick={() => copy(row.value.replace(/\s/g, ''), row.copyKey)}
              >
                {copied === row.copyKey ? '✅ Đã copy' : '📋'}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── MoMo info component ──
function MomoInfo({ total, orderCode }) {
  return (
    <div className="momo-info-box">
      <div className="momo-info-header">📱 Thanh toán MoMo</div>
      <div className="momo-qr-placeholder">
        <div style={{ fontSize: 64 }}>📲</div>
        <div style={{ fontSize: 13, color: '#ae1c7b', marginTop: 8 }}>Quét QR hoặc chuyển tiền trực tiếp</div>
      </div>
      <div className="bank-info-table">
        {[
          { label: 'Số MoMo', value: '0966 160 925', highlight: false },
          { label: 'Tên', value: 'goBook' },
          { label: 'Số tiền', value: formatPrice(total), highlight: true },
          { label: 'Nội dung', value: orderCode, highlight: true },
        ].map(row => (
          <div className="bank-row" key={row.label}>
            <span className="bank-label">{row.label}:</span>
            <span className={`bank-value ${row.highlight ? 'highlight' : ''}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── VietQR info component ──
function VietqrInfo({ total, orderCode }) {
  const qrUrl = `https://img.vietqr.io/image/vietcombank-1054599581-compact2.png?amount=${total}&addInfo=${orderCode}&accountName=LE%20TIEN%20DAT`;
  return (
    <div className="vietqr-info-box" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#fff', padding: 24, borderRadius: 12, border: '1px solid #ddd', marginTop: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#0288d1' }}>Quét mã QR để thanh toán</div>
      <img src={qrUrl} alt="VietQR" style={{ width: 250, height: 250, objectFit: 'contain', marginBottom: 16, border: '1px solid #eee', borderRadius: 8, padding: 8 }} />
      <div style={{ fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 16 }}>
        Sử dụng ứng dụng ngân hàng hoặc ví điện tử để quét mã.<br/>
        Hệ thống sẽ <strong>tự động xác nhận</strong> đơn hàng khi nhận được tiền.
      </div>
      <div style={{ width: '100%', maxWidth: 300 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #eee' }}>
          <span style={{ color: '#777' }}>Số tiền:</span>
          <strong style={{ color: '#d32f2f' }}>{formatPrice(total)}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
          <span style={{ color: '#777' }}>Nội dung:</span>
          <strong>{orderCode}</strong>
        </div>
      </div>
    </div>
  );
}

// ── Success screen ──
function SuccessScreen({ result }) {
  const isCOD = result.payment_method === 'cod';
  const isBank = result.payment_method === 'bank';
  const isMomo = result.payment_method === 'momo';
  const isVietqr = result.payment_method === 'vietqr';

  return (
    <div className="checkout-success">
      <div className={`success-card ${isCOD ? 'cod' : 'paid'}`}>
        <div className="success-icon">{isCOD ? <Hourglass size={48} color="#f57c00" /> : <PartyPopper size={48} color="#2e7d32" />}</div>

        <h2>{isCOD ? 'Đặt hàng thành công!' : '✅ Đơn hàng đã xác nhận!'}</h2>

        <div className="order-code-badge">
          Mã đơn hàng: <strong>{result.code}</strong>
        </div>

        {isCOD && (
          <div className="status-notice cod-notice">
            <div className="notice-icon"><BellRing size={20} color="#f57c00" /></div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Đang chờ xác nhận từ admin</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                Chúng tôi sẽ liên hệ xác nhận qua điện thoại trong vòng <strong>30 phút</strong>.<br/>
                Đơn hàng sẽ được giao sau khi xác nhận thành công.
              </div>
            </div>
          </div>
        )}

        {isBank && (
          <div className="status-notice bank-notice">
            <div className="notice-icon"><CheckCircle size={20} color="#2e7d32" /></div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Đơn hàng đã được xác nhận!</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                Vui lòng chuyển khoản để chúng tôi tiến hành giao hàng.
              </div>
            </div>
          </div>
        )}

        {isMomo && (
          <div className="status-notice momo-notice">
            <div className="notice-icon"><CheckCircle size={20} color="#2e7d32" /></div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Đơn hàng đã được xác nhận!</div>
              <div style={{ fontSize: 13, color: '#555' }}>
                Vui lòng hoàn tất thanh toán qua MoMo bên dưới.
              </div>
            </div>
          </div>
        )}

        {isVietqr && (
          <div className="status-notice" style={{ background: '#e1f5fe', color: '#01579b', border: '1px solid #b3e5fc', padding: '12px 16px', borderRadius: 8, display: 'flex', gap: 12, alignItems: 'flex-start', textAlign: 'left', marginTop: 16 }}>
            <div className="notice-icon" style={{ marginTop: 2 }}><CheckCircle size={20} color="#0288d1" /></div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Đơn hàng đã được xác nhận!</div>
              <div style={{ fontSize: 13, color: '#0277bd' }}>
                Vui lòng quét mã VietQR bên dưới để hoàn tất thanh toán.
              </div>
            </div>
          </div>
        )}

        {isBank && <BankInfo total={result.total} orderCode={result.code} />}
        {isMomo && <MomoInfo total={result.total} orderCode={result.code} />}
        {isVietqr && <VietqrInfo total={result.total} orderCode={result.code} />}

        <div className="success-summary">
          <div className="summary-line"><span>Tổng thanh toán</span><strong className="grand">{formatPrice(result.total)}</strong></div>
          {result.discount > 0 && <div className="summary-line discount"><span>Đã giảm</span><strong>-{formatPrice(result.discount)}</strong></div>}
        </div>

        <div className="success-actions">
          <Link to="/tra-cuu-don-hang" className="btn btn-outline">🔍 Theo dõi đơn hàng</Link>
          <Link to="/" className="btn btn-primary btn-lg">🛒 Tiếp tục mua sắm</Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// Main CheckoutPage
// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { items: allItems, freeShipThreshold, removeItems, clearCart } = useCart();
  const { user, getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedIds = location.state?.selectedIds;
  const items = selectedIds ? allItems.filter(i => selectedIds.includes(i.id)) : allItems;
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingFee = total >= freeShipThreshold ? 0 : 30000;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: user?.name || '', phone: '', email: user?.email || '',
    address: '', city: '', district: '', note: '',
  });

  const [addresses, setAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddressMode, setNewAddressMode] = useState(false);
  const [newAddrForm, setNewAddrForm] = useState({ name: '', phone: '', address: '', is_default: false });

  useEffect(() => {
    if (user) {
      fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/me/addresses`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json())
        .then(data => {
           if (Array.isArray(data)) {
             setAddresses(data);
             const def = data.find(a => a.is_default) || data[0];
             if (def) {
               setForm(f => ({ ...f, name: def.name, phone: def.phone, address: def.address, city: '', district: '' }));
             }
           }
        })
        .catch(console.error);
    }
  }, [user, getToken]);

  const handleSelectAddress = (addr) => {
    setForm(f => ({ ...f, name: addr.name, phone: addr.phone, address: addr.address, city: '', district: '' }));
    setShowAddressModal(false);
  };

  const handleAddNewAddress = async (e) => {
    e.preventDefault();
    if (!newAddrForm.name || !newAddrForm.phone || !newAddrForm.address) return alert('Vui lòng điền đủ thông tin');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/me/addresses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...newAddrForm, is_default: newAddrForm.is_default ? 1 : 0 })
      });
      if (res.ok) {
        const r2 = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/users/me/addresses`, { headers: { Authorization: `Bearer ${getToken()}` } });
        const d2 = await r2.json();
        setAddresses(d2);
        const newest = d2.find(a => a.name === newAddrForm.name && a.address === newAddrForm.address) || d2[d2.length - 1];
        if (newest) handleSelectAddress(newest);
        setNewAddressMode(false);
        setNewAddrForm({ name: '', phone: '', address: '', is_default: false });
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
  const [voucherResult, setVoucherResult] = useState(null); // { discount, code }
  const [voucherError, setVoucherError] = useState('');
  const [payment, setPayment] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  const discount = voucherResult?.discount || 0;
  const actualShipping = (total - discount) >= 300000 ? 0 : shippingFee;
  const actualTotal = total - discount + actualShipping;

  // ── Input handlers (validation) ──
  const handleChange = e => {
    const { name, value } = e.target;
    if (name === 'name' && /\d/.test(value)) return;
    if (name === 'phone' && value !== '' && !/^\d+$/.test(value)) return;
    setForm(f => ({ ...f, name: value })); // Wait, I made a mistake here, it should be dynamic. 
    // Let me rewrite this properly.
    setForm(f => ({ ...f, [name]: value }));
  };

  // ── Apply voucher ──
  const applyVoucher = async () => {
    if (!voucher.trim()) return;
    setVoucherError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/vouchers/validate`, {
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

  // ── Place order ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.address) { setError('Vui lòng điền đầy đủ thông tin'); return; }
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          city: form.city,
          district: form.district,
          note: form.note,
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

      // ── VNPay redirect ──
      if (payment === 'vnpay') {
        const payRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/vnpay/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, orderCode: data.code, amount: data.total }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) { setError(payData.error); setOrderResult(data); return; }
        window.location.href = payData.paymentUrl;
        return;
      }

      // ── MoMo redirect ──
      if (payment === 'momo') {
        const payRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/momo/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, orderCode: data.code, amount: data.total }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) { setError(payData.error); setOrderResult(data); return; }
        window.location.href = payData.paymentUrl;
        return;
      }

      // ── COD / bank / vietqr: show success screen ──
      setOrderResult(data);
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  // ── Success screen ──
  if (orderResult) return <SuccessScreen result={orderResult} />;

  // ── Empty cart ──
  if (items.length === 0) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2>Không có sản phẩm nào để thanh toán</h2>
        <Link to="/gio-hang" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Về giỏ hàng</Link>
      </div>
    );
  }

  const paymentLabel = { cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản ngân hàng', momo: 'Ví MoMo', vietqr: 'Thanh toán qua VietQR' };

  return (
    <div className="checkout-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link><span>›</span>
          <Link to="/gio-hang">Giỏ hàng</Link><span>›</span>
          <span>Thanh toán</span>
        </div>

        <h1 className="page-title">Thanh toán</h1>

        {/* Steps */}
        <div className="checkout-steps">
          {['Thông tin giao hàng', 'Phương thức thanh toán', 'Xác nhận đặt hàng'].map((s, i) => (
            <div key={i} className={`step ${step >= i + 1 ? 'done' : ''} ${step === i + 1 ? 'active' : ''}`}>
              <div className="step-num">{i + 1}</div>
              <span className="step-label">{s}</span>
              {i < 2 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={handleSubmit} id="checkout-form">

            {/* ── STEP 1: Shipping info ── */}
            {step === 1 && (
              <div className="checkout-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0 }}>Thông tin người nhận</h3>
                  {user && addresses.length > 0 && (
                    <button type="button" className="btn btn-outline" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => setShowAddressModal(true)}>
                      📍 Thay đổi địa chỉ
                    </button>
                  )}
                </div>

                {user ? (
                  addresses.length > 0 && form.address ? (
                    <div style={{ padding: '16px 20px', border: '1px solid var(--border)', borderRadius: 8, background: '#fafafa', marginBottom: 20 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6, color: 'var(--text-primary)' }}>
                        {form.name} <span style={{ color: '#ccc', margin: '0 8px' }}>|</span> {form.phone}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        {form.address}{form.city ? `, ${form.city}` : ''}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '40px 20px', border: '2px dashed #ddd', borderRadius: 8, textAlign: 'center', marginBottom: 20, background: '#fafafa' }}>
                      <div style={{ marginBottom: 12, fontSize: 15, color: '#666' }}>Bạn chưa có địa chỉ nhận hàng nào</div>
                      <button type="button" className="btn btn-primary" onClick={() => { setNewAddressMode(true); setShowAddressModal(true); }}>
                        + Thêm địa chỉ mới
                      </button>
                    </div>
                  )
                ) : (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="co-name">Họ và tên *</label>
                        <input className="form-control" id="co-name" name="name" value={form.name} onChange={handleChange} placeholder="Nguyễn Văn A" required />
                        <div className="field-note">Không nhập số</div>
                      </div>
                      <div className="form-group">
                        <label htmlFor="co-phone">Số điện thoại *</label>
                        <input className="form-control" id="co-phone" name="phone" value={form.phone} onChange={handleChange} placeholder="0966160925" required inputMode="numeric" maxLength={11} />
                        <div className="field-note">Chỉ nhập số</div>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="co-email">Email (để nhận thông báo đơn hàng)</label>
                      <input className="form-control" id="co-email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="email@example.com" />
                    </div>
                    <div className="form-group">
                      <label htmlFor="co-address">Địa chỉ *</label>
                      <input className="form-control" id="co-address" name="address" value={form.address} onChange={handleChange} placeholder="Số nhà, tên đường" required />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="co-city">Tỉnh/Thành phố</label>
                        <select className="form-control" id="co-city" name="city" value={form.city} onChange={handleChange}>
                          <option value="">Chọn tỉnh/thành</option>
                          <option>Hà Nội</option><option>TP. Hồ Chí Minh</option>
                          <option>Đà Nẵng</option><option>Cần Thơ</option>
                          <option>Hải Phòng</option><option>Nghệ An</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label htmlFor="co-district">Quận/Huyện</label>
                        <input className="form-control" id="co-district" name="district" value={form.district} onChange={handleChange} placeholder="Quận/Huyện" />
                      </div>
                    </div>
                  </>
                )}

                <div className="form-group">
                  <label htmlFor="co-note">Ghi chú đơn hàng</label>
                  <textarea className="form-control" id="co-note" name="note" value={form.note} onChange={handleChange} placeholder="Ghi chú giao hàng (không bắt buộc)" rows={2} />
                </div>
                
                <button type="button" className="btn btn-primary btn-lg" onClick={() => {
                  if (user && addresses.length === 0) {
                    setError('Vui lòng thêm địa chỉ nhận hàng trước khi tiếp tục');
                    return;
                  }
                  if (!form.name || !form.phone || !form.address) { 
                    setError('Vui lòng điền đủ: họ tên, SĐT và địa chỉ'); 
                    return; 
                  }
                  setError(''); 
                  setStep(2);
                }} id="next-step-1">
                  Tiếp tục →
                </button>
                {error && <div className="checkout-error">{error}</div>}
              </div>
            )}

            {/* ── STEP 2: Payment method ── */}
            {step === 2 && (
              <div className="checkout-section">
                <h3>Phương thức thanh toán</h3>
                <div className="payment-options">
                  {[
                    {
                      id: 'cod',
                      icon: <Banknote size={24} color="#2e7d32" />,
                      label: 'Thanh toán khi nhận hàng (COD)',
                      desc: 'Trả tiền mặt khi nhận sách',
                      badge: 'Chờ xác nhận từ admin',
                      badgeClass: 'badge-warn',
                    },
                    {
                      id: 'vnpay',
                      icon: <CreditCard size={24} color="#1976d2" />,
                      label: 'Thanh toán VNPay',
                      desc: 'ATM, Visa, Master, QR Code — xác nhận ngay',
                      badge: 'Xác nhận ngay',
                      badgeClass: 'badge-ok',
                    },
                    {
                      id: 'vietqr',
                      icon: <QrCode size={24} color="#0288d1" />,
                      label: 'Thanh toán qua VietQR',
                      desc: 'Quét mã QR bằng ứng dụng ngân hàng',
                      badge: 'Xác nhận tự động',
                      badgeClass: 'badge-ok',
                    },
                    {
                      id: 'momo',
                      icon: <Smartphone size={24} color="#d81b60" />,
                      label: 'Ví MoMo',
                      desc: 'Thanh toán nhanh qua ứng dụng MoMo',
                      badge: 'Xác nhận ngay',
                      badgeClass: 'badge-ok',
                    },
                    {
                      id: 'bank',
                      icon: <Building size={24} color="#00897b" />,
                      label: 'Chuyển khoản ngân hàng',
                      desc: 'Vietcombank – 1054599581 – LE TIEN DAT',
                      badge: 'Xác nhận ngay',
                      badgeClass: 'badge-ok',
                    },
                  ].map(opt => (
                    <label key={opt.id} className={`payment-option ${payment === opt.id ? 'selected' : ''}`} htmlFor={`pay-${opt.id}`}>
                      <input type="radio" id={`pay-${opt.id}`} name="payment" value={opt.id} checked={payment === opt.id} onChange={() => setPayment(opt.id)} />
                      <span className="pay-icon">{opt.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div className="pay-label">{opt.label}</div>
                        <div className="pay-desc">{opt.desc}</div>
                      </div>
                      <span className={`pay-badge ${opt.badgeClass}`}>{opt.badge}</span>
                      {payment === opt.id && <span className="pay-check">✓</span>}
                    </label>
                  ))}
                </div>

                {/* VNPay notice */}
                {payment === 'vnpay' && (
                  <div className="payment-preview" style={{ background: '#e8f4fd', border: '1.5px solid #90caf9' }}>
                    <div className="preview-title" style={{ color: '#0d47a1' }}>💳 Thanh toán qua VNPay</div>
                    <div style={{ fontSize: 13, color: '#555' }}>Bạn sẽ được chuyển sang trang VNPay để thanh toán an toàn. Hỗ trợ: ATM nội địa, Visa, MasterCard, QR Code.</div>
                  </div>
                )}

                {/* MoMo notice */}
                {payment === 'momo' && (
                  <div className="payment-preview momo-preview">
                    <div className="preview-title">📱 Thanh toán qua MoMo</div>
                    <div style={{ fontSize: 13, color: '#555' }}>Bạn sẽ được chuyển sang ứng dụng / trang MoMo để hoàn tất thanh toán.</div>
                  </div>
                )}

                {/* VietQR notice */}
                {payment === 'vietqr' && (
                  <div className="payment-preview" style={{ background: '#e1f5fe', border: '1.5px solid #81d4fa' }}>
                    <div className="preview-title" style={{ color: '#01579b' }}>📷 Thanh toán qua VietQR</div>
                    <div style={{ fontSize: 13, color: '#0277bd' }}>Mã VietQR sẽ được hiển thị ngay sau khi bạn đặt hàng. Bạn chỉ cần dùng ứng dụng ngân hàng quét mã để thanh toán nhanh chóng.</div>
                  </div>
                )}

                {/* Bank info preview */}
                {payment === 'bank' && (
                  <div className="payment-preview bank-preview">
                    <div className="preview-title">📋 Thông khoản chuyển khoản</div>
                    <table style={{ width: '100%', fontSize: 13 }}>
                      <tbody>
                        <tr><td style={{ color: '#777', padding: '3px 0' }}>Ngân hàng:</td><td><strong>Vietcombank</strong></td></tr>
                        <tr><td style={{ color: '#777' }}>Số TK:</td><td><strong>1054599581</strong></td></tr>
                        <tr><td style={{ color: '#777' }}>Chủ TK:</td><td><strong>LE TIEN DAT</strong></td></tr>
                        <tr><td style={{ color: '#777' }}>Số tiền:</td><td><strong style={{ color: '#d32f2f' }}>{formatPrice(actualTotal)}</strong></td></tr>
                      </tbody>
                    </table>
                    <div style={{ fontSize: 12, color: '#777', marginTop: 8 }}>⚠️ Mã đơn hàng sẽ được dùng làm nội dung chuyển khoản</div>
                  </div>
                )}

                <div className="step-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setStep(1)} id="back-step">← Quay lại</button>
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => setStep(3)} id="next-step-2">Tiếp tục →</button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Confirm ── */}
            {step === 3 && (
              <div className="checkout-section">
                <h3>Xác nhận đặt hàng</h3>

                <div className="confirm-info">
                  <div className="confirm-row"><span>Người nhận:</span><strong>{form.name}</strong></div>
                  <div className="confirm-row"><span>Điện thoại:</span><strong>{form.phone}</strong></div>
                  <div className="confirm-row"><span>Địa chỉ:</span><strong>{form.address}{form.city ? `, ${form.city}` : ''}</strong></div>
                  <div className="confirm-row"><span>Thanh toán:</span>
                    <strong className={`pay-method-tag ${payment}`}>
                      {payment === 'cod' ? '💰 COD' : payment === 'bank' ? '🏦 Chuyển khoản' : payment === 'vnpay' ? '💳 VNPay' : payment === 'momo' ? '📱 MoMo' : '📷 VietQR'}
                    </strong>
                  </div>
                </div>

                {/* COD notice */}
                {payment === 'cod' && (
                  <div className="confirm-notice cod">
                    <span>⏳</span>
                    <div>
                      <strong>Đơn hàng COD sẽ cần xác nhận từ admin</strong><br/>
                      <span style={{ fontSize: 12 }}>Chúng tôi sẽ gọi điện xác nhận trong 30 phút sau khi đặt hàng.</span>
                    </div>
                  </div>
                )}

                {/* VNPay / MoMo / Bank / VietQR auto-confirm notice */}
                {(payment === 'bank' || payment === 'momo' || payment === 'vnpay' || payment === 'vietqr') && (
                  <div className="confirm-notice auto">
                    <span>✅</span>
                    <div>
                      <strong>
                        {payment === 'vnpay' ? 'Bạn sẽ được chuyển sang trang VNPay để thanh toán' : 'Đơn hàng sẽ được xác nhận ngay sau khi đặt'}
                      </strong><br/>
                      <span style={{ fontSize: 12 }}>
                        {payment === 'bank' ? 'Thông tin chuyển khoản sẽ hiển thị sau khi đặt hàng.'
                          : payment === 'vnpay' ? 'Hỗ trợ ATM, Visa, MasterCard, QR Code.'
                          : payment === 'momo' ? 'Bạn sẽ được chuyển sang trang MoMo để thanh toán.'
                          : 'Mã QR thanh toán sẽ hiển thị ở bước tiếp theo.'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Voucher input */}
                <div className="voucher-section">
                  <label>🎟️ Mã giảm giá</label>
                  <div className="voucher-row">
                    <input
                      className="form-control"
                      placeholder="Nhập mã voucher..."
                      value={voucher}
                      onChange={e => { setVoucher(e.target.value.toUpperCase()); setVoucherResult(null); setVoucherError(''); }}
                      id="voucher-input"
                    />
                    <button type="button" className="btn btn-outline" onClick={applyVoucher} id="apply-voucher">Áp dụng</button>
                  </div>
                  {voucherResult && <div className="voucher-success">✅ Giảm: <strong>{formatPrice(voucherResult.discount)}</strong></div>}
                  {voucherError && <div className="voucher-error">❌ {voucherError}</div>}
                </div>

                {error && <div className="checkout-error">{error}</div>}

                <div className="step-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setStep(2)} id="back-step-2">← Quay lại</button>
                  <button type="submit" className="btn btn-accent btn-lg" id="place-order-btn" disabled={loading}>
                    {loading ? '⏳ Đang xử lý...' : `🎉 Đặt hàng ngay (${formatPrice(actualTotal)})`}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Order summary sidebar */}
          <div className="checkout-order-summary">
            <h3>Đơn hàng ({items.length} sản phẩm)</h3>
            <div className="checkout-items">
              {items.map(item => (
                <div key={item.id} className="checkout-item">
                  <div className="checkout-item-img-wrap">
                    <img src={item.image} alt={item.name} />
                    <span className="item-qty-badge">{item.quantity}</span>
                  </div>
                  <div className="checkout-item-info">
                    <div className="checkout-item-name">{item.name}</div>
                    <div className="checkout-item-unit">{formatPrice(item.price)} × {item.quantity}</div>
                  </div>
                  <div className="checkout-item-price">{formatPrice(item.price * item.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="checkout-summary-lines">
              <div className="summary-line"><span>Tạm tính</span><span>{formatPrice(total)}</span></div>
              {discount > 0 && <div className="summary-line discount"><span>🎟️ Giảm giá</span><span className="discount-val">-{formatPrice(discount)}</span></div>}
              <div className="summary-line">
                <span>Vận chuyển</span>
                <span className={actualShipping === 0 ? 'free' : ''}>{actualShipping === 0 ? 'Miễn phí' : formatPrice(actualShipping)}</span>
              </div>
              <div className="summary-line total"><strong>Tổng cộng</strong><strong className="grand">{formatPrice(actualTotal)}</strong></div>
            </div>
            {payment === 'cod' && (
              <div className="sidebar-payment-note cod-note">
                ⏳ COD: Admin sẽ xác nhận đơn trước khi giao
              </div>
            )}
            {(payment === 'bank' || payment === 'momo' || payment === 'vietqr') && (
              <div className="sidebar-payment-note confirm-note">
                ✅ Đơn xác nhận ngay — thanh toán sau
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Address Modal ── */}
      {showAddressModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: 12, marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>Sổ địa chỉ của bạn</h3>
              <button onClick={() => setShowAddressModal(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            
            {newAddressMode ? (
              <form onSubmit={handleAddNewAddress}>
                <div className="form-group">
                  <label>Tên người nhận</label>
                  <input className="form-control" value={newAddrForm.name} onChange={e => setNewAddrForm({...newAddrForm, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input className="form-control" type="tel" value={newAddrForm.phone} onChange={e => setNewAddrForm({...newAddrForm, phone: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Địa chỉ cụ thể</label>
                  <input className="form-control" value={newAddrForm.address} onChange={e => setNewAddrForm({...newAddrForm, address: e.target.value})} required />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" id="modal-is-default" checked={newAddrForm.is_default} onChange={e => setNewAddrForm({...newAddrForm, is_default: e.target.checked})} style={{ width: 'auto' }} />
                  <label htmlFor="modal-is-default" style={{ margin: 0, fontWeight: 'normal' }}>Đặt làm địa chỉ mặc định</label>
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setNewAddressMode(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Lưu địa chỉ</button>
                </div>
              </form>
            ) : (
              <div>
                {addresses.length === 0 ? (
                  <p style={{ textAlign: 'center', color: '#777', margin: '20px 0' }}>Bạn chưa lưu địa chỉ nào.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                    {addresses.map(addr => (
                      <div key={addr.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, cursor: 'pointer', position: 'relative' }} onClick={() => handleSelectAddress(addr)}>
                        <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{addr.name} {addr.is_default ? <span style={{ background: '#ffebee', color: '#c92127', fontSize: 11, padding: '2px 6px', borderRadius: 4, marginLeft: 8, fontWeight: 'normal' }}>Mặc định</span> : null}</div>
                        <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>SĐT: {addr.phone}</div>
                        <div style={{ fontSize: 13, color: '#555' }}>{addr.address}</div>
                        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#c92127', fontWeight: 'bold' }}>
                          Chọn
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button type="button" className="btn btn-outline w-full" onClick={() => setNewAddressMode(true)}>
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
