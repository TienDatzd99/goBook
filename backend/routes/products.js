const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/products?page=1&limit=20&category=&search=&sort=
router.get('/', (req, res) => {
  const { page = 1, limit = 20, category, search, sort = 'created_at_desc', is_new, is_bestseller } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ['1=1'];
  let params = [];

  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (search) { where.push('(p.name LIKE ? OR p.author LIKE ? OR p.publisher LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (is_new === '1') { where.push('p.is_new = 1'); }
  if (is_bestseller === '1') { where.push('p.is_bestseller = 1'); }

  const orderMap = {
    'created_at_desc': 'p.created_at DESC',
    'price_asc': 'p.price ASC',
    'price_desc': 'p.price DESC',
    'discount_desc': 'p.discount DESC',
    'rating_desc': 'p.rating DESC',
    'stock_asc': 'p.stock ASC',
  };
  const orderBy = orderMap[sort] || 'p.created_at DESC';

  const sql = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${where.join(' AND ')}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) as total
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE ${where.join(' AND ')}
  `;

  const products = db.prepare(sql).all([...params, parseInt(limit), offset]);
  const { total } = db.prepare(countSql).get(params);

  res.json({ data: products, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ? OR p.slug = ?
  `).get(req.params.id, req.params.id);

  if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  res.json(product);
});

// POST /api/products – admin only
router.post('/', auth, adminOnly, (req, res) => {
  const { name, slug, price, original_price, discount, stock, category_id, publisher, author, description, image, is_new, is_bestseller, sku } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Tên và giá sản phẩm là bắt buộc' });

  const finalSlug = slug || name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  try {
    const result = db.prepare(`
      INSERT INTO products (name, slug, price, original_price, discount, stock, category_id, publisher, author, description, image, is_new, is_bestseller, sku)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, finalSlug, price, original_price || 0, discount || 0, stock || 0, category_id, publisher || '', author || '', description || '', image || '', is_new ? 1 : 0, is_bestseller ? 1 : 0, sku || '');

    const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newProduct);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Slug đã tồn tại' });
    throw err;
  }
});

// PUT /api/products/:id – admin only
router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, slug, price, original_price, discount, stock, category_id, publisher, author, description, image, is_new, is_bestseller, sku } = req.body;
  const existing = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

  db.prepare(`
    UPDATE products SET name=?, slug=?, price=?, original_price=?, discount=?, stock=?, category_id=?,
    publisher=?, author=?, description=?, image=?, is_new=?, is_bestseller=?, sku=?,
    updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(name, slug, price, original_price, discount, stock, category_id, publisher, author, description, image, is_new ? 1 : 0, is_bestseller ? 1 : 0, sku, req.params.id);

  res.json(db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id));
});

// DELETE /api/products/:id – admin only
router.delete('/:id', auth, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  res.json({ message: 'Đã xóa sản phẩm' });
});

module.exports = router;
