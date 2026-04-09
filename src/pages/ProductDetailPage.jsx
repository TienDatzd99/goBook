import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import ProductCard from '../components/ProductCard/ProductCard';
import { BookOpen, Maximize, ShoppingCart } from 'lucide-react';
import { getProductBySlug, getRelatedProducts } from '../data/products';
import './ProductDetailPage.css';

function formatPrice(n) { return n.toLocaleString('vi-VN') + '₫'; }

// ── Read Preview Modal ──────────────────────────────────────────────────────
function ReadPreviewModal({ product, onClose }) {
  const { pdfUrl } = product;

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="preview-modal-overlay" onClick={onClose}>
      <div className="preview-modal preview-modal-large" onClick={e => e.stopPropagation()}>
        <div className="preview-modal-header">
          <div>
            <div className="preview-modal-title">📖 Đọc Thử</div>
            <div className="preview-modal-subtitle">{product.name}</div>
          </div>
          <button className="preview-modal-close" onClick={onClose} aria-label="Đóng">✕</button>
        </div>

        <div className="preview-modal-body preview-modal-pdf-body">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              title={`Đọc thử: ${product.name}`}
              className="preview-pdf-frame"
              frameBorder="0"
              allowFullScreen
            />
          ) : (
            <div className="preview-no-pdf">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><BookOpen size={64} strokeWidth={1} color="#ccd1d9" /></div>
              <h3>Chưa có bản đọc thử</h3>
              <p>Cuốn sách này chưa có bản đọc thử trực tuyến.</p>
              <p>Vui lòng xem ảnh nội dung bên dưới hoặc đặt mua để trải nghiệm toàn bộ sách.</p>
              <button className="btn btn-primary" onClick={onClose} style={{ marginTop: 16 }}>Đóng</button>
            </div>
          )}
        </div>

        {pdfUrl && (
          <div className="preview-modal-footer">
            <p>📌 Đây là bản xem thử giới hạn. Mua sách để đọc toàn bộ nội dung.</p>
            <button className="btn btn-primary" onClick={onClose}>Đóng xem thử</button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Main Component ──────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);
  const { addItem } = useCart();

  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('desc');
  const [added, setAdded] = useState(false);
  const [activeImg, setActiveImg] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Gallery images: cover + interior previews
  const images = product?.images || (product ? [product.image] : []);

  // Reset active image when product changes
  useEffect(() => { setActiveImg(0); }, [slug]);

  const handlePrev = useCallback(() => setActiveImg(i => (i - 1 + images.length) % images.length), [images.length]);
  const handleNext = useCallback(() => setActiveImg(i => (i + 1) % images.length), [images.length]);

  if (!product) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2>Không tìm thấy sản phẩm</h2>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>Về trang chủ</Link>
      </div>
    );
  }

  const related = getRelatedProducts(product);

  const handleAddToCart = () => {
    addItem(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="product-detail-page">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Trang chủ</Link>
          <span>›</span>
          <Link to={`/danh-muc/${product.category}`}>{product.category}</Link>
          <span>›</span>
          <span>{product.name}</span>
        </div>

        <div className="product-detail-grid">
          {/* ── Gallery ── */}
          <div className="product-detail-images">
            {/* "Đọc Thử" button overlaid on gallery */}
            <button
              className="read-preview-btn"
              onClick={() => setPreviewOpen(true)}
              id="read-preview-btn"
            >
              <span className="read-preview-icon" style={{ display: 'inline-flex', paddingBottom: 2 }}><BookOpen size={18} /></span>
              Đọc Thử
            </button>

            {/* Main image with nav arrows */}
            <div className="main-image-wrap" onClick={() => setZoomOpen(true)} title="Nhấn để phóng to">
              {product.discount > 0 && (
                <span className="detail-badge-sale">-{product.discount}%</span>
              )}
              <img
                src={images[activeImg]}
                alt={product.name}
                className="main-image"
                key={activeImg}
              />
              {images.length > 1 && (
                <>
                  <button
                    className="img-nav-btn img-nav-prev"
                    onClick={e => { e.stopPropagation(); handlePrev(); }}
                    aria-label="Ảnh trước"
                  >‹</button>
                  <button
                    className="img-nav-btn img-nav-next"
                    onClick={e => { e.stopPropagation(); handleNext(); }}
                    aria-label="Ảnh tiếp"
                  >›</button>
                </>
              )}
              <div className="img-counter">{activeImg + 1} / {images.length}</div>
            </div>

            {/* Thumbnails strip */}
            {images.length > 1 && (
              <div className="thumbnail-strip">
                {images.map((img, i) => (
                  <button
                    key={i}
                    className={`thumb-item ${i === activeImg ? 'active' : ''}`}
                    onClick={() => setActiveImg(i)}
                    aria-label={i === 0 ? 'Ảnh bìa' : `Trang nội dung ${i}`}
                  >
                    <img src={img} alt={i === 0 ? 'Bìa sách' : `Trang ${i}`} />
                    {i === 0 && <div className="thumb-label">Bìa</div>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ── */}
          <div className="product-detail-info">
            <div className="detail-publisher">{product.publisher}</div>
            <h1 className="detail-title">{product.name}</h1>

            <div className="detail-rating-row">
              <div className="stars">
                {[1,2,3,4,5].map(s => (
                  <span key={s} style={{ color: s <= Math.round(product.rating) ? '#f9a825' : '#ddd', fontSize: 16 }}>★</span>
                ))}
              </div>
              <span className="detail-rating-val">{product.rating}</span>
              <span className="detail-reviews">({product.reviews} đánh giá)</span>
              {product.stock > 0 ? (
                <span className="stock-badge in-stock">Còn hàng ({product.stock})</span>
              ) : (
                <span className="stock-badge out-stock">Hết hàng</span>
              )}
            </div>

            <div className="detail-prices">
              <span className="detail-price-current">{formatPrice(product.price)}</span>
              {product.originalPrice > product.price && (
                <>
                  <span className="detail-price-original">{formatPrice(product.originalPrice)}</span>
                  <span className="detail-discount-tag">Tiết kiệm {formatPrice(product.originalPrice - product.price)}</span>
                </>
              )}
            </div>

            {/* Meta */}
            <div className="detail-meta">
              {product.author && (
                <div className="meta-row">
                  <span className="meta-label">Tác giả:</span>
                  <span className="meta-value">{product.author}</span>
                </div>
              )}
              <div className="meta-row">
                <span className="meta-label">NXB:</span>
                <span className="meta-value">{product.publisher}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label">ISBN:</span>
                <span className="meta-value">{product.sku}</span>
              </div>
            </div>

            {/* Quantity + Add */}
            <div className="detail-actions">
              <div className="qty-control">
                <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))} id="detail-qty-minus">−</button>
                <span className="qty-display">{qty}</span>
                <button className="qty-btn" onClick={() => setQty(q => Math.min(product.stock, q + 1))} id="detail-qty-plus">+</button>
              </div>
              <button
                className={`btn btn-primary btn-lg add-main-btn ${added ? 'added' : ''}`}
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                id="add-to-cart-main"
              >
                {added ? '✓ Đã thêm vào giỏ!' : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    Thêm vào giỏ hàng
                  </>
                )}
              </button>
              <Link
                to="/thanh-toan"
                className="btn btn-accent btn-lg"
                onClick={() => addItem(product, qty)}
                id="buy-now-btn"
              >
                Mua ngay
              </Link>
            </div>

            {/* Guarantees */}
            <div className="detail-guarantees">
              <div className="guarantee-item">🔄 Đổi trả trong 10 ngày</div>
              <div className="guarantee-item">🚚 Giao hàng toàn quốc</div>
              <div className="guarantee-item">💳 Thanh toán COD / CK</div>
              <div className="guarantee-item">📦 Đóng gói cẩn thận</div>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="detail-tabs-section">
          <div className="tabs">
            <button className={`tab-btn ${tab === 'desc' ? 'active' : ''}`} onClick={() => setTab('desc')} id="tab-desc">Mô tả sản phẩm</button>
            <button className={`tab-btn ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')} id="tab-preview">📖 Đọc thử</button>
            <button className={`tab-btn ${tab === 'specs' ? 'active' : ''}`} onClick={() => setTab('specs')} id="tab-specs">Thông số kỹ thuật</button>
            <button className={`tab-btn ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')} id="tab-reviews">Đánh giá ({product.reviews})</button>
          </div>
          <div className="tab-content">
            {tab === 'desc' && (
              <div className="desc-content">
                <p>{product.description}</p>
                <p style={{ marginTop: 12, color: 'var(--text-secondary)' }}>
                  Cuốn sách này mang lại những kiến thức và trải nghiệm quý giá cho độc giả.
                  Với nội dung phong phú, cách trình bày rõ ràng, đây là một trong những tựa sách
                  được bạn đọc yêu thích nhất tại goBook.
                </p>
              </div>
            )}

            {/* ── Đọc Thử Tab ── */}
            {tab === 'preview' && (
              <div className="read-preview-tab">
                {product.pdfUrl ? (
                  // Có PDF -> hiển thị viewer
                  <>
                    <div className="read-preview-header">
                      <div className="read-preview-title-row">
                        <span className="read-book-icon" style={{ display: 'inline-flex' }}><BookOpen size={28} color="var(--primary)" /></span>
                        <div>
                          <h3>Đọc thử nội dung sách</h3>
                          <p>Xem trước nội dung trực tiếp ngay trên trang</p>
                        </div>
                      </div>
                      <a
                        href={product.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-read-fullscreen"
                        id="btn-read-fullscreen"
                      >
                        <Maximize size={16} /> Mở toàn màn hình
                      </a>
                    </div>
                    <div className="pdf-embed-wrap">
                      <iframe
                        src={product.pdfUrl}
                        title={`Đọc thử: ${product.name}`}
                        className="pdf-embed-frame"
                        frameBorder="0"
                        allowFullScreen
                      />
                    </div>
                    <div className="read-preview-cta">
                      <p>📌 Bạn đang xem bản xem thử giới hạn. Mua sách để đọc toàn bộ nội dung.</p>
                      <button className="btn btn-primary" onClick={handleAddToCart} id="preview-add-to-cart">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShoppingCart size={18} /> Thêm vào giỏ hàng</span> – {formatPrice(product.price)}
                      </button>
                    </div>
                  </>
                ) : (
                  // Không có PDF -> chỉ hiện thông báo
                  <div className="no-preview-section">
                    <div className="no-preview-notice">
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><BookOpen size={64} strokeWidth={1} color="#ccd1d9" /></div>
                      <div className="no-preview-text">
                        <h3>Chưa có bản đọc thử</h3>
                        <p>Cuốn sách này hiện chưa có bản đọc thử trực tuyến.</p>
                        <p>Vui lòng đặt mua để trải nghiệm toàn bộ nội dung sách.</p>
                      </div>
                    </div>
                    <div className="read-preview-cta">
                      <button className="btn btn-primary" onClick={handleAddToCart} id="preview-add-to-cart">
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShoppingCart size={18} /> Thêm vào giỏ hàng</span> – {formatPrice(product.price)}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}


            {tab === 'specs' && (
              <table className="specs-table">
                <tbody>
                  <tr><td>ISBN</td><td>{product.sku}</td></tr>
                  <tr><td>Nhà xuất bản</td><td>{product.publisher}</td></tr>
                  {product.author && <tr><td>Tác giả</td><td>{product.author}</td></tr>}
                  <tr><td>Danh mục</td><td>{product.category}</td></tr>
                  <tr><td>Tình trạng</td><td>{product.stock > 0 ? `Còn ${product.stock} cuốn` : 'Hết hàng'}</td></tr>
                  <tr><td>Xếp hạng</td><td>⭐ {product.rating} / 5 ({product.reviews} đánh giá)</td></tr>
                </tbody>
              </table>
            )}

            {tab === 'reviews' && (
              <div className="reviews-section">
                <div className="review-summary">
                  <div className="review-avg">{product.rating}</div>
                  <div>
                    <div className="stars" style={{ fontSize: 20 }}>
                      {[1,2,3,4,5].map(s => (
                        <span key={s} style={{ color: s <= Math.round(product.rating) ? '#f9a825' : '#ddd' }}>★</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{product.reviews} đánh giá</div>
                  </div>
                </div>
                <div className="review-placeholder">
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Chức năng bình luận đang được phát triển...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Related Products ── */}
        {related.length > 0 && (
          <div className="related-section">
            <div className="section-title">
              <h2>Sản phẩm liên quan</h2>
            </div>
            <div className="product-grid">
              {related.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── Zoom Modal (click main image) ── */}
      {zoomOpen && (
        <div className="zoom-modal-overlay" onClick={() => setZoomOpen(false)}>
          <div className="zoom-modal" onClick={e => e.stopPropagation()}>
            <button className="zoom-modal-close" onClick={() => setZoomOpen(false)}>✕</button>
            <button className="zoom-nav-btn zoom-prev" onClick={handlePrev}>‹</button>
            <img src={images[activeImg]} alt={product.name} className="zoom-main-img" />
            <button className="zoom-nav-btn zoom-next" onClick={handleNext}>›</button>
            <div className="zoom-thumbnails">
              {images.map((img, i) => (
                <button
                  key={i}
                  className={`zoom-thumb ${i === activeImg ? 'active' : ''}`}
                  onClick={() => setActiveImg(i)}
                >
                  <img src={img} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Read Preview Modal ── */}
      {previewOpen && (
        <ReadPreviewModal product={product} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
