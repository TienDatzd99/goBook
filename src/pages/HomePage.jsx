import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider/HeroSlider';
import FlashSale from '../components/FlashSale/FlashSale';
import ProductSection from '../components/ProductSection/ProductSection';
import { newProducts, bestsellerProducts, comboProducts, toyProducts, flashSaleProducts, categories, products as allProducts } from '../data/products';
import { blogPosts } from '../data/blogs';
import CategoryIcon from '../components/CategoryIcon';
import { Sparkles, Flame, PackageSearch, Gamepad2 } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
  const [layout, setLayout] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/settings/homepage`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setLayout(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const renderComponent = (item) => {
    // Parse selected items
    const selectedSlugs = typeof item.selected_items === 'string' ? JSON.parse(item.selected_items || '[]') : (item.selected_items || []);
    const itemCount = item.item_count || 10;
    
    // Helper to get custom products or fallback
    const getProducts = (fallbackList) => {
      if (item.is_manual && selectedSlugs.length > 0) {
        // Handle older format (array of strings) vs new format (array of objects with is_visible)
        const visibleSelected = selectedSlugs.filter(s => typeof s === 'string' ? true : s.is_visible !== false);
        const customProducts = visibleSelected.map(s => {
          const slug = typeof s === 'string' ? s : s.slug;
          return allProducts.find(p => p.slug === slug);
        }).filter(Boolean);
        return customProducts.length > 0 ? customProducts : fallbackList.slice(0, itemCount);
      }
      return fallbackList.slice(0, itemCount);
    };

    switch (item.section_id) {
      case 'flash_sale':
      case item.section_id.startsWith('campaign_') ? item.section_id : null: {
        const isFlashSale = item.section_id === 'flash_sale';
        const campaignSlug = isFlashSale ? 'flash-sale' : item.section_id.replace('campaign_', '');
        return (
          <div className="container" key={item.section_id}>
            <FlashSale products={getProducts(flashSaleProducts)} campaignSlug={campaignSlug} title={item.name} />
          </div>
        );
      }
      case 'new_books':
        return (
          <ProductSection
            key="new_books"
            icon={<Sparkles size={26} strokeWidth={2} />}
            title={item.name}
            products={getProducts(newProducts)}
            viewAllLink="/danh-muc/sach-moi"
            cols={5}
          />
        );
      case 'best_sellers':
        return (
          <ProductSection
            key="best_sellers"
            icon={<Flame size={26} strokeWidth={2} color="#f57c00" />}
            title={item.name}
            products={getProducts(bestsellerProducts)}
            viewAllLink="/danh-muc/ban-chay"
            cols={5}
            bgLight
          />
        );
      case 'combos':
        return (
          <ProductSection
            key="combos"
            icon={<PackageSearch size={26} strokeWidth={2} color="#795548" />}
            title={item.name}
            products={getProducts(comboProducts)}
            viewAllLink="/danh-muc/combo"
            cols={4}
          />
        );
      case 'toys':
        return (
          <ProductSection
            key="toys"
            icon={<Gamepad2 size={26} strokeWidth={2} color="#d32f2f" />}
            title={item.name}
            products={getProducts(toyProducts)}
            viewAllLink="/danh-muc/do-choi"
            cols={4}
            bgLight
          />
        );
      case 'blog':
        return (
          <section className="blog-section section" key="blog">
            <div className="container">
              <div className="section-title">
                <h2>📖 {item.name}</h2>
                <Link to="/diem-sach">Xem thêm →</Link>
              </div>
              <div className="blog-grid">
                {blogPosts.slice(0, itemCount).map(post => (
                  <article key={post.id} className="blog-card">
                    <Link to={`/blog/${post.slug}`} className="blog-img-wrap">
                      <img src={post.image} alt={post.title} loading="lazy" />
                      <span className="blog-cat-tag">{post.category}</span>
                    </Link>
                    <div className="blog-card-body">
                      <div className="blog-meta">
                        <span>{post.date}</span>
                        <span>•</span>
                        <span>{post.comments} bình luận</span>
                      </div>
                      <Link to={`/blog/${post.slug}`} className="blog-title">{post.title}</Link>
                      <p className="blog-excerpt">{post.excerpt}</p>
                      <Link to={`/blog/${post.slug}`} className="blog-read-more">Đọc tiếp →</Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        );
      case 'newsletter':
        return (
          <section className="newsletter-section" key="newsletter">
            <div className="container">
              <div className="newsletter-inner">
                <div className="newsletter-text">
                  <h3>📬 {item.name}</h3>
                  <p>Nhận ngay ưu đãi 10% cho đơn hàng đầu tiên & cập nhật sách mới mỗi tuần</p>
                </div>
                <form className="newsletter-form" onSubmit={e => e.preventDefault()}>
                  <input
                    type="email"
                    placeholder="Nhập email của bạn..."
                    className="newsletter-input"
                    id="newsletter-email"
                  />
                  <button type="submit" className="btn btn-primary" id="newsletter-submit">
                    Đăng ký
                  </button>
                </form>
              </div>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <main className="homepage">
      <div className="container">
        <HeroSlider />
      </div>

      {/* Categories */}
      <section className="categories-bar section">
        <div className="container">
          <div className="cat-grid">
            {categories.map(cat => (
              <Link key={cat.id} to={`/danh-muc/${cat.slug}`} className="cat-card" id={`cat-card-${cat.slug}`}>
                <CategoryIcon slug={cat.slug} size={36} withBackground className="cat-card-icon" />
                <span className="cat-card-name">{cat.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Sections */}
      {!loading && layout.filter(item => item.is_visible).map(item => renderComponent(item))}

      {/* Fallback layout if API fails or no layout configured */}
      {(!loading && layout.length === 0) && (
        <>
          {renderComponent({ section_id: 'flash_sale', item_count: 6, name: 'Flash Sale' })}
          {renderComponent({ section_id: 'new_books', item_count: 10, name: 'Sách Mới Lên Kệ' })}
          {renderComponent({ section_id: 'best_sellers', item_count: 10, name: 'Top Sách Bán Chạy' })}
          {renderComponent({ section_id: 'combos', item_count: 8, name: 'Combo Bán Chạy' })}
          {renderComponent({ section_id: 'toys', item_count: 8, name: 'Đồ Chơi Giáo Dục' })}
          {renderComponent({ section_id: 'blog', item_count: 3, name: 'Điểm Sách & Chia Sẻ' })}
          {renderComponent({ section_id: 'newsletter', name: 'Đăng ký nhận thông tin' })}
        </>
      )}
    </main>
  );
}
