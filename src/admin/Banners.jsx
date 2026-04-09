import { useState, useEffect, useCallback } from 'react';
import { api } from './api';

const POSITIONS = [
  { value: 'hero', label: '🖼️ Hero Slider (Trang chủ)', desc: 'Banner lớn trên cùng trang chủ' },
  { value: 'sidebar', label: '📌 Sidebar', desc: 'Banner bên phải trang' },
  { value: 'popup', label: '🪟 Popup', desc: 'Popup hiện khi vào trang' },
  { value: 'flash_sale', label: '⚡ Flash Sale', desc: 'Banner trong section Flash Sale' },
];

const BG_PRESETS = [
  { label: 'Đỏ - Tím', value: 'linear-gradient(135deg,#d32f2f 0%,#7b1fa2 100%)' },
  { label: 'Xanh dương', value: 'linear-gradient(135deg,#1565c0 0%,#0288d1 100%)' },
  { label: 'Cam - Vàng', value: 'linear-gradient(135deg,#e65100 0%,#f57f17 100%)' },
  { label: 'Xanh lá', value: 'linear-gradient(135deg,#2e7d32 0%,#43a047 100%)' },
  { label: 'Hồng', value: 'linear-gradient(135deg,#880e4f 0%,#e91e63 100%)' },
  { label: 'Indigo', value: 'linear-gradient(135deg,#1a237e 0%,#3949ab 100%)' },
];

const EMPTY = {
  title: '', subtitle: '', image: '', link: '/', position: 'hero',
  button_text: 'Xem ngay', bg_color: BG_PRESETS[0].value,
  sort_order: 0, is_active: true, start_date: '', end_date: '',
};

