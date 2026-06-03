import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const EMPTY = { name:'', slug:'', price:'', original_price:'', discount:'', stock:'', category_id:'', publisher:'', author:'', description:'', image:'', is_new:false, is_bestseller:false, sku:'' };

function fmt(n) { return Number(n||0).toLocaleString('vi-VN') + '₫'; }

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [sort, setSort] = useState('created_at_desc');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | {mode:'add'|'edit', data}
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15, sort };
    if (search) params.search = search;
    if (catFilter) params.category = catFilter;
    api.getProducts(params)
      .then(r => { setProducts(r.data); setTotal(r.total); setTotalPages(r.totalPages); })
      .finally(() => setLoading(false));
  }, [page, search, catFilter, sort]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.getCategories().then(setCategories); }, []);

  const openAdd = () => setModal({ mode: 'add', data: { ...EMPTY } });
  const openEdit = (p) => setModal({ mode: 'edit', data: { ...p, is_new: !!p.is_new, is_bestseller: !!p.is_bestseller } });
  const closeModal = () => setModal(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') await api.createProduct(modal.data);
      else await api.updateProduct(modal.data.id, modal.data);
      closeModal();
      load();
    } catch (err) { alert('Lỗi: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    setDeleting(id);
    try { await api.deleteProduct(id); load(); }
    catch (err) { alert('Lỗi: ' + err.message); }
    finally { setDeleting(null); }
  };

  const handleReseed = async () => {
    if (!confirm('Hành động này sẽ XÓA TOÀN BỘ sản phẩm hiện tại và khôi phục lại 500 sản phẩm gốc. Bạn có chắc chắn?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products/reseed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi khôi phục');
      alert(data.message);
      load();
    } catch (err) {
      alert('Lỗi: ' + err.message);
      setLoading(false);
    }
  };

  const setField = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  return (
    <div>
      <div className="a-page-header">
        <div>
          <div className="a-page-title">📦 Sản phẩm</div>
          <div className="a-page-subtitle">Tổng cộng {total} sản phẩm</div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="a-btn a-btn-outline" onClick={handleReseed} title="Khôi phục lại 500 sản phẩm gốc">
            🔄 Khôi phục dữ liệu gốc
          </button>
          <button className="a-btn a-btn-primary" onClick={openAdd} id="add-product-btn">
            ＋ Thêm sản phẩm
          </button>
        </div>
      </div>

      <div className="a-card">
        <div className="a-card-header">
          <div className="a-filter-bar">
            <div className="a-search-wrap">
              <span>🔍</span>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Tìm kiếm..." id="prod-search" />
            </div>
            <select className="a-select" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1); }}>
              <option value="">Tất cả danh mục</option>
              {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <select className="a-select" value={sort} onChange={e => setSort(e.target.value)}>
              <option value="created_at_desc">Mới nhất</option>
              <option value="price_asc">Giá thấp nhất</option>
              <option value="price_desc">Giá cao nhất</option>
              <option value="discount_desc">Giảm giá nhiều nhất</option>
              <option value="stock_asc">Sắp hết hàng</option>
            </select>
          </div>
        </div>

        <div className="a-table-wrap">
          {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Đang tải...</div> : (
            <table className="a-table">
              <thead>
                <tr>
                  <th>Sản phẩm</th><th>Danh mục</th><th>Giá</th>
                  <th>Tồn kho</th><th>Giảm giá</th><th>Badges</th><th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr><td colSpan={7}><div className="a-empty"><div className="a-empty-icon">📭</div><h3>Không có sản phẩm</h3></div></td></tr>
                ) : products.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <img src={p.image} alt="" className="prod-img" onError={e => e.target.src = 'https://via.placeholder.com/44x52'} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--a-text-muted)' }}>SKU: {p.sku || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className="a-badge a-badge-blue">{p.category_name || '—'}</span></td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--a-primary)' }}>{fmt(p.price)}</div>
                      {p.original_price > 0 && <div style={{ fontSize: 11, textDecoration: 'line-through', color: 'var(--a-text-muted)' }}>{fmt(p.original_price)}</div>}
                    </td>
                    <td>
                      <span className={`a-badge ${p.stock <= 0 ? 'a-badge-red' : p.stock <= 5 ? 'a-badge-orange' : 'a-badge-green'}`}>
                        {p.stock} sp
                      </span>
                    </td>
                    <td>{p.discount > 0 ? <span className="a-badge a-badge-red">-{p.discount}%</span> : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {!!p.is_new && <span className="a-badge a-badge-green">Mới</span>}
                        {!!p.is_bestseller && <span className="a-badge a-badge-orange">Hot</span>}
                      </div>
                    </td>
                    <td>
                      <div className="a-actions">
                        <button className="a-btn a-btn-outline a-btn-icon a-btn-sm" onClick={() => openEdit(p)} title="Sửa">✏️</button>
                        <button className="a-btn a-btn-danger a-btn-icon a-btn-sm" onClick={() => handleDelete(p.id)} disabled={deleting === p.id} title="Xóa">🗑️</button>
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
            <span className="a-pagination-info">Hiển thị {products.length} / {total} sản phẩm</span>
            <div className="a-pager">
              <button className="a-page-btn" onClick={() => setPage(p => p-1)} disabled={page<=1}>←</button>
              {Array.from({length: Math.min(5, totalPages)}, (_, i) => i+1).map(n => (
                <button key={n} className={`a-page-btn ${page===n ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
              ))}
              <button className="a-page-btn" onClick={() => setPage(p => p+1)} disabled={page>=totalPages}>→</button>
            </div>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {modal && (
        <div className="a-modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="a-modal a-modal-lg">
            <div className="a-modal-header">
              <div className="a-modal-title">{modal.mode === 'add' ? '➕ Thêm sản phẩm mới' : '✏️ Chỉnh sửa sản phẩm'}</div>
              <button className="a-modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="a-modal-body">
                <div className="a-form-grid">
                  <div className="a-field a-form-full">
                    <label className="a-label">Tên sản phẩm *</label>
                    <input className="a-input" value={modal.data.name} onChange={e => setField('name', e.target.value)} required />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Slug URL</label>
                    <input className="a-input" value={modal.data.slug} onChange={e => setField('slug', e.target.value)} placeholder="tu-dong-tao-neu-trong" />
                  </div>
                  <div className="a-field">
                    <label className="a-label">SKU</label>
                    <input className="a-input" value={modal.data.sku} onChange={e => setField('sku', e.target.value)} />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Giá bán (₫) *</label>
                    <input className="a-input" type="number" value={modal.data.price} onChange={e => setField('price', +e.target.value)} required min="0" />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Giá gốc (₫)</label>
                    <input className="a-input" type="number" value={modal.data.original_price} onChange={e => setField('original_price', +e.target.value)} min="0" />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Giảm giá (%)</label>
                    <input className="a-input" type="number" value={modal.data.discount} onChange={e => setField('discount', +e.target.value)} min="0" max="100" />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Tồn kho</label>
                    <input className="a-input" type="number" value={modal.data.stock} onChange={e => setField('stock', +e.target.value)} min="0" />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Danh mục</label>
                    <select className="a-select-full" value={modal.data.category_id} onChange={e => setField('category_id', e.target.value)}>
                      <option value="">-- Chọn danh mục --</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="a-field">
                    <label className="a-label">Tác giả</label>
                    <input className="a-input" value={modal.data.author} onChange={e => setField('author', e.target.value)} />
                  </div>
                  <div className="a-field">
                    <label className="a-label">Nhà xuất bản</label>
                    <input className="a-input" value={modal.data.publisher} onChange={e => setField('publisher', e.target.value)} />
                  </div>
                  <div className="a-field a-form-full">
                    <label className="a-label">URL Ảnh bìa</label>
                    <input className="a-input" value={modal.data.image} onChange={e => setField('image', e.target.value)} placeholder="https://..." />
                  </div>
                  <div className="a-field a-form-full">
                    <label className="a-label">Mô tả</label>
                    <textarea className="a-textarea" value={modal.data.description} onChange={e => setField('description', e.target.value)} rows="3" />
                  </div>
                  <div className="a-field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={modal.data.is_new} onChange={e => setField('is_new', e.target.checked)} />
                      <span className="a-label" style={{ textTransform: 'none', fontSize: 13, marginBottom: 0 }}>🆕 Sách mới</span>
                    </label>
                  </div>
                  <div className="a-field">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={modal.data.is_bestseller} onChange={e => setField('is_bestseller', e.target.checked)} />
                      <span className="a-label" style={{ textTransform: 'none', fontSize: 13, marginBottom: 0 }}>🔥 Bán chạy</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="a-modal-footer">
                <button type="button" className="a-btn a-btn-outline" onClick={closeModal}>Hủy</button>
                <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : '💾 Lưu sản phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
