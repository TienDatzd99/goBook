import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { heroBanners } from '../../data/blogs';
import './HeroSlider.css';

export default function HeroSlider() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % heroBanners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const goTo = (idx) => setCurrent(idx);
  const prev = () => setCurrent(c => (c - 1 + heroBanners.length) % heroBanners.length);
  const next = () => setCurrent(c => (c + 1) % heroBanners.length);

  return (
    <div className="hero-section">
      <div className="hero-slider">
        {heroBanners.map((banner, idx) => (
          <div
            key={banner.id}
            className={`slide ${idx === current ? 'active' : ''}`}
            style={{ background: banner.bg }}
          >
            <div className="slide-content">
              <div className="slide-text">
                <span className="slide-tag">🔥 Ưu đãi đặc biệt</span>
                <h1 className="slide-title">{banner.title}</h1>
                <p className="slide-subtitle">{banner.subtitle}</p>
                <Link to={banner.href} className="slide-cta" id={`slide-cta-${idx}`}>
                  {banner.cta}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
              </div>
              <div className="slide-img-wrap">
                <img src={banner.image} alt={banner.title} className="slide-img" />
                <div className="slide-img-overlay" />
              </div>
            </div>
          </div>
        ))}

        {/* Controls */}
        <button className="slider-prev" onClick={prev} aria-label="Trước">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>
        <button className="slider-next" onClick={next} aria-label="Sau">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>

        {/* Dots */}
        <div className="slider-dots">
          {heroBanners.map((_, idx) => (
            <button
              key={idx}
              className={`dot ${idx === current ? 'active' : ''}`}
              onClick={() => goTo(idx)}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Side Banners */}
      <div className="hero-side-banners">
        <div className="side-banner side-banner-1">
          <Link to="/danh-muc/combo">
            <img src="https://images.unsplash.com/photo-1589998059171-988d887df646?w=300&h=160&fit=crop" alt="Combo Sách" />
            <div className="side-banner-text">
              <span>Combo Sách</span>
              <strong>Giảm đến 30%</strong>
            </div>
          </Link>
        </div>
        <div className="side-banner side-banner-2">
          <Link to="/danh-muc/sach-thieu-nhi">
            <img src="https://images.unsplash.com/photo-1532012197267-da84d127e765?w=300&h=160&fit=crop" alt="Sách Thiếu Nhi" />
            <div className="side-banner-text">
              <span>Sách Thiếu Nhi</span>
              <strong>Phong phú nhất</strong>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
