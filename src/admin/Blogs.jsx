import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const EMPTY = { title:'', slug:'', excerpt:'', content:'', author:'', category:'', image:'', is_published:true };
const CATS = ['Kỹ Năng Sống','Tâm Lý Học','Cảm Hứng','Thiếu Nhi','Kinh Doanh','Văn Học','Phát Triển Bản Thân'];

export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.getBlogs({ page, limit: 12 })
      .then(r => { setBlogs(r.data); setTotal(r.total); setTotalPages(r.totalPages); })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const setField = (k, v) => setModal(m => ({...m, data:{...m.data, [k]:v}}));

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      if (modal.mode==='add') await api.createBlog(modal.data);
      else await api.updateBlog(modal.data.id, modal.data);
      setModal(null); load();
    } catch (err) { alert('Lỗi: '+err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa bài viết này?')) return;
    await api.deleteBlog(id).catch(e => alert(e.message));
    load();
  };

  return (
    <div>
      <div className="a-page-header">
        <div>
          <div className="a-page-title">✍️ Blog</div>
          <div className="a-page-subtitle">Tổng {total} bài viết</div>
        </div>
        <button className="a-btn a-btn-primary" onClick={() => setModal({mode:'add', data:{...EMPTY}})}>
          ＋ Viết bài mới
        </button>
      </div>

      <div className="a-card">
        <div className="a-table-wrap">
          {loading ? <div style={{padding:40,textAlign:'center'}}>⏳...</div> : (
            <table className="a-table">
              <thead><tr><th>Ảnh</th><th>Tiêu đề</th><th>Tác giả</th><th>Danh mục</th><th>Lượt xem</th><th>Trạng thái</th><th>Ngày tạo</th><th>Hành động</th></tr></thead>
              <tbody>
                {blogs.length===0 ? (
                  <tr><td colSpan={8}><div className="a-empty"><div className="a-empty-icon">📝</div><h3>Chưa có bài viết nào</h3></div></td></tr>
                ) : blogs.map(b => (
                  <tr key={b.id}>
                    <td><img src={b.image} alt="" style={{width:64,height:40,objectFit:'cover',borderRadius:6}} onError={e => e.target.src='https://via.placeholder.com/64x40'} /></td>
                    <td>
                      <div style={{fontWeight:600,maxWidth:280,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{b.title}</div>
                      <div style={{fontSize:11,color:'var(--a-text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:280}}>{b.excerpt}</div>
                    </td>
                    <td>{b.author || '—'}</td>
                    <td><span className="a-badge a-badge-blue">{b.category || '—'}</span></td>
                    <td>{b.view_count || 0}</td>
                    <td><span className={`a-badge ${b.is_published ? 'a-badge-green' : 'a-badge-gray'}`}>{b.is_published ? '✅ Đã đăng' : '📝 Nháp'}</span></td>
                    <td style={{fontSize:12,color:'var(--a-text-muted)'}}>{new Date(b.created_at).toLocaleDateString('vi-VN')}</td>
                    <td>
                      <div className="a-actions">
                        <button className="a-btn a-btn-outline a-btn-icon a-btn-sm" onClick={() => setModal({mode:'edit',data:{...b,is_published:!!b.is_published}})}>✏️</button>
                        <button className="a-btn a-btn-danger a-btn-icon a-btn-sm" onClick={() => handleDelete(b.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {totalPages>1 && (
          <div className="a-pagination">
            <span className="a-pagination-info">Hiển thị {blogs.length}/{total}</span>
            <div className="a-pager">
              <button className="a-page-btn" onClick={() => setPage(p=>p-1)} disabled={page<=1}>←</button>
              {Array.from({length:Math.min(5,totalPages)},(_,i)=>i+1).map(n=><button key={n} className={`a-page-btn ${page===n?'active':''}`} onClick={()=>setPage(n)}>{n}</button>)}
              <button className="a-page-btn" onClick={() => setPage(p=>p+1)} disabled={page>=totalPages}>→</button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <div className="a-modal-overlay" onClick={e => e.target===e.currentTarget && setModal(null)}>
          <div className="a-modal a-modal-lg">
            <div className="a-modal-header">
              <div className="a-modal-title">{modal.mode==='add' ? '➕ Viết bài mới' : '✏️ Chỉnh sửa bài viết'}</div>
              <button className="a-modal-close" onClick={() => setModal(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="a-modal-body">
                <div className="a-form-grid">
                  <div className="a-field a-form-full">
                    <label className="a-label">Tiêu đề *</label>
                    <input className="a-input" value={modal.data.title} onChange={e => setField('title',e.target.value)} required />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Slug</label>
                    <input className="a-input" value={modal.data.slug} onChange={e => setField('slug',e.target.value)} placeholder="tu-dong-tao" />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Danh mục</label>
                    <select className="a-select-full" value={modal.data.category} onChange={e => setField('category',e.target.value)}>
                      <option value="">-- Chọn --</option>
                      {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="a-field">
                    <label className="a-label">Tác giả</label>
                    <input className="a-input" value={modal.data.author} onChange={e => setField('author',e.target.value)} />
                  </div>
                  <div className="a-field">
                    <label className="a-label">URL Ảnh bìa</label>
                    <input className="a-input" value={modal.data.image} onChange={e => setField('image',e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="a-field a-form-full">
                    <label className="a-label">Tóm tắt</label>
                    <textarea className="a-textarea" value={modal.data.excerpt} onChange={e => setField('excerpt',e.target.value)} rows="2" />
                  </div>
                  <div className="a-field a-form-full">
                    <label className="a-label">Nội dung</label>
                    <textarea className="a-textarea" value={modal.data.content} onChange={e => setField('content',e.target.value)} rows="6" />
                  </div>
                  <div className="a-field">
                    <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                      <input type="checkbox" checked={modal.data.is_published} onChange={e => setField('is_published',e.target.checked)} />
                      <span className="a-label" style={{textTransform:'none',fontSize:13}}>✅ Xuất bản ngay</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="a-modal-footer">
                <button type="button" className="a-btn a-btn-outline" onClick={() => setModal(null)}>Hủy</button>
                <button type="submit" className="a-btn a-btn-primary" disabled={saving}>{saving?'⏳...':'💾 Lưu bài viết'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
