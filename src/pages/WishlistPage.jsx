import { useState } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import { products } from '../data/products';
import './WishlistPage.css';

// Simulate a wishlist with some products
const defaultWishlist = products.slice(0, 6);

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState(defaultWishlist);

  const remove = (id) => setWishlist(w => w.filter(p => p.id !== id));

  return (
    <div className="wishlist-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link><span>›</span>
          <span>Danh sách yêu thích</span>
        </div>

        <div className="wishlist-header">
          <h1>❤️ Danh Sách Yêu Thích
            <span>({wishlist.length} sản phẩm)</span>
          </h1>
          <Link to="/" className="btn btn-outline">Tiếp tục mua sắm</Link>
        </div>

        {wishlist.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 70 }}>💔</div>
            <h3>Danh sách yêu thích trống</h3>
            <p>Hãy thêm sản phẩm yêu thích để xem sau</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: 16 }}>
              Khám phá sách
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlist.map(p => (
              <div key={p.id} className="wishlist-item">
                <button
                  className="wishlist-remove"
                  onClick={() => remove(p.id)}
                  title="Xóa khỏi yêu thích"
                >✕</button>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
