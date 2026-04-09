const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/banners – public (filter by position for frontend)
router.get('/', (req, res) => {
  const { position, is_active } = req.query;
  let where = ['1=1'], params = [];
  if (position) { where.push('position=?'); params.push(position); }
  if (is_active !== undefined) { where.push('is_active=?'); params.push(parseInt(is_active)); }

  const banners = db.prepare(`SELECT * FROM banners WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, created_at DESC`).all(params);
  res.json(banners);
});

// GET /api/banners/:id – admin
router.get('/:id', auth, adminOnly, (req, res) => {
  const b = db.prepare('SELECT * FROM banners WHERE id=?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Không tìm thấy banner' });
  res.json(b);
});

// POST /api/banners/click/:id – track click (public)
router.post('/click/:id', (req, res) => {
  db.prepare('UPDATE banners SET click_count=click_count+1 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/banners – admin create
router.post('/', auth, adminOnly, (req, res) => {
  const { title, subtitle, image, link, position, button_text, bg_color, sort_order, is_active, start_date, end_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Tiêu đề banner là bắt buộc' });

  const result = db.prepare(`
    INSERT INTO banners (title, subtitle, image, link, position, button_text, bg_color, sort_order, is_active, start_date, end_date)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    title, subtitle||'', image||'', link||'/',
    position||'hero', button_text||'Xem ngay',
    bg_color||'linear-gradient(135deg,#d32f2f,#7b1fa2)',
    parseInt(sort_order)||0, is_active?1:1,
    start_date||null, end_date||null
  );
  res.status(201).json(db.prepare('SELECT * FROM banners WHERE id=?').get(result.lastInsertRowid));
});

// PUT /api/banners/:id – admin update
router.put('/:id', auth, adminOnly, (req, res) => {
  const { title, subtitle, image, link, position, button_text, bg_color, sort_order, is_active, start_date, end_date } = req.body;
  const existing = db.prepare('SELECT id FROM banners WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy banner' });

  db.prepare(`
    UPDATE banners SET title=?,subtitle=?,image=?,link=?,position=?,button_text=?,bg_color=?,
    sort_order=?,is_active=?,start_date=?,end_date=?,updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(
    title, subtitle||'', image||'', link||'/',
    position||'hero', button_text||'Xem ngay',
    bg_color||'', parseInt(sort_order)||0,
    is_active?1:0, start_date||null, end_date||null,
    req.params.id
  );
  res.json(db.prepare('SELECT * FROM banners WHERE id=?').get(req.params.id));
});

// PUT /api/banners/:id/toggle
router.put('/:id/toggle', auth, adminOnly, (req, res) => {
  const b = db.prepare('SELECT is_active FROM banners WHERE id=?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Không tìm thấy banner' });
  db.prepare('UPDATE banners SET is_active=? WHERE id=?').run(b.is_active ? 0 : 1, req.params.id);
  res.json({ is_active: !b.is_active });
});

// DELETE /api/banners/:id
router.delete('/:id', auth, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM banners WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy banner' });
  res.json({ message: 'Đã xóa banner' });
});

module.exports = router;
