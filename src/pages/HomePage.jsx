import { Link } from 'react-router-dom';
import HeroSlider from '../components/HeroSlider/HeroSlider';
import FlashSale from '../components/FlashSale/FlashSale';
import ProductSection from '../components/ProductSection/ProductSection';
import { newProducts, bestsellerProducts, comboProducts, toyProducts, categories } from '../data/products';
import { blogPosts } from '../data/blogs';
import CategoryIcon from '../components/CategoryIcon';
import { Sparkles, Flame, PackageSearch, Gamepad2 } from 'lucide-react';
import './HomePage.css';

export default function HomePage() {
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

      {/* Flash Sale */}
      <div className="container">
        <FlashSale />
      </div>

      {/* New Books */}
      <ProductSection
        icon={<Sparkles size={26} strokeWidth={2} />}
        title="Sách Mới Lên Kệ"
        products={newProducts}
        viewAllLink="/danh-muc/sach-moi"
        cols={5}
      />

      {/* Best Sellers */}
      <ProductSection
        icon={<Flame size={26} strokeWidth={2} color="#f57c00" />}
        title="Top Sách Bán Chạy"
        products={bestsellerProducts}
        viewAllLink="/danh-muc/ban-chay"
        cols={5}
        bgLight
      />

      {/* Combos */}
      <ProductSection
        icon={<PackageSearch size={26} strokeWidth={2} color="#795548" />}
        title="Combo Bán Chạy"
        products={comboProducts}
        viewAllLink="/danh-muc/combo"
        cols={4}
      />

      {/* Toys */}
      <ProductSection
        icon={<Gamepad2 size={26} strokeWidth={2} color="#d32f2f" />}
        title="Đồ Chơi Giáo Dục"
        products={toyProducts}
        viewAllLink="/danh-muc/do-choi"
        cols={4}
        bgLight
      />

      {/* Blog */}
      <section className="blog-section section">
        <div className="container">
          <div className="section-title">
            <h2>📖 Điểm Sách & Chia Sẻ</h2>
            <Link to="/diem-sach">Xem thêm →</Link>
          </div>
          <div className="blog-grid">
            {blogPosts.map(post => (
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

      {/* Newsletter */}
      <section className="newsletter-section">
        <div className="container">
          <div className="newsletter-inner">
            <div className="newsletter-text">
              <h3>📬 Đăng ký nhận thông tin</h3>
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
    </main>
  );
}
