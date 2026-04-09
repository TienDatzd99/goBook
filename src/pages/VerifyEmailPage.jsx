import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) { setStatus('error'); setMessage('Link xác nhận không hợp lệ.'); return; }

    verifyEmail(token)
      .then(() => { setStatus('success'); setTimeout(() => navigate('/'), 4000); })
      .catch(err => { setStatus('error'); setMessage(err.error || 'Link đã hết hạn hoặc không hợp lệ.'); });
  }, []);

  return (
    <div className="login-page">
      <div className="login-card" style={{ textAlign: 'center' }}>
        <div className="login-logo">
          <span>📚</span>
          <div>
            <div className="login-logo-name">goBook</div>
            <div className="login-logo-slogan">Ươm mầm tri thức</div>
          </div>
        </div>

        {status === 'loading' && (
          <div style={{ padding: '40px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <div style={{ fontWeight: 600, color: '#555' }}>Đang xác nhận email...</div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ padding: '40px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: '#2e7d32', marginBottom: 8 }}>Xác nhận thành công!</h2>
            <p style={{ color: '#555', marginBottom: 24 }}>
              Tài khoản của bạn đã được kích hoạt.<br/>Bạn sẽ được chuyển về trang chủ sau giây lát...
            </p>
            <Link to="/" className="btn btn-primary btn-lg">🏠 Về trang chủ ngay</Link>
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: '40px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>❌</div>
            <h2 style={{ color: '#c62828', marginBottom: 8 }}>Xác nhận thất bại</h2>
            <p style={{ color: '#555', marginBottom: 24 }}>{message}</p>
            <Link to="/dang-nhap" className="btn btn-primary">Đăng nhập / Đăng ký</Link>
          </div>
        )}
      </div>
    </div>
  );
}
