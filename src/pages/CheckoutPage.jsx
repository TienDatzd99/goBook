import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Hourglass, PartyPopper, CheckCircle, BellRing, Banknote, CreditCard, Smartphone, Building } from 'lucide-react';
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
          { label: 'Số tài khoản', value: '1234 5678 9012', copyKey: 'acc' },
          { label: 'Chủ tài khoản', value: 'GOBOOK STORE' },
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

// ── Success screen ──
function SuccessScreen({ result }) {
  const isCOD = result.payment_method === 'cod';
  const isBank = result.payment_method === 'bank';
  const isMomo = result.payment_method === 'momo';

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

        {isBank && <BankInfo total={result.total} orderCode={result.code} />}
        {isMomo && <MomoInfo total={result.total} orderCode={result.code} />}

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
// Main CheckoutPage
// ─────────────────────────────────────────────────────────────────────────────
export default function CheckoutPage() {
  const { items, total, shippingFee, grandTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: user?.name || '', phone: '', email: user?.email || '',
    address: '', city: '', district: '', note: '',
  });
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
      setVoucherResult({ code: voucher.toUpperCase(), discount: data.discount_amount });
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

      clearCart();

      // ── VNPay redirect ──
      if (payment === 'vnpay') {
        const payRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/vnpay/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: data.orderId, orderCode: data.code, amount: data.total }),
        });
        const payData = await payRes.json();
        if (!payRes.ok) { setError(payData.error); clearCart(); setOrderResult(data); return; }
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
        if (!payRes.ok) { setError(payData.error); clearCart(); setOrderResult(data); return; }
        window.location.href = payData.paymentUrl;
        return;
      }

      // ── COD / bank: show success screen ──
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
        <h2>Giỏ hàng trống</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Về trang chủ</Link>
      </div>
    );
  }

  const paymentLabel = { cod: 'Thanh toán khi nhận hàng (COD)', bank: 'Chuyển khoản ngân hàng', momo: 'Ví MoMo' };

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
                <h3>Thông tin người nhận</h3>
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
                <div className="form-group">
                  <label htmlFor="co-note">Ghi chú đơn hàng</label>
                  <textarea className="form-control" id="co-note" name="note" value={form.note} onChange={handleChange} placeholder="Ghi chú giao hàng (không bắt buộc)" rows={2} />
                </div>
                <button type="button" className="btn btn-primary btn-lg" onClick={() => {
                  if (!form.name || !form.phone || !form.address) { setError('Vui lòng điền đủ: họ tên, SĐT và địa chỉ'); return; }
                  setError(''); setStep(2);
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
                      desc: 'Vietcombank – 1234 5678 9012 – GOBOOK STORE',
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

                {/* Bank info preview */}
                {payment === 'bank' && (
                  <div className="payment-preview bank-preview">
                    <div className="preview-title">📋 Thông tin chuyển khoản</div>
                    <table style={{ width: '100%', fontSize: 13 }}>
                      <tbody>
                        <tr><td style={{ color: '#777', padding: '3px 0' }}>Ngân hàng:</td><td><strong>Vietcombank</strong></td></tr>
                        <tr><td style={{ color: '#777' }}>Số TK:</td><td><strong>1234 5678 9012</strong></td></tr>
                        <tr><td style={{ color: '#777' }}>Chủ TK:</td><td><strong>GOBOOK STORE</strong></td></tr>
                        <tr><td style={{ color: '#777' }}>Số tiền:</td><td><strong style={{ color: '#d32f2f' }}>{formatPrice(actualTotal)}</strong></td></tr>
                      </tbody>
                    </table>
                    <div style={{ fontSize: 12, color: '#777', marginTop: 8 }}>⚠️ Mã đơn hàng sẽ được dùng làm nội dung chuyển khoản</div>
                  </div>
                )}

                {payment === 'momo' && (
                  <div className="payment-preview momo-preview">
                    <div className="preview-title">📱 Thông tin MoMo</div>
                    <div style={{ fontSize: 13, color: '#ae1c7b' }}>Số MoMo: <strong>0966 160 925</strong> (goBook)</div>
                    <div style={{ fontSize: 13, marginTop: 4, color: '#555' }}>Số tiền: <strong style={{ color: '#d32f2f' }}>{formatPrice(actualTotal)}</strong></div>
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
                      {payment === 'cod' ? '💰 COD' : payment === 'bank' ? '🏦 Chuyển khoản' : payment === 'vnpay' ? '💳 VNPay' : '📱 MoMo'}
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

                {/* VNPay / MoMo / Bank auto-confirm notice */}
                {(payment === 'bank' || payment === 'momo' || payment === 'vnpay') && (
                  <div className="confirm-notice auto">
                    <span>✅</span>
                    <div>
                      <strong>
                        {payment === 'vnpay' ? 'Bạn sẽ được chuyển sang trang VNPay để thanh toán' : 'Đơn hàng sẽ được xác nhận ngay sau khi đặt'}
                      </strong><br/>
                      <span style={{ fontSize: 12 }}>
                        {payment === 'bank' ? 'Thông tin chuyển khoản sẽ hiển thị sau khi đặt hàng.'
                          : payment === 'vnpay' ? 'Hỗ trợ ATM, Visa, MasterCard, QR Code.'
                          : 'Bạn sẽ được chuyển sang trang MoMo để thanh toán.'}
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
            {(payment === 'bank' || payment === 'momo') && (
              <div className="sidebar-payment-note confirm-note">
                ✅ Đơn xác nhận ngay — thanh toán sau
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