export default function Banners() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [posFilter, setPosFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [previewTab, setPreviewTab] = useState('form');

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (posFilter) params.position = posFilter;
    api.getBanners(params).then(setBanners).finally(() => setLoading(false));
  }, [posFilter]);

  useEffect(() => { load(); }, [load]);

  const setField = (k, v) => setModal(m => ({ ...m, data: { ...m.data, [k]: v } }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal.mode === 'add') await api.createBanner(modal.data);
      else await api.updateBanner(modal.data.id, modal.data);
      setModal(null);
      load();
    } catch (err) { alert('Lỗi: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    setToggling(id);
    try { await api.toggleBanner(id); load(); }
    catch (err) { alert(err.message); }
    finally { setToggling(null); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Xóa banner này?')) return;
    await api.deleteBanner(id).catch(e => alert(e.message));
    load();
  };

  const grouped = POSITIONS.reduce((acc, pos) => {
    acc[pos.value] = banners.filter(b => b.position === pos.value);
    return acc;
  }, {});

  const d = modal?.data;

  return (
    <div>
      <div className="a-page-header">
        <div>
          <div className="a-page-title">🖼️ Quản lý Quảng Cáo</div>
          <div className="a-page-subtitle">Banner, Popup, Flash Sale — {banners.length} ảnh quảng cáo</div>
        </div>
        <button className="a-btn a-btn-primary" onClick={() => { setModal({ mode: 'add', data: { ...EMPTY } }); setPreviewTab('form'); }} id="add-banner-btn">
          ＋ Thêm banner mới
        </button>
      </div>

      {/* Position filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className={`a-btn a-btn-sm ${posFilter === '' ? 'a-btn-primary' : 'a-btn-outline'}`} onClick={() => setPosFilter('')}>🗂️ Tất cả ({banners.length})</button>
        {POSITIONS.map(p => (
          <button key={p.value} className={`a-btn a-btn-sm ${posFilter === p.value ? 'a-btn-primary' : 'a-btn-outline'}`} onClick={() => setPosFilter(p.value)}>
            {p.label.split(' ')[0]} {p.label.split(' ').slice(1).join(' ')} ({(grouped[p.value]||[]).length})
          </button>
        ))}
      </div>

      {/* Grouped banner display */}
      {loading ? <div style={{ padding: 40, textAlign: 'center' }}>⏳ Đang tải...</div> : (
        (posFilter ? [POSITIONS.find(p => p.value === posFilter)] : POSITIONS).map(pos => {
          const items = grouped[pos.value] || [];
          return (
            <div key={pos.value} className="a-card" style={{ marginBottom: 16 }}>
              <div className="a-card-header">
                <div>
                  <div className="a-card-title">{pos.label}</div>
                  <div style={{ fontSize: 12, color: 'var(--a-text-muted)' }}>{pos.desc}</div>
                </div>
                <span className="a-badge a-badge-blue">{items.length} banner</span>
              </div>

              {items.length === 0 ? (
                <div className="a-empty" style={{ padding: '30px 20px' }}>
                  <div className="a-empty-icon">🖼️</div>
                  <h3>Chưa có banner nào</h3>
                  <button className="a-btn a-btn-outline a-btn-sm" style={{ marginTop: 8 }} onClick={() => { setModal({ mode: 'add', data: { ...EMPTY, position: pos.value } }); setPreviewTab('form'); }}>
                    ＋ Thêm banner cho vị trí này
                  </button>
                </div>
              ) : (
                <div style={{ padding: '12px 0' }}>
                  {/* Hero: show as large cards */}
                  {pos.value === 'hero' ? (
                    <div style={{ display: 'flex', gap: 12, padding: '0 20px', flexWrap: 'wrap' }}>
                      {items.map(b => (
                        <div key={b.id} style={{ flex: '1 1 300px', maxWidth: 400, borderRadius: 12, overflow: 'hidden', border: '2px solid var(--a-border)', position: 'relative' }}>
                          <div style={{ background: b.bg_color, height: 120, display: 'flex', alignItems: 'center', padding: '0 20px', position: 'relative', overflow: 'hidden' }}>
                            {b.image && <img src={b.image} alt="" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '50%', objectFit: 'cover', opacity: 0.3 }} />}
                            <div style={{ position: 'relative', color: '#fff' }}>
                              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{b.title}</div>
                              <div style={{ fontSize: 12, opacity: 0.85 }}>{b.subtitle}</div>
                              <div style={{ marginTop: 8, background: 'rgba(255,255,255,0.25)', borderRadius: 4, padding: '2px 10px', fontSize: 11, display: 'inline-block' }}>{b.button_text}</div>
                            </div>
                          </div>
                          <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 12, fontWeight: 600 }}>#{b.sort_order}</span>
                              <span className={`a-badge ${b.is_active ? 'a-badge-green' : 'a-badge-gray'}`}>{b.is_active ? '✅ Bật' : '⏸️ Tắt'}</span>
                              <span style={{ fontSize: 11, color: 'var(--a-text-muted)' }}>👆 {b.click_count}</span>
                            </div>
                            <div className="a-actions">
                              <button className={`a-btn a-btn-sm ${b.is_active ? 'a-btn-outline' : 'a-btn-success'}`} onClick={() => handleToggle(b.id)} disabled={toggling===b.id}>{b.is_active ? '⏸️' : '▶️'}</button>
                              <button className="a-btn a-btn-outline a-btn-icon a-btn-sm" onClick={() => { setModal({ mode: 'edit', data: { ...b } }); setPreviewTab('form'); }}>✏️</button>
                              <button className="a-btn a-btn-danger a-btn-icon a-btn-sm" onClick={() => handleDelete(b.id)}>🗑️</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Other positions: table view */
                    <div className="a-table-wrap">
                      <table className="a-table">
                        <thead><tr><th>Ảnh</th><th>Tiêu đề</th><th>Link</th><th>Thứ tự</th><th>Lượt click</th><th>Trạng thái</th><th>Hành động</th></tr></thead>
                        <tbody>
                          {items.map(b => (
                            <tr key={b.id}>
                              <td>
                                <div style={{ width: 80, height: 50, borderRadius: 6, overflow: 'hidden', background: b.bg_color }}>
                                  {b.image && <img src={b.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600 }}>{b.title}</div>
                                <div style={{ fontSize: 11, color: 'var(--a-text-muted)' }}>{b.subtitle}</div>
                              </td>
                              <td><code style={{ fontSize: 11, background: '#f0f2f5', padding: '2px 6px', borderRadius: 4 }}>{b.link}</code></td>
                              <td>{b.sort_order}</td>
                              <td>👆 {b.click_count}</td>
                              <td><span className={`a-badge ${b.is_active ? 'a-badge-green' : 'a-badge-gray'}`}>{b.is_active ? '✅ Bật' : '⏸️ Tắt'}</span></td>
                              <td>
                                <div className="a-actions">
                                  <button className={`a-btn a-btn-sm ${b.is_active ? 'a-btn-outline' : 'a-btn-success'}`} onClick={() => handleToggle(b.id)} disabled={toggling===b.id}>{b.is_active ? '⏸️' : '▶️'}</button>
                                  <button className="a-btn a-btn-outline a-btn-icon a-btn-sm" onClick={() => { setModal({ mode: 'edit', data: { ...b } }); setPreviewTab('form'); }}>✏️</button>
                                  <button className="a-btn a-btn-danger a-btn-icon a-btn-sm" onClick={() => handleDelete(b.id)}>🗑️</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Banner modal */}
      {modal && d && (
        <div className="a-modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="a-modal a-modal-lg">
            <div className="a-modal-header">
              <div className="a-modal-title">{modal.mode === 'add' ? '➕ Thêm banner mới' : '✏️ Chỉnh sửa banner'}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {['form', 'preview'].map(t => (
                  <button key={t} type="button" className={`a-btn a-btn-sm ${previewTab === t ? 'a-btn-primary' : 'a-btn-outline'}`} onClick={() => setPreviewTab(t)}>
                    {t === 'form' ? '📝 Form' : '👁️ Xem trước'}
                  </button>
                ))}
                <button className="a-modal-close" onClick={() => setModal(null)}>✕</button>
              </div>
            </div>
            <form onSubmit={handleSave}>
              <div className="a-modal-body">
                {previewTab === 'preview' ? (
                  /* LIVE PREVIEW */
                  <div>
                    <div style={{ background: d.bg_color, borderRadius: 12, height: 200, display: 'flex', alignItems: 'center', padding: '0 40px', position: 'relative', overflow: 'hidden', marginBottom: 16 }}>
                      {d.image && <img src={d.image} alt="" style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: '55%', objectFit: 'cover', opacity: 0.4 }} />}
                      <div style={{ position: 'relative', color: '#fff', maxWidth: '55%' }}>
                        <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 8, lineHeight: 1.2 }}>{d.title || 'Tiêu đề banner'}</div>
                        <div style={{ fontSize: 14, opacity: 0.9, marginBottom: 16 }}>{d.subtitle || 'Phụ đề...'}</div>
                        <button type="button" style={{ background: '#fff', color: '#333', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 700, fontSize: 14, cursor: 'default' }}>{d.button_text}</button>
                      </div>
                    </div>
                    <div style={{ background: '#f8f9fb', borderRadius: 8, padding: 14, fontSize: 13 }}>
                      <div style={{ marginBottom: 4 }}><strong>Vị trí:</strong> {POSITIONS.find(p => p.value === d.position)?.label}</div>
                      <div style={{ marginBottom: 4 }}><strong>Link:</strong> <code>{d.link}</code></div>
                      <div style={{ marginBottom: 4 }}><strong>Thứ tự:</strong> {d.sort_order}</div>
                      <div><strong>Trạng thái:</strong> <span className={`a-badge ${d.is_active ? 'a-badge-green' : 'a-badge-gray'}`}>{d.is_active ? 'Bật' : 'Tắt'}</span></div>
                    </div>
                  </div>
                ) : (
                  /* FORM */
                  <div className="a-form-grid">
                    <div className="a-field a-form-full">
                      <label className="a-label">Tiêu đề *</label>
                      <input className="a-input" value={d.title} onChange={e => setField('title', e.target.value)} required placeholder="VD: Flash Sale Cuối Tuần" />
                    </div>
                    <div className="a-field a-form-full">
                      <label className="a-label">Phụ đề</label>
                      <input className="a-input" value={d.subtitle} onChange={e => setField('subtitle', e.target.value)} placeholder="VD: Giảm đến 50% hàng ngàn đầu sách" />
                    </div>
                    <div className="a-field a-form-full">
                      <label className="a-label">URL Ảnh</label>
                      <input className="a-input" value={d.image} onChange={e => setField('image', e.target.value)} placeholder="https://images.unsplash.com/..." />
                    </div>
                    <div className="a-field">
                      <label className="a-label">Link đích</label>
                      <input className="a-input" value={d.link} onChange={e => setField('link', e.target.value)} placeholder="/danh-muc/ky-nang-song" />
                    </div>
                    <div className="a-field">
                      <label className="a-label">Nút CTA</label>
                      <input className="a-input" value={d.button_text} onChange={e => setField('button_text', e.target.value)} placeholder="Xem ngay" />
                    </div>
                    <div className="a-field">
                      <label className="a-label">Vị trí hiển thị</label>
                      <select className="a-select-full" value={d.position} onChange={e => setField('position', e.target.value)}>
                        {POSITIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </select>
                    </div>
                    <div className="a-field">
                      <label className="a-label">Thứ tự sắp xếp</label>
                      <input className="a-input" type="number" value={d.sort_order} onChange={e => setField('sort_order', parseInt(e.target.value))} min="0" />
                    </div>
                    <div className="a-field">
                      <label className="a-label">Ngày bắt đầu</label>
                      <input className="a-input" type="date" value={d.start_date || ''} onChange={e => setField('start_date', e.target.value)} />
                    </div>
                    <div className="a-field">
                      <label className="a-label">Ngày kết thúc</label>
                      <input className="a-input" type="date" value={d.end_date || ''} onChange={e => setField('end_date', e.target.value)} />
                    </div>
                    <div className="a-field a-form-full">
                      <label className="a-label">Màu nền</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                        {BG_PRESETS.map(bg => (
                          <button key={bg.value} type="button"
                            onClick={() => setField('bg_color', bg.value)}
                            style={{ width: 56, height: 32, borderRadius: 8, background: bg.value, border: d.bg_color === bg.value ? '3px solid #333' : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s' }}
                            title={bg.label}
                          />
                        ))}
                      </div>
                      <input className="a-input" value={d.bg_color} onChange={e => setField('bg_color', e.target.value)} placeholder="CSS gradient hoặc màu" />
                    </div>
                    <div className="a-field">
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={d.is_active} onChange={e => setField('is_active', e.target.checked)} />
                        <span className="a-label" style={{ textTransform: 'none', fontSize: 13 }}>✅ Kích hoạt</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
              <div className="a-modal-footer">
                <button type="button" className="a-btn a-btn-outline" onClick={() => setModal(null)}>Hủy</button>
                <button type="button" className="a-btn a-btn-outline" onClick={() => setPreviewTab(t => t === 'form' ? 'preview' : 'form')}>
                  {previewTab === 'form' ? '👁️ Xem trước' : '📝 Quay lại form'}
                </button>
                <button type="submit" className="a-btn a-btn-primary" disabled={saving}>
                  {saving ? '⏳ Đang lưu...' : '💾 Lưu banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
