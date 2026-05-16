import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Truck, CreditCard, Building, Smartphone } from 'lucide-react';
import './CartPage.css';

function formatPrice(n) { return n.toLocaleString('vi-VN') + '₫'; }

export default function CartPage() {
  const { items, removeItem, updateQuantity, freeShipThreshold, addToast } = useCart();
  const navigate = useNavigate();

  const [selectedIds, setSelectedIds] = useState(() => items.map(i => i.id));

  useEffect(() => {
    setSelectedIds(prev => prev.filter(id => items.some(i => i.id === id)));
  }, [items]);

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === items.length ? [] : items.map(i => i.id));

  const handleQtyChange = (e, item) => {
    if (e.target.value === '') return;
    let val = parseInt(e.target.value);
    if (isNaN(val)) return;
    const maxStock = item.stock > 0 ? item.stock : 99;
    if (val > maxStock) {
      val = maxStock;
      addToast(`Số lượng tối đa là ${maxStock}`, 'error');
    }
    if (val < 1) val = 1;
    updateQuantity(item.id, val);
  };

  const handleCheckout = () => {
    if (selectedIds.length === 0) return addToast('Vui lòng chọn ít nhất một sản phẩm', 'error');
    navigate('/thanh-toan', { state: { selectedIds } });
  };

  if (items.length === 0) {
    return (
      <div className="container cart-empty-page">
        <div className="empty-state">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><ShoppingCart size={80} strokeWidth={1} color="#ccd1d9" /></div>
          <h3>Giỏ hàng trống</h3>
          <p>Hãy thêm sản phẩm vào giỏ hàng để tiếp tục</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>Tiếp tục mua sắm</Link>
        </div>
      </div>
    );
  }

  const selectedItems = items.filter(i => selectedIds.includes(i.id));
  const selectedTotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const selectedShippingFee = selectedTotal >= freeShipThreshold ? 0 : 30000;
  const selectedGrandTotal = selectedTotal > 0 ? selectedTotal + selectedShippingFee : 0;
  const remaining = Math.max(0, freeShipThreshold - selectedTotal);

  return (
    <div className="cart-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>›</span>
          <span>Giỏ hàng</span>
        </div>

        <h1 className="page-title">Giỏ hàng của bạn <span>({items.length} sản phẩm)</span></h1>

        {selectedTotal > 0 && remaining > 0 && (
          <div className="cart-freeship-notice" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Truck size={20} color="#f57c00" strokeWidth={2} /> Mua thêm <strong>{formatPrice(remaining)}</strong> để được miễn phí vận chuyển!
          </div>
        )}

        <div className="cart-layout">
          {/* Items */}
          <div className="cart-items-table">
            <div className="cart-table-head">
              <span className="cart-checkbox-col" onClick={toggleSelectAll} style={{cursor:'pointer', display:'flex', alignItems:'center', gap: 8, userSelect: 'none'}}>
                <input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} readOnly style={{cursor:'pointer'}} />
                Chọn tất cả
              </span>
              <span>Đơn giá</span>
              <span>Số lượng</span>
              <span>Thành tiền</span>
              <span></span>
            </div>
            {items.map(item => (
              <div key={item.id} className="cart-row">
                <div className="cart-product-col" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelect(item.id)} style={{cursor:'pointer'}} />
                  <Link to={`/san-pham/${item.slug}`}>
                    <img src={item.image} alt={item.name} />
                  </Link>
                  <div>
                    <Link to={`/san-pham/${item.slug}`} className="cart-product-name">{item.name}</Link>
                    <div className="cart-product-pub">{item.publisher}</div>
                  </div>
                </div>
                <div className="cart-price-col">{formatPrice(item.price)}</div>
                <div className="cart-qty-col">
                  <div className="qty-control" style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)} id={`cart-minus-${item.id}`}>−</button>
                    <input 
                      type="number" 
                      className="qty-input" 
                      value={item.quantity} 
                      onChange={(e) => handleQtyChange(e, item)} 
                      style={{ width: 44, textAlign: 'center', border: 'none', background: 'transparent', outline: 'none', appearance: 'textfield', MozAppearance: 'textfield' }}
                    />
                    <button className="qty-btn" onClick={() => {
                      const maxStock = item.stock > 0 ? item.stock : 99;
                      if (item.quantity >= maxStock) addToast(`Số lượng tối đa là ${maxStock}`, 'error');
                      else updateQuantity(item.id, item.quantity + 1);
                    }} id={`cart-plus-${item.id}`}>+</button>
                  </div>
                  {item.stock > 0 && <div style={{fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center'}}>Kho: {item.stock}</div>}
                </div>
                <div className="cart-subtotal-col">{formatPrice(item.price * item.quantity)}</div>
                <div className="cart-remove-col">
                  <button className="cart-remove-btn" onClick={() => removeItem(item.id)} id={`cart-remove-${item.id}`} title="Xóa">✕</button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="cart-summary-box">
            <h3>Tóm tắt đơn hàng</h3>
            <div className="summary-lines">
              <div className="summary-line">
                <span>Tạm tính ({selectedIds.length} sản phẩm)</span>
                <span>{formatPrice(selectedTotal)}</span>
              </div>
              <div className="summary-line">
                <span>Phí vận chuyển</span>
                <span className={selectedShippingFee === 0 ? 'free' : ''}>
                  {selectedTotal === 0 ? '-' : selectedShippingFee === 0 ? 'Miễn phí' : formatPrice(selectedShippingFee)}
                </span>
              </div>
              <div className="summary-line total">
                <strong>Tổng cộng</strong>
                <strong className="grand">{formatPrice(selectedGrandTotal)}</strong>
              </div>
            </div>
            <button className="btn btn-primary btn-lg w-full" onClick={handleCheckout} id="proceed-checkout" disabled={selectedIds.length === 0}>
              Tiến hành thanh toán →
            </button>
            <Link to="/" className="btn btn-outline w-full" style={{ textAlign: 'center', display: 'block', marginTop: 12 }}>
              ← Tiếp tục mua sắm
            </Link>
            <div className="payment-icons" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
              <span style={{ display: 'inline-flex' }}><CreditCard size={24} color="#1976d2" /></span>
              <span style={{ display: 'inline-flex' }}><Building size={24} color="#00897b" /></span>
              <span style={{ display: 'inline-flex' }}><Smartphone size={24} color="#d81b60" /></span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thanh toán an toàn</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
