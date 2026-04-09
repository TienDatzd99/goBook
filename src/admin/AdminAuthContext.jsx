import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      api.me().then(r => setAdmin(r.user)).catch(() => localStorage.removeItem('admin_token')).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const r = await api.login({ email, password });
    if (r.user.role !== 'admin') throw new Error('Tài khoản không có quyền admin');
    localStorage.setItem('admin_token', r.token);
    setAdmin(r.user);
    return r;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('admin_token');
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, login, logout, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export const useAdminAuth = () => useContext(AdminAuthContext);
