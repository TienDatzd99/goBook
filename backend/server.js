require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = new Set(['http://localhost:5173', 'http://localhost:3000']);
if (process.env.FRONTEND_URL) allowedOrigins.add(process.env.FRONTEND_URL);
if (process.env.FRONTEND_URLS) {
  process.env.FRONTEND_URLS.split(',')
    .map((url) => url.trim())
    .filter(Boolean)
    .forEach((url) => allowedOrigins.add(url));
}

const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true';

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server calls and local tools without Origin header.
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);

    if (allowVercelPreviews) {
      try {
        const hostname = new URL(origin).hostname;
        if (hostname.endsWith('.vercel.app')) return callback(null, true);
      } catch (error) {
        // Ignore parsing error and continue to rejection below.
      }
    }

    return callback(new Error('CORS blocked for origin: ' + origin));
  }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`${color}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${Date.now()-start}ms)`);
  });
  next();
});

// ── Routes ────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/blogs', require('./routes/blogs'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/vouchers', require('./routes/vouchers'));
app.use('/api/banners', require('./routes/banners'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/search', require('./routes/search'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 404
app.use((req, res) => res.status(404).json({ error: 'Endpoint không tồn tại' }));

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(500).json({ error: 'Lỗi server nội bộ' });
});

// ── Start ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Server đang chạy tại http://localhost:${PORT}`);
  console.log(`📋 API Docs:`);
  console.log(`   GET  /api/health`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/products`);
  console.log(`   GET  /api/orders   (admin)`);
  console.log(`   GET  /api/stats/dashboard   (admin)`);
  console.log(`\n👤 Admin: admin@minhlongbook.vn / Admin@123\n`);
});
