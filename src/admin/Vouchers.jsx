import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const EMPTY = {
  code: '', name: '', type: 'percent', value: '', min_order_value: '',
  max_discount: '', usage_limit: '', is_active: true,
  start_date: '', end_date: '', description: '',
};

function fmt(n) { return Number(n || 0).toLocaleString('vi-VN') + '₫'; }
function fmtValue(v) {
  if (v.type === 'percent') return `-${v.value}%`;
  return `-${fmt(v.value)}`;
}

function isExpired(v) {
  if (!v.end_date) return false;
  return new Date().toISOString().split('T')[0] > v.end_date;
}
function isNotStarted(v) {
  if (!v.start_date) return false;
  return new Date().toISOString().split('T')[0] < v.start_date;
}

function getStatusInfo(v) {
  if (!v.is_active) return { label: 'Vô hiệu', cls: 'a-badge-gray' };
  if (isExpired(v)) return { label: 'Hết hạn', cls: 'a-badge-red' };
  if (isNotStarted(v)) return { label: 'Chưa bắt đầu', cls: 'a-badge-orange' };
  if (v.usage_limit > 0 && v.used_count >= v.usage_limit) return { label: 'Hết lượt', cls: 'a-badge-red' };
  return { label: 'Đang hoạt động', cls: 'a-badge-green' };
}

