import { useState } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';
import AIAssistant from './AIAssistant';
import './admin.css';

const NAV_ITEMS = [
  { href: '/admin', icon: '📊', label: 'Dashboard', exact: true },
  { href: '/admin/products', icon: '📦', label: 'Sản phẩm' },
  { href: '/admin/orders', icon: '🛒', label: 'Đơn hàng' },
  { href: '/admin/users', icon: '👥', label: 'Người dùng' },
  { href: '/admin/categories', icon: '🗂️', label: 'Danh mục' },
  { href: '/admin/vouchers', icon: '🎟️', label: 'Voucher' },
  { href: '/admin/banners', icon: '🖼️', label: 'Quảng Cáo' },
  { href: '/admin/blogs', icon: '✍️', label: 'Blog' },
  { href: '/admin/layout', icon: '🎨', label: 'Giao diện' },
  { href: '/admin/menu', icon: '🧭', label: 'Menu' },
  { href: '/admin/campaigns', icon: '⚡', label: 'Chiến dịch' },
  { href: '/admin/reviews', icon: '⭐', label: 'Đánh giá' },
  { href: '/admin/complaints', icon: '⚠️', label: 'Khiếu nại' },
];

export default function AdminLayout({ children }) {
  const { admin, logout, loading } = useAdminAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (loading) return (
    <div className="admin-loading">
      <div className="admin-spinner" />
    </div>
  );

  if (!admin) return <Navigate to="/admin/login" replace />;

  const isActive = (href, exact) => exact ? location.pathname === href : location.pathname.startsWith(href);

  return (
    <div className={`admin-app ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">📚</span>
          <span className="sidebar-logo-text">goBook</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              to={item.href}
              className={`sidebar-link ${isActive(item.href, item.exact) ? 'active' : ''}`}
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span className="sidebar-label">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Link to="/" target="_blank" className="sidebar-link sidebar-link-sm">
            <span>🌐</span><span className="sidebar-label">Xem trang web</span>
          </Link>
          <button className="sidebar-link sidebar-link-sm logout-btn" onClick={logout}>
            <span>🚪</span><span className="sidebar-label">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        {/* Top bar */}
        <header className="admin-topbar">
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} id="sidebar-toggle">
            ☰
          </button>
          <div className="admin-topbar-right">
            <div className="admin-user-info">
              <div className="admin-avatar">{admin.name[0]}</div>
              <div>
                <div className="admin-name">{admin.name}</div>
                <div className="admin-role">Administrator</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="admin-content">
          {children}
        </main>
      </div>
      
      {/* AI Assistant Widget */}
      <AIAssistant />
    </div>
  );
}
