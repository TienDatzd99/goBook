import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function ForgotPasswordPage() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await requestPasswordReset(email.trim());
      setSuccess(result.message || 'Nếu email tồn tại, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu trong ít phút.');
    } catch (err) {
      setError(err.error || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <span>📚</span>
          <div>
            <div className="login-logo-name">goBook</div>
            <div className="login-logo-slogan">Ươm mầm tri thức</div>
          </div>
        </div>

        <h2 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>Quên mật khẩu</h2>
        <p style={{ margin: '0 0 24px', color: '#666', lineHeight: 1.6 }}>
          Nhập email đã đăng ký để nhận link đặt lại mật khẩu dùng một lần.
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-error" style={{ background: '#e8f5e9', color: '#2e7d32' }}>{success}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="forgot-email">Email *</label>
            <input
              id="forgot-email"
              className="form-control"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              autoComplete="email"
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
            {loading ? '⏳ Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
          </button>
        </form>

        <div className="login-back">
          <Link to="/dang-nhap">← Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}