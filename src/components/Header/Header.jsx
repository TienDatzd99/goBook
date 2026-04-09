import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useWishlist } from '../../context/WishlistContext';
import { categories } from '../../data/products';
import CategoryIcon from '../CategoryIcon';
import { BookOpen } from 'lucide-react';

// Nhóm riêng: sách và đồ chơi
const bookCats = categories.filter(c => c.slug !== 'do-choi');
const toyCats  = categories.filter(c => c.slug === 'do-choi');

import SearchDropdown from './SearchDropdown';
import './Header.css';

export default function Header() {
  const { count, setIsOpen } = useCart();
  const { user, logout } = useAuth();
  const { count: wishCount } = useWishlist();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchFocus(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/tim-kiem?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  return (
    <header className="header">
      {/* Top Bar */}
      <div className="header-topbar">
        <div className="container topbar-inner">
          <div className="topbar-left">
            <span>🚚 Ship COD Toàn Quốc</span>
            <span>🎁 Free Ship Đơn &gt;300k</span>
            <span>📞 0966.160.925</span>
          </div>
          <div className="topbar-right">
            <Link to="/tra-cuu-don-hang">Tra cứu đơn hàng</Link>
            {user ? (
              <>
                <span className="topbar-user">👋 {user.name}</span>
                <button onClick={logout} className="topbar-link">Đăng xuất</button>
              </>
            ) : (
              <>
                <Link to="/dang-nhap">Đăng nhập</Link>
                <Link to="/dang-ky">Đăng ký</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="header-main">
        <div className="container main-bar-inner">
          {/* Logo */}
          <Link to="/" className="logo">
            <div className="logo-icon" style={{ fontSize: 0 }}><BookOpen color="var(--primary)" size={28} /></div>
            <div className="logo-text">
              <span className="logo-name">go</span>
              <span className="logo-slogan">Book</span>
            </div>
          </Link>

          {/* Search */}
          <div className="search-wrap" ref={searchRef}>
            <form className="search-form" onSubmit={handleSearch}>
            <div className="search-categories">
              <select className="search-cat-select" id="search-category">
                <option>Tất cả</option>
                {categories.slice(0, 6).map(c => <option key={c.id}>{c.name}</option>)}
              </select>
              <span className="search-divider" />
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm sách, tác giả, chủ đề..."
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setSearchFocus(true); }}
              onFocus={() => setSearchFocus(true)}
              onClick={() => setSearchFocus(true)}
              className="search-input"
              id="search-input"
            />
            <button type="submit" className="search-btn" id="search-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              Tìm kiếm
            </button>
            </form>
            {searchFocus && (
              <SearchDropdown query={searchTerm} onSelect={() => setSearchFocus(false)} />
            )}
          </div>

          {/* Actions */}
          <div className="header-actions">
            {/* Account */}
            <div
              className="action-dropdown"
              onMouseEnter={() => setUserMenuOpen(true)}
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <Link to={user ? '/tai-khoan' : '/dang-nhap'} className="action-btn" id="account-btn">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="action-label">
                  {user ? user.name.split(' ').pop() : 'Tài khoản'}
                </span>
              </Link>
              {userMenuOpen && !user && (
                <div className="user-dropdown">
                  <Link to="/dang-nhap" className="user-drop-link" id="login-dropdown">
                    🔑 Đăng nhập
                  </Link>
                  <Link to="/dang-ky" className="user-drop-link" id="register-dropdown">
                    ✏️ Đăng ký
                  </Link>
                  <div className="user-drop-divider" />
                  <Link to="/tra-cuu-don-hang" className="user-drop-link">
                    📦 Tra cứu đơn hàng
                  </Link>
                </div>
              )}
              {userMenuOpen && user && (
                <div className="user-dropdown">
                  <div className="user-drop-name">👋 {user.name}</div>
                  <div className="user-drop-divider" />
                  <Link to="/tai-khoan" className="user-drop-link">👤 Tài khoản</Link>
                  <Link to="/tra-cuu-don-hang" className="user-drop-link">📦 Đơn hàng</Link>
                  <Link to="/yeu-thich" className="user-drop-link">❤️ Yêu thích</Link>
                  <div className="user-drop-divider" />
                  <button className="user-drop-link user-drop-logout" onClick={logout}>🚪 Đăng xuất</button>
                </div>
              )}
            </div>

            {/* Wishlist */}
            <Link to="/yeu-thich" className="action-btn" title="Yêu thích" id="wishlist-icon">
              <div className="cart-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {wishCount > 0 && <span className="cart-count wish-count">{wishCount}</span>}
              </div>
              <span className="action-label">Yêu thích</span>
            </Link>

            {/* Cart */}
            <button
              className="action-btn cart-btn"
              onClick={() => setIsOpen(true)}
              title="Giỏ hàng"
              id="cart-icon"
            >
              <div className="cart-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 0 1-8 0"/>
                </svg>
                {count > 0 && <span className="cart-count">{count}</span>}
              </div>
              <span className="action-label">Giỏ hàng</span>
            </button>
          </div>

          {/* Mobile menu btn */}
          <button
            className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </div>

      {/* Nav Bar */}
      <nav className="header-nav">
        <div className="container nav-inner">
          <div
            className="nav-categories"
            onMouseEnter={() => setMegaMenuOpen(true)}
            onMouseLeave={() => setMegaMenuOpen(false)}
          >
            <button className="nav-cat-btn" id="category-menu-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
              Danh mục sách
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transition: 'transform 0.2s', transform: megaMenuOpen ? 'rotate(180deg)' : 'none' }}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            {megaMenuOpen && (
              <div className="mega-menu">
                <div className="mega-menu-inner">
                  {/* Chỉ hiện sách */}
                  {bookCats.map(cat => (
                    <Link
                      key={cat.id}
                      to={`/danh-muc/${cat.slug}`}
                      className="mega-menu-item"
                      onClick={() => setMegaMenuOpen(false)}
                      id={`cat-${cat.slug}`}
                    >
                      <span className="cat-icon"><CategoryIcon slug={cat.slug} size={20} /></span>
                      <div>
                        <div className="cat-name">{cat.name}</div>
                        <div className="cat-count">{cat.count} sản phẩm</div>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="cat-arrow">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </Link>
                  ))}
                </div>
                {/* Đồ chơi — dải riêng phía dưới */}
                <div className="mega-menu-toys">
                  {toyCats.map(cat => (
                    <Link
                      key={cat.id}
                      to={`/danh-muc/${cat.slug}`}
                      className="mega-menu-toy-item"
                      onClick={() => setMegaMenuOpen(false)}
                    >
                      <CategoryIcon slug={cat.slug} size={16} /> {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>

          <div className="nav-links">
            <Link to="/collections/mung-sinh-nhat" className="nav-link nav-link-hot">
              🎂 Deal Sinh Nhật 18K
            </Link>
            <Link to="/collections/flash-sale" className="nav-link nav-link-sale">
              ⚡ Flash Sale
            </Link>
            <Link to="/danh-muc/sach-moi" className="nav-link">Sách Mới</Link>
            <Link to="/danh-muc/van-hoc" className="nav-link">Văn Học</Link>
            <Link to="/danh-muc/ky-nang-song" className="nav-link">Kỹ Năng Sống</Link>
            <Link to="/danh-muc/sach-thieu-nhi" className="nav-link">Thiếu Nhi</Link>
            <Link to="/danh-muc/nuoi-day-con" className="nav-link">Nuôi Dạy Con</Link>
            <Link to="/danh-muc/combo" className="nav-link">Combo</Link>
            <Link to="/danh-muc/do-choi" className="nav-link">Đồ Chơi</Link>
            <Link to="/diem-sach" className="nav-link">Điểm sách</Link>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div className="overlay" onClick={() => setMobileMenuOpen(false)} style={{ zIndex: 700 }} />
          <div className="mobile-menu">
            <form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false); }} className="mobile-search">
              <input
                type="text"
                placeholder="Tìm kiếm sách..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
              />
              <button type="submit">🔍</button>
            </form>
            <div className="mobile-quick-links">
              <Link to="/dang-nhap" onClick={() => setMobileMenuOpen(false)} className="mobile-quick-btn">
                👤 Tài khoản
              </Link>
              <Link to="/yeu-thich" onClick={() => setMobileMenuOpen(false)} className="mobile-quick-btn">
                ❤️ Yêu thích
              </Link>
              <button onClick={() => { setIsOpen(true); setMobileMenuOpen(false); }} className="mobile-quick-btn">
                🛒 Giỏ hàng {count > 0 && `(${count})`}
              </button>
            </div>
            <div className="mobile-nav-links">
              <div className="mobile-nav-label">Sách</div>
              {bookCats.map(cat => (
                <Link
                  key={cat.id}
                  to={`/danh-muc/${cat.slug}`}
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CategoryIcon slug={cat.slug} size={14} /> {cat.name}
                  </span>
                  <span className="mobile-cat-count">{cat.count}</span>
                </Link>
              ))}
              <div className="mobile-nav-label" style={{ marginTop: 12 }}>Đồ Chơi</div>
              {toyCats.map(cat => (
                <Link
                  key={cat.id}
                  to={`/danh-muc/${cat.slug}`}
                  className="mobile-nav-link"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CategoryIcon slug={cat.slug} size={14} /> {cat.name}
                  </span>
                  <span className="mobile-cat-count">{cat.count}</span>
                </Link>
              ))}
            </div>

          </div>
        </>
      )}
    </header>
  );
}
