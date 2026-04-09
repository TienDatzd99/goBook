import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function OrderTrackingPage() {
  const [orderId, setOrderId] = useState('');
  const [result, setResult] = useState(null);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    // Simulate order lookup
    setResult({
      id: orderId,
      status: 'Đang giao hàng',
      date: new Date().toLocaleDateString('vi-VN'),
      items: 2,
      total: '195,000₫',
      steps: ['Đặt hàng thành công', 'Xác nhận đơn hàng', 'Đang giao hàng', 'Giao hàng thành công'],
      currentStep: 2,
    });
  };

  return (
    <div style={{ padding: '20px 0 48px', background: 'var(--bg-light)', minHeight: '60vh' }}>
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link><span>›</span>
          <span>Tra cứu đơn hàng</span>
        </div>
        <div style={{ maxWidth: 600, margin: '0 auto', background: '#fff', borderRadius: 'var(--radius-xl)', padding: 32, boxShadow: 'var(--shadow-card)' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 48 }}>📦</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginTop: 8 }}>Tra cứu đơn hàng</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Nhập mã đơn hàng để xem trạng thái</p>
          </div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
            <input
              type="text"
              className="form-control"
              id="order-id-input"
              placeholder="Nhập mã đơn hàng (vd: MLB12345678)"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" id="track-order-btn" style={{ whiteSpace: 'nowrap' }}>
              Tra cứu
            </button>
          </form>

          {result && (
            <div>
              <div style={{ background: 'var(--bg-light)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    ['Mã đơn hàng', result.id],
                    ['Ngày đặt', result.date],
                    ['Số sản phẩm', `${result.items} cuốn`],
                    ['Tổng tiền', result.total],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Trạng thái đơn hàng</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {result.steps.map((step, i) => (
                  <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: i <= result.currentStep ? 'var(--primary)' : 'var(--border)',
                      color: i <= result.currentStep ? '#fff' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14
                    }}>
                      {i <= result.currentStep ? '✓' : i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: i <= result.currentStep ? 600 : 400, color: i <= result.currentStep ? 'var(--text-primary)' : 'var(--text-muted)' }}>{step}</div>
                    </div>
                    {i === result.currentStep && (
                      <span style={{ marginLeft: 'auto', background: '#fff3e0', color: 'var(--accent)', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 12 }}>Hiện tại</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
