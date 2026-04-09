import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ShoppingCart, Truck, CreditCard, Building, Smartphone } from 'lucide-react';
import './CartPage.css';

function formatPrice(n) { return n.toLocaleString('vi-VN') + '₫'; }

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, shippingFee, grandTotal, freeShipThreshold } = useCart();

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

  const remaining = Math.max(0, freeShipThreshold - total);

  return (
    <div className="cart-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>›</span>
          <span>Giỏ hàng</span>
        </div>

        <h1 className="page-title">Giỏ hàng của bạn <span>({items.length} sản phẩm)</span></h1>

        {remaining > 0 && (
          <div className="cart-freeship-notice" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Truck size={20} color="#f57c00" strokeWidth={2} /> Mua thêm <strong>{formatPrice(remaining)}</strong> để được miễn phí vận chuyển!
          </div>
        )}

        <div className="cart-layout">
          {/* Items */}
          <div className="cart-items-table">
            <div className="cart-table-head">
              <span>Sản phẩm</span>
              <span>Đơn giá</span>
              <span>Số lượng</span>
              <span>Thành tiền</span>
              <span></span>
            </div>
            {items.map(item => (
              <div key={item.id} className="cart-row">
                <div className="cart-product-col">
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
                  <div className="qty-control">
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)} id={`cart-minus-${item.id}`}>−</button>
                    <span className="qty-display">{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)} id={`cart-plus-${item.id}`}>+</button>
                  </div>
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
                <span>Tạm tính ({items.length} sản phẩm)</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="summary-line">
                <span>Phí vận chuyển</span>
                <span className={shippingFee === 0 ? 'free' : ''}>
                  {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
                </span>
              </div>
              <div className="summary-line total">
                <strong>Tổng cộng</strong>
                <strong className="grand">{formatPrice(grandTotal)}</strong>
              </div>
            </div>
            <Link to="/thanh-toan" className="btn btn-primary btn-lg w-full" id="proceed-checkout">
              Tiến hành thanh toán →
            </Link>
            <Link to="/" className="btn btn-outline w-full" style={{ textAlign: 'center' }}>
              ← Tiếp tục mua sắm
            </Link>
            <div className="payment-icons" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
