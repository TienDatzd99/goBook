const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET all reviews (Admin gets all, Customer gets theirs)
router.get('/', auth, (req, res) => {
  try {
    let query = `
      SELECT r.*, u.name as customer_name, p.name as product_name, p.image as product_image, o.code as order_code
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      JOIN orders o ON r.order_id = o.id
    `;
    let params = [];

    if (req.user.role !== 'admin') {
      query += ` WHERE r.user_id = ?`;
      params.push(req.user.id);
    }
    
    query += ` ORDER BY r.created_at DESC`;
    const reviews = db.prepare(query).all(params);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET public reviews for a product
router.get('/product/:productId', (req, res) => {
  try {
    const reviews = db.prepare(`
      SELECT r.*, u.name as customer_name, u.avatar
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      JOIN products p ON r.product_id = p.id
      WHERE (p.id = ? OR p.slug = ? OR p.slug LIKE '%' || ? || '%') AND r.is_visible = 1
      ORDER BY r.created_at DESC
    `).all(req.params.productId, req.params.productId, req.params.productId);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a review
router.post('/', auth, (req, res) => {
  const { order_id, product_id, rating, comment } = req.body;
  if (!order_id || !product_id || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if order belongs to user and is delivered
    const order = db.prepare(`SELECT status FROM orders WHERE id = ? AND user_id = ?`).get(order_id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'Chỉ được đánh giá khi đơn đã giao' });

    // Check if already reviewed
    const existing = db.prepare(`SELECT id FROM reviews WHERE order_id = ? AND product_id = ?`).get(order_id, product_id);
    if (existing) return res.status(400).json({ error: 'Sản phẩm trong đơn này đã được đánh giá' });

    db.prepare(`
      INSERT INTO reviews (user_id, product_id, order_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.user.id, product_id, order_id, rating, comment);

    // Update product rating and review count
    const stats = db.prepare(`SELECT AVG(rating) as avg_rating, COUNT(id) as r_count FROM reviews WHERE product_id = ? AND is_visible = 1`).get(product_id);
    db.prepare(`UPDATE products SET rating = ?, review_count = ? WHERE id = ?`).run(stats.avg_rating || 5, stats.r_count || 0, product_id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT reply to a review (Admin)
router.put('/:id/reply', auth, adminOnly, (req, res) => {
  try {
    db.prepare(`UPDATE reviews SET reply = ? WHERE id = ?`).run(req.body.reply, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT toggle visibility (Admin)
router.put('/:id/visibility', auth, adminOnly, (req, res) => {
  try {
    db.prepare(`UPDATE reviews SET is_visible = ? WHERE id = ?`).run(req.body.is_visible ? 1 : 0, req.params.id);
    
    // Recalculate product rating
    const review = db.prepare(`SELECT product_id FROM reviews WHERE id = ?`).get(req.params.id);
    if (review) {
       const stats = db.prepare(`SELECT AVG(rating) as avg_rating, COUNT(id) as r_count FROM reviews WHERE product_id = ? AND is_visible = 1`).get(review.product_id);
       db.prepare(`UPDATE products SET rating = ?, review_count = ? WHERE id = ?`).run(stats.avg_rating || 5, stats.r_count || 0, review.product_id);
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
