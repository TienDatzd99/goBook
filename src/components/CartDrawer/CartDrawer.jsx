import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { ShoppingCart, PartyPopper } from 'lucide-react';
import './CartDrawer.css';

function formatPrice(n) { return n.toLocaleString('vi-VN') + '₫'; }

export default function CartDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    items, isOpen, setIsOpen,
    removeItem, updateQuantity,
    total, shippingFee, grandTotal, freeShipThreshold
  } = useCart();

  // Detect current page to set as 'from' for checkout back button
  const getCurrentPageForBackLink = () => {
    const path = location.pathname;
    // Map common paths to user-friendly back navigation
    if (path === '/') return '/';
    if (path === '/gio-hang') return '/gio-hang';
    if (path.startsWith('/danh-muc/')) return path; // Category page
    if (path.startsWith('/tim-kiem')) return '/tim-kiem';
    return '/'; // Default to home
  };

  const handleCheckout = () => {
    setIsOpen(false);
    navigate('/thanh-toan', { state: { from: getCurrentPageForBackLink() } });
  };

  if (!isOpen) return null;

  const remaining = freeShipThreshold - total;
  const percent = Math.min(100, (total / freeShipThreshold) * 100);

  return (
    <>
      <div className="overlay" onClick={() => setIsOpen(false)} />
      <div className="cart-drawer">
        <div className="cart-drawer-header">
          <h3>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Giỏ hàng ({items.length})
          </h3>
          <button className="cart-close" onClick={() => setIsOpen(false)} aria-label="Đóng giỏ hàng">✕</button>
        </div>

        {/* Free ship progress */}
        <div className="freeship-bar">
          {remaining > 0 ? (
            <p>Mua thêm <strong>{formatPrice(remaining)}</strong> để được <span className="freeship-tag">FREE SHIP</span></p>
          ) : (
            <p className="freeship-done" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><PartyPopper size={16} /> Bạn được miễn phí vận chuyển!</p>
          )}
          <div className="freeship-progress">
            <div className="freeship-fill" style={{ width: `${percent}%` }} />
          </div>
        </div>

        {/* Items */}
        <div className="cart-items">
          {items.length === 0 ? (
            <div className="cart-empty">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><ShoppingCart size={64} strokeWidth={1} color="#ccd1d9" /></div>
              <p>Giỏ hàng trống</p>
              <button onClick={() => setIsOpen(false)} className="btn btn-primary btn-sm">Tiếp tục mua sắm</button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="cart-item">
                <Link to={`/san-pham/${item.slug}`} onClick={() => setIsOpen(false)}>
                  <img src={item.image} alt={item.name} className="cart-item-img" />
                </Link>
                <div className="cart-item-info">
                  <Link
                    to={`/san-pham/${item.slug}`}
                    className="cart-item-name"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                  <div className="cart-item-price">{formatPrice(item.price)}</div>
                  <div className="cart-item-controls">
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      id={`qty-minus-${item.id}`}
                    >−</button>
                    <span className="qty-val">{item.quantity}</span>
                    <button
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      id={`qty-plus-${item.id}`}
                    >+</button>
                    <button
                      className="cart-remove"
                      onClick={() => removeItem(item.id)}
                      title="Xóa"
                      id={`remove-${item.id}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="cart-item-subtotal">
                  {formatPrice(item.price * item.quantity)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary">
              <div className="summary-row">
                <span>Tạm tính</span>
                <span>{formatPrice(total)}</span>
              </div>
              <div className="summary-row">
                <span>Phí ship</span>
                <span className={shippingFee === 0 ? 'free-color' : ''}>
                  {shippingFee === 0 ? 'Miễn phí' : formatPrice(shippingFee)}
                </span>
              </div>
              <div className="summary-row total-row">
                <strong>Tổng cộng</strong>
                <strong className="grand-total">{formatPrice(grandTotal)}</strong>
              </div>
            </div>
            <Link
              to="/gio-hang"
              className="btn btn-outline btn-lg w-full"
              onClick={() => setIsOpen(false)}
              id="view-cart-btn"
            >
              Xem giỏ hàng
            </Link>
            <button
              onClick={handleCheckout}
              className="btn btn-primary btn-lg w-full"
              style={{ textDecoration: 'none', cursor: 'pointer', border: 'none', background: '#c92127', color: '#fff' }}
              id="checkout-btn"
            >
              Thanh toán ngay →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
