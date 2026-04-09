import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const EMPTY = { name:'', slug:'', icon:'📚', sort_order:0 };

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.getCategories().then(setCats).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (k, v) => setModal(m => ({...m, data:{...m.data, [k]:v}}));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal.mode==='add') await api.createCategory(modal.data);
      else await api.updateCategory(modal.data.id, modal.data);
      setModal(null); load();
    } catch (err) { alert('Lỗi: '+err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa danh mục này?')) return;
    setDeleting(id);
    await api.deleteCategory(id).catch(e => alert(e.message));
    setDeleting(null); load();
  };

  const ICON_OPTIONS = ['📚','🧠','👶','📖','💼','👨‍👧','🧘','🎮','📦','🌍','🎨','🔬','⚽','🎵','💻','🍳','✈️','💰'];

  return (
    <div>
      <div className="a-page-header">
        <div>
          <div className="a-page-title">🗂️ Danh mục</div>
          <div className="a-page-subtitle">{cats.length} danh mục</div>
        </div>
        <button className="a-btn a-btn-primary" onClick={() => setModal({mode:'add', data:{...EMPTY}})}>
          ＋ Thêm danh mục
        </button>
      </div>

      <div className="a-card">
        <div className="a-table-wrap">
          {loading ? <div style={{padding:40,textAlign:'center'}}>⏳ Đang tải...</div> : (
            <table className="a-table">
              <thead><tr><th>Icon</th><th>Tên danh mục</th><th>Slug</th><th>Sản phẩm</th><th>Thứ tự</th><th>Hành động</th></tr></thead>
              <tbody>
                {cats.map(c => (
                  <tr key={c.id}>
                    <td style={{fontSize:28}}>{c.icon}</td>
                    <td style={{fontWeight:600}}>{c.name}</td>
                    <td><code style={{background:'#f0f2f5',padding:'2px 8px',borderRadius:4,fontSize:12}}>{c.slug}</code></td>
                    <td><span className="a-badge a-badge-blue">{c.product_count} sp</span></td>
                    <td>{c.sort_order}</td>
                    <td>
                      <div className="a-actions">
                        <button className="a-btn a-btn-outline a-btn-icon a-btn-sm" onClick={() => setModal({mode:'edit',data:{...c}})}>✏️</button>
                        <button className="a-btn a-btn-danger a-btn-icon a-btn-sm" onClick={() => handleDelete(c.id)} disabled={deleting===c.id}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && (
        <div className="a-modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="a-modal">
            <div className="a-modal-header">
              <div className="a-modal-title">{modal.mode==='add' ? '➕ Thêm danh mục' : '✏️ Sửa danh mục'}</div>
              <button className="a-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="a-modal-body">
                <div className="a-form-grid">
                  <div className="a-field a-form-full">
                    <label className="a-label">Tên danh mục *</label>
                    <input className="a-input" value={modal.data.name} onChange={e => setField('name',e.target.value)} required />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Slug *</label>
                    <input className="a-input" value={modal.data.slug} onChange={e => setField('slug',e.target.value)} required placeholder="ky-nang-song" />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Thứ tự hiển thị</label>
                    <input className="a-input" type="number" value={modal.data.sort_order} onChange={e => setField('sort_order',+e.target.value)} />
                  </div>
                  <div className="a-field a-form-full">
                    <label className="a-label">Icon (chọn)</label>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:4 }}>
                      {ICON_OPTIONS.map(ic => (
                        <button key={ic} type="button" onClick={() => setField('icon',ic)}
                          style={{ fontSize:24, padding:'6px 10px', borderRadius:8, border: modal.data.icon===ic ? '2px solid var(--a-primary)' : '2px solid transparent', background: modal.data.icon===ic ? '#fff5f5' : '#f0f2f5', cursor:'pointer', transition:'all 0.15s' }}>
                          {ic}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{fontSize:28}}>{modal.data.icon}</span>
                      <input className="a-input" value={modal.data.icon} onChange={e => setField('icon',e.target.value)} style={{width:100}} placeholder="emoji" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="a-modal-footer">
                <button type="button" className="a-btn a-btn-outline" onClick={() => setModal(null)}>Hủy</button>
                <button type="submit" className="a-btn a-btn-primary" disabled={saving}>{saving?'⏳...':'💾 Lưu'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
