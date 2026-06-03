import { Link } from 'react-router-dom';
import { Truck, Wallet, RefreshCw, Headset, BookOpen, Building2, Store, MapPin, Mail, ShieldCheck, CreditCard, Banknote, Smartphone } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      {/* Service Highlights */}
      <div className="footer-services">
        <div className="container services-grid">
          <div className="service-item">
            <div className="service-icon"><Truck strokeWidth={1.5} size={28} color="var(--primary)" /></div>
            <div>
              <div className="service-title">Miễn Phí Vận Chuyển</div>
              <div className="service-desc">cho đơn hàng trên 300.000 VNĐ</div>
            </div>
          </div>
          <div className="service-item">
            <div className="service-icon"><Wallet strokeWidth={1.5} size={28} color="var(--primary)" /></div>
            <div>
              <div className="service-title">Ship COD Toàn Quốc</div>
              <div className="service-desc">Thanh toán khi nhận sách</div>
            </div>
          </div>
          <div className="service-item">
            <div className="service-icon"><RefreshCw strokeWidth={1.5} size={28} color="var(--primary)" /></div>
            <div>
              <div className="service-title">Miễn Phí Đổi Trả Hàng</div>
              <div className="service-desc">trong vòng 10 ngày</div>
            </div>
          </div>
          <div className="service-item">
            <div className="service-icon"><Headset strokeWidth={1.5} size={28} color="var(--primary)" /></div>
            <div>
              <div className="service-title">Hotline Hỗ Trợ</div>
              <div className="service-desc">0966160925 - 0989849396</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className="footer-main">
        <div className="container footer-grid">
          {/* Company Info */}
          <div className="footer-col footer-about">
            <div className="footer-logo">
              <span className="footer-logo-icon" style={{ fontSize: 0, paddingRight: 6 }}><BookOpen color="#fff" size={32} /></span>
              <div>
                <div className="footer-logo-name">goBook</div>
                <div className="footer-logo-slogan">Ươm mầm tri thức</div>
              </div>
            </div>
            <div className="footer-company-info">
              CÔNG TY TNHH MTV THƯƠNG MẠI VÀ DỊCH VỤ VĂN HÓA GOBOOK<br />
              Khởi chiếu: 2010<br />
              Mã số thuế: 0104639414
            </div>
            <div className="footer-address">
              <div className="addr-item">
                <span><Building2 size={16} color="var(--text-muted)" /></span>
                <span>LK 02-03, Dãy B, KĐT Green Pearl, 378 Minh Khai, Hai Bà Trưng, Hà Nội</span>
              </div>
              <div className="addr-item">
                <span><Store size={16} color="var(--text-muted)" /></span>
                <span>Phố Sách Hà Nội, 19 tháng 12, Hoàn Kiếm, Hà Nội</span>
              </div>
              <div className="addr-item">
                <span><MapPin size={16} color="var(--text-muted)" /></span>
                <span>CN Miền Nam: 33 Đỗ Thừa Tự, Tân Quý, Tân Phú, TP.HCM</span>
              </div>
              <div className="addr-item">
                <span><Mail size={16} color="var(--text-muted)" /></span>
                <a href="mailto:cskh@gobook.vn">cskh@gobook.vn</a>
              </div>
            </div>
            <div className="social-links">
              <a href="#" className="social-btn" title="Facebook" id="fb-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" className="social-btn" title="Instagram" id="ig-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a href="#" className="social-btn" title="YouTube" id="yt-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.41 19c1.71.46 8.59.46 8.59.46s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
                  <polygon fill="white" points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
                </svg>
              </a>
              <a href="#" className="social-btn" title="TikTok" id="tt-link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.75a8.16 8.16 0 004.78 1.52V6.82a4.85 4.85 0 01-1.01-.13z" />
                </svg>
              </a>
            </div>
          </div>

          {/* About */}
          <div className="footer-col">
            <h4 className="footer-heading">Về chúng tôi</h4>
            <ul className="footer-links">
              <li><Link to="/gioi-thieu">Giới thiệu</Link></li>
              <li><Link to="/diem-sach">Điểm sách</Link></li>
              <li><Link to="/tuyen-dung">Tuyển dụng</Link></li>
              <li><Link to="/su-kien">Sự kiện</Link></li>
              <li><Link to="/tin-khuyen-mai">Tin khuyến mại</Link></li>
            </ul>
          </div>

          {/* Policies */}
          <div className="footer-col">
            <h4 className="footer-heading">Chính sách</h4>
            <ul className="footer-links">
              <li><Link to="/dieu-khoan-su-dung">Điều khoản sử dụng</Link></li>
              <li><Link to="/huong-dan-mua-hang">Hướng dẫn mua hàng</Link></li>
              <li><Link to="/phuong-thuc-thanh-toan">Phương thức thanh toán</Link></li>
              <li><Link to="/phuong-thuc-van-chuyen">Phương thức giao hàng</Link></li>
              <li><Link to="/chinh-sach-doi-tra">Chính sách đổi trả</Link></li>
              <li><Link to="/bao-mat-thong-tin">Bảo mật thông tin</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div className="footer-col">
            <h4 className="footer-heading">Tài khoản</h4>
            <ul className="footer-links">
              <li><Link to="/dang-nhap">Đăng nhập</Link></li>
              <li><Link to="/dang-ky">Đăng ký</Link></li>
              <li><Link to="/tra-cuu-don-hang">Tra cứu đơn hàng</Link></li>
              <li><Link to="/lien-he">Liên hệ</Link></li>
            </ul>
            <div className="footer-certified">
              <div className="cert-badge">
                <span style={{ marginRight: 8, marginTop: 2, display: 'block' }}><ShieldCheck size={32} color="#00C853" strokeWidth={1.5} /></span>
                <div>
                  <div>Đã đăng ký</div>
                  <strong>Bộ Công Thương</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p>© 2024 Bản quyền thuộc về <strong>Công ty TNHH MTV TM và DV Văn Hoá goBook</strong></p>
          <div className="payment-methods">
            <span className="pm-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Banknote size={14} /> COD</span>
            <span className="pm-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 size={14} /> Chuyển khoản</span>
            <span className="pm-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Smartphone size={14} /> MoMo</span>
            <span className="pm-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CreditCard size={14} /> VNPay</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
