import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import './ProductCard.css';

function formatPrice(price) {
  return price.toLocaleString('vi-VN') + '₫';
}

export default function ProductCard({ product, horizontal = false }) {
  const { addItem } = useCart();
  const { toggle, isWishlisted } = useWishlist();
  const wishlisted = isWishlisted(product.id);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product);
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggle(product);
  };

  return (
    <div className={`product-card ${horizontal ? 'product-card-h' : ''}`}>
      <Link to={`/san-pham/${product.slug}`} className="product-card-img-wrap">
        {product.discount > 0 && (
          <span className="product-badge-sale">-{product.discount}%</span>
        )}
        {(product.isNew || product.is_new === 1) && !product.discount && (
          <span className="product-badge-new">Mới</span>
        )}
        {(product.isBestseller || product.is_bestseller === 1) && (
          <span className="product-badge-hot">Hot</span>
        )}
        <img
          src={product.image}
          alt={product.name}
          className="product-img"
          loading="lazy"
        />
        {/* Wishlist button */}
        <button
          className={`wishlist-btn ${wishlisted ? 'wishlisted' : ''}`}
          onClick={handleWishlist}
          id={`wish-${product.id}`}
          title={wishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
        >
          {wishlisted ? '❤️' : '🤍'}
        </button>
        <div className="product-card-overlay">
          <button
            className="quick-add-btn"
            onClick={handleAdd}
            id={`add-cart-${product.id}`}
            title="Thêm vào giỏ"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Thêm vào giỏ
          </button>
        </div>
      </Link>

      <div className="product-card-info">
        {product.publisher && (
          <div className="product-publisher">{product.publisher}</div>
        )}
        <Link to={`/san-pham/${product.slug}`} className="product-name">
          {product.name}
        </Link>
        {product.author && (
          <div className="product-author">Tác giả: {product.author}</div>
        )}
        <div className="product-rating">
          <div className="stars">
            {[1,2,3,4,5].map(s => (
              <span key={s} style={{ color: s <= Math.round(product.rating || 5) ? '#f9a825' : '#ddd' }}>★</span>
            ))}
          </div>
          <span className="review-count">({product.reviews || product.review_count || 0})</span>
        </div>
        <div className="product-price-row">
          <span className="price-sale">{formatPrice(product.price)}</span>
          {(product.originalPrice || product.original_price) > 0 && (product.originalPrice || product.original_price) > product.price && (
            <span className="price-original-card">{formatPrice(product.originalPrice || product.original_price)}</span>
          )}
        </div>
        <button
          className="add-to-cart-btn"
          onClick={handleAdd}
          id={`add-btn-${product.id}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
          Thêm vào giỏ
        </button>
      </div>
    </div>
  );
}
