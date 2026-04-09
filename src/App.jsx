import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';

// Customer UI components
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import CartDrawer from './components/CartDrawer/CartDrawer';
import ToastContainer from './components/Toast/ToastContainer';

// Customer pages
import HomePage from './pages/HomePage';
import CategoryPage from './pages/CategoryPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import LoginPage from './pages/LoginPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import PaymentReturnPage from './pages/PaymentReturnPage';
import SearchPage from './pages/SearchPage';
import OrderTrackingPage from './pages/OrderTrackingPage';
import BlogPage from './pages/BlogPage';
import BlogDetailPage from './pages/BlogDetailPage';
import WishlistPage from './pages/WishlistPage';
import NotFoundPage from './pages/NotFoundPage';

// Admin
import { AdminAuthProvider } from './admin/AdminAuthContext';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import Products from './admin/Products';
import Orders from './admin/Orders';
import Users from './admin/Users';
import Categories from './admin/Categories';
import Blogs from './admin/Blogs';
import Vouchers from './admin/Vouchers';
import Banners from './admin/Banners';

function CustomerLayout({ children }) {
  return (
    <>
      <Header />
      <div style={{ minHeight: 'calc(100vh - 300px)' }}>
        {children}
      </div>
      <Footer />
      <CartDrawer />
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Routes>
                {/* ── Admin Routes ── */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
                <Route path="/admin/products" element={<AdminLayout><Products /></AdminLayout>} />
                <Route path="/admin/orders" element={<AdminLayout><Orders /></AdminLayout>} />
                <Route path="/admin/users" element={<AdminLayout><Users /></AdminLayout>} />
                <Route path="/admin/categories" element={<AdminLayout><Categories /></AdminLayout>} />
                <Route path="/admin/vouchers" element={<AdminLayout><Vouchers /></AdminLayout>} />
                <Route path="/admin/banners" element={<AdminLayout><Banners /></AdminLayout>} />
                <Route path="/admin/blogs" element={<AdminLayout><Blogs /></AdminLayout>} />

                {/* ── Customer Auth pages (no layout) ── */}
                <Route path="/dang-nhap" element={<LoginPage />} />
                <Route path="/dang-ky" element={<LoginPage />} />
                <Route path="/xac-thuc-email" element={<VerifyEmailPage />} />
                <Route path="/thanh-toan/ket-qua" element={<PaymentReturnPage />} />

                {/* ── Customer pages ── */}
                <Route path="/" element={<CustomerLayout><HomePage /></CustomerLayout>} />
                <Route path="/danh-muc/:slug" element={<CustomerLayout><CategoryPage /></CustomerLayout>} />
                <Route path="/san-pham/:slug" element={<CustomerLayout><ProductDetailPage /></CustomerLayout>} />
                <Route path="/gio-hang" element={<CustomerLayout><CartPage /></CustomerLayout>} />
                <Route path="/thanh-toan" element={<CustomerLayout><CheckoutPage /></CustomerLayout>} />
                <Route path="/tim-kiem" element={<CustomerLayout><SearchPage /></CustomerLayout>} />
                <Route path="/tra-cuu-don-hang" element={<CustomerLayout><OrderTrackingPage /></CustomerLayout>} />
                <Route path="/diem-sach" element={<CustomerLayout><BlogPage /></CustomerLayout>} />
                <Route path="/blog/:slug" element={<CustomerLayout><BlogDetailPage /></CustomerLayout>} />
                <Route path="/yeu-thich" element={<CustomerLayout><WishlistPage /></CustomerLayout>} />
                <Route path="/collections/:slug" element={<CustomerLayout><CategoryPage /></CustomerLayout>} />
                <Route path="*" element={<CustomerLayout><NotFoundPage /></CustomerLayout>} />
              </Routes>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </AdminAuthProvider>
    </BrowserRouter>
  );
}
