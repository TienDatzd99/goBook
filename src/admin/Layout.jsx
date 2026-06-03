import { useState, useEffect } from 'react';
import { useAdminAuth } from './AdminAuthContext';
import { api } from './api';

export default function Layout() {
  const [layout, setLayout] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [expandedSection, setExpandedSection] = useState(null);
  const [products, setProducts] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [campaignItems, setCampaignItems] = useState({}); // { 'slug': [products] }
  const [searchQuery, setSearchQuery] = useState('');
  const { admin } = useAdminAuth();

  // Helper to get auto products from the fetched `products` pool
  const getAutoProducts = (sectionId) => {
    switch (sectionId) {
      case 'flash_sale': return products.filter(p => p.discount >= 25 && p.category_slug !== 'do-choi');
      case 'new_books': return products.filter(p => p.is_new && p.category_slug !== 'do-choi');
      case 'best_sellers': return products.filter(p => p.is_bestseller && p.category_slug !== 'do-choi');
      case 'combos': return products.filter(p => p.category_slug === 'combo');
      case 'toys': return products.filter(p => p.category_slug === 'do-choi');
      default: return [];
    }
  };

  useEffect(() => {
    fetchLayout();
    fetchProducts();
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (!data.error) setCampaigns(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLayout = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/settings/homepage`);
      const data = await res.json();
      if (res.ok) {
        const parsed = data.map(item => ({
          ...item,
          selected_items: typeof item.selected_items === 'string' ? JSON.parse(item.selected_items || '[]') : (item.selected_items || []),
          item_count: item.item_count === undefined ? 10 : item.item_count,
          is_manual: item.is_manual || 0
        }));
        setLayout(parsed);
        // Tải trước dữ liệu campaign items cho các khối
        parsed.forEach(item => {
          if (item.section_id.startsWith('campaign_') || item.section_id === 'flash_sale') {
            const slug = item.section_id === 'flash_sale' ? 'flash-sale' : item.section_id.replace('campaign_', '');
            fetchCampaignItems(slug);
          }
        });
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi khi tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.getProducts({ limit: 1000 });
      setProducts(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCampaignItems = async (slug) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/collections/${slug}`);
      const data = await res.json();
      if (data && data.products) {
        setCampaignItems(prev => ({ ...prev, [slug]: data.products }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateSection = (index, field, value) => {
    const newLayout = [...layout];
    newLayout[index][field] = value;
    setLayout(newLayout);
  };

  const toggleVisibility = (index) => {
    updateSection(index, 'is_visible', layout[index].is_visible ? 0 : 1);
  };

  const moveSectionUp = (index) => {
    if (index === 0) return;
    const newLayout = [...layout];
    const temp = newLayout[index];
    newLayout[index] = newLayout[index - 1];
    newLayout[index - 1] = temp;
    setLayout(newLayout);
  };

  const moveSectionDown = (index) => {
    if (index === layout.length - 1) return;
    const newLayout = [...layout];
    const temp = newLayout[index];
    newLayout[index] = newLayout[index + 1];
    newLayout[index + 1] = temp;
    setLayout(newLayout);
  };

  // Switch Mode (Auto <-> Manual)
  const setMode = (index, isManual) => {
    const newLayout = [...layout];
    newLayout[index].is_manual = isManual ? 1 : 0;
    
    // If switching to manual and it's empty, we might optionally prefill it
    if (isManual && newLayout[index].selected_items.length === 0) {
      const item = newLayout[index];
      const isCampaignBlock = item.section_id.startsWith('campaign_') || item.section_id === 'flash_sale';
      const campaignSlug = item.section_id === 'flash_sale' ? 'flash-sale' : item.section_id.replace('campaign_', '');
      const sourceList = isCampaignBlock ? (campaignItems[campaignSlug] || []) : getAutoProducts(item.section_id);
      
      const autoBooks = sourceList.slice(0, newLayout[index].item_count);
      newLayout[index].selected_items = autoBooks.map(p => ({ slug: p.slug, is_visible: true }));
    }
    
    setLayout(newLayout);
  };

  // Product Selection Handlers
  const addProductToSection = (sectionIndex, product) => {
    const newLayout = [...layout];
    const items = newLayout[sectionIndex].selected_items;
    if (!items.find(s => s.slug === product.slug)) {
      items.push({ slug: product.slug, is_visible: true });
      setLayout(newLayout);
    }
  };

  const removeProductFromSection = (sectionIndex, slug) => {
    const newLayout = [...layout];
    newLayout[sectionIndex].selected_items = newLayout[sectionIndex].selected_items.filter(s => s.slug !== slug);
    setLayout(newLayout);
  };

  const toggleProductVisibility = (sectionIndex, slug) => {
    const newLayout = [...layout];
    const item = newLayout[sectionIndex].selected_items.find(s => s.slug === slug);
    if (item) {
      item.is_visible = !item.is_visible;
      setLayout(newLayout);
    }
  };

  const moveProductUp = (sectionIndex, itemIndex) => {
    if (itemIndex === 0) return;
    const newLayout = [...layout];
    const items = [...newLayout[sectionIndex].selected_items];
    const temp = items[itemIndex];
    items[itemIndex] = items[itemIndex - 1];
    items[itemIndex - 1] = temp;
    newLayout[sectionIndex].selected_items = items;
    setLayout(newLayout);
  };

  const moveProductDown = (sectionIndex, itemIndex) => {
    const newLayout = [...layout];
    const items = [...newLayout[sectionIndex].selected_items];
    if (itemIndex === items.length - 1) return;
    const temp = items[itemIndex];
    items[itemIndex] = items[itemIndex + 1];
    items[itemIndex + 1] = temp;
    newLayout[sectionIndex].selected_items = items;
    setLayout(newLayout);
  };

  const deleteSection = (index) => {
    if (!window.confirm('Bạn có chắc muốn xóa khối này khỏi trang chủ?')) return;
    const newLayout = [...layout];
    newLayout.splice(index, 1);
    setLayout(newLayout);
  };

  const addCampaignSection = (campaign) => {
    const newLayout = [...layout];
    newLayout.push({
      section_id: `campaign_${campaign.slug}`,
      name: campaign.name,
      is_visible: 1,
      order_index: newLayout.length,
      item_count: 10,
      selected_items: [],
      is_manual: 1 // Default to manual for campaigns so it's easier to manage
    });
    setLayout(newLayout);
    fetchCampaignItems(campaign.slug);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = layout.map(item => ({
        ...item,
        selected_items: JSON.stringify(item.selected_items)
      }));

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/settings/homepage`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ layout: payload })
      });
      const data = await res.json();
      if (res.ok) {
        const parsed = data.map(item => ({
          ...item,
          selected_items: typeof item.selected_items === 'string' ? JSON.parse(item.selected_items || '[]') : (item.selected_items || []),
          item_count: item.item_count === undefined ? 10 : item.item_count,
          is_manual: item.is_manual || 0
        }));
        setLayout(parsed);
        setSuccess('Đã lưu cấu hình trang chủ');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Lỗi lưu cấu hình');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Đang tải cấu hình...</div>;

  return (
    <div className="admin-page layout-admin">
      <style>{`
        .layout-admin .admin-card {
          margin-bottom: 16px;
          border: 1px solid #eaeaea;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
        .layout-header-row {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          background: #fdfdfd;
          border-bottom: 1px solid #f0f0f0;
          transition: background 0.2s;
        }
        .layout-header-row:hover {
          background: #f9f9f9;
        }
        .layout-inactive {
          opacity: 0.6;
          background: #fafafa;
        }
        .layout-idx {
          width: 40px;
          font-weight: bold;
          color: #666;
        }
        .layout-title {
          flex: 1;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }
        .layout-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .layout-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #ddd;
          background: #fff;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .layout-btn:hover:not(:disabled) {
          border-color: #c92127;
          color: #c92127;
        }
        .layout-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .layout-btn.primary {
          background: #c92127;
          color: white;
          border-color: #c92127;
        }
        .layout-body {
          padding: 20px;
          background: #fff;
          border-top: 1px solid #eee;
        }
        .config-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }
        .config-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          width: 100px;
        }
        .mode-toggle {
          display: inline-flex;
          background: #f5f5f5;
          padding: 4px;
          border-radius: 6px;
        }
        .mode-btn {
          padding: 6px 16px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          color: #666;
        }
        .mode-btn.active {
          background: #fff;
          color: #c92127;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .product-picker-container {
          display: flex;
          gap: 24px;
        }
        .product-search {
          flex: 1;
        }
        .search-input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          margin-bottom: 12px;
        }
        .search-results {
          max-height: 300px;
          overflow-y: auto;
          border: 1px solid #eee;
          border-radius: 6px;
        }
        .search-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 12px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
        }
        .search-item:hover {
          background: #f9f9f9;
        }
        .search-item img {
          width: 40px;
          height: 40px;
          object-fit: cover;
          border-radius: 4px;
        }
        .search-item-title {
          font-size: 13px;
          font-weight: 500;
          line-height: 1.4;
        }
        .selected-products {
          flex: 1;
          background: #fafafa;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #eee;
        }
        .selected-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }
        .selected-item.hidden {
          opacity: 0.5;
          background: #f9f9f9;
        }
        .selected-item-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .selected-item-info img {
          width: 30px;
          height: 30px;
          object-fit: cover;
          border-radius: 4px;
        }
        .selected-item-title {
          font-size: 13px;
          width: 150px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .action-btns {
          display: flex;
          gap: 4px;
        }
        .action-btns button {
          padding: 4px 8px;
          border: 1px solid #ddd;
          background: #fff;
          cursor: pointer;
          border-radius: 4px;
          font-size: 12px;
        }
        .action-btns button:hover {
          background: #f5f5f5;
        }
        .empty-text {
          color: #888;
          font-size: 13px;
          text-align: center;
          padding: 20px;
        }
        .auto-books-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 12px;
          margin-top: 12px;
        }
        .auto-book-card {
          border: 1px solid #eee;
          padding: 8px;
          border-radius: 6px;
          background: #fff;
          text-align: center;
        }
        .auto-book-card img {
          width: 100%;
          height: 120px;
          object-fit: cover;
          border-radius: 4px;
          margin-bottom: 8px;
        }
        .auto-book-card .title {
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: #333;
        }
      `}</style>

      <div className="admin-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, margin: 0, color: '#333' }}>Quản lý Trang chủ</h2>
          <p style={{ color: '#666', marginTop: 8 }}>Sắp xếp các khối nội dung và tuỳ chỉnh sách hiển thị</p>
        </div>
        <button className="layout-btn primary" onClick={handleSave} disabled={saving} style={{ fontSize: 15, padding: '10px 20px' }}>
          {saving ? '⏳ Đang lưu...' : '💾 Lưu Thay Đổi'}
        </button>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 16, padding: 12, background: '#ffebee', color: '#c62828', borderRadius: 6 }}>{error}</div>}
      {success && <div className="alert success" style={{ marginBottom: 16, padding: 12, background: '#e8f5e9', color: '#2e7d32', borderRadius: 6 }}>{success}</div>}

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <select 
          className="config-input" 
          style={{ width: 250 }}
          onChange={(e) => {
            if (e.target.value) {
              const camp = campaigns.find(c => c.id.toString() === e.target.value);
              if (camp && !layout.find(l => l.section_id === `campaign_${camp.slug}`)) {
                addCampaignSection(camp);
              } else {
                alert('Chiến dịch này đã tồn tại trên trang chủ!');
              }
              e.target.value = '';
            }
          }}
        >
          <option value="">+ Thêm khối chiến dịch vào trang chủ...</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="layout-list">
        {layout.map((item, index) => {
          // Sections without specific products (like Newsletter or Blog) should not show product picker
          const isBookSection = !['newsletter', 'blog'].includes(item.section_id);

          return (
            <div key={item.section_id} className={`admin-card ${item.is_visible ? '' : 'layout-inactive'}`}>
              <div className="layout-header-row">
                <div className="layout-idx">#{index + 1}</div>
                <div className="layout-title">
                  {item.name}
                  {!item.is_visible && <span style={{ fontSize: 12, fontWeight: 'normal', color: '#d32f2f', marginLeft: 8 }}>(Đang ẩn)</span>}
                  {isBookSection && (
                    <span style={{ fontSize: 12, marginLeft: 8, padding: '2px 8px', borderRadius: 12, background: item.is_manual ? '#e3f2fd' : '#e8f5e9', color: item.is_manual ? '#1565c0' : '#2e7d32' }}>
                      {item.is_manual ? 'Thủ công' : 'Tự động'}
                    </span>
                  )}
                </div>
                <div className="layout-actions">
                  <button 
                    className="layout-btn"
                    onClick={() => toggleVisibility(index)}
                  >
                    {item.is_visible ? '👁️ Ẩn' : '✅ Hiện'}
                  </button>
                  <button 
                    className="layout-btn"
                    onClick={() => setExpandedSection(expandedSection === index ? null : index)}
                  >
                    {expandedSection === index ? '🔼 Thu gọn' : '⚙️ Tuỳ chỉnh'}
                  </button>
                  <button 
                    className="layout-btn" 
                    onClick={() => moveSectionUp(index)}
                    disabled={index === 0}
                  >⬆️</button>
                  <button 
                    className="layout-btn" 
                    onClick={() => moveSectionDown(index)}
                    disabled={index === layout.length - 1}
                  >⬇️</button>
                  {item.section_id.startsWith('campaign_') && (
                    <button 
                      className="layout-btn" 
                      onClick={() => deleteSection(index)}
                      style={{ color: '#c62828', borderColor: '#ffcdd2', background: '#ffebee' }}
                      title="Xóa khối chiến dịch này"
                    >🗑️</button>
                  )}
                </div>
              </div>

              {expandedSection === index && (
                <div className="layout-body">
                  <div className="config-row">
                    <label style={{ fontWeight: 500 }}>Số lượng tối đa:</label>
                    <input 
                      type="number" 
                      className="config-input"
                      value={item.item_count === undefined ? 10 : item.item_count}
                      onChange={(e) => updateSection(index, 'item_count', e.target.value === '' ? '' : parseInt(e.target.value))}
                      onBlur={(e) => { if(e.target.value === '' || parseInt(e.target.value) < 1) updateSection(index, 'item_count', 10) }}
                      min={1} max={50}
                    />
                    
                    {isBookSection && (
                      <div style={{ marginLeft: 'auto' }}>
                        <span style={{ marginRight: 12, fontSize: 14, color: '#666' }}>Chế độ hiển thị sách:</span>
                        <div className="mode-toggle">
                          <button 
                            className={`mode-btn ${!item.is_manual ? 'active' : ''}`}
                            onClick={() => setMode(index, false)}
                          >Tự động</button>
                          <button 
                            className={`mode-btn ${item.is_manual ? 'active' : ''}`}
                            onClick={() => setMode(index, true)}
                          >Thủ công</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isBookSection && (
                    <>
                      {!item.is_manual ? (
                        <div style={{ padding: 16, background: '#fafafa', borderRadius: 8, border: '1px solid #eee' }}>
                          <h4 style={{ fontSize: 14, margin: 0, color: '#444' }}>Xem trước Sách Tự Động</h4>
                          <p style={{ fontSize: 13, color: '#888', margin: '4px 0 12px 0' }}>Sách trong mục này sẽ tự động cập nhật khi có sách mới. Chuyển sang "Thủ công" để tự tay sắp xếp.</p>
                          <div className="auto-books-grid">
                            {(() => {
                              const isCampaignBlock = item.section_id.startsWith('campaign_') || item.section_id === 'flash_sale';
                              const campaignSlug = item.section_id === 'flash_sale' ? 'flash-sale' : item.section_id.replace('campaign_', '');
                              const sourceList = isCampaignBlock ? (campaignItems[campaignSlug] || []) : getAutoProducts(item.section_id);
                              
                              return sourceList.slice(0, item.item_count).map(p => (
                                <div key={p.id} className="auto-book-card">
                                  <img src={p.image} alt={p.name} />
                                  <div className="title" title={p.name}>{p.name}</div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      ) : (
                        <div className="product-picker-container">
                          <div className="product-search">
                            <h4 style={{ marginBottom: 12, fontSize: 14 }}>Tìm & Thêm sách</h4>
                            <input 
                              type="text" 
                              className="search-input"
                              placeholder="Nhập tên sách để tìm..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <div className="search-results">
                              {(() => {
                                const isCampaignBlock = item.section_id.startsWith('campaign_') || item.section_id === 'flash_sale';
                                const campaignSlug = item.section_id === 'flash_sale' ? 'flash-sale' : item.section_id.replace('campaign_', '');
                                
                                const sourceProducts = isCampaignBlock ? (campaignItems[campaignSlug] || []) : products;
                                
                                const searchedProducts = searchQuery.trim() 
                                  ? sourceProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                  : sourceProducts;

                                return (
                                  <>
                                    {searchQuery && searchedProducts.length === 0 && (
                                      <div className="empty-text">Không tìm thấy sách nào. {isCampaignBlock && 'Lưu ý: Chỉ tìm được sách đã thêm vào Chiến dịch này.'}</div>
                                    )}
                                    {!searchQuery && isCampaignBlock && sourceProducts.length === 0 && (
                                      <div className="empty-text">Chiến dịch này chưa có sách nào. Vui lòng thêm sách vào chiến dịch trước.</div>
                                    )}
                                    {searchedProducts.slice(0, 20).map(p => (
                                      <div key={p.id} className="search-item" onClick={() => addProductToSection(index, p)}>
                                        <img src={p.image} alt={p.name} />
                                        <div className="search-item-title">{p.name}</div>
                                        <div style={{ marginLeft: 'auto', color: '#c92127', fontSize: 16 }}>+</div>
                                      </div>
                                    ))}
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="selected-products">
                            <h4 style={{ marginBottom: 12, fontSize: 14 }}>Sách đã chọn ({item.selected_items.length})</h4>
                            {item.selected_items.length === 0 ? (
                              <div className="empty-text">Chưa có sách nào được chọn.</div>
                            ) : (
                              item.selected_items.map((selected, itemIndex) => {
                                // Fallback mapping due to older db having array of strings
                                const slug = typeof selected === 'string' ? selected : selected.slug;
                                const is_visible = typeof selected === 'string' ? true : selected.is_visible;

                                const product = products.find(p => p.slug === slug);
                                if (!product) return null;
                                
                                return (
                                  <div key={slug} className={`selected-item ${!is_visible ? 'hidden' : ''}`}>
                                    <div className="selected-item-info">
                                      <span style={{ color: '#888', fontWeight: 'bold', width: 20 }}>{itemIndex + 1}.</span>
                                      <img src={product.image} alt={product.name} />
                                      <div className="selected-item-title" title={product.name}>{product.name}</div>
                                    </div>
                                    <div className="action-btns">
                                      <button onClick={() => toggleProductVisibility(index, slug)} title={is_visible ? "Ẩn" : "Hiện"}>
                                        {is_visible ? '👁️' : '🔒'}
                                      </button>
                                      <button onClick={() => moveProductUp(index, itemIndex)} disabled={itemIndex === 0}>⬆️</button>
                                      <button onClick={() => moveProductDown(index, itemIndex)} disabled={itemIndex === item.selected_items.length - 1}>⬇️</button>
                                      <button onClick={() => removeProductFromSection(index, slug)} style={{ color: '#d32f2f' }}>❌</button>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
