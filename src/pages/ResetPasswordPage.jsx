import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function ResetPasswordPage() {
  const { resetPassword } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Link đặt lại mật khẩu không hợp lệ.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Link đặt lại mật khẩu không hợp lệ.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirm) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(token, password);
      setSuccess(result.message || 'Đặt lại mật khẩu thành công.');
      setTimeout(() => navigate('/dang-nhap', { replace: true }), 3000);
    } catch (err) {
      setError(err.error || 'Không thể đặt lại mật khẩu.');
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

        <h2 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>Đặt lại mật khẩu</h2>
        <p style={{ margin: '0 0 24px', color: '#666', lineHeight: 1.6 }}>
          Tạo mật khẩu mới cho tài khoản của bạn. Link này chỉ dùng một lần.
        </p>

        {error && <div className="auth-error">{error}</div>}
        {success && <div className="auth-error" style={{ background: '#e8f5e9', color: '#2e7d32' }}>{success}</div>}

        {!success && (
          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="new-password">Mật khẩu mới *</label>
              <input
                id="new-password"
                className="form-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Xác nhận mật khẩu *</label>
              <input
                id="confirm-password"
                className="form-control"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || !token}>
              {loading ? '⏳ Đang xử lý...' : 'Lưu mật khẩu mới'}
            </button>
          </form>
        )}

        <div className="login-back">
          <Link to="/dang-nhap">← Quay lại đăng nhập</Link>
        </div>
      </div>
    </div>
  );
}