import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import CategoryIcon from '../components/CategoryIcon';
import { BookOpen, Gamepad2, Loader2 } from 'lucide-react';
import { useCategories } from '../context/CategoryContext';
import './CategoryPage.css';

const SORT_OPTIONS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'price-asc', label: 'Giá: Thấp đến Cao' },
  { value: 'price-desc', label: 'Giá: Cao đến Thấp' },
  { value: 'discount', label: 'Giảm giá nhiều nhất' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
];

const PRICE_RANGES = [
  { label: 'Dưới 50.000₫', min: 0, max: 50000 },
  { label: '50.000₫ - 100.000₫', min: 50000, max: 100000 },
  { label: '100.000₫ - 200.000₫', min: 100000, max: 200000 },
  { label: '200.000₫ - 500.000₫', min: 200000, max: 500000 },
  { label: 'Trên 500.000₫', min: 500000, max: Infinity },
];

// Slug đặc biệt
const SPECIAL_SLUGS = { 'sach-moi': true, 'ban-chay': true };

const MIN_PRICE = 0;
const MAX_PRICE = 1000000;

export default function CategoryPage() {
  const { slug } = useParams();
  const { categories, loading: catsLoading } = useCategories();
  
  const [sort, setSort] = useState('default');
  const [priceMin, setPriceMin] = useState(MIN_PRICE);
  const [priceMax, setPriceMax] = useState(MAX_PRICE);
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Nhóm danh mục (dựa vào categories từ context)
  const bookCats = categories.filter(c => c.slug !== 'do-choi');
  const toyCats  = categories.filter(c => c.slug === 'do-choi');

  useEffect(() => {
    setPage(1);
    setSort('default');
    setPriceMin(MIN_PRICE);
    setPriceMax(MAX_PRICE);
  }, [slug]);

  useEffect(() => {
    setLoading(true);
    let url = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products?page=${page}&limit=${PER_PAGE}`;
    
    if (slug === 'sach-moi') url += '&is_new=1';
    else if (slug === 'ban-chay') url += '&is_bestseller=1';
    else if (slug !== 'all') url += `&category=${slug}`;
    
    if (priceMin > MIN_PRICE) url += `&min_price=${priceMin}`;
    if (priceMax < MAX_PRICE) url += `&max_price=${priceMax}`;
    
    if (sort !== 'default') {
      if (sort === 'price-asc') url += '&sort=price_asc';
      else if (sort === 'price-desc') url += '&sort=price_desc';
      else if (sort === 'discount') url += '&sort=discount_desc';
      else if (sort === 'rating') url += '&sort=rating_desc';
    }

    fetch(url)
      .then(r => r.json())
      .then(data => {
        setProducts(data.data || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, sort, priceMin, priceMax, page]);

  // Tên trang
  const category = categories.find(c => c.slug === slug);
  const pageTitle =
    slug === 'all'           ? 'Tất cả sách' :
    slug === 'do-choi'       ? 'Đồ Chơi Giáo Dục' :
    slug === 'sach-moi'      ? 'Sách Mới Lên Kệ' :
    slug === 'ban-chay'      ? 'Sách Bán Chạy' :
    category                 ? category.name :
                               'Sản phẩm';

  const isToyPage = slug === 'do-choi';

  return (
    <div className="category-page">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>›</span>
          {isToyPage
            ? <span>Đồ Chơi Giáo Dục</span>
            : <><Link to="/danh-muc/all">Tất cả sách</Link><span>›</span><span>{pageTitle}</span></>
          }
        </div>

        <div className="page-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            {/* Sách */}
            <div className="sidebar-widget">
              <h3 className="sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><BookOpen size={18} /> Danh mục Sách</h3>
              <ul className="sidebar-cats">
                <li>
                  <Link to="/danh-muc/all" className={`sidebar-cat-link ${slug === 'all' ? 'active' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'inline-flex', width: 20, justifyContent: 'center' }}>
                        <BookOpen size={16} />
                      </span>
                      <span>Tất cả sách</span>
                    </div>
                  </Link>
                </li>
                {bookCats.map(cat => (
                  <li key={cat.id}>
                    <Link
                      to={`/danh-muc/${cat.slug}`}
                      className={`sidebar-cat-link ${slug === cat.slug ? 'active' : ''}`}
                      id={`sidebar-cat-${cat.slug}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ display: 'inline-flex', width: 20, justifyContent: 'center' }}>
                          <CategoryIcon slug={cat.slug} size={16} />
                        </span>
                        <span>{cat.name}</span>
                      </div>
                      <span className="cat-count-badge">{cat.product_count || 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Đồ chơi — nhóm riêng */}
            <div className="sidebar-widget">
              <h3 className="sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Gamepad2 size={18} /> Đồ Chơi</h3>
              <ul className="sidebar-cats">
                {toyCats.map(cat => (
                  <li key={cat.id}>
                    <Link
                      to={`/danh-muc/${cat.slug}`}
                      className={`sidebar-cat-link ${slug === cat.slug ? 'active' : ''}`}
                      id={`sidebar-cat-${cat.slug}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ display: 'inline-flex', width: 20, justifyContent: 'center' }}>
                          <CategoryIcon slug={cat.slug} size={16} />
                        </span>
                        <span>{cat.name}</span>
                      </div>
                      <span className="cat-count-badge">{cat.product_count || 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bộ lọc giá */}
            <div className="sidebar-widget">
              <h3 className="sidebar-title">Khoảng giá</h3>
              <div className="price-filter-slider">
                <div className="price-inputs-row">
                  <div className="price-input-group">
                    <label>Từ:</label>
                    <input
                      type="number"
                      className="price-input"
                      value={priceMin}
                      onChange={(e) => {
                        const val = Math.max(MIN_PRICE, Math.min(parseInt(e.target.value) || 0, priceMax));
                        setPriceMin(val);
                      }}
                      min={MIN_PRICE}
                      max={priceMax}
                    />
                  </div>
                  <div className="price-input-group">
                    <label>Đến:</label>
                    <input
                      type="number"
                      className="price-input"
                      value={priceMax}
                      onChange={(e) => {
                        const val = Math.min(MAX_PRICE, Math.max(parseInt(e.target.value) || MAX_PRICE, priceMin));
                        setPriceMax(val);
                      }}
                      min={priceMin}
                      max={MAX_PRICE}
                    />
                  </div>
                </div>
                <div className="slider-container">
                  <input
                    type="range"
                    min={MIN_PRICE}
                    max={MAX_PRICE}
                    value={priceMin}
                    onChange={(e) => setPriceMin(Math.min(parseInt(e.target.value), priceMax))}
                    className="range-slider range-slider-min"
                  />
                  <input
                    type="range"
                    min={MIN_PRICE}
                    max={MAX_PRICE}
                    value={priceMax}
                    onChange={(e) => setPriceMax(Math.max(parseInt(e.target.value), priceMin))}
                    className="range-slider range-slider-max"
                  />
                  <div className="slider-track">
                    <div
                      className="slider-track-active"
                      style={{
                        left: `${(priceMin / MAX_PRICE) * 100}%`,
                        right: `${100 - (priceMax / MAX_PRICE) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="price-display">
                  <span className="price-display-text">
                    {(priceMin / 1000).toFixed(0)}k - {(priceMax / 1000).toFixed(0)}k₫
                  </span>
                </div>
              </div>
              <div className="price-filter-divider"></div>
              <ul className="price-filter">
                <li>
                  <label className="radio-label">
                    <input type="radio" name="price" checked={priceMin === MIN_PRICE && priceMax === MAX_PRICE} onChange={() => { setPriceMin(MIN_PRICE); setPriceMax(MAX_PRICE); }} />
                    Tất cả
                  </label>
                </li>
                {PRICE_RANGES.map((r, i) => (
                  <li key={i}>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="price"
                        checked={priceMin === r.min && priceMax === r.max}
                        onChange={() => { setPriceMin(r.min); setPriceMax(r.max); }}
                      />
                      {r.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Main */}
          <div className="category-main">
            <div className="category-toolbar">
              <div className="result-count">
                <strong>{total}</strong> sản phẩm
                {slug && slug !== 'all' && !SPECIAL_SLUGS[slug] && category &&
                  <span> trong <em>{category.name}</em></span>
                }
              </div>
              <div className="sort-dropdown-wrap">
                <label htmlFor="sort-select">Sắp xếp:</label>
                <select id="sort-select" value={sort} onChange={e => setSort(e.target.value)} className="sort-select">
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                <Loader2 className="spinner" size={40} color="var(--primary)" />
              </div>
            ) : products.length > 0 ? (
              <>
                <div className="product-grid product-grid-4">
                  {products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="pagination">
                    <button className="page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} id="prev-page">‹</button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                      <button key={n} className={`page-btn ${page === n ? 'active' : ''}`} onClick={() => setPage(n)} id={`page-${n}`}>{n}</button>
                    ))}
                    <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} id="next-page">›</button>
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <div style={{ fontSize: 60 }}>{isToyPage ? '🎮' : '📚'}</div>
                <h3>Không tìm thấy sản phẩm</h3>
                <p>Hãy thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
