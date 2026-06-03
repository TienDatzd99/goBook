import { useState, useEffect } from 'react';
import './admin.css';

export default function MenuSettings() {
  const [menuItems, setMenuItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchMenu();
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/campaigns`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data);
      }
    } catch (err) {
      console.error('Error fetching campaigns', err);
    }
  };

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/settings/header_menu`);
      if (res.ok) {
        const data = await res.json();
        if (data) {
          setMenuItems(data);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi tải danh sách menu');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/settings/header_menu`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({ data: menuItems })
      });
      
      if (res.ok) {
        setSuccess('Đã lưu cấu hình menu thành công!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Lỗi khi lưu cấu hình');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    setMenuItems([
      ...menuItems, 
      { id: Date.now().toString(), label: '', url: '', icon: '', highlight_class: '', is_visible: true }
    ]);
  };

  const handleAddCampaignMenu = (e) => {
    const slug = e.target.value;
    if (!slug) return;
    
    const camp = campaigns.find(c => c.slug === slug);
    if (!camp) return;

    setMenuItems([
      ...menuItems,
      { 
        id: Date.now().toString(), 
        label: camp.name, 
        url: `/collections/${camp.slug}`, 
        icon: '🔥', 
        highlight_class: 'nav-link-sale',
        is_visible: true
      }
    ]);
    e.target.value = '';
  };

  const handleRemove = (id) => {
    setMenuItems(menuItems.filter(item => item.id !== id));
  };

  const handleChange = (id, field, value) => {
    setMenuItems(menuItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const moveItem = (index, direction) => {
    if (index + direction < 0 || index + direction >= menuItems.length) return;
    const newItems = [...menuItems];
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setMenuItems(newItems);
  };

  if (loading) return <div className="admin-page">Đang tải...</div>;

  return (
    <div className="admin-page">
      <div className="admin-header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, margin: 0 }}>Quản lý Menu (Header Navigation)</h2>
          <p style={{ color: '#666', marginTop: 8 }}>Tùy chỉnh thanh điều hướng màu trắng xuất hiện ở đầu trang</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : '💾 Lưu Thay Đổi'}
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}
      {success && <div className="alert success">{success}</div>}

      <div className="admin-card">
        <div className="menu-list-container">
          {menuItems.map((item, index) => (
            <div key={item.id} className="menu-item-card" style={{ opacity: item.is_visible === false ? 0.6 : 1, background: item.is_visible === false ? '#fafafa' : '#fff' }}>
              <div className="menu-item-drag">
                <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0}>▲</button>
                <button type="button" onClick={() => moveItem(index, 1)} disabled={index === menuItems.length - 1}>▼</button>
              </div>
              
              <div className="menu-item-content">
                <div className="menu-input-wrapper">
                  <label className="menu-input-label">Icon</label>
                  <input 
                    type="text" 
                    className="menu-input"
                    value={item.icon} 
                    onChange={e => handleChange(item.id, 'icon', e.target.value)}
                    placeholder="🎂"
                    style={{ textAlign: 'center' }}
                  />
                </div>
                
                <div className="menu-input-wrapper">
                  <label className="menu-input-label">Tên hiển thị</label>
                  <input 
                    type="text" 
                    className="menu-input"
                    value={item.label} 
                    onChange={e => handleChange(item.id, 'label', e.target.value)}
                    placeholder="VD: Sách mới"
                  />
                </div>
                
                <div className="menu-input-wrapper">
                  <label className="menu-input-label">Đường dẫn (URL)</label>
                  <input 
                    type="text" 
                    className="menu-input"
                    value={item.url} 
                    onChange={e => handleChange(item.id, 'url', e.target.value)}
                    placeholder="VD: /danh-muc/sach-moi"
                  />
                </div>
                
                <div className="menu-input-wrapper">
                  <label className="menu-input-label">Kiểu nổi bật</label>
                  <select 
                    className="menu-input menu-select"
                    value={item.highlight_class} 
                    onChange={e => handleChange(item.id, 'highlight_class', e.target.value)}
                  >
                    <option value="">Bình thường (Đen)</option>
                    <option value="nav-link-hot">Đỏ nổi bật</option>
                    <option value="nav-link-sale">Cam Flash Sale</option>
                  </select>
                </div>
              </div>
              
              <div className="menu-item-actions">
                <button 
                  type="button" 
                  onClick={() => handleChange(item.id, 'is_visible', item.is_visible === false ? true : false)}
                  title={item.is_visible !== false ? 'Ẩn menu này' : 'Hiện menu này'}
                  style={{ marginRight: 8, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' }}
                >
                  {item.is_visible !== false ? '👁️' : '🔒'}
                </button>
                <button type="button" className="menu-del-btn" onClick={() => handleRemove(item.id)}>
                  🗑️
                </button>
              </div>
            </div>
          ))}

          {menuItems.length === 0 && (
            <div className="a-empty">
              <div className="a-empty-icon">📂</div>
              <h3>Chưa có mục menu nào</h3>
              <p>Hãy thêm các mục menu để hiển thị trên thanh điều hướng</p>
            </div>
          )}
        </div>

        <div className="menu-add-zone">
          <button type="button" className="menu-add-btn" onClick={handleAdd}>
            <span style={{ fontSize: 18 }}>+</span> Thêm mục menu tự do
          </button>
          
          <select 
            className="menu-add-select"
            onChange={handleAddCampaignMenu}
            defaultValue=""
          >
            <option value="" disabled>+ Thêm từ chiến dịch...</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.slug}>✨ {c.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="admin-card" style={{ marginTop: 24 }}>
        <h4>💡 Hướng dẫn cấu hình đường dẫn (URL)</h4>
        <ul style={{ paddingLeft: 20, color: '#555', fontSize: 14, lineHeight: 1.6 }}>
          <li>Trang chủ: <code>/</code></li>
          <li>Đến một danh mục: <code>/danh-muc/slug-danh-muc</code> (Ví dụ: <code>/danh-muc/van-hoc</code>)</li>
          <li>Đến một chiến dịch (Flash Sale, Sinh Nhật...): <code>/collections/slug-chien-dich</code> (Ví dụ: <code>/collections/flash-sale</code>)</li>
          <li>Đến một trang blog: <code>/diem-sach</code></li>
          <li>Để trống icon nếu không muốn hiển thị hình ảnh trước chữ. Có thể dùng emoji (🎂, ⚡, 🌟, 🔥) làm icon.</li>
        </ul>
      </div>
    </div>
  );
}
