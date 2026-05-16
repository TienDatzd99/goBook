const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET all complaints (Admin gets all, Customer gets theirs)
router.get('/', auth, (req, res) => {
  try {
    let query = `
      SELECT c.*, u.name as customer_name, o.code as order_code
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      JOIN orders o ON c.order_id = o.id
    `;
    let params = [];

    if (req.user.role !== 'admin') {
      query += ` WHERE c.user_id = ?`;
      params.push(req.user.id);
    }
    
    query += ` ORDER BY c.created_at DESC`;
    const complaints = db.prepare(query).all(params);
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a complaint
router.post('/', auth, (req, res) => {
  const { order_id, type, description } = req.body;
  if (!order_id || !type || !description) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const order = db.prepare(`SELECT status FROM orders WHERE id = ? AND user_id = ?`).get(order_id, req.user.id);
    if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    if (order.status !== 'delivered') return res.status(400).json({ error: 'Chỉ được khiếu nại đơn đã giao' });

    db.prepare(`
      INSERT INTO complaints (user_id, order_id, type, description)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, order_id, type, description);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update complaint status/reply (Admin)
router.put('/:id', auth, adminOnly, (req, res) => {
  const { status, admin_reply } = req.body;
  try {
    db.prepare(`
      UPDATE complaints 
      SET status = COALESCE(?, status), 
          admin_reply = COALESCE(?, admin_reply),
          updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(status, admin_reply, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
