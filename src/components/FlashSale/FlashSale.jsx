import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import ProductCard from '../ProductCard/ProductCard';
import { Zap } from 'lucide-react';
import './FlashSale.css';

function getEndOfDay() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function pad(n) { return String(n).padStart(2, '0'); }

export default function FlashSale({ products, campaignSlug = 'flash-sale', title = 'Flash Sale' }) {
  const [endTime] = useState(() => getEndOfDay());
  const [timeLeft, setTimeLeft] = useState({ h: 0, m: 0, s: 0 });
  const [campaignData, setCampaignData] = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/collections/${campaignSlug}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error && data.products) setCampaignData(data.products);
      })
      .catch(console.error);
  }, [campaignSlug]);

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, endTime - Date.now());
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft({ h, m, s });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endTime]);

  const sourceProducts = campaignData || products || [];
  
  // Use useMemo so that we don't recalculate random numbers on every 1-second tick
  const displayProducts = useMemo(() => {
    return sourceProducts.slice(0, 6).map(p => {
      // If campaign_sold_count exists (even if it's 0), use it. Otherwise, use a static random number.
      let sold = p.soldPercent;
      if (sold === undefined) {
        sold = p.campaign_sold_count !== undefined && p.campaign_sold_count !== null 
          ? p.campaign_sold_count 
          : Math.floor(Math.random() * 60) + 30;
      }
      return { ...p, soldPercent: sold };
    });
  }, [sourceProducts]);

  return (
    <section className="flash-sale section">
      <div className="container">
        <div className="flash-sale-header">
          <div className="flash-title">
            <span className="flash-icon" style={{ display: 'inline-flex', alignItems: 'center' }}><Zap size={28} fill="currentColor" /></span>
            <h2>{title}</h2>
          </div>
          <div className="flash-countdown">
            <span className="countdown-label">Kết thúc sau</span>
            <div className="countdown-blocks">
              <div className="time-block">
                <span className="time-num">{pad(timeLeft.h)}</span>
                <span className="time-label">giờ</span>
              </div>
              <span className="time-dot">:</span>
              <div className="time-block">
                <span className="time-num">{pad(timeLeft.m)}</span>
                <span className="time-label">phút</span>
              </div>
              <span className="time-dot">:</span>
              <div className="time-block">
                <span className="time-num">{pad(timeLeft.s)}</span>
                <span className="time-label">giây</span>
              </div>
            </div>
          </div>
          <Link to={`/collections/${campaignSlug}`} className="flash-view-all">
            Xem tất cả →
          </Link>
        </div>

        <div className="flash-products">
          {displayProducts.map(product => (
            <div key={product.id} className="flash-product-wrap">
              <ProductCard product={product} />
              <div className="flash-progress">
                <div className="flash-sold-text">
                  Đã bán: <strong>{product.soldPercent}%</strong>
                </div>
                <div className="flash-bar">
                  <div
                    className="flash-bar-fill"
                    style={{ width: `${product.soldPercent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
