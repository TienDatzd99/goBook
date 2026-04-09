const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', (req, res) => {
  const cats = db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c LEFT JOIN products p ON c.id = p.category_id
    GROUP BY c.id ORDER BY c.sort_order ASC
  `).all();
  res.json(cats);
});

router.post('/', auth, adminOnly, (req, res) => {
  const { name, slug, icon, sort_order } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Tên và slug là bắt buộc' });
  try {
    const result = db.prepare('INSERT INTO categories (name, slug, icon, sort_order) VALUES (?,?,?,?)').run(name, slug, icon || '📚', sort_order || 0);
    res.status(201).json(db.prepare('SELECT * FROM categories WHERE id=?').get(result.lastInsertRowid));
  } catch { res.status(400).json({ error: 'Slug đã tồn tại' }); }
});

router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, slug, icon, sort_order } = req.body;
  const result = db.prepare('UPDATE categories SET name=?,slug=?,icon=?,sort_order=? WHERE id=?').run(name, slug, icon, sort_order, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
  res.json(db.prepare('SELECT * FROM categories WHERE id=?').get(req.params.id));
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  const productCount = db.prepare('SELECT COUNT(*) as c FROM products WHERE category_id=?').get(req.params.id).c;
  if (productCount > 0) return res.status(400).json({ error: `Danh mục đang có ${productCount} sản phẩm, không thể xóa` });
  const result = db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy danh mục' });
  res.json({ message: 'Đã xóa danh mục' });
});

module.exports = router;
