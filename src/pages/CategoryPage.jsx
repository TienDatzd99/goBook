import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductCard from '../components/ProductCard/ProductCard';
import { products, categories } from '../data/products';
import CategoryIcon from '../components/CategoryIcon';
import { BookOpen, Gamepad2 } from 'lucide-react';
import './CategoryPage.css';

const SORT_OPTIONS = [
  { value: 'default', label: 'Mặc định' },
  { value: 'price-asc', label: 'Giá: Thấp đến Cao' },
  { value: 'price-desc', label: 'Giá: Cao đến Thấp' },
  { value: 'discount', label: 'Giảm giá nhiều nhất' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
];

const MAX_PRICE = 1000000;
const MIN_PRICE = 0;

// Nhóm danh mục
const BOOK_CATEGORIES = categories.filter(c => c.slug !== 'do-choi');
const TOY_CATEGORIES  = categories.filter(c => c.slug === 'do-choi');

// Slug đặc biệt
const SPECIAL_SLUGS = { 'sach-moi': true, 'ban-chay': true };

export default function CategoryPage() {
  const { slug } = useParams();
  const [sort, setSort] = useState('default');
  const [priceMin, setPriceMin] = useState(MIN_PRICE);
  const [priceMax, setPriceMax] = useState(MAX_PRICE);
  const [page, setPage] = useState(1);
  const PER_PAGE = 12;

  useEffect(() => {
    setPage(1);
    setSort('default');
    setPriceMin(MIN_PRICE);
    setPriceMax(MAX_PRICE);
  }, [slug]);

  // Tên trang
  const category = categories.find(c => c.slug === slug);
  const pageTitle =
    slug === 'all'           ? 'Tất cả sách' :
    slug === 'do-choi'       ? 'Đồ Chơi Giáo Dục' :
    slug === 'sach-moi'      ? 'Sách Mới Lên Kệ' :
    slug === 'ban-chay'      ? 'Sách Bán Chạy' :
    category                 ? category.name :
                               'Sản phẩm';

  // Lọc sản phẩm theo slug
  let filtered;
  if (slug === 'all') {
    // Tất cả sách — KHÔNG bao gồm đồ chơi
    filtered = products.filter(p => p.category !== 'do-choi');
  } else if (slug === 'sach-moi') {
    filtered = products
      .filter(p => p.available && p.category !== 'do-choi')
      .sort((a, b) => b.id - a.id);
  } else if (slug === 'ban-chay') {
    filtered = products.filter(p => p.available && p.reviews >= 200 && p.category !== 'do-choi');
  } else {
    filtered = products.filter(p => p.category === slug);
  }

  if (priceMin > MIN_PRICE || priceMax < MAX_PRICE) {
    filtered = filtered.filter(p => p.price >= priceMin && p.price <= priceMax);
  }
  if (sort === 'price-asc')  filtered = [...filtered].sort((a, b) => a.price - b.price);
  else if (sort === 'price-desc') filtered = [...filtered].sort((a, b) => b.price - a.price);
  else if (sort === 'discount')   filtered = [...filtered].sort((a, b) => b.discount - a.discount);
  else if (sort === 'rating')     filtered = [...filtered].sort((a, b) => b.rating - a.rating);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

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
                {BOOK_CATEGORIES.map(cat => (
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
                      <span className="cat-count-badge">{cat.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Đồ chơi — nhóm riêng */}
            <div className="sidebar-widget">
              <h3 className="sidebar-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Gamepad2 size={18} /> Đồ Chơi</h3>
              <ul className="sidebar-cats">
                {TOY_CATEGORIES.map(cat => (
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
                      <span className="cat-count-badge">{cat.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bộ lọc giá */}
            <div className="sidebar-widget">
              <h3 className="sidebar-title">Khoảng giá</h3>
              <div className="price-range-container">
                <div className="price-range-inputs">
                  <input
                    type="text"
                    placeholder="Từ"
                    value={priceMin === 0 ? '' : priceMin.toLocaleString('vi-VN')}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                      setPriceMin(Math.min(val, priceMax));
                      setPage(1);
                    }}
                    className="price-input"
                  />
                  <span className="price-separator">-</span>
                  <input
                    type="text"
                    placeholder="Đến"
                    value={priceMax === MAX_PRICE ? '' : priceMax.toLocaleString('vi-VN')}
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/\D/g, '')) || MAX_PRICE;
                      setPriceMax(Math.max(val, priceMin));
                      setPage(1);
                    }}
                    className="price-input"
                  />
                </div>
                <div className="price-range-slider-container">
                  <div className="price-range-slider">
                    <input
                      type="range"
                      min={MIN_PRICE}
                      max={MAX_PRICE}
                      value={priceMin}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val <= priceMax) {
                          setPriceMin(val);
                          setPage(1);
                        }
                      }}
                      className="price-range-input price-range-min"
                    />
                    <input
                      type="range"
                      min={MIN_PRICE}
                      max={MAX_PRICE}
                      value={priceMax}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (val >= priceMin) {
                          setPriceMax(val);
                          setPage(1);
                        }
                      }}
                      className="price-range-input price-range-max"
                    />
                    <div className="price-range-track"></div>
                    <div className="price-range-fill"></div>
                  </div>
                </div>
                <div className="price-range-labels">
                  <span>{priceMin.toLocaleString('vi-VN')}₫</span>
                  <span>{priceMax.toLocaleString('vi-VN')}₫</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Main */}
          <div className="category-main">
            <div className="category-toolbar">
              <div className="result-count">
                <strong>{filtered.length}</strong> sản phẩm
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

            {paginated.length > 0 ? (
              <>
                <div className="product-grid product-grid-4">
                  {paginated.map(product => (
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
