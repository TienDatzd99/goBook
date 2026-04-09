import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);
const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('mlb_token');
    if (!token) { setLoading(false); return; }
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
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
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    saveSession(data.token, data.user);
    return data.user;
  }, [saveSession]);

  // Register with email
  const register = useCallback(async (formData) => {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data; // { success, message, needVerification }
  }, []);

  // Google OAuth login
  const loginWithGoogle = useCallback(async (credential) => {
    const res = await fetch(`${API}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    saveSession(data.token, data.user);
    return data.user;
  }, [saveSession]);

  // Resend verification email
  const resendVerification = useCallback(async (email) => {
    const res = await fetch(`${API}/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw data;
    return data;
  }, []);

  // Verify email token (called from VerifyEmailPage)
  const verifyEmail = useCallback(async (token) => {
    const res = await fetch(`${API}/verify-email?token=${token}`);
    const data = await res.json();
    if (!res.ok) throw data;
    saveSession(data.token, data.user);
    return data;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('mlb_token');
    setUser(null);
  }, []);

  const getToken = useCallback(() => localStorage.getItem('mlb_token'), []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, resendVerification, verifyEmail, logout, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
