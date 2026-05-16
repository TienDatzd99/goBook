const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/users – admin
router.get('/', auth, adminOnly, (req, res) => {
  const { page = 1, limit = 20, search, role } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where = ['1=1'], params = [];
  if (search) { where.push('(name LIKE ? OR email LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (role) { where.push('role = ?'); params.push(role); }

  const users = db.prepare(`
    SELECT id, name, email, role, is_active, phone, created_at,
    (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count
    FROM users WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all([...params, parseInt(limit), offset]);

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM users WHERE ${where.join(' AND ')}`).get(params);
  res.json({ data: users, total, page: parseInt(page), totalPages: Math.ceil(total/parseInt(limit)) });
});

// GET /api/users/:id
router.get('/:id', auth, adminOnly, (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,is_active,phone,address,created_at FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  const orders = db.prepare('SELECT id,code,status,total,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 10').all(req.params.id);
  res.json({ ...user, orders });
});

// PUT /api/users/:id – admin
router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, email, role, is_active, phone } = req.body;
  const result = db.prepare(`UPDATE users SET name=?,email=?,role=?,is_active=?,phone=?,updated_at=datetime('now','localtime') WHERE id=?`).run(name, email, role, is_active ? 1 : 0, phone || '', req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  res.json({ message: 'Cập nhật thành công' });
});

// PUT /api/users/:id/toggle-active
router.put('/:id/toggle-active', auth, adminOnly, (req, res) => {
  const user = db.prepare('SELECT is_active FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  db.prepare('UPDATE users SET is_active=? WHERE id=?').run(user.is_active ? 0 : 1, req.params.id);
  res.json({ message: 'Cập nhật trạng thái thành công', is_active: !user.is_active });
});

// POST /api/users – admin creates new user
router.post('/', auth, adminOnly, (req, res) => {
  const { name, email, password, role = 'customer', phone } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(`INSERT INTO users (name, email, password_hash, role, phone) VALUES (?,?,?,?,?)`).run(name, email, hash, role, phone || '');
    res.status(201).json({ id: result.lastInsertRowid, name, email, role });
  } catch { res.status(400).json({ error: 'Email đã tồn tại' }); }
});

// DELETE /api/users/:id – admin
router.delete('/:id', auth, adminOnly, (req, res) => {
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ error: 'Không thể xóa tài khoản đang đăng nhập' });
  const result = db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  res.json({ message: 'Đã xóa người dùng' });
});

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// PUT /api/users/me - Update profile
router.put('/me', auth, (req, res) => {
  const { name, phone } = req.body;
  if (!name) return res.status(400).json({ error: 'Tên không được để trống' });
  
  db.prepare(`UPDATE users SET name=?, phone=?, updated_at=datetime('now','localtime') WHERE id=?`)
    .run(name, phone || '', req.user.id);
  
  res.json({ message: 'Cập nhật thông tin thành công' });
});

// GET /api/users/me/addresses
router.get('/me/addresses', auth, (req, res) => {
  const addresses = db.prepare('SELECT * FROM user_addresses WHERE user_id=? ORDER BY is_default DESC, created_at DESC').all(req.user.id);
  res.json(addresses);
});

// POST /api/users/me/addresses
router.post('/me/addresses', auth, (req, res) => {
  const { name, phone, address, is_default } = req.body;
  if (!name || !phone || !address) return res.status(400).json({ error: 'Vui lòng điền đủ thông tin' });

  // If this is the first address or set as default, we might need to unset others
  const currentCount = db.prepare('SELECT COUNT(*) as c FROM user_addresses WHERE user_id=?').get(req.user.id).c;
  const setAsDefault = (is_default || currentCount === 0) ? 1 : 0;

  if (setAsDefault) {
    db.prepare('UPDATE user_addresses SET is_default=0 WHERE user_id=?').run(req.user.id);
  }

  const result = db.prepare(`
    INSERT INTO user_addresses (user_id, name, phone, address, is_default)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, name, phone, address, setAsDefault);

  res.status(201).json({ id: result.lastInsertRowid, message: 'Thêm địa chỉ thành công' });
});

// PUT /api/users/me/addresses/:id
router.put('/me/addresses/:id', auth, (req, res) => {
  const { name, phone, address, is_default } = req.body;
  
  // verify ownership
  const addr = db.prepare('SELECT id FROM user_addresses WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!addr) return res.status(404).json({ error: 'Không tìm thấy địa chỉ' });

  if (is_default) {
    db.prepare('UPDATE user_addresses SET is_default=0 WHERE user_id=?').run(req.user.id);
  }

  db.prepare(`
    UPDATE user_addresses 
    SET name=?, phone=?, address=?, is_default=?, updated_at=datetime('now','localtime') 
    WHERE id=?
  `).run(name, phone, address, is_default ? 1 : 0, req.params.id);

  res.json({ message: 'Cập nhật địa chỉ thành công' });
});

// DELETE /api/users/me/addresses/:id
router.delete('/me/addresses/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM user_addresses WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy địa chỉ' });
  
  // if we deleted the default address, make the most recent one default
  const remaining = db.prepare('SELECT id FROM user_addresses WHERE user_id=? AND is_default=1').get(req.user.id);
  if (!remaining) {
    const latest = db.prepare('SELECT id FROM user_addresses WHERE user_id=? ORDER BY created_at DESC LIMIT 1').get(req.user.id);
    if (latest) {
      db.prepare('UPDATE user_addresses SET is_default=1 WHERE id=?').run(latest.id);
    }
  }

  res.json({ message: 'Đã xóa địa chỉ' });
});

module.exports = router;
