const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// GET /api/products?page=1&limit=20&category=&search=&sort=
router.get('/', (req, res) => {
  const { page = 1, limit = 20, category, search, sort = 'created_at_desc', is_new, is_bestseller, min_price, max_price } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let where = ['1=1'];
  let params = [];

  if (category) { where.push('c.slug = ?'); params.push(category); }
  if (search) { where.push('(p.name LIKE ? OR p.author LIKE ? OR p.publisher LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (is_new === '1') { where.push('p.is_new = 1'); }
  if (is_bestseller === '1') { where.push('p.is_bestseller = 1'); }
  if (min_price !== undefined) { where.push('p.price >= ?'); params.push(parseInt(min_price)); }
  if (max_price !== undefined) { where.push('p.price <= ?'); params.push(parseInt(max_price)); }

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
    SELECT 
      p.id, p.name, p.slug, p.stock, p.category_id, p.publisher, p.author, p.description, p.image, p.is_new, p.is_bestseller, p.sku, p.created_at, p.updated_at, p.pdf_url as pdfUrl, p.images,
      c.name as category_name, c.slug as category_slug,
      COALESCE(camp.campaign_price, p.price) as price,
      CASE WHEN camp.campaign_price IS NOT NULL THEN p.price ELSE p.original_price END as original_price,
      CASE WHEN camp.campaign_price IS NOT NULL THEN camp.discount_percent ELSE p.discount END as discount,
      CASE WHEN camp.campaign_price IS NOT NULL THEN 1 ELSE 0 END as is_flash_sale
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN (
      SELECT product_id, MIN(campaign_price) as campaign_price, discount_percent
      FROM campaign_items ci
      JOIN campaigns c2 ON ci.campaign_id = c2.id
      WHERE c2.is_active = 1
      GROUP BY product_id
    ) camp ON p.id = camp.product_id
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
  products.forEach(p => {
    if (p.images) {
      try { p.images = JSON.parse(p.images); } catch(e) { p.images = []; }
    } else {
      p.images = [];
    }
  });

  const { total } = db.prepare(countSql).get(params);

  res.json({ data: products, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / limit) });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT 
      p.id, p.name, p.slug, p.stock, p.category_id, p.publisher, p.author, p.description, p.image, p.is_new, p.is_bestseller, p.sku, p.created_at, p.updated_at, p.pdf_url as pdfUrl, p.images,
      c.name as category_name, c.slug as category_slug,
      COALESCE(camp.campaign_price, p.price) as price,
      CASE WHEN camp.campaign_price IS NOT NULL THEN p.price ELSE p.original_price END as original_price,
      CASE WHEN camp.campaign_price IS NOT NULL THEN camp.discount_percent ELSE p.discount END as discount,
      CASE WHEN camp.campaign_price IS NOT NULL THEN 1 ELSE 0 END as is_flash_sale
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN (
      SELECT product_id, MIN(campaign_price) as campaign_price, discount_percent
      FROM campaign_items ci
      JOIN campaigns c2 ON ci.campaign_id = c2.id
      WHERE c2.is_active = 1
      GROUP BY product_id
    ) camp ON p.id = camp.product_id
    WHERE p.id = ? OR p.slug = ?
  `).get(req.params.id, req.params.id);

  if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
  if (product.images) {
    try { product.images = JSON.parse(product.images); } catch(e) { product.images = []; }
  } else {
    product.images = [];
  }
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

// POST /api/products/reseed - admin only (Force seed 500 products)
router.post('/reseed', auth, adminOnly, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const productsRealPath = path.join(__dirname, '../../src/data/products_real.js');
    let productsToSeed = [];
    try {
      const content = fs.readFileSync(productsRealPath, 'utf8');
      const arrayStr = content.substring(content.indexOf('['), content.lastIndexOf('];') + 1);
      productsToSeed = JSON.parse(arrayStr);
    } catch (err) {
      console.warn('Could not load products_real.js for seeding:', err.message);
    }
    
    if (productsToSeed.length === 0) {
      return res.status(400).json({ error: 'Không tìm thấy dữ liệu mẫu trong file products_real.js' });
    }

    const catRows = db.prepare('SELECT id, slug FROM categories').all();
    const catMap = {};
    catRows.forEach(c => catMap[c.slug] = c.id);

    const insertProd = db.prepare(`
      INSERT INTO products (name, slug, price, original_price, discount, stock, category_id, publisher, author, description, image, is_new, is_bestseller, sku, rating, review_count, pdf_url, images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let count = 0;
    db.transaction(() => {
      // Set product_id in order_items to NULL to avoid FOREIGN KEY constraint error
      db.prepare('UPDATE order_items SET product_id = NULL').run();
      // Xóa hết sản phẩm cũ trước khi import
      db.prepare('DELETE FROM products').run();
      
      productsToSeed.forEach(p => {
        try {
          const imgs = p.images ? JSON.stringify(p.images) : JSON.stringify([p.image].filter(Boolean));
          insertProd.run(
            p.name, p.slug, p.price, p.originalPrice || p.price, p.discount || 0, p.stock || 100,
            catMap[p.category] || null, p.publisher || '', p.author || '', p.description || '', p.image || '',
            p.isNew ? 1 : 0, p.isBestseller ? 1 : 0, p.sku || '', p.rating || 4.5, p.reviews || 0, p.pdfUrl || null, imgs
          );
          count++;
        } catch(e) { }
      });
    })();

    res.json({ message: `Đã khôi phục thành công ${count} sản phẩm!` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi server khi khôi phục sản phẩm' });
  }
});

module.exports = router;
