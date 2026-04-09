import { useParams, Link } from 'react-router-dom';
import { blogPosts } from '../data/blogs';
import './BlogDetailPage.css';

export default function BlogDetailPage() {
  const { slug } = useParams();
  const post = blogPosts.find(p => p.slug === slug) || blogPosts[0];
  const related = blogPosts.filter(p => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="blog-detail-page">
      <div className="container">
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link><span>›</span>
          <Link to="/diem-sach">Điểm Sách</Link><span>›</span>
          <span>{post.title.slice(0, 40)}...</span>
        </div>

        <div className="blog-detail-layout">
          {/* Main Content */}
          <article className="blog-detail-main">
            <div className="blog-detail-hero">
              <img src={post.image} alt={post.title} />
            </div>

            <div className="blog-detail-content">
              <span className="blog-cat-tag">{post.category}</span>
              <h1 className="blog-detail-title">{post.title}</h1>

              <div className="blog-detail-meta">
                <span>✍️ <strong>{post.author}</strong></span>
                <span>📅 {post.date}</span>
                <span>💬 {post.comments} bình luận</span>
              </div>

              <div className="blog-detail-body">
                <p className="lead-paragraph">{post.excerpt}</p>

                <h2>Nội dung chi tiết</h2>
                <p>
                  Trong thế giới ngày nay, việc đọc sách không chỉ là một thói quen tốt mà còn là
                  chìa khóa mở ra cánh cửa tri thức. Mỗi trang sách là một cuộc hành trình, mỗi chương
                  là một bài học quý giá từ cuộc sống.
                </p>
                <p>
                  goBook luôn tin rằng tri thức là tài sản quý giá nhất của con người. Chúng tôi
                  không chỉ bán sách mà còn ươm mầm những giá trị văn hóa, giáo dục cho thế hệ trẻ Việt Nam.
                </p>

                <blockquote>
                  "Một cuốn sách hay giống như một người bạn tốt — luôn ở bên bạn khi bạn cần,
                  không bao giờ phán xét, và luôn mang lại điều gì đó mới mẻ mỗi lần bạn quay lại."
                </blockquote>

                <h2>Kết luận</h2>
                <p>
                  Hãy bắt đầu hành trình đọc sách ngay hôm nay. Dù bạn chọn thể loại nào — kỹ năng sống,
                  văn học, khoa học hay thiếu nhi — mỗi cuốn sách đều có giá trị riêng của nó.
                </p>
              </div>

              {/* Tags */}
              <div className="blog-tags">
                {['Đọc sách', 'Kỹ năng sống', 'Phát triển bản thân', 'Sách hay'].map(tag => (
                  <span key={tag} className="blog-tag">#{tag}</span>
                ))}
              </div>

              {/* Share */}
              <div className="blog-share">
                <span>Chia sẻ bài viết:</span>
                <button className="share-btn fb">📘 Facebook</button>
                <button className="share-btn zalo">💬 Zalo</button>
                <button className="share-btn copy">🔗 Copy link</button>
              </div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="blog-sidebar">
            {/* Related */}
            <div className="sidebar-widget">
              <h3 className="sidebar-title">Bài viết liên quan</h3>
              <div className="related-posts">
                {related.map(p => (
                  <Link key={p.id} to={`/blog/${p.slug}`} className="related-post">
                    <img src={p.image} alt={p.title} />
                    <div>
                      <div className="related-title">{p.title}</div>
                      <div className="related-date">{p.date}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Newsletter */}
            <div className="sidebar-widget sidebar-newsletter">
              <h3>📬 Nhận bài viết mới</h3>
              <p>Đăng ký để không bỏ lỡ những bài review sách hay nhất</p>
              <input type="email" className="form-control" placeholder="Email của bạn..." style={{ marginBottom: 10 }} />
              <button className="btn btn-primary w-full">Đăng ký</button>
            </div>

            {/* Featured Books */}
            <div className="sidebar-widget">
              <h3 className="sidebar-title">📚 Sách được đề cử</h3>
              <Link to="/danh-muc/ky-nang-song" className="featured-book-banner">
                <span>Sách Kỹ Năng Sống<br/><strong>Giảm đến 35%</strong></span>
                <span style={{ fontSize: 40 }}>🧠</span>
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
