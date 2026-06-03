import { useState, useEffect } from 'react';
import { api } from './api';
import './admin.css';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // States for Editing/Adding
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    banner_image: '',
    bg_color: '',
    start_date: '',
    end_date: '',
    is_active: 1,
    items: []
  });
  
  // Search products inside modal
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCampaigns();
    fetchProducts();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        setCampaigns(await res.json());
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi tải danh sách chiến dịch');
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

  const loadCampaignDetail = async (campaign) => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns/${campaign.id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        const detail = await res.json();
        setFormData({
          name: detail.name,
          slug: detail.slug,
          banner_image: detail.banner_image || '',
          bg_color: detail.bg_color || '',
          start_date: detail.start_date || '',
          end_date: detail.end_date || '',
          is_active: detail.is_active,
          items: detail.items || []
        });
        setEditingCampaign(campaign);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const isNew = !editingCampaign || editingCampaign.id === 'new';
      const url = !isNew
        ? `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns/${editingCampaign.id}`
        : `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns`;
      
      const method = !isNew ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message || 'Lưu thành công');
        setEditingCampaign(null);
        setFormData({ name: '', slug: '', banner_image: '', bg_color: '', start_date: '', end_date: '', is_active: 1, items: [] });
        fetchCampaigns();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Lỗi lưu dữ liệu');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa chiến dịch này?')) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) fetchCampaigns();
    } catch (err) {
      console.error(err);
    }
  };

  const addProductToCampaign = (product) => {
    if (formData.items.find(i => i.product_id === product.id)) return;
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        product_id: product.id,
        product_name: product.name,
        product_image: product.image,
        original_price: product.price,
        campaign_price: product.price, // Default same
        discount_percent: 0
      }]
    }));
  };

  const removeProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(i => i.product_id !== productId)
    }));
  };

  const updateItem = (productId, field, value) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.product_id === productId) {
          const newItem = { ...item, [field]: value };
          // Auto calculate related field
          if (field === 'discount_percent') {
            newItem.campaign_price = Math.round(item.original_price * (1 - value / 100));
          } else if (field === 'campaign_price') {
            newItem.discount_percent = Math.round((1 - value / item.original_price) * 100);
          }
          return newItem;
        }
        return item;
      })
    }));
  };

  const searchedProducts = searchQuery.trim() 
    ? products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, margin: 0 }}>Quản lý Chiến dịch</h2>
          <p style={{ color: '#666', margin: '8px 0 0' }}>Quản lý các chương trình Flash Sale, Khuyến mãi sinh nhật...</p>
        </div>
        {!editingCampaign && (
          <button className="a-btn a-btn-primary" onClick={() => setEditingCampaign({ id: 'new' })}>
            <span style={{ fontSize: 18, marginRight: 4 }}>+</span> Thêm Chiến Dịch Mới
          </button>
        )}
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      {editingCampaign ? (
        <div className="a-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
          <div className="a-card-header">
            <h3 className="a-card-title">{editingCampaign.id === 'new' ? '✨ Tạo Chiến Dịch Mới' : '✏️ Chỉnh Sửa Chiến Dịch'}</h3>
            <button className="a-btn a-btn-outline" onClick={() => { setEditingCampaign(null); setFormData({ name: '', slug: '', banner_image: '', bg_color: '', start_date: '', end_date: '', is_active: 1, items: [] }); }}>
              ← Quay lại
            </button>
          </div>

          <form onSubmit={handleSave} className="camp-modal-body" style={{ flex: 1, overflow: 'hidden' }}>
            {/* SIDEBAR: GENERAL INFO */}
            <div className="camp-modal-sidebar">
              <div className="camp-section-title">Thông tin chung</div>
              <div className="a-form-grid" style={{ gridTemplateColumns: '1fr', gap: 20 }}>
                <div className="a-field">
                  <label className="a-label">Tên chiến dịch *</label>
                  <input required className="a-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="VD: Flash Sale Tháng 5" />
                </div>
                <div className="a-field">
                  <label className="a-label">Slug URL *</label>
                  <input required className="a-input" value={formData.slug} onChange={e => setFormData({...formData, slug: e.target.value})} placeholder="VD: flash-sale" />
                </div>
                <div className="a-field">
                  <label className="a-label">Màu nền (tuỳ chọn)</label>
                  <input className="a-input" value={formData.bg_color} onChange={e => setFormData({...formData, bg_color: e.target.value})} placeholder="VD: #d32f2f" />
                </div>
                <div className="a-field">
                  <label className="a-label">Banner Image URL (tuỳ chọn)</label>
                  <input className="a-input" value={formData.banner_image} onChange={e => setFormData({...formData, banner_image: e.target.value})} placeholder="https://..." />
                  {formData.banner_image && (
                    <img src={formData.banner_image} alt="Banner Preview" style={{ width: '100%', height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }} />
                  )}
                </div>
                <div className="a-field">
                  <label className="a-label">Trạng thái</label>
                  <select className="a-select-full" value={formData.is_active} onChange={e => setFormData({...formData, is_active: Number(e.target.value)})}>
                    <option value={1}>🟢 Đang chạy (Hiển thị)</option>
                    <option value={0}>⚪ Tạm dừng (Ẩn)</option>
                  </select>
                </div>
                
                <div style={{ marginTop: 12 }}>
                  <button type="submit" className="a-btn a-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 14, fontSize: 15 }}>
                    💾 {editingCampaign.id === 'new' ? 'Tạo Chiến Dịch' : 'Lưu Thay Đổi'}
                  </button>
                </div>
              </div>
            </div>

            {/* MAIN: PRODUCTS */}
            <div className="camp-modal-main">
              <div className="product-picker-container">
                <div className="camp-section-title">Tìm & Thêm Sản Phẩm</div>
                <div className="product-picker-search">
                  <span style={{ fontSize: 18, marginRight: 8 }}>🔍</span>
                  <input 
                    type="text" 
                    placeholder="Gõ tên sách để tìm kiếm nhanh..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                
                {searchQuery.trim() && (
                  <div className="picker-grid">
                    {searchedProducts.slice(0, 12).map(p => {
                      const isAdded = formData.items.find(i => i.product_id === p.id);
                      return (
                        <div key={p.id} className="picker-item" onClick={() => !isAdded && addProductToCampaign(p)} style={{ opacity: isAdded ? 0.5 : 1, cursor: isAdded ? 'default' : 'pointer' }}>
                          <img src={p.image} alt={p.name} />
                          <div className="picker-item-info">
                            <div className="picker-item-name">{p.name}</div>
                            <div className="picker-item-price">{p.price?.toLocaleString()}đ</div>
                          </div>
                          {!isAdded ? (
                            <div style={{ color: 'var(--a-primary)', fontWeight: 'bold', fontSize: 18 }}>+</div>
                          ) : (
                            <div style={{ color: 'green', fontSize: 14 }}>✔️</div>
                          )}
                        </div>
                      );
                    })}
                    {searchedProducts.length === 0 && <div style={{ color: '#888', padding: 10 }}>Không tìm thấy sách nào</div>}
                  </div>
                )}
              </div>

              <div className="selected-products-list">
                <div className="camp-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Danh Sách Sản Phẩm Khuyến Mãi</span>
                  <span className="a-badge a-badge-blue">{formData.items.length} sản phẩm</span>
                </div>
                
                {formData.items.map((item) => (
                  <div key={item.product_id} className="sp-row">
                    <img src={item.product_image} alt={item.product_name} className="sp-image" />
                    <div className="sp-info">
                      <div className="sp-name">{item.product_name}</div>
                      <div className="sp-original-price">Giá gốc: {item.original_price?.toLocaleString()}đ</div>
                    </div>
                    <div className="sp-inputs">
                      <div className="sp-input-group">
                        <label>Giảm (%)</label>
                        <input 
                          type="number" 
                          value={item.discount_percent}
                          onChange={e => {
                            let val = Number(e.target.value);
                            if (val > 100) val = 100;
                            if (val < 0) val = 0;
                            updateItem(item.product_id, 'discount_percent', val);
                          }}
                          min={0} max={100}
                        />
                      </div>
                      <span style={{ fontWeight: 'bold', color: '#ccc', alignSelf: 'flex-end', paddingBottom: 10 }}>=</span>
                      <div className="sp-input-group">
                        <label>Giá KM (đ)</label>
                        <input 
                          type="number" 
                          className="sp-price"
                          value={item.campaign_price}
                          onChange={e => {
                            let val = Number(e.target.value);
                            if (val < 0) val = 0;
                            if (val > item.original_price) val = item.original_price;
                            updateItem(item.product_id, 'campaign_price', val);
                          }}
                        />
                      </div>
                    </div>
                    <div className="sp-actions">
                      <button type="button" onClick={() => removeProduct(item.product_id)} className="menu-del-btn" style={{ width: 32, height: 32, fontSize: 14 }}>
                        ✖
                      </button>
                    </div>
                  </div>
                ))}
                
                {formData.items.length === 0 && (
                  <div className="a-empty" style={{ background: '#fff', borderRadius: 12, border: '1px dashed #ccc' }}>
                    <div className="a-empty-icon">🛒</div>
                    <h3>Chưa có sản phẩm nào</h3>
                    <p>Sử dụng thanh tìm kiếm phía trên để thêm sách vào chiến dịch.</p>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
      ) : (
        <div className="campaign-grid">
          {campaigns.map(camp => (
            <div key={camp.id} className="camp-card">
              <div className="camp-card-banner" style={{ 
                backgroundImage: camp.banner_image ? `url(${camp.banner_image})` : 'none',
                backgroundColor: camp.bg_color || 'var(--a-primary)'
              }}>
                <div className="camp-card-banner-overlay"></div>
                <div className={`camp-card-status ${camp.is_active ? 'active' : 'inactive'}`}>
                  {camp.is_active ? 'Đang chạy' : 'Tạm dừng'}
                </div>
              </div>
              
              <div className="camp-card-content">
                <h3 className="camp-card-title">{camp.name}</h3>
                <div className="camp-card-slug">
                  <i>🔗</i> /collections/{camp.slug}
                </div>
                
                <div className="camp-card-footer">
                  <div className="camp-card-stats">
                    📦 Xem chi tiết
                  </div>
                  <div className="camp-card-actions">
                    <button className="camp-btn-edit" onClick={() => loadCampaignDetail(camp)}>Sửa</button>
                    <button className="camp-btn-del" onClick={() => handleDelete(camp.id)}>Xóa</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {campaigns.length === 0 && (
            <div className="a-empty" style={{ gridColumn: '1 / -1' }}>
              <div className="a-empty-icon">🎪</div>
              <h3>Chưa có chiến dịch nào</h3>
              <p>Bấm nút "Thêm Chiến Dịch Mới" ở góc phải để tạo chiến dịch đầu tiên.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
