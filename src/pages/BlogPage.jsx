import { Link } from 'react-router-dom';
import { blogPosts } from '../data/blogs';
import './BlogPage.css';
import './BlogDetailPage.css';

export default function BlogPage() {
  return (
    <div className="blog-page">
      <div className="container">
        {/* Hero Banner */}
        <div className="blog-hero">
          <h1>📖 Điểm Sách & Chia Sẻ</h1>
          <p>Những bài viết hay về sách, kỹ năng sống và phát triển bản thân</p>
        </div>

        {/* Category Pills */}
        <div className="blog-cats">
          {['Tất cả', 'Kỹ Năng Sống', 'Tâm Lý Học', 'Cảm Hứng', 'Thiếu Nhi', 'Kinh Doanh'].map(cat => (
            <button key={cat} className={`blog-cat-pill ${cat === 'Tất cả' ? 'active' : ''}`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Featured post */}
        <div className="blog-featured">
          <Link to={`/blog/${blogPosts[0].slug}`} className="featured-img-wrap">
            <img src={blogPosts[0].image} alt={blogPosts[0].title} />
            <span className="featured-tag">Nổi Bật</span>
          </Link>
          <div className="featured-content">
            <span className="blog-cat-tag">{blogPosts[0].category}</span>
            <Link to={`/blog/${blogPosts[0].slug}`} className="featured-title">
              {blogPosts[0].title}
            </Link>
            <p className="featured-excerpt">{blogPosts[0].excerpt}</p>
            <div className="blog-meta-row">
              <span>✍️ {blogPosts[0].author}</span>
              <span>📅 {blogPosts[0].date}</span>
              <span>💬 {blogPosts[0].comments} bình luận</span>
            </div>
            <Link to={`/blog/${blogPosts[0].slug}`} className="btn btn-primary">
              Đọc bài viết →
            </Link>
          </div>
        </div>

        {/* All Posts Grid */}
        <div className="section-title" style={{ marginTop: 40 }}>
          <h2>Bài viết mới nhất</h2>
        </div>
        <div className="blog-grid-page">
          {blogPosts.map(post => (
            <article key={post.id} className="blog-card-lg">
              <Link to={`/blog/${post.slug}`} className="blog-card-img">
                <img src={post.image} alt={post.title} loading="lazy" />
                <span className="blog-cat-tag">{post.category}</span>
              </Link>
              <div className="blog-card-body-lg">
                <div className="blog-meta-row">
                  <span>✍️ {post.author}</span>
                  <span>📅 {post.date}</span>
                </div>
                <Link to={`/blog/${post.slug}`} className="blog-card-title">{post.title}</Link>
                <p className="blog-card-excerpt">{post.excerpt}</p>
                <Link to={`/blog/${post.slug}`} className="read-more-link">
                  Đọc tiếp <span>→</span>
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
