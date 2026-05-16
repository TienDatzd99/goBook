import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import './CategoryPage.css';

const SORT_OPTIONS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'price-asc', label: 'Giá: Thấp đến Cao' },
  { value: 'price-desc', label: 'Giá: Cao đến Thấp' },
  { value: 'discount', label: 'Giảm giá nhiều nhất' },
];

export default function CollectionPage() {
  const { slug } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [sort, setSort] = useState('default');
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  useEffect(() => {
    setPage(1);
    setSort('default');
    fetchCollection();
  }, [slug]);

  const fetchCollection = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/collections/${slug}`);
      const data = await res.json();
      if (res.ok) {
        setCampaign(data.campaign);
        setProducts(data.products || []);
      } else {
        setError(data.error || 'Không tìm thấy bộ sưu tập');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 100, textAlign: 'center' }}>Đang tải bộ sưu tập...</div>;
  if (error || !campaign) return (
    <div style={{ padding: 100, textAlign: 'center' }}>
      <h2>Không tìm thấy trang</h2>
      <p style={{ color: '#888' }}>Chiến dịch này không tồn tại hoặc đã kết thúc.</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 20 }}>Về trang chủ</Link>
    </div>
  );

  // Sorting
  let sorted = [...products];
  if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price);
  else if (sort === 'discount') sorted.sort((a, b) => b.discount - a.discount);

  const totalPages = Math.ceil(sorted.length / PER_PAGE);
  const paginated = sorted.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="collection-page" style={{ backgroundColor: campaign.bg_color || '#f9f9f9', minHeight: '80vh', paddingBottom: 60 }}>
      {/* Banner */}
      {campaign.banner_image && (
        <div style={{ width: '100%', marginBottom: 30 }}>
          <img src={campaign.banner_image} alt={campaign.name} style={{ width: '100%', maxHeight: 400, objectFit: 'cover' }} />
        </div>
      )}

      <div className="container" style={{ paddingTop: campaign.banner_image ? 0 : 40 }}>
        {!campaign.banner_image && (
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h1 style={{ color: campaign.bg_color ? '#fff' : '#333', fontSize: 32, marginBottom: 12 }}>{campaign.name}</h1>
            {campaign.description && <p style={{ color: campaign.bg_color ? 'rgba(255,255,255,0.8)' : '#666', maxWidth: 600, margin: '0 auto' }}>{campaign.description}</p>}
          </div>
        )}

        <div className="category-main" style={{ background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <div className="category-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, marginBottom: 20, borderBottom: '1px solid #f0f0f0' }}>
            <div className="result-count" style={{ fontSize: 16 }}>
              <strong>{products.length}</strong> sản phẩm trong chiến dịch
            </div>
            <div className="sort-dropdown-wrap">
              <label htmlFor="sort-select" style={{ marginRight: 10 }}>Sắp xếp:</label>
              <select id="sort-select" value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ddd' }}>
                {SORT_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {paginated.length > 0 ? (
            <>
              <div className="product-grid product-grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
                {paginated.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination" style={{ marginTop: 40, display: 'flex', justifyContent: 'center', gap: 8 }}>
                  <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} className={`page-btn ${page === n ? 'active' : ''}`} onClick={() => setPage(n)}>{n}</button>
                  ))}
                  <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state" style={{ padding: 60, textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: '#888' }}>Chưa có sản phẩm nào trong chiến dịch này.</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
