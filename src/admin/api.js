const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;

function getToken() {
  return localStorage.getItem('admin_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Lỗi kết nối server' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  // Stats
  dashboard: () => request('/stats/dashboard'),
  revenueByMonth: () => request('/stats/revenue-by-month'),

  // Products
  getProducts: (params = {}) => request('/products?' + new URLSearchParams(params)),
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),

  // Orders
  getOrders: (params = {}) => request('/orders?' + new URLSearchParams(params)),
  getOrder: (id) => request(`/orders/${id}`),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

  // Users
  getUsers: (params = {}) => request('/users?' + new URLSearchParams(params)),
  getUser: (id) => request(`/users/${id}`),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleUserActive: (id) => request(`/users/${id}/toggle-active`, { method: 'PUT' }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),

  // Categories
  getCategories: () => request('/categories'),
  createCategory: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCategory: (id) => request(`/categories/${id}`, { method: 'DELETE' }),

  // Blogs
  getBlogs: (params = {}) => request('/blogs?' + new URLSearchParams(params)),
  getBlog: (id) => request(`/blogs/${id}`),
  createBlog: (data) => request('/blogs', { method: 'POST', body: JSON.stringify(data) }),
  updateBlog: (id, data) => request(`/blogs/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBlog: (id) => request(`/blogs/${id}`, { method: 'DELETE' }),

  // Vouchers
  getVouchers: (params = {}) => request('/vouchers?' + new URLSearchParams(params)),
  getVoucher: (id) => request(`/vouchers/${id}`),
  validateVoucher: (data) => request('/vouchers/validate', { method: 'POST', body: JSON.stringify(data) }),
  createVoucher: (data) => request('/vouchers', { method: 'POST', body: JSON.stringify(data) }),
  updateVoucher: (id, data) => request(`/vouchers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleVoucher: (id) => request(`/vouchers/${id}/toggle`, { method: 'PUT' }),
  deleteVoucher: (id) => request(`/vouchers/${id}`, { method: 'DELETE' }),

  // Banners
  getBanners: (params = {}) => request('/banners?' + new URLSearchParams(params)),
  getBanner: (id) => request(`/banners/${id}`),
  createBanner: (data) => request('/banners', { method: 'POST', body: JSON.stringify(data) }),
  updateBanner: (id, data) => request(`/banners/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  toggleBanner: (id) => request(`/banners/${id}/toggle`, { method: 'PUT' }),
  deleteBanner: (id) => request(`/banners/${id}`, { method: 'DELETE' }),
};
