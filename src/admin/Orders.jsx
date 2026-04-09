import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

function fmt(n) { return Number(n||0).toLocaleString('vi-VN') + '₫'; }

const STATUS_CONFIG = {
  pending:   { label: 'Chờ xác nhận', cls: 'a-badge-orange', next: 'confirmed', nextLabel: 'Xác nhận' },
  confirmed: { label: 'Đã xác nhận',  cls: 'a-badge-blue',   next: 'shipping',  nextLabel: 'Giao hàng' },
  shipping:  { label: 'Đang giao',    cls: 'a-badge-purple',  next: 'delivered', nextLabel: 'Hoàn thành' },
  delivered: { label: 'Hoàn thành',   cls: 'a-badge-green',   next: null },
  cancelled: { label: 'Đã hủy',       cls: 'a-badge-red',     next: null },
};

const PAY_MAP = { cod: '💵 COD', bank: '🏦 Chuyển khoản', momo: '💜 Momo', zalopay: '🔵 ZaloPay' };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [updating, setUpdating] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
    if (search) params.search = search;
    api.getOrders(params)
      .then(r => { setOrders(r.data); setTotal(r.total); setTotalPages(r.totalPages); })
      .finally(() => setLoading(false));
  }, [page, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    const d = await api.getOrder(id);
    setDetail(d);
  };

  const updateStatus = async (id, status) => {
    setUpdating(id);
    try { await api.updateOrderStatus(id, status); load(); if (detail?.id === id) { const d = await api.getOrder(id); setDetail(d); } }
    catch (err) { alert('Lỗi: ' + err.message); }
    finally { setUpdating(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa đơn hàng này?')) return;
    await api.deleteOrder(id);
    load();
  };

  return (
    <div>
      <div className="a-page-header">
        <div>
          <div className="a-page-title">🛒 Đơn hàng</div>
          <div className="a-page-subtitle">Tổng {total} đơn hàng</div>
        </div>
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['all','Tất cả'], ['pending','Chờ xử lý'], ['confirmed','Đã xác nhận'], ['shipping','Đang giao'], ['delivered','Hoàn thành'], ['cancelled','Đã hủy']].map(([v, l]) => (
          <button key={v} className={`a-btn ${statusFilter === v ? 'a-btn-primary' : 'a-btn-outline'} a-btn-sm`} onClick={() => { setStatusFilter(v); setPage(1); }}>
            {l}
          </button>
        ))}
      </div>

      <div className="a-card">
        <div className="a-card-header">
          <div className="a-search-wrap">
            <span>🔍</span>
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm mã đơn, tên, SĐT..." />
          </div>
        </div>

        <div className="a-table-wrap">
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Đang tải...</div> : (
            <table className="a-table">
              <thead>
                <tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>TT Thanh toán</th><th>Trạng thái</th><th>Ngày đặt</th><th>Hành động</th></tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan={8}><div className="a-empty"><div className="a-empty-icon">📭</div><h3>Không có đơn hàng</h3></div></td></tr>
                ) : orders.map(o => {
                  const cfg = STATUS_CONFIG[o.status];
                  return (
                    <tr key={o.id}>
                      <td><span style={{ color: 'var(--a-primary)', fontWeight: 700, cursor: 'pointer' }} onClick={() => openDetail(o.id)}>{o.code}</span></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                        {o.user_name && <div style={{ fontSize: 11, color: 'var(--a-text-muted)' }}>👤 {o.user_name}</div>}
                      </td>
                      <td><span className="a-badge a-badge-gray">—</span></td>
                      <td style={{ fontWeight: 700, color: 'var(--a-primary)' }}>{fmt(o.total)}</td>
                      <td><span className="a-badge a-badge-blue">{PAY_MAP[o.payment_method] || o.payment_method}</span></td>
                      <td><span className={`a-badge ${cfg?.cls}`}>{cfg?.label}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--a-text-muted)', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <div className="a-actions">
                          <button className="a-btn a-btn-outline a-btn-icon a-btn-sm" onClick={() => openDetail(o.id)} title="Chi tiết">👁️</button>
                          {cfg?.next && (
                            <button className="a-btn a-btn-success a-btn-sm" onClick={() => updateStatus(o.id, cfg.next)} disabled={updating===o.id} title={cfg.nextLabel}>
                              {updating===o.id ? '...' : cfg.nextLabel}
                            </button>
                          )}
                          {o.status === 'pending' && (
                            <button className="a-btn a-btn-danger a-btn-icon a-btn-sm" onClick={() => updateStatus(o.id, 'cancelled')}>✕</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="a-pagination">
            <span className="a-pagination-info">Hiển thị {orders.length}/{total}</span>
            <div className="a-pager">
              <button className="a-page-btn" onClick={() => setPage(p => p-1)} disabled={page<=1}>←</button>
              {Array.from({length: Math.min(5, totalPages)}, (_, i) => i+1).map(n => (
                <button key={n} className={`a-page-btn ${page===n?'active':''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="a-page-btn" onClick={() => setPage(p => p+1)} disabled={page>=totalPages}>→</button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {detail && (
        <div className="a-modal-overlay" onClick={e => e.target === e.currentTarget && setDetail(null)}>
          <div className="a-modal a-modal-lg">
            <div className="a-modal-header">
              <div>
                <div className="a-modal-title">🧾 Chi tiết đơn {detail.code}</div>
                <span className={`a-badge ${STATUS_CONFIG[detail.status]?.cls}`}>{STATUS_CONFIG[detail.status]?.label}</span>
              </div>
              <button className="a-modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="a-modal-body">
              <div className="a-form-grid">
                <div><div className="a-label">Khách hàng</div><div style={{ fontWeight: 600 }}>{detail.customer_name}</div></div>
                <div><div className="a-label">Điện thoại</div><div>{detail.phone}</div></div>
                <div><div className="a-label">Email</div><div>{detail.email || '—'}</div></div>
                <div><div className="a-label">Thành phố</div><div>{detail.city || '—'}</div></div>
                <div className="a-form-full"><div className="a-label">Địa chỉ</div><div>{detail.address}</div></div>
                <div><div className="a-label">TT Thanh toán</div><div>{PAY_MAP[detail.payment_method]}</div></div>
                <div><div className="a-label">Ngày đặt</div><div>{new Date(detail.created_at).toLocaleString('vi-VN')}</div></div>
              </div>

              <div style={{ marginTop: 20 }}>
                <div className="a-label" style={{ marginBottom: 10 }}>Sản phẩm đặt mua</div>
                <table className="a-table">
                  <thead><tr><th>Sản phẩm</th><th>Đơn giá</th><th>SL</th><th>Thành tiền</th></tr></thead>
                  <tbody>
                    {detail.items?.map((item, i) => (
                      <tr key={i}>
                        <td><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><img src={item.product_image} alt="" style={{ width:36,height:44,objectFit:'cover',borderRadius:4 }} /><span style={{ fontWeight:600 }}>{item.product_name}</span></div></td>
                        <td>{fmt(item.price)}</td>
                        <td>{item.quantity}</td>
                        <td style={{ fontWeight:700, color:'var(--a-primary)' }}>{fmt(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8f9fb', borderRadius: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span>Tạm tính</span><span>{fmt(detail.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span>Phí ship</span><span style={{ color: detail.shipping_fee === 0 ? 'green' : 'inherit' }}>{detail.shipping_fee === 0 ? 'Miễn phí' : fmt(detail.shipping_fee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 16, borderTop: '1px solid var(--a-border)', paddingTop: 8 }}>
                  <span>Tổng cộng</span><span style={{ color: 'var(--a-primary)' }}>{fmt(detail.total)}</span>
                </div>
              </div>
            </div>
            <div className="a-modal-footer">
              {STATUS_CONFIG[detail.status]?.next && (
                <button className="a-btn a-btn-success" onClick={() => updateStatus(detail.id, STATUS_CONFIG[detail.status].next)} disabled={updating===detail.id}>
                  ✅ {STATUS_CONFIG[detail.status].nextLabel}
                </button>
              )}
              {detail.status === 'pending' && (
                <button className="a-btn a-btn-danger" onClick={() => { updateStatus(detail.id, 'cancelled'); setDetail(null); }}>✕ Hủy đơn</button>
              )}
              <button className="a-btn a-btn-outline" onClick={() => setDetail(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
