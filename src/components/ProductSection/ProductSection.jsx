import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard/ProductCard';
import './ProductSection.css';

export default function ProductSection({ title, icon, products, viewAllLink, cols = 5, bgLight = false }) {
  return (
    <section className={`product-section section ${bgLight ? 'bg-light-section' : ''}`}>
      <div className="container">
        <div className="section-title">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon && <span style={{ display: 'inline-flex', color: 'var(--primary)' }}>{icon}</span>}
            {title}
          </h2>
          {viewAllLink && <Link to={viewAllLink}>Xem thêm →</Link>}
        </div>
        <div className={`product-grid product-grid-${cols}`}>
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
