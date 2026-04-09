import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useGoogleLogin } from '@react-oauth/google';
import './LoginPage.css';

const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
const GOOGLE_LOGIN_ENABLED = GOOGLE_CLIENT_ID.length > 0;

// ── Validation helpers ──
const hasNumber = (str) => /\d/.test(str);
const onlyDigits = (str) => /^\d*$/.test(str);

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(null); // { type: 'verify', email }
  const [resending, setResending] = useState(false);
  const { login, register, loginWithGoogle, resendVerification } = useAuth();
  const navigate = useNavigate();

  // ── Per-field validation ──
  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        if (!value) return 'Vui lòng nhập họ và tên';
        if (hasNumber(value)) return 'Họ tên không được chứa chữ số';
        if (value.trim().length < 2) return 'Họ tên phải có ít nhất 2 ký tự';
        return '';
      case 'phone':
        if (value && !onlyDigits(value)) return 'Số điện thoại chỉ được chứa chữ số';
        if (value && value.length < 9) return 'Số điện thoại phải có ít nhất 9 chữ số';
        return '';
      case 'email':
        if (!value) return 'Vui lòng nhập email';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Email không hợp lệ';
        return '';
      case 'password':
        if (!value) return 'Vui lòng nhập mật khẩu';
        if (value.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
        return '';
      case 'confirm':
        if (!isLogin && value !== form.password) return 'Mật khẩu xác nhận không khớp';
        return '';
      default: return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Block numbers in name field
    if (name === 'name' && hasNumber(value)) {
      setErrors(err => ({ ...err, name: 'Họ tên không được chứa chữ số' }));
      return; // Don't update the value
    }

    // Block non-digits in phone field
    if (name === 'phone' && !onlyDigits(value)) {
      setErrors(err => ({ ...err, phone: 'Số điện thoại chỉ được chứa chữ số' }));
      return;
    }

    setForm(f => ({ ...f, [name]: value }));
    const fieldError = validateField(name, value);
    setErrors(err => ({ ...err, [name]: fieldError }));
    if (apiError) setApiError('');
  };

  const validateAll = () => {
    const fields = isLogin
      ? ['email', 'password']
      : ['name', 'email', 'password', 'confirm'];
    const newErrors = {};
    let hasError = false;
    fields.forEach(f => {
      newErrors[f] = validateField(f, form[f]);
      if (newErrors[f]) hasError = true;
    });
    if (!isLogin && form.phone) {
      newErrors.phone = validateField('phone', form.phone);
      if (newErrors.phone) hasError = true;
    }
    setErrors(newErrors);
    return !hasError;
  };

  // ── Submit login/register ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;
    setApiError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(form.email, form.password);
        navigate('/');
      } else {
        const result = await register({ name: form.name.trim(), email: form.email, password: form.password, phone: form.phone });
        if (result.needVerification) {
          setSuccessState({ type: 'verify', email: form.email });
        }
      }
    } catch (err) {
      if (err.needVerification) {
        setSuccessState({ type: 'verify', email: form.email });
      } else {
        setApiError(err.error || 'Đã xảy ra lỗi. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Google OAuth ──
  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    setApiError('');
    try {
      // tokenResponse.access_token — use implicit flow to get userinfo
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      }).then(r => r.json());

      // Build a fake credential-like payload for backend
      // Backend will accept google_id + email + name directly
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credential: null,
          googleUser: {
            sub: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
            picture: userInfo.picture,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      localStorage.setItem('mlb_token', data.token);
      navigate('/');
    } catch (err) {
      setApiError(err.error || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => setApiError('Đăng nhập Google bị hủy hoặc thất bại'),
  });

  const handleGoogleClick = () => {
    if (!GOOGLE_LOGIN_ENABLED) {
      setApiError('Google Login chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
      return;
    }
    googleLogin();
  };

  // ── Resend verification email ──
  const handleResend = async () => {
    if (!successState?.email) return;
    setResending(true);
    try {
      await resendVerification(successState.email);
      setApiError('');
      alert('✅ Email xác nhận đã được gửi lại! Vui lòng kiểm tra hộp thư.');
    } catch (err) {
      setApiError(err.error || 'Không thể gửi lại email.');
    } finally {
      setResending(false);
    }
  };

  // ── Verify pending screen ──
  if (successState?.type === 'verify') {
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
          <div style={{ padding: '24px 0' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📬</div>
            <h2 style={{ color: '#1a1a2e', marginBottom: 8 }}>Kiểm tra email của bạn!</h2>
            <p style={{ color: '#555', lineHeight: 1.6, marginBottom: 8 }}>
              Chúng tôi đã gửi email xác nhận đến<br/>
              <strong style={{ color: '#d32f2f' }}>{successState.email}</strong>
            </p>
            <p style={{ color: '#777', fontSize: 13, marginBottom: 24 }}>
              Nhấn vào link trong email để kích hoạt tài khoản. Link có hiệu lực trong 24 giờ.
            </p>
            {apiError && <div className="auth-error" style={{ marginBottom: 16 }}>{apiError}</div>}
            <div className="verify-actions">
              <button
                className="btn btn-outline"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? '⏳ Đang gửi...' : '🔄 Gửi lại email'}
              </button>
              <button
                className="btn btn-primary"
                onClick={() => { setSuccessState(null); setIsLogin(true); }}
              >
                🔑 Đến trang đăng nhập
              </button>
            </div>
          </div>
          <div className="login-back">
            <Link to="/">← Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Google Login prominently at top */}
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="social-auth-btn google-primary"
            id="google-login"
            onClick={handleGoogleClick}
            disabled={loading || !GOOGLE_LOGIN_ENABLED}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '12px 16px',
              border: '1.5px solid #e0e0e0',
              borderRadius: 10,
              background: GOOGLE_LOGIN_ENABLED ? '#fff' : '#f5f5f5',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 600,
              color: GOOGLE_LOGIN_ENABLED ? '#333' : '#888',
              boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'all 0.15s',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLogin ? 'Đăng nhập với Google' : 'Đăng ký với Google'}
          </button>
        </div>

        <div className="login-divider"><span>hoặc dùng email</span></div>

        <div className="login-tabs">
          <button className={`login-tab ${isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(true); setErrors({}); setApiError(''); }} id="tab-login">Đăng nhập</button>
          <button className={`login-tab ${!isLogin ? 'active' : ''}`} onClick={() => { setIsLogin(false); setErrors({}); setApiError(''); }} id="tab-register">Đăng ký</button>
        </div>

        <form onSubmit={handleSubmit} id="auth-form" noValidate>
          {/* Họ tên – register only */}
          {!isLogin && (
            <div className={`form-group ${errors.name ? 'has-error' : ''}`}>
              <label htmlFor="name">Họ và tên *</label>
              <input
                className={`form-control ${errors.name ? 'error' : ''}`}
                id="name" name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Nguyễn Văn An"
                required
                autoComplete="name"
              />
              {errors.name && <div className="field-error">⚠️ {errors.name}</div>}
              <div className="field-hint">Chỉ nhập chữ cái, không nhập số</div>
            </div>
          )}

          {/* Phone – register only */}
          {!isLogin && (
            <div className={`form-group ${errors.phone ? 'has-error' : ''}`}>
              <label htmlFor="phone">Số điện thoại</label>
              <input
                className={`form-control ${errors.phone ? 'error' : ''}`}
                id="phone" name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="0966160925"
                inputMode="numeric"
                maxLength={11}
              />
              {errors.phone && <div className="field-error">⚠️ {errors.phone}</div>}
              <div className="field-hint">Chỉ nhập chữ số (9-11 ký tự)</div>
            </div>
          )}

          {/* Email */}
          <div className={`form-group ${errors.email ? 'has-error' : ''}`}>
            <label htmlFor="email">Email *</label>
            <input
              className={`form-control ${errors.email ? 'error' : ''}`}
              id="email" name="email" type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="email@example.com"
              required
              autoComplete="email"
            />
            {errors.email && <div className="field-error">⚠️ {errors.email}</div>}
          </div>

          {/* Password */}
          <div className={`form-group ${errors.password ? 'has-error' : ''}`}>
            <label htmlFor="password">Mật khẩu *</label>
            <input
              className={`form-control ${errors.password ? 'error' : ''}`}
              id="password" name="password" type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            {errors.password && <div className="field-error">⚠️ {errors.password}</div>}
          </div>

          {/* Confirm password – register only */}
          {!isLogin && (
            <div className={`form-group ${errors.confirm ? 'has-error' : ''}`}>
              <label htmlFor="confirm">Xác nhận mật khẩu *</label>
              <input
                className={`form-control ${errors.confirm ? 'error' : ''}`}
                id="confirm" name="confirm" type="password"
                value={form.confirm}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
              {errors.confirm && <div className="field-error">⚠️ {errors.confirm}</div>}
            </div>
          )}

          {/* API error */}
          {apiError && (
            <div className="auth-error">
              {apiError}
              {apiError.includes('xác thực') && (
                <button type="button" onClick={handleResend} disabled={resending} style={{ marginLeft: 8, textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                  {resending ? 'Đang gửi...' : 'Gửi lại email'}
                </button>
              )}
            </div>
          )}

          {isLogin && (
            <div className="forgot-link">
              <a href="#">Quên mật khẩu?</a>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg w-full" id="auth-submit" disabled={loading}>
            {loading ? '⏳ Đang xử lý...' : isLogin ? '🔑 Đăng nhập' : '✨ Tạo tài khoản'}
          </button>
        </form>

        <div className="login-back">
          <Link to="/">← Về trang chủ</Link>
        </div>
      </div>
    </div>
  );
}
