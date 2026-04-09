const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

router.get('/', (req, res) => {
  const { page=1, limit=12, is_published, category } = req.query;
  const offset = (parseInt(page)-1)*parseInt(limit);
  let where=['1=1'], params=[];
  if (is_published !== undefined) { where.push('is_published=?'); params.push(parseInt(is_published)); }
  if (category) { where.push('category=?'); params.push(category); }

  const blogs = db.prepare(`SELECT * FROM blogs WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all([...params, parseInt(limit), offset]);
  const { total } = db.prepare(`SELECT COUNT(*) as total FROM blogs WHERE ${where.join(' AND ')}`).get(params);
  res.json({ data: blogs, total, page: parseInt(page), totalPages: Math.ceil(total/parseInt(limit)) });
});

router.get('/:id', (req, res) => {
  const blog = db.prepare('SELECT * FROM blogs WHERE id=? OR slug=?').get(req.params.id, req.params.id);
  if (!blog) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  db.prepare('UPDATE blogs SET view_count=view_count+1 WHERE id=?').run(blog.id);
  res.json(blog);
});

router.post('/', auth, adminOnly, (req, res) => {
  const { title, slug, excerpt, content, author, category, image, is_published } = req.body;
  if (!title) return res.status(400).json({ error: 'Tiêu đề là bắt buộc' });
  const finalSlug = slug || title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
  try {
    const result = db.prepare(`INSERT INTO blogs (title,slug,excerpt,content,author,category,image,is_published) VALUES (?,?,?,?,?,?,?,?)`).run(title, finalSlug, excerpt||'', content||'', author||'', category||'', image||'', is_published?1:1);
    res.status(201).json(db.prepare('SELECT * FROM blogs WHERE id=?').get(result.lastInsertRowid));
  } catch { res.status(400).json({ error: 'Slug đã tồn tại' }); }
});

router.put('/:id', auth, adminOnly, (req, res) => {
  const { title, slug, excerpt, content, author, category, image, is_published } = req.body;
  const result = db.prepare(`UPDATE blogs SET title=?,slug=?,excerpt=?,content=?,author=?,category=?,image=?,is_published=?,updated_at=datetime('now','localtime') WHERE id=?`)
    .run(title, slug, excerpt, content, author, category, image, is_published?1:0, req.params.id);
  if (result.changes===0) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  res.json(db.prepare('SELECT * FROM blogs WHERE id=?').get(req.params.id));
});

router.delete('/:id', auth, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM blogs WHERE id=?').run(req.params.id);
  if (result.changes===0) return res.status(404).json({ error: 'Không tìm thấy bài viết' });
  res.json({ message: 'Đã xóa bài viết' });
});

module.exports = router;
