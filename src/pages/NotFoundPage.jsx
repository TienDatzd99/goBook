import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import './NotFoundPage.css';

export default function NotFoundPage() {
  const [suggested, setSuggested] = useState([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products?is_bestseller=1&limit=5`)
      .then(res => res.json())
      .then(d => {
        if (d.data) setSuggested(d.data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="not-found-page">
      <div className="container">
        <div className="not-found-content">
          <div className="not-found-number">404</div>
          <h1>Trang không tìm thấy</h1>
          <p>Trang bạn đang tìm kiếm có thể đã bị xóa hoặc không tồn tại.</p>
          <div className="not-found-actions">
            <Link to="/" className="btn btn-primary btn-lg">🏠 Về trang chủ</Link>
            <Link to="/danh-muc/all" className="btn btn-outline btn-lg">📚 Xem tất cả sách</Link>
          </div>
        </div>

        <div style={{ marginTop: 48 }}>
          <div className="section-title">
            <h2>Sách bán chạy có thể bạn thích</h2>
          </div>
          <div className="product-grid">
            {suggested.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
