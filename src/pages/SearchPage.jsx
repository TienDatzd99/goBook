import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import { products } from '../data/products';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') || '';
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (q) {
      const r = products.filter(p =>
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.author.toLowerCase().includes(q.toLowerCase()) ||
        p.description.toLowerCase().includes(q.toLowerCase())
      );
      setResults(r);
    } else {
      setResults([]);
    }
  }, [q]);

  return (
    <div style={{ padding: '20px 0 48px', background: 'var(--bg-light)', minHeight: '60vh' }}>
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link><span>›</span>
          <span>Tìm kiếm: "{q}"</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20 }}>
          Kết quả cho "{q}" ({results.length} sản phẩm)
        </h1>
        {results.length > 0 ? (
          <div className="product-grid product-grid-4">
            {results.map(p => <ProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <div className="empty-state">
            <div style={{ fontSize: 60 }}>🔍</div>
            <h3>Không tìm thấy kết quả</h3>
            <p>Thử tìm với từ khóa khác hoặc <Link to="/" style={{ color: 'var(--primary)' }}>về trang chủ</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
