import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, LayoutGrid, Search, History } from 'lucide-react';
import CategoryIcon from '../CategoryIcon';
import './SearchDropdown.css';

function formatPrice(n) {
  return typeof n === 'number' ? n.toLocaleString('vi-VN') + '₫' : n;
}

export default function SearchDropdown({ query, onSelect }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState([]);

  // Fetch trending products on mount
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/products?is_bestseller=1&limit=4`)
      .then(res => res.json())
      .then(d => {
        if (d.data) setTrending(d.data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!query) {
      setData(null);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/search/suggest?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    const debounceId = setTimeout(fetchSuggestions, 200);
    return () => clearTimeout(debounceId);
  }, [query]);

  // Initial Empty State
  if (!query || query.length === 0) {
    return (
      <div className="search-dropdown-pane">
        <div className="sd-banner">
          Sale Giữa Tháng - Deal Bao La
        </div>

        <div className="sd-section">
          <div className="sd-section-header">
            <TrendingUp size={18} /> Từ khóa hot
            <button className="sd-refresh" title="Làm mới"><History size={16} /></button>
          </div>
          <div className="sd-hot-grid">
             {trending.map(p => (
               <Link to={`/san-pham/${p.slug}`} key={p.id} className="sd-hot-item" onClick={onSelect}>
                 <img src={p.image} alt={p.name} />
                 <span>{p.name.length > 20 ? p.name.slice(0, 18) + '...' : p.name}</span>
               </Link>
             ))}
          </div>
        </div>

        <div className="sd-section">
          <div className="sd-section-header">
            <LayoutGrid size={18} /> Danh mục nổi bật
            <button className="sd-refresh" title="Làm mới"><History size={16} /></button>
          </div>
          <div className="sd-cat-grid">
            <Link to="/danh-muc/sach-thieu-nhi" onClick={onSelect} className="sd-cat-box">
              <span className="sd-cat-icon"><CategoryIcon slug="sach-thieu-nhi" size={24} /></span>
              <span>Sách Thiếu Nhi</span>
            </Link>
            <Link to="/danh-muc/quan-tri" onClick={onSelect} className="sd-cat-box">
              <span className="sd-cat-icon"><CategoryIcon slug="quan-tri" size={24} /></span>
              <span>Quản Trị K.Doanh</span>
            </Link>
            <Link to="/danh-muc/ky-nang-song" onClick={onSelect} className="sd-cat-box">
              <span className="sd-cat-icon"><CategoryIcon slug="ky-nang-song" size={24} /></span>
              <span>Kỹ Năng Sống</span>
            </Link>
            <Link to="/danh-muc/combo" onClick={onSelect} className="sd-cat-box">
              <span className="sd-cat-icon"><CategoryIcon slug="combo" size={24} /></span>
              <span>Combo Sách Hot</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Type State
  return (
    <div className="search-dropdown-pane typing-state">
      <div className="sd-section">
        <div className="sd-section-header">
          <History size={18} /> Gợi ý
        </div>
        <div className="sd-tag-list">
          {!data || loading ? (
             <span className="sd-tag-placeholder">Đang tìm...</span>
          ) : data.suggestions && data.suggestions.length > 0 ? (
             data.suggestions.map((s, i) => (
                <Link to={`/tim-kiem?q=${encodeURIComponent(s)}`} onClick={onSelect} key={i} className="sd-tag">
                  {s}
                </Link>
             ))
          ) : (
             <span className="sd-tag-placeholder">Không tìm thấy cụm từ.</span>
          )}
        </div>
      </div>

      <div className="sd-section">
        <div className="sd-section-header">
          <TrendingUp size={18} /> Sản phẩm
        </div>
        <div className="sd-prod-list">
          {!data || loading ? (
             <div className="sd-loading-spinner" />
          ) : data.products && data.products.length > 0 ? (
             data.products.map(p => (
               <Link to={`/san-pham/${p.slug}`} onClick={onSelect} key={p.id} className="sd-prod-item">
                 <img src={p.image} alt={p.name} />
                 <div className="sd-prod-info">
                   <div className="sd-prod-name">{p.name}</div>
                   <div className="sd-prod-price">{formatPrice(p.price)}</div>
                 </div>
               </Link>
             ))
          ) : (
             <div className="sd-empty">Không có sản phẩm nào khớp với từ khoá.</div>
          )}
        </div>
      </div>
    </div>
  );
}
