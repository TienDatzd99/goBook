import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './AdminAuthContext';
import './admin.css';

export default function AdminLogin() {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: 'admin@gobook.vn', password: 'Admin@123' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="admin-login-page">
      <div className="al-card">
        <div className="al-header">
          <div className="al-logo">📚</div>
          <h1>goBook</h1>
          <p>Trang quản trị hệ thống</p>
        </div>

        {error && <div className="al-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="al-form">
          <div className="al-input-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="admin@gobook.vn" required id="admin-email" />
          </div>
          <div className="al-input-group">
            <label>Mật khẩu</label>
            <input type="password" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} placeholder="••••••••" required id="admin-password" />
          </div>
          <button type="submit" className="al-submit" disabled={loading} id="admin-login-btn">
            {loading ? '⏳ Đang đăng nhập...' : '🔐 Đăng nhập'}
          </button>
        </form>

        <div className="al-hint">
          <strong>Demo:</strong> admin@gobook.vn / Admin@123
        </div>
      </div>
    </div>
  );
}
