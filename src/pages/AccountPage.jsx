import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { X, Star, AlertTriangle, Send, CheckCircle, MessageSquare } from 'lucide-react';
import './AccountPage.css';
import AddressDropdown from '../components/AddressDropdown';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;

const formatPrice = (price) => {
  return Number(price).toLocaleString('vi-VN') + ' đ';
};

const formatDate = (dateString) => {
  const d = new Date(dateString);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const statusMap = {
  'pending': { label: 'Chờ xác nhận', class: 'status-pending' },
  'confirmed': { label: 'Đã xác nhận', class: 'status-confirmed' },
  'shipping': { label: 'Đang vận chuyển', class: 'status-shipping' },
  'delivered': { label: 'Đã giao hàng', class: 'status-delivered' },
  'cancelled': { label: 'Đã hủy', class: 'status-cancelled' }
};

export default function AccountPage() {
  const { user, getToken, loading } = useAuth();
  const { addToast } = useCart();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/dang-nhap?redirect=/tai-khoan');
    }
  }, [user, loading, navigate]);

  if (loading || !user) return <div className="account-page"><div style={{padding: '50px', textAlign: 'center', width: '100%'}}>Đang tải...</div></div>;

  return (
    <div className="account-page">
      <div className="account-sidebar">
        <div className="account-user-info">
          <div className="account-avatar">
            {user.avatar ? <img src={user.avatar} alt="avatar" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} /> : user.name.charAt(0).toUpperCase()}
          </div>
          <div className="account-user-name">{user.name}</div>
          <div className="account-user-email">{user.email}</div>
        </div>
        <ul className="account-menu">
          <li className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
            <span>👤</span> Thông tin tài khoản
          </li>
          <li className={activeTab === 'addresses' ? 'active' : ''} onClick={() => setActiveTab('addresses')}>
            <span>📍</span> Sổ địa chỉ
          </li>
          <li className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
            <span>📦</span> Quản lý đơn hàng
          </li>
        </ul>
      </div>
      <div className="account-content">
        {activeTab === 'profile' && <ProfileTab user={user} getToken={getToken} addToast={addToast} />}
        {activeTab === 'addresses' && <AddressesTab getToken={getToken} addToast={addToast} />}
        {activeTab === 'orders' && <OrdersTab getToken={getToken} />}
      </div>
    </div>
  );
}