export default function Vouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (filter !== '') params.is_active = filter;
    api.getVouchers(params).then(setVouchers).finally(() => setLoading(false));
  }, [search, filter]);

  useEffect(() => { load(); }, [load]);

  const setField = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') await api.createVoucher(modal.data);
      else await api.updateVoucher(modal.data.id, modal.data);
      setModal(null);
      load();
    } catch (err) { alert('Lỗi: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    setToggling(id);
    try { await api.toggleVoucher(id); load(); }
    catch (err) { alert(err.message); }
    finally { setToggling(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa voucher này?')) return;
    await api.deleteVoucher(id).catch(e => alert(e.message));
    load();
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const code = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    setField('code', code);
  };

  const usagePercent = (v) => v.usage_limit > 0 ? Math.min(100, Math.round(v.used_count / v.usage_limit * 100)) : 0;

  return (
    <div>
      <div className="a-page-header">
        <div>
          <div className="a-page-title">🎟️ Voucher & Khuyến mãi</div>
          <div className="a-page-subtitle">Quản lý mã giảm giá cho khách hàng</div>
        </div>
        <button className="a-btn a-btn-primary" onClick={() => setModal({ mode: 'add', data: { ...EMPTY } })} id="add-voucher-btn">
          ＋ Tạo voucher mới
        </button>
      </div>

      {/* Summary cards */}
      <div className="a-stats-grid" style={{ marginBottom: 20 }}>
        {[
          { icon: '🎟️', label: 'Tổng voucher', value: vouchers.length, bg: '#fff5f5', iBg: '#ffcdd2' },
          { icon: '✅', label: 'Đang hoạt động', value: vouchers.filter(v => v.is_active && !isExpired(v)).length, bg: '#e8f5e9', iBg: '#c8e6c9' },
          { icon: '⏰', label: 'Sắp hết hạn', value: vouchers.filter(v => { if (!v.end_date || !v.is_active) return false; const days = (new Date(v.end_date) - new Date()) / 86400000; return days >= 0 && days <= 7; }).length, bg: '#fff3e0', iBg: '#ffe0b2' },
          { icon: '📊', label: 'Tổng lượt dùng', value: vouchers.reduce((s, v) => s + v.used_count, 0), bg: '#e3f2fd', iBg: '#bbdefb' },
        ].map((s, i) => (
          <div key={i} className="a-stat-card" style={{ background: s.bg }}>
            <div className="a-stat-icon" style={{ background: s.iBg }}>{s.icon}</div>
            <div className="a-stat-info">
              <div className="a-stat-value">{s.value}</div>
              <div className="a-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="a-card">
        <div className="a-card-header">
          <div className="a-filter-bar">
            <div className="a-search-wrap">
              <span>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã, tên voucher..." />
            </div>
            <select className="a-select" value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="1">Đang hoạt động</option>
              <option value="0">Vô hiệu</option>
            </select>
          </div>
        </div>

        <div className="a-table-wrap">
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Đang tải...</div> : (
            <table className="a-table">
              <thead>
                <tr>
                  <th>Mã Voucher</th>
                  <th>Tên chương trình</th>
                  <th>Loại giảm</th>
                  <th>Điều kiện</th>
                  <th>Lượt dùng</th>
                  <th>Thời hạn</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr><td colSpan={8}><div className="a-empty"><div className="a-empty-icon">🎟️</div><h3>Chưa có voucher nào</h3></div></td></tr>
                ) : vouchers.map(v => {
                  const status = getStatusInfo(v);
                  const pct = usagePercent(v);
                  return (
                    <tr key={v.id}>
                      {/* Code */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code style={{ background: '#fff5f5', color: 'var(--a-primary)', padding: '4px 10px', borderRadius: 6, fontSize: 13, fontWeight: 800, border: '1.5px dashed #ffcdd2', letterSpacing: 1 }}>
                            {v.code}
                          </code>
                          <button className="a-btn a-btn-outline a-btn-icon a-btn-sm" title="Copy" onClick={() => { navigator.clipboard.writeText(v.code); }}>📋</button>
                        </div>
                      </td>
                      {/* Name */}
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.name}</div>
                        {v.description && <div style={{ fontSize: 11, color: 'var(--a-text-muted)' }}>{v.description}</div>}
                      </td>
                      {/* Type + Value */}
                      <td>
                        <span className={`a-badge ${v.type === 'percent' ? 'a-badge-purple' : 'a-badge-orange'}`}>
                          {v.type === 'percent' ? `📊 -${v.value}%` : `💰 -${fmt(v.value)}`}
                        </span>
                        {v.max_discount > 0 && (
                          <div style={{ fontSize: 11, color: 'var(--a-text-muted)', marginTop: 2 }}>
                            Tối đa {fmt(v.max_discount)}
                          </div>
                        )}
                      </td>
                      {/* Condition */}
                      <td>
                        {v.min_order_value > 0
                          ? <span style={{ fontSize: 12 }}>Từ {fmt(v.min_order_value)}</span>
                          : <span className="a-badge a-badge-green" style={{ fontSize: 11 }}>Không giới hạn</span>
                        }
                      </td>
                      {/* Usage */}
                      <td style={{ minWidth: 120 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                              <span>{v.used_count}</span>
                              <span style={{ color: 'var(--a-text-muted)' }}>/{v.usage_limit || '∞'}</span>
                            </div>
                            {v.usage_limit > 0 && (
                              <div style={{ height: 5, background: '#f0f2f5', borderRadius: 3 }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 90 ? '#c62828' : 'var(--a-primary)', borderRadius: 3, transition: 'width 0.5s' }} />
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Date */}
                      <td style={{ fontSize: 12 }}>
                        {v.start_date && <div>Từ: {v.start_date}</div>}
                        {v.end_date && <div style={{ color: isExpired(v) ? '#c62828' : 'inherit' }}>Đến: {v.end_date}</div>}
                        {!v.start_date && !v.end_date && <span style={{ color: 'var(--a-text-muted)' }}>Không giới hạn</span>}
                      </td>
                      {/* Status */}
                      <td>
                        <span className={`a-badge ${status.cls}`}>{status.label}</span>
                      </td>
                      {/* Actions */}
                      <td>
                        <div className="a-actions">
                          <button
                            className={`a-btn a-btn-sm ${v.is_active ? 'a-btn-outline' : 'a-btn-success'}`}
                            onClick={() => handleToggle(v.id)} disabled={toggling === v.id}
                            title={v.is_active ? 'Tắt' : 'Bật'}
                          >
                            {v.is_active ? '⏸️' : '▶️'}
                          </button>
                          <button className="a-btn a-btn-outline a-btn-icon a-btn-sm" onClick={() => setModal({ mode: 'edit', data: { ...v } })}>✏️</button>
                          <button className="a-btn a-btn-danger a-btn-icon a-btn-sm" onClick={() => handleDelete(v.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Voucher Modal */}
      {modal && (
        <div className="a-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="a-modal a-modal-lg">
            <div className="a-modal-header">
              <div className="a-modal-title">{modal.mode === 'add' ? '➕ Tạo voucher mới' : '✏️ Chỉnh sửa voucher'}</div>
              <button className="a-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="a-modal-body">
                <div className="a-form-grid">
                  {/* Code */}
                  <div className="a-field">
                    <label className="a-label">Mã Voucher *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input className="a-input" value={modal.data.code} onChange={e => setField('code', e.target.value.toUpperCase())} required style={{ flex: 1, letterSpacing: 2, fontWeight: 700 }} placeholder="VD: SALE20" />
                      <button type="button" className="a-btn a-btn-outline a-btn-sm" onClick={generateCode} title="Tạo ngẫu nhiên">🎲</button>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="a-field">
                    <label className="a-label">Tên chương trình *</label>
                    <input className="a-input" value={modal.data.name} onChange={e => setField('name', e.target.value)} required placeholder="Khuyến mãi mùa hè..." />
                  </div>

                  {/* Type */}
                  <div className="a-field">
                    <label className="a-label">Loại giảm giá</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[['percent', '📊 Phần trăm (%)'], ['fixed', '💰 Cố định (₫)']].map(([val, lbl]) => (
                        <button key={val} type="button"
                          onClick={() => setField('type', val)}
                          className={`a-btn ${modal.data.type === val ? 'a-btn-primary' : 'a-btn-outline'}`}
                          style={{ flex: 1 }}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Value */}
                  <div className="a-field">
                    <label className="a-label">Giá trị giảm {modal.data.type === 'percent' ? '(%)' : '(₫)'} *</label>
                    <input className="a-input" type="number" value={modal.data.value} onChange={e => setField('value', e.target.value)} required min="1" max={modal.data.type === 'percent' ? 100 : undefined} placeholder={modal.data.type === 'percent' ? 'VD: 20' : 'VD: 50000'} />
                  </div>

                  {/* Min order */}
                  <div className="a-field">
                    <label className="a-label">Giá trị đơn tối thiểu (₫)</label>
                    <input className="a-input" type="number" value={modal.data.min_order_value} onChange={e => setField('min_order_value', e.target.value)} min="0" placeholder="0 = Không giới hạn" />
                  </div>

                  {/* Max discount */}
                  <div className="a-field">
                    <label className="a-label">Giảm tối đa (₫)</label>
                    <input className="a-input" type="number" value={modal.data.max_discount} onChange={e => setField('max_discount', e.target.value)} min="0" placeholder="0 = Không giới hạn" />
                  </div>

                  {/* Usage limit */}
                  <div className="a-field">
                    <label className="a-label">Giới hạn lượt dùng</label>
                    <input className="a-input" type="number" value={modal.data.usage_limit} onChange={e => setField('usage_limit', e.target.value)} min="0" placeholder="0 = Không giới hạn" />
                  </div>

                  {/* Start date */}
                  <div className="a-field">
                    <label className="a-label">Ngày bắt đầu</label>
                    <input className="a-input" type="date" value={modal.data.start_date} onChange={e => setField('start_date', e.target.value)} />
                  </div>

                  {/* End date */}
                  <div className="a-field">
                    <label className="a-label">Ngày kết thúc</label>
                    <input className="a-input" type="date" value={modal.data.end_date} onChange={e => setField('end_date', e.target.value)} />
                  </div>

                  {/* Description */}
                  <div className="a-field a-form-full">
                    <label className="a-label">Mô tả</label>
                    <textarea className="a-textarea" value={modal.data.description} onChange={e => setField('description', e.target.value)} rows="2" placeholder="Điều khoản áp dụng..." />
                  </div>

                  {/* Active toggle */}
                  <div className="a-field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={modal.data.is_active} onChange={e => setField('is_active', e.target.checked)} />
                      <span className="a-label" style={{ textTransform: 'none', fontSize: 13 }}>✅ Kích hoạt ngay</span>
                    </label>
                  </div>

                  {/* Preview */}
                  {modal.data.code && modal.data.value && (
                    <div className="a-field a-form-full">
                      <label className="a-label">Xem trước</label>
                      <div style={{ background: 'linear-gradient(135deg, #d32f2f, #7b1fa2)', borderRadius: 12, padding: '16px 20px', color: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontSize: 32 }}>🎟️</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2 }}>{modal.data.code}</div>
                          <div style={{ opacity: 0.9, fontSize: 13, marginTop: 2 }}>{modal.data.name || 'Tên chương trình'}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, fontSize: 22 }}>
                            {modal.data.type === 'percent' ? `-${modal.data.value}%` : `-${Number(modal.data.value||0).toLocaleString('vi-VN')}₫`}
                          </div>
                          {modal.data.min_order_value > 0 && (
                            <div style={{ opacity: 0.8, fontSize: 11 }}>Đơn từ {Number(modal.data.min_order_value).toLocaleString('vi-VN')}₫</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="a-modal-footer">
                <button type="button" className="a-btn a-btn-outline" onClick={() => setModal(null)}>Hủy</button>
                <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : '💾 Lưu voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
