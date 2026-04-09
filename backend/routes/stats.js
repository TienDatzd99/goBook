const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/stats/dashboard
router.get('/dashboard', auth, adminOnly, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7); // YYYY-MM
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);

  // Core stats
  const todayRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) as v FROM orders WHERE date(created_at)=? AND status!='cancelled'`).get(today).v;
  const yesterdayRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) as v FROM orders WHERE date(created_at)=? AND status!='cancelled'`).get(yesterday).v;
  const monthRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) as v FROM orders WHERE strftime('%Y-%m',created_at)=? AND status!='cancelled'`).get(thisMonth).v;
  const lastMonthRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) as v FROM orders WHERE strftime('%Y-%m',created_at)=? AND status!='cancelled'`).get(lastMonth).v;

  const totalOrders = db.prepare('SELECT COUNT(*) as c FROM orders').get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM orders WHERE status='pending'").get().c;
  const todayOrders = db.prepare(`SELECT COUNT(*) as c FROM orders WHERE date(created_at)=?`).get(today).c;
  const totalProducts = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  const lowStockProducts = db.prepare('SELECT COUNT(*) as c FROM products WHERE stock <= 5').get().c;
  const totalUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='customer'").get().c;
  const newUsersToday = db.prepare(`SELECT COUNT(*) as c FROM users WHERE date(created_at)=? AND role='customer'`).get(today).c;

  // Revenue by day – last 7 days
  const revenueByDay = db.prepare(`
    SELECT date(created_at) as date, COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
    FROM orders WHERE created_at >= date('now','-6 days') AND status!='cancelled'
    GROUP BY date(created_at) ORDER BY date ASC
  `).all();

  // Fill missing days
  const dailyRevenue = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const found = revenueByDay.find(r => r.date === d);
    dailyRevenue.push({ date: d, revenue: found?.revenue || 0, orders: found?.orders || 0 });
  }

  // Top products by order count
  const topProducts = db.prepare(`
    SELECT p.name, p.image, p.price, SUM(oi.quantity) as sold, SUM(oi.subtotal) as revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status != 'cancelled'
    GROUP BY p.id ORDER BY sold DESC LIMIT 5
  `).all();

  // Order status distribution
  const ordersByStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM orders GROUP BY status
  `).all();

  // Recent orders
  const recentOrders = db.prepare(`
    SELECT o.id, o.code, o.customer_name, o.total, o.status, o.created_at, o.payment_method
    FROM orders o ORDER BY o.created_at DESC LIMIT 10
  `).all();

  res.json({
    stats: {
      todayRevenue, yesterdayRevenue, monthRevenue, lastMonthRevenue,
      totalOrders, pendingOrders, todayOrders,
      totalProducts, lowStockProducts,
      totalUsers, newUsersToday,
    },
    dailyRevenue,
    topProducts,
    ordersByStatus,
    recentOrders,
  });
});

// GET /api/stats/revenue-by-month – last 6 months
router.get('/revenue-by-month', auth, adminOnly, (req, res) => {
  const data = db.prepare(`
    SELECT strftime('%Y-%m', created_at) as month,
    COALESCE(SUM(total),0) as revenue, COUNT(*) as orders
    FROM orders WHERE created_at >= date('now','-5 months','start of month') AND status!='cancelled'
    GROUP BY month ORDER BY month ASC
  `).all();
  res.json(data);
});

module.exports = router;
