import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const EMPTY_USER = { name:'', email:'', password:'', role:'customer', phone:'' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    api.getUsers(params)
      .then(r => { setUsers(r.data); setTotal(r.total); setTotalPages(r.totalPages); })
      .finally(() => setLoading(false));
  }, [page, search, roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id) => {
    setToggling(id);
    try { await api.toggleUserActive(id); load(); }
    catch (err) { alert(err.message); }
    finally { setToggling(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa người dùng này? Thao tác không thể hoàn tác.')) return;
    await api.deleteUser(id).catch(e => alert(e.message));
    load();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') await api.createUser(modal.data);
      else await api.updateUser(modal.data.id, modal.data);
      setModal(null); load();
    } catch (err) { alert('Lỗi: ' + err.message); }
    finally { setSaving(false); }
  };

  const setField = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  return (
    <div>
      <div className="a-page-header">
        <div>
          <div className="a-page-title">👥 Người dùng</div>
          <div className="a-page-subtitle">Tổng {total} tài khoản</div>
        </div>
        <button className="a-btn a-btn-primary" onClick={() => setModal({ mode:'add', data:{...EMPTY_USER} })}>
          ＋ Thêm người dùng
        </button>
      </div>

      <div className="a-card">
        <div className="a-card-header">
          <div className="a-filter-bar">
            <div className="a-search-wrap">
              <span>🔍</span>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm tên, email..." />
            </div>
            <select className="a-select" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
              <option value="">Tất cả vai trò</option>
              <option value="admin">Admin</option>
              <option value="customer">Khách hàng</option>
            </select>
          </div>
        </div>

        <div className="a-table-wrap">
          {loading ? <div style={{ padding:40, textAlign:'center' }}>⏳ Đang tải...</div> : (
            <table className="a-table">
              <thead><tr><th>Người dùng</th><th>Vai trò</th><th>Điện thoại</th><th>Đơn hàng</th><th>Trạng thái</th><th>Ngày tạo</th><th>Hành động</th></tr></thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={7}><div className="a-empty"><div className="a-empty-icon">👤</div><h3>Không có người dùng</h3></div></td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--a-primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700 }}>{u.name[0]}</div>
                        <div>
                          <div style={{ fontWeight:600 }}>{u.name}</div>
                          <div style={{ fontSize:11, color:'var(--a-text-muted)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`a-badge ${u.role==='admin' ? 'a-badge-red' : 'a-badge-blue'}`}>{u.role==='admin' ? '👑 Admin' : '👤 Khách hàng'}</span></td>
                    <td>{u.phone || '—'}</td>
                    <td><span className="a-badge a-badge-blue">{u.order_count} đơn</span></td>
                    <td>
                      <button
                        className={`a-badge ${u.is_active ? 'a-badge-green' : 'a-badge-red'}`}
                        style={{ cursor:'pointer', border:'none', fontFamily:'inherit', fontWeight:700 }}
                        onClick={() => handleToggle(u.id)} disabled={toggling===u.id}
                      >
                        {u.is_active ? '✅ Hoạt động' : '🚫 Bị khóa'}
                      </button>
                    </td>
                    <td style={{ fontSize:12, color:'var(--a-text-muted)' }}>{new Date(u.created_at).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <div className="a-actions">
                        <button className="a-btn a-btn-outline a-btn-icon a-btn-sm" onClick={() => setModal({ mode:'edit', data:{...u} })} title="Sửa">✏️</button>
                        {u.role !== 'admin' && <button className="a-btn a-btn-danger a-btn-icon a-btn-sm" onClick={() => handleDelete(u.id)} title="Xóa">🗑️</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {totalPages > 1 && (
          <div className="a-pagination">
            <span className="a-pagination-info">Hiển thị {users.length}/{total}</span>
            <div className="a-pager">
              <button className="a-page-btn" onClick={() => setPage(p=>p-1)} disabled={page<=1}>←</button>
              {Array.from({length: Math.min(5, totalPages)}, (_,i) => i+1).map(n => (
                <button key={n} className={`a-page-btn ${page===n?'active':''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="a-page-btn" onClick={() => setPage(p=>p+1)} disabled={page>=totalPages}>→</button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="a-modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="a-modal">
            <div className="a-modal-header">
              <div className="a-modal-title">{modal.mode==='add' ? '➕ Thêm người dùng' : '✏️ Chỉnh sửa người dùng'}</div>
              <button className="a-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="a-modal-body">
                <div className="a-form-grid">
                  <div className="a-field"><label className="a-label">Họ tên *</label><input className="a-input" value={modal.data.name} onChange={e => setField('name', e.target.value)} required /></div>
                  <div className="a-field"><label className="a-label">Email *</label><input className="a-input" type="email" value={modal.data.email} onChange={e => setField('email', e.target.value)} required /></div>
                  {modal.mode==='add' && <div className="a-field"><label className="a-label">Mật khẩu *</label><input className="a-input" type="password" value={modal.data.password} onChange={e => setField('password', e.target.value)} required /></div>}
                  <div className="a-field"><label className="a-label">Điện thoại</label><input className="a-input" value={modal.data.phone} onChange={e => setField('phone', e.target.value)} /></div>
                  <div className="a-field"><label className="a-label">Vai trò</label>
                    <select className="a-select-full" value={modal.data.role} onChange={e => setField('role', e.target.value)}>
                      <option value="customer">Khách hàng</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="a-modal-footer">
                <button type="button" className="a-btn a-btn-outline" onClick={() => setModal(null)}>Hủy</button>
                <button type="submit" className="a-btn a-btn-primary" disabled={saving}>{saving ? '⏳...' : '💾 Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