// ── Profile Tab ──
function ProfileTab({ user, getToken, addToast }) {
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name) return addToast('Vui lòng nhập họ tên', 'error');
    setSaving(true);
    try {
      const res = await fetch(`${API}/users/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ name, phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast(data.message, 'success');
      // Ideally update AuthContext user here, but skipping for simplicity as it requires modifying AuthContext
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>Thông tin tài khoản</h2>
      <form className="profile-form" onSubmit={handleSave}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={user.email} disabled />
        </div>
        <div className="form-group">
          <label>Họ và tên</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Số điện thoại</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
}

// ── Addresses Tab ──
function AddressesTab({ getToken, addToast }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editData, setEditData] = useState(null);

  const fetchAddresses = async () => {
    try {
      const res = await fetch(`${API}/users/me/addresses`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok) setAddresses(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAddresses(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    try {
      const res = await fetch(`${API}/users/me/addresses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast(data.message, 'success');
      fetchAddresses();
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="address-header">
        <h2 style={{margin: 0, border: 'none', padding: 0}}>Sổ địa chỉ</h2>
        <button className="btn-primary" onClick={() => { setEditData(null); setShowModal(true); }}>
          + Thêm địa chỉ mới
        </button>
      </div>

      {loading ? <p>Đang tải...</p> : addresses.length === 0 ? (
        <div className="no-data">Bạn chưa có địa chỉ nào.</div>
      ) : (
        <div className="address-list">
          {addresses.map(addr => (
            <div key={addr.id} className={`address-item ${addr.is_default ? 'is-default' : ''}`}>
              <div className="address-info">
                <div className="address-name">
                  {addr.name} 
                  {addr.is_default ? <span className="default-badge">Mặc định</span> : null}
                </div>
                <div className="address-phone">SĐT: {addr.phone}</div>
                <div className="address-detail">{addr.address}</div>
              </div>
              <div className="address-actions">
                <button className="btn-edit" onClick={() => { setEditData(addr); setShowModal(true); }}>Sửa</button>
                <button className="btn-delete" onClick={() => handleDelete(addr.id)}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddressModal 
          onClose={() => setShowModal(false)} 
          onSuccess={() => { setShowModal(false); fetchAddresses(); }}
          initialData={editData}
          getToken={getToken}
          addToast={addToast}
        />
      )}
    </div>
  );
}

function AddressModal({ onClose, onSuccess, initialData, getToken, addToast }) {
  const [formData, setFormData] = useState(initialData || { name: '', phone: '', address: '', is_default: false, province_id: null, district_id: null, ward_code: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Validation functions
  const validateName = (name) => {
    if (!name.trim()) return 'Vui lòng nhập tên người nhận';
    if (!/^[a-zA-ZÀ-ỿ\s]+$/.test(name)) return 'Tên không được chứa số hoặc ký tự đặc biệt';
    if (name.trim().length < 2) return 'Tên phải có ít nhất 2 ký tự';
    return '';
  };

  const validatePhone = (phone) => {
    if (!phone.trim()) return 'Vui lòng nhập số điện thoại';
    if (!/^0[0-9]{9}$/.test(phone.replace(/\s/g, ''))) return 'Số điện thoại phải có 10 chữ số, bắt đầu từ 0';
    return '';
  };

  const validateAddress = (address) => {
    if (!address.trim()) return 'Vui lòng nhập địa chỉ cụ thể';
    if (address.trim().length < 5) return 'Địa chỉ phải có ít nhất 5 ký tự';
    return '';
  };

  const handleNameChange = (e) => {
    const value = e.target.value;
    setFormData({...formData, name: value});
    if (errors.name) setErrors({...errors, name: validateName(value)});
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    setFormData({...formData, phone: value});
    if (errors.phone) setErrors({...errors, phone: validatePhone(value)});
  };

  const handleAddressChange = (e) => {
    const value = e.target.value;
    setFormData({...formData, address: value});
    if (errors.address) setErrors({...errors, address: validateAddress(value)});
  };

  const handleGhnSelect = ({ provinceId, districtId, wardCode }) => {
    setFormData({ ...formData, province_id: provinceId, district_id: districtId, ward_code: wardCode });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const nameError = validateName(formData.name);
    const phoneError = validatePhone(formData.phone);
    const addressError = validateAddress(formData.address);

    const newErrors = {};
    if (nameError) newErrors.name = nameError;
    if (phoneError) newErrors.phone = phoneError;
    if (addressError) newErrors.address = addressError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast('Vui lòng sửa các lỗi trên form', 'error');
      return;
    }

    setSaving(true);
    const method = initialData ? 'PUT' : 'POST';
    const url = initialData ? `${API}/users/me/addresses/${initialData.id}` : `${API}/users/me/addresses`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...formData, is_default: formData.is_default ? 1 : 0 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast(data.message, 'success');
      onSuccess();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{initialData ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Tên người nhận</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={handleNameChange}
              placeholder="Nhập họ và tên (không chứa số hoặc ký tự đặc biệt)"
              required 
            />
            {errors.name && <span style={{color: '#d32f2f', fontSize: '12px'}}>{errors.name}</span>}
          </div>
          <div className="form-group">
            <label>Số điện thoại</label>
            <input 
              type="tel" 
              value={formData.phone} 
              onChange={handlePhoneChange}
              placeholder="0xxxxxxxxx (10 chữ số)"
              required 
              maxLength="10"
            />
            {errors.phone && <span style={{color: '#d32f2f', fontSize: '12px'}}>{errors.phone}</span>}
          </div>
          <div className="form-group">
            <label>Địa chỉ cụ thể (Số nhà, Đường)</label>
            <input 
              type="text" 
              value={formData.address} 
              onChange={handleAddressChange}
              required 
            />
            {errors.address && <span style={{color: '#d32f2f', fontSize: '12px'}}>{errors.address}</span>}
          </div>

          <div className="form-group">
            <label>Tỉnh/TP - Quận/Huyện - Phường/Xã</label>
            <AddressDropdown onSelect={handleGhnSelect} initial={{ provinceId: formData.province_id, districtId: formData.district_id, wardCode: formData.ward_code }} />
          </div>
          <div className="form-group" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <input 
              type="checkbox" 
              id="is_default" 
              checked={formData.is_default} 
              onChange={e => setFormData({...formData, is_default: e.target.checked})} 
              style={{width: 'auto'}}
            />
            <label htmlFor="is_default" style={{margin: 0, fontWeight: 'normal'}}>Đặt làm địa chỉ mặc định</label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-outline" onClick={onClose} disabled={saving}>Hủy</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Orders Tab ──
function OrdersTab({ getToken }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const { addToast } = useCart();
  
  const [reviewOrder, setReviewOrder] = useState(null);
  const [complaintOrder, setComplaintOrder] = useState(null);

  const fetchOrders = async (status = 'all') => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/orders/my-orders?status=${status}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      const data = await res.json();
      if (res.ok) setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này không?')) return;
    try {
      const res = await fetch(`${API}/orders/${orderId}/customer-cancel`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast('Đã hủy đơn hàng', 'success');
      fetchOrders(filter);
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  useEffect(() => { fetchOrders(filter); }, [filter]);

  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'pending', label: 'Chờ xác nhận' },
    { id: 'shipping', label: 'Đang vận chuyển' },
    { id: 'delivered', label: 'Đã giao hàng' },
    { id: 'cancelled', label: 'Đã hủy' },
  ];

  return (
    <div>
      <div className="order-tabs">
        {tabs.map(t => (
          <div 
            key={t.id} 
            className={`order-tab ${filter === t.id ? 'active' : ''}`}
            onClick={() => setFilter(t.id)}
          >
            {t.label}
          </div>
        ))}
      </div>

      {loading ? <p>Đang tải đơn hàng...</p> : orders.length === 0 ? (
        <div className="no-data">Không có đơn hàng nào.</div>
      ) : (
        <div className="order-list">
          {orders.map(order => {
            const statusInfo = statusMap[order.status] || { label: order.status, class: '' };
            return (
              <div key={order.id} className="order-item">
                <div className="order-header">
                  <div>
                    <span className="order-code">Mã ĐH: {order.code}</span>
                    <span className="order-date">{formatDate(order.created_at)}</span>
                  </div>
                  <div className={`order-status ${statusInfo.class}`}>{statusInfo.label}</div>
                </div>
                
                <div className="order-products">
                  {order.items?.map(item => (
                    <div key={item.id} className="order-product">
                      <Link to={`/san-pham/${item.product_slug || ''}`}>
                        <img src={item.product_image || '/placeholder.png'} alt={item.product_name} style={{ cursor: 'pointer' }} />
                      </Link>
                      <div className="order-product-info">
                        <Link to={`/san-pham/${item.product_slug || ''}`} style={{ textDecoration: 'none' }}>
                          <div className="order-product-name" style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseEnter={e => e.currentTarget.style.color = '#c92127'} onMouseLeave={e => e.currentTarget.style.color = '#333'}>
                            {item.product_name}
                          </div>
                        </Link>
                        <div className="order-product-qty">x{item.quantity}</div>
                      </div>
                      <div className="order-product-price">{formatPrice(item.price)}</div>
                    </div>
                  ))}
                </div>

                <div className="order-footer">
                  <div>
                    {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 
                     order.payment_method === 'bank' ? 'Chuyển khoản ngân hàng' : 'Thanh toán ví điện tử'}
                  </div>
                  <div>
                    <span className="order-total-label">Thành tiền:</span>
                    <span className="order-total-price">{formatPrice(order.total)}</span>
                  </div>
                </div>
                <div style={{ padding: '16px', borderTop: '1px solid #eee', display: 'flex', gap: 12, justifyContent: 'flex-end', background: '#fafafa' }}>
                  {order.status === 'pending' && (
                    <button className="btn-outline" onClick={() => handleCancelOrder(order.id)} style={{ color: '#d32f2f', borderColor: '#d32f2f' }}>Hủy đơn hàng</button>
                  )}
                  {order.status === 'delivered' && (
                    <>
                      <button className="btn-outline" onClick={() => setComplaintOrder(order)}>Khiếu nại</button>
                      <button className="btn-primary" onClick={() => setReviewOrder(order)}>Đánh giá</button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewOrder && (
        <ReviewModal 
          order={reviewOrder} 
          onClose={() => setReviewOrder(null)} 
          getToken={getToken} 
          addToast={addToast} 
        />
      )}
      {complaintOrder && (
        <ComplaintModal 
          order={complaintOrder} 
          onClose={() => setComplaintOrder(null)} 
          getToken={getToken} 
          addToast={addToast} 
        />
      )}
    </div>
  );
}

// ── Modals ──
// ── Premium Modals ──
function ReviewModal({ order, onClose, getToken, addToast }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedProduct) return addToast('Vui lòng chọn sản phẩm để đánh giá', 'error');
    setSaving(true);
    try {
      const res = await fetch(`${API}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ order_id: order.id, product_id: selectedProduct, rating, comment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast('Đánh giá thành công! Cảm ơn bạn.', 'success');
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <div className="modal-content" style={{ maxWidth: 550, padding: 0, overflow: 'hidden', border: 'none', borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease-out' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #c92127 0%, #a81c21 100%)', padding: '20px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Star fill="white" size={24} />
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: 'white' }}>Đánh giá sản phẩm</h3>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Đơn hàng: {order.code}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.3)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, background: '#fafafa' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#333' }}>1. Chọn sản phẩm cần đánh giá *</label>
            <div style={{ position: 'relative' }}>
              <select 
                value={selectedProduct} 
                onChange={e => setSelectedProduct(e.target.value)} 
                required
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #ddd', appearance: 'none', background: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = '#c92127'}
                onBlur={e => e.target.style.borderColor = '#ddd'}
              >
                <option value="" disabled>-- Vui lòng chọn sản phẩm --</option>
                {order.items?.map(item => (
                  <option key={item.product_id} value={item.product_id}>{item.product_name}</option>
                ))}
              </select>
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#999' }}>▼</div>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#333' }}>2. Mức độ hài lòng của bạn</label>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '16px 0', background: '#fff', borderRadius: 8, border: '1px solid #eee' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star 
                  key={star} 
                  size={40} 
                  fill={(hoverRating || rating) >= star ? '#f9a825' : 'transparent'} 
                  color={(hoverRating || rating) >= star ? '#f9a825' : '#ddd'} 
                  strokeWidth={1.5}
                  style={{ cursor: 'pointer', transition: 'transform 0.1s' }}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  onMouseDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
                  onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 13, color: '#666', fontWeight: 500 }}>
              {rating === 5 ? 'Tuyệt vời!' : rating === 4 ? 'Tốt' : rating === 3 ? 'Bình thường' : rating === 2 ? 'Tệ' : 'Rất tệ'}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#333' }}>3. Nhận xét chi tiết</label>
            <textarea 
              rows="4" 
              value={comment} 
              onChange={e => setComment(e.target.value)} 
              placeholder="Chia sẻ cảm nhận của bạn về chất lượng sản phẩm, đóng gói..."
              style={{ width: '100%', padding: 16, borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none', resize: 'vertical', background: '#fff', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#c92127'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            ></textarea>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: 20 }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#555', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#f5f5f5'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              Hủy bỏ
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#c92127', color: 'white', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1, transition: 'background 0.2s' }} onMouseEnter={e=> {if(!saving) e.currentTarget.style.background='#a81c21'}} onMouseLeave={e=>{if(!saving) e.currentTarget.style.background='#c92127'}}>
              <Send size={18} />
              {saving ? 'Đang gửi...' : 'Gửi Đánh Giá'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ComplaintModal({ order, onClose, getToken, addToast }) {
  const [type, setType] = useState('Sản phẩm bị lỗi / rách / hỏng');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return addToast('Vui lòng mô tả chi tiết vấn đề', 'error');
    setSaving(true);
    try {
      const res = await fetch(`${API}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ order_id: order.id, type, description })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addToast('Gửi khiếu nại thành công! Chúng tôi sẽ liên hệ để giải quyết sớm nhất.', 'success');
      onClose();
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ animation: 'fadeIn 0.2s ease-out' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
      <div className="modal-content" style={{ maxWidth: 500, padding: 0, overflow: 'hidden', border: 'none', borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease-out' }}>
        
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #e53935 0%, #c62828 100%)', padding: '20px 24px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle color="white" size={24} />
            <div>
              <h3 style={{ margin: 0, fontSize: 18, color: 'white' }}>Khiếu nại / Phản ánh</h3>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>Đơn hàng: {order.code}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.3)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.2)'}>
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, background: '#fafafa' }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 8, color: '#333' }}>Loại vấn đề bạn gặp phải</label>
            <div style={{ position: 'relative' }}>
              <select 
                value={type} 
                onChange={e => setType(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #ddd', appearance: 'none', background: '#fff', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = '#c62828'}
                onBlur={e => e.target.style.borderColor = '#ddd'}
              >
                <option value="Sản phẩm bị lỗi / rách / hỏng">Sản phẩm bị lỗi / rách / hỏng</option>
                <option value="Giao sai sản phẩm / Thiếu hàng">Giao sai sản phẩm / Thiếu hàng</option>
                <option value="Thái độ phục vụ / Giao hàng">Thái độ phục vụ / Giao hàng</option>
                <option value="Khác">Lý do khác...</option>
              </select>
              <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#999' }}>▼</div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 8, color: '#333' }}>
              <MessageSquare size={16} color="#666" /> Mô tả chi tiết vấn đề
            </label>
            <textarea 
              required
              rows="5" 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Vui lòng mô tả rõ tình trạng sách, hoặc vấn đề bạn gặp phải để chúng tôi có thể hỗ trợ tốt nhất..."
              style={{ width: '100%', padding: 16, borderRadius: 8, border: '1px solid #ddd', fontSize: 14, outline: 'none', resize: 'vertical', background: '#fff', transition: 'border-color 0.2s', fontFamily: 'inherit' }}
              onFocus={e => e.target.style.borderColor = '#c62828'}
              onBlur={e => e.target.style.borderColor = '#ddd'}
            ></textarea>
            <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
              💡 Chúng tôi sẽ phản hồi lại bạn qua email hoặc số điện thoại trong vòng 24h làm việc.
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', borderTop: '1px solid #eee', paddingTop: 20 }}>
            <button type="button" onClick={onClose} disabled={saving} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', color: '#555', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#f5f5f5'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
              Hủy bỏ
            </button>
            <button type="submit" disabled={saving} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#c62828', color: 'white', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, opacity: saving ? 0.7 : 1, transition: 'background 0.2s' }} onMouseEnter={e=> {if(!saving) e.currentTarget.style.background='#b71c1c'}} onMouseLeave={e=>{if(!saving) e.currentTarget.style.background='#c62828'}}>
              {saving ? 'Đang gửi...' : 'Gửi Khiếu Nại'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
