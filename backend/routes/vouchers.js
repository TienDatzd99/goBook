const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const router = express.Router();

// ── Helper: Check voucher validity ──
function checkVoucherValidity(v, orderValue) {
  const now = new Date().toISOString().split('T')[0];
  if (!v.is_active) return { ok: false, msg: 'Voucher không hoạt động' };
  if (v.start_date && now < v.start_date) return { ok: false, msg: 'Voucher chưa có hiệu lực' };
  if (v.end_date && now > v.end_date) return { ok: false, msg: 'Voucher đã hết hạn' };
  if (v.usage_limit > 0 && v.used_count >= v.usage_limit) return { ok: false, msg: 'Voucher đã hết lượt sử dụng' };
  if (orderValue < v.min_order_value) return { ok: false, msg: `Đơn hàng tối thiểu ${(v.min_order_value/1000).toFixed(0)}k để dùng voucher này` };
  return { ok: true };
}

function calcDiscount(v, orderValue) {
  if (v.type === 'percent') {
    const disc = Math.floor(orderValue * v.value / 100);
    return v.max_discount > 0 ? Math.min(disc, v.max_discount) : disc;
  }
  return Math.min(v.value, orderValue); // fixed
}

// GET /api/vouchers – admin list
router.get('/', auth, adminOnly, (req, res) => {
  const { search, is_active } = req.query;
  let where = ['1=1'], params = [];
  if (search) { where.push('(code LIKE ? OR name LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }
  if (is_active !== undefined && is_active !== '') { where.push('is_active=?'); params.push(parseInt(is_active)); }

  const vouchers = db.prepare(`SELECT * FROM vouchers WHERE ${where.join(' AND ')} ORDER BY created_at DESC`).all(params);
  res.json(vouchers);
});

// POST /api/vouchers/validate – public (check voucher at checkout)
router.post('/validate', (req, res) => {
  const { code, order_value = 0 } = req.body;
  if (!code) return res.status(400).json({ error: 'Vui lòng nhập mã voucher' });

  const v = db.prepare('SELECT * FROM vouchers WHERE code = ?').get(code.toUpperCase().trim());
  if (!v) return res.status(404).json({ error: 'Mã voucher không tồn tại' });

  const { ok, msg } = checkVoucherValidity(v, order_value);
  if (!ok) return res.status(400).json({ error: msg });

  const discount = calcDiscount(v, order_value);
  res.json({
    valid: true,
    voucher: { id: v.id, code: v.code, name: v.name, type: v.type, value: v.value },
    discount,
    message: `Áp dụng thành công! Giảm ${discount.toLocaleString('vi-VN')}₫`,
  });
});

// GET /api/vouchers/:id
router.get('/:id', auth, adminOnly, (req, res) => {
  const v = db.prepare('SELECT * FROM vouchers WHERE id=? OR code=?').get(req.params.id, req.params.id.toUpperCase());
  if (!v) return res.status(404).json({ error: 'Không tìm thấy voucher' });
  res.json(v);
});

// POST /api/vouchers – admin create
router.post('/', auth, adminOnly, (req, res) => {
  const { code, name, type, value, min_order_value, max_discount, usage_limit, is_active, start_date, end_date, description } = req.body;
  if (!code || !name || !value) return res.status(400).json({ error: 'Mã, tên và giá trị voucher là bắt buộc' });

  try {
    const result = db.prepare(`
      INSERT INTO vouchers (code, name, type, value, min_order_value, max_discount, usage_limit, is_active, start_date, end_date, description)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      code.toUpperCase().trim(), name, type || 'percent',
      parseInt(value), parseInt(min_order_value)||0, parseInt(max_discount)||0,
      parseInt(usage_limit)||0, is_active?1:1,
      start_date||null, end_date||null, description||''
    );
    res.status(201).json(db.prepare('SELECT * FROM vouchers WHERE id=?').get(result.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Mã voucher đã tồn tại' });
    throw err;
  }
});

// PUT /api/vouchers/:id – admin update
router.put('/:id', auth, adminOnly, (req, res) => {
  const { code, name, type, value, min_order_value, max_discount, usage_limit, is_active, start_date, end_date, description } = req.body;
  const existing = db.prepare('SELECT id FROM vouchers WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Không tìm thấy voucher' });

  db.prepare(`
    UPDATE vouchers SET code=?,name=?,type=?,value=?,min_order_value=?,max_discount=?,usage_limit=?,
    is_active=?,start_date=?,end_date=?,description=?,updated_at=datetime('now','localtime')
    WHERE id=?
  `).run(
    code.toUpperCase().trim(), name, type, parseInt(value),
    parseInt(min_order_value)||0, parseInt(max_discount)||0,
    parseInt(usage_limit)||0, is_active?1:0,
    start_date||null, end_date||null, description||'', req.params.id
  );
  res.json(db.prepare('SELECT * FROM vouchers WHERE id=?').get(req.params.id));
});

// PUT /api/vouchers/:id/toggle – toggle active
router.put('/:id/toggle', auth, adminOnly, (req, res) => {
  const v = db.prepare('SELECT is_active FROM vouchers WHERE id=?').get(req.params.id);
  if (!v) return res.status(404).json({ error: 'Không tìm thấy voucher' });
  db.prepare('UPDATE vouchers SET is_active=? WHERE id=?').run(v.is_active ? 0 : 1, req.params.id);
  res.json({ is_active: !v.is_active });
});

// DELETE /api/vouchers/:id
router.delete('/:id', auth, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM vouchers WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy voucher' });
  res.json({ message: 'Đã xóa voucher' });
});

module.exports = router;
