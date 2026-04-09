import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api';

function fmt(n) { return Number(n || 0).toLocaleString('vi-VN') + '₫'; }
function pct(a, b) { if (!b) return '+0%'; const v = ((a - b) / b * 100).toFixed(1); return (v > 0 ? '+' : '') + v + '%'; }

const STATUS_MAP = {
  pending:   { label: 'Chờ xác nhận', cls: 'a-badge-orange' },
  confirmed: { label: 'Đã xác nhận',  cls: 'a-badge-blue' },
  shipping:  { label: 'Đang giao',    cls: 'a-badge-purple' },
  delivered: { label: 'Hoàn thành',   cls: 'a-badge-green' },
  cancelled: { label: 'Đã hủy',       cls: 'a-badge-red' },
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.dashboard()
      .then(setData)
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="admin-loading" style={{ minHeight: 300 }}><div className="admin-spinner" /></div>;
  if (err) return <div style={{ color: 'red', padding: 20 }}>Lỗi: {err}</div>;

  const { stats, dailyRevenue, topProducts, ordersByStatus, recentOrders } = data;

  const maxRevenue = Math.max(...dailyRevenue.map(d => d.revenue), 1);

  const STAT_CARDS = [
    { icon: '💰', label: 'Doanh thu hôm nay', value: fmt(stats.todayRevenue), change: pct(stats.todayRevenue, stats.yesterdayRevenue), bg: '#fff5f5', iconBg: '#ffcdd2', up: stats.todayRevenue >= stats.yesterdayRevenue },
    { icon: '🛒', label: 'Đơn hàng mới', value: stats.todayOrders, change: `${stats.pendingOrders} chờ xử lý`, bg: '#e3f2fd', iconBg: '#bbdefb', up: true },
    { icon: '📦', label: 'Tổng sản phẩm', value: stats.totalProducts, change: `${stats.lowStockProducts} sắp hết`, bg: '#e8f5e9', iconBg: '#c8e6c9', up: stats.lowStockProducts === 0 },
    { icon: '👥', label: 'Người dùng', value: stats.totalUsers, change: `+${stats.newUsersToday} hôm nay`, bg: '#f3e5f5', iconBg: '#e1bee7', up: true },
  ];

  return (
    <div>
      <div className="a-page-header">
        <div>
          <div className="a-page-title">📊 Dashboard</div>
          <div className="a-page-subtitle">Tổng quan hoạt động hệ thống</div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--a-text-muted)' }}>
          {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="a-stats-grid">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className="a-stat-card" style={{ background: s.bg }}>
            <div className="a-stat-icon" style={{ background: s.iconBg }}>{s.icon}</div>
            <div className="a-stat-info">
              <div className="a-stat-value">{s.value}</div>
              <div className="a-stat-label">{s.label}</div>
              <div className={`a-stat-change ${s.up ? 'up' : 'down'}`}>{s.change}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="a-grid-2" style={{ marginBottom: 16 }}>
        {/* Revenue Chart */}
        <div className="a-card">
          <div className="a-card-header">
            <div className="a-card-title">📈 Doanh thu 7 ngày</div>
            <span style={{ fontSize: 13, color: 'var(--a-text-muted)' }}>{fmt(stats.monthRevenue)} tháng này</span>
          </div>
          <div className="a-card-body">
            <div className="a-chart-placeholder">
              {dailyRevenue.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div
                    className="a-chart-bar"
                    style={{ height: `${Math.max(8, (d.revenue / maxRevenue) * 160)}px`, width: '100%' }}
                    data-val={d.revenue >= 1000 ? (d.revenue/1000).toFixed(0)+'k' : d.revenue}
                    title={`${d.date}: ${fmt(d.revenue)}`}
                  />
                  <span style={{ fontSize: 10, color: 'var(--a-text-muted)' }}>
                    {new Date(d.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Order Status Pie */}
        <div className="a-card">
          <div className="a-card-header">
            <div className="a-card-title">🥧 Trạng thái đơn hàng</div>
          </div>
          <div className="a-card-body">
            {ordersByStatus.map(s => {
              const cfg = STATUS_MAP[s.status] || { label: s.status, cls: 'a-badge-gray' };
              const pct = stats.totalOrders > 0 ? (s.count / stats.totalOrders * 100).toFixed(1) : 0;
              return (
                <div key={s.status} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                    <span className={`a-badge ${cfg.cls}`}>{cfg.label}</span>
                    <span style={{ fontWeight: 600 }}>{s.count} ({pct}%)</span>
                  </div>
                  <div style={{ height: 6, background: '#f0f2f5', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--a-primary)', borderRadius: 3, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="a-grid-3">
        {/* Recent Orders */}
        <div className="a-card">
          <div className="a-card-header">
            <div className="a-card-title">🛒 Đơn hàng gần nhất</div>
            <Link to="/admin/orders" className="a-btn a-btn-outline a-btn-sm">Xem tất cả</Link>
          </div>
          <div className="a-table-wrap">
            <table className="a-table">
              <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {recentOrders.map(o => {
                  const cfg = STATUS_MAP[o.status] || { label: o.status, cls: 'a-badge-gray' };
                  return (
                    <tr key={o.id}>
                      <td><Link to={`/admin/orders`} style={{ color: 'var(--a-primary)', fontWeight: 600 }}>{o.code}</Link></td>
                      <td>{o.customer_name}</td>
                      <td style={{ fontWeight: 600 }}>{fmt(o.total)}</td>
                      <td><span className={`a-badge ${cfg.cls}`}>{cfg.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="a-card">
          <div className="a-card-header">
            <div className="a-card-title">🏆 Sản phẩm bán chạy</div>
          </div>
          <div className="a-card-body" style={{ padding: '12px 20px' }}>
            {topProducts.map((p, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', paddingBottom: 12, marginBottom: 12, borderBottom: i < topProducts.length-1 ? '1px solid #f0f2f5' : 'none' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : '#cd7f32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{i+1}</div>
                <img src={p.image} alt={p.name} style={{ width: 36, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--a-text-muted)' }}>Đã bán: <strong>{p.sold}</strong></div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--a-primary)', flexShrink: 0 }}>{fmt(p.revenue)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
