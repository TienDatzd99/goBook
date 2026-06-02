import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'https://gobook.up.railway.app' : 'http://localhost:3001');
const API = `${API_BASE}/api/auth`;
const REQUEST_TIMEOUT_MS = 15000;

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function requestJSON(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      throw {
        error: data.error || `HTTP ${res.status}`,
        needVerification: data.needVerification,
        email: data.email,
      };
    }
    return data;
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw { error: 'Kết nối tới máy chủ quá lâu. Vui lòng thử lại.' };
    }
    if (!err?.error) {
      throw { error: 'Không thể kết nối máy chủ. Kiểm tra VITE_API_URL và backend Railway.' };
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('mlb_token');
    if (!token) { setLoading(false); return; }
    requestJSON('/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(d => { if (d.user) setUser(d.user); })
      .catch(() => localStorage.removeItem('mlb_token'))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = useCallback((token, userData) => {
    localStorage.setItem('mlb_token', token);
    setUser(userData);
  }, []);

  // Login with email/password
  const login = useCallback(async (email, password) => {
    const data = await requestJSON('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    saveSession(data.token, data.user);
    return data.user;
  }, [saveSession]);

  // Register with email
  const register = useCallback(async (formData) => {
    const data = await requestJSON('/register', {
      method: 'POST',
      body: JSON.stringify(formData),
    });
    return data; // { success, message, needVerification }
  }, []);

  // Google OAuth login
  const loginWithGoogle = useCallback(async (credential) => {
    const data = await requestJSON('/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    saveSession(data.token, data.user);
    return data.user;
  }, [saveSession]);

  // Resend verification email
  const resendVerification = useCallback(async (email) => {
    const data = await requestJSON('/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data;
  }, []);

  // Request password reset email
  const requestPasswordReset = useCallback(async (email) => {
    const data = await requestJSON('/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    return data;
  }, []);

  // Reset password using one-time token
  const resetPassword = useCallback(async (token, password) => {
    const data = await requestJSON('/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    return data;
  }, []);

  // Verify email token (called from VerifyEmailPage)
  const verifyEmail = useCallback(async (token) => {
    const data = await requestJSON(`/verify-email?token=${token}`);
    saveSession(data.token, data.user);
    return data;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('mlb_token');
    setUser(null);
  }, []);

  const getToken = useCallback(() => localStorage.getItem('mlb_token'), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, resendVerification, requestPasswordReset, resetPassword, verifyEmail, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
