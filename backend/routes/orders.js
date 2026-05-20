const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const { getTransporter } = require('../utils/mailer');
const { FREE_SHIPPING_THRESHOLD, DEFAULT_SHIPPING_FEE } = require('../config');
const router = express.Router();

function generateOrderCode() {
  const num = db.prepare('SELECT COUNT(*) as c FROM orders').get().c + 1;
  return 'MLB' + String(num).padStart(8, '0');
}

function fmt(n) { return Number(n).toLocaleString('vi-VN') + '₫'; }

// ── Email helpers ──
async function sendOrderEmail(order, items, type) {
  let t;
  try { t = await getTransporter(); } catch { return; }

  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${i.product_name}</td>
      <td style="text-align:center;border-bottom:1px solid #f0f0f0;">x${i.quantity}</td>
      <td style="text-align:right;border-bottom:1px solid #f0f0f0;">${fmt(i.subtotal)}</td>
    </tr>`
  ).join('');

  const BANK_INFO = `
    <div style="background:#f0f7ff;border:1.5px solid #bbdefb;border-radius:10px;padding:16px 20px;margin:16px 0;">
      <div style="font-weight:700;font-size:15px;color:#1565c0;margin-bottom:10px;">🏦 Thông tin chuyển khoản</div>
      <table style="width:100%;font-size:14px;">
        <tr><td style="color:#777;padding:3px 0;">Ngân hàng:</td><td style="font-weight:600;">Vietcombank</td></tr>
        <tr><td style="color:#777;padding:3px 0;">Số tài khoản:</td><td style="font-weight:600;letter-spacing:1px;">1054599581</td></tr>
        <tr><td style="color:#777;padding:3px 0;">Tên chủ TK:</td><td style="font-weight:600;">LE TIEN DAT</td></tr>
        <tr><td style="color:#777;padding:3px 0;">Số tiền:</td><td style="font-weight:800;color:#d32f2f;font-size:16px;">${fmt(order.total)}</td></tr>
        <tr><td style="color:#777;padding:3px 0;">Nội dung CK:</td><td style="font-weight:700;color:#1565c0;">${order.code}</td></tr>
      </table>
    </div>
  `;

  const subjects = {
    cod_customer: `📦 Đặt hàng thành công - Chờ xác nhận | ${order.code}`,
    bank_customer: `✅ Đơn hàng đã xác nhận - Chờ thanh toán | ${order.code}`,
    momo_customer: `✅ Đơn hàng đã xác nhận | ${order.code}`,
    vietqr_customer: `✅ Đơn hàng đã xác nhận - Thanh toán VietQR | ${order.code}`,
    cod_admin: `🔔 Đơn hàng mới cần xác nhận: ${order.code}`,
    confirmed_customer: `✅ Đơn hàng đã được xác nhận! | ${order.code}`,
  };

  const bodies = {
    cod_customer: `
      <div style="font-size:16px;color:#e65100;font-weight:700;margin-bottom:8px;">⏳ Đơn hàng đang chờ admin xác nhận</div>
      <p style="color:#555;">Cảm ơn bạn đã đặt hàng! Đơn hàng <strong>${order.code}</strong> của bạn đã được tiếp nhận và đang chờ xác nhận từ đội ngũ goBook.<br/>Chúng tôi sẽ liên hệ qua số <strong>${order.phone}</strong> để xác nhận trong vòng <strong>30 phút</strong>.</p>
    `,
    bank_customer: `
      <div style="font-size:16px;color:#1565c0;font-weight:700;margin-bottom:8px;">✅ Đơn hàng đã được tiếp nhận!</div>
      <p style="color:#555;">Đơn hàng <strong>${order.code}</strong> đã được tiếp nhận. Vui lòng chuyển khoản để hoàn tất quá trình thanh toán:</p>
      ${BANK_INFO}
      <p style="color:#777;font-size:13px;">⚠️ Đơn hàng sẽ được xác nhận và giao sau khi chúng tôi nhận được thanh toán.</p>
    `,
    momo_customer: `
      <div style="font-size:16px;color:#ae1c7b;font-weight:700;margin-bottom:8px;">✅ Đơn hàng đã được tiếp nhận!</div>
      <p style="color:#555;">Đơn hàng <strong>${order.code}</strong> đã được tiếp nhận. Vui lòng thanh toán qua MoMo số <strong>0966160925</strong> (goBook), số tiền: <strong style="color:#d32f2f;">${fmt(order.total)}</strong>, nội dung: <strong>${order.code}</strong>.</p>
    `,
    vietqr_customer: `
      <div style="font-size:16px;color:#0288d1;font-weight:700;margin-bottom:8px;">✅ Đơn hàng đã được tiếp nhận!</div>
      <p style="color:#555;">Đơn hàng <strong>${order.code}</strong> đã được tiếp nhận. Vui lòng quét mã VietQR trên website hoặc chuyển khoản vào tài khoản Vietcombank (1054599581 - LE TIEN DAT) với nội dung: <strong>${order.code}</strong>. Hệ thống sẽ tự động xác nhận sau khi nhận được thanh toán.</p>
    `,
    cod_admin: `
      <p>Đơn hàng <strong>${order.code}</strong> mới cần xác nhận (COD):</p>
      <ul>
        <li>Khách: <strong>${order.customer_name}</strong></li>
        <li>SĐT: ${order.phone}</li>
        <li>Địa chỉ: ${order.address}, ${order.city}</li>
        <li>Tổng: <strong style="color:#d32f2f;">${fmt(order.total)}</strong></li>
      </ul>
      <a href="http://localhost:5173/admin/orders" style="background:#d32f2f;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;display:inline-block;margin-top:8px;">👉 Vào trang quản lý</a>
    `,
    confirmed_customer: `
      <div style="font-size:16px;color:#2e7d32;font-weight:700;margin-bottom:8px;">🎉 Đơn hàng đã được xác nhận!</div>
      <p style="color:#555;">Admin đã xác nhận đơn hàng <strong>${order.code}</strong> của bạn. Đơn hàng sẽ được giao trong 2–3 ngày làm việc.</p>
    `,
  };

  const base = `
    <!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
    <body style="margin:0;padding:20px;background:#f5f5f5;font-family:'Segoe UI',sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
        <div style="background:linear-gradient(135deg,#d32f2f,#7b1fa2);padding:28px 32px;text-align:center;">
          <h1 style="color:#fff;margin:0;font-size:22px;">📚 goBook</h1>
          <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">Ươm mầm tri thức</p>
        </div>
        <div style="padding:28px 32px;">
          ${bodies[type] || ''}
          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <thead><tr style="background:#f8f8f8;"><th style="padding:8px;text-align:left;font-size:13px;">Sản phẩm</th><th style="text-align:center;font-size:13px;">SL</th><th style="text-align:right;font-size:13px;">Tiền</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
          <div style="text-align:right;font-size:15px;font-weight:700;color:#d32f2f;">Tổng: ${fmt(order.total)}</div>
        </div>
      </div>
    </body></html>
  `;

  const to = type.endsWith('admin')
    ? (process.env.MAIL_USER || 'admin@gobook.vn')
    : (order.email || '');

  if (!to) return;

  const info = await t.sendMail({ from: process.env.MAIL_FROM || '"goBook" <noreply@minhlongbook.vn>', to, subject: subjects[type], html: base });
  const preview = require('nodemailer').getTestMessageUrl(info);
  if (preview) console.log(`📧 [DEV] Email (${type}): ${preview}`);
}

// ── Admin: GET all orders ──
router.get('/', auth, adminOnly, (req, res) => {
  const { page = 1, limit = 20, status, search, date_from, date_to } = req.query;
  const offset = (parseInt(page)-1) * parseInt(limit);
  let where = ['1=1'], params = [];

  if (status && status !== 'all') { where.push('o.status = ?'); params.push(status); }
  if (search) { where.push('(o.code LIKE ? OR o.customer_name LIKE ? OR o.phone LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (date_from) { where.push('date(o.created_at) >= ?'); params.push(date_from); }
  if (date_to) { where.push('date(o.created_at) <= ?'); params.push(date_to); }

  const orders = db.prepare(`
    SELECT o.*, u.name as user_name
    FROM orders o LEFT JOIN users u ON o.user_id = u.id
    WHERE ${where.join(' AND ')}
    ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `).all([...params, parseInt(limit), offset]);

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM orders o WHERE ${where.join(' AND ')}`).get(params);
  res.json({ data: orders, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

// ── Customer: GET my orders ──
router.get('/my-orders', auth, (req, res) => {
  const { status } = req.query;
  let where = ['user_id = ?'];
  let params = [req.user.id];

  if (status && status !== 'all') {
    where.push('status = ?');
    params.push(status);
  }

  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC
  `).all(params);

  // also fetch items for these orders
  const orderIds = orders.map(o => o.id);
  let itemsByOrderId = {};
  if (orderIds.length > 0) {
    const placeholders = orderIds.map(() => '?').join(',');
    const items = db.prepare(`
      SELECT oi.*, p.slug as product_slug 
      FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id IN (${placeholders})
    `).all(orderIds);
    items.forEach(item => {
      if (!itemsByOrderId[item.order_id]) itemsByOrderId[item.order_id] = [];
      itemsByOrderId[item.order_id].push(item);
    });
  }

  const ordersWithItems = orders.map(o => ({
    ...o,
    items: itemsByOrderId[o.id] || []
  }));

  res.json(ordersWithItems);
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = db.prepare(`
    SELECT o.*, u.name as user_name, u.email as user_email
    FROM orders o LEFT JOIN users u ON o.user_id = u.id
    WHERE o.id = ? OR o.code = ?
  `).get(req.params.id, req.params.id);

  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

  const items = db.prepare(`
    SELECT oi.*, p.slug as product_slug
    FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(order.id);

  res.json({ ...order, items });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders – PUBLIC (create from checkout)
// Logic:
//   COD   → status = 'pending' (chờ admin xác nhận)
//   bank  → status = 'confirmed' (tự xác nhận, chờ CK)
//   momo  → status = 'confirmed' (tự xác nhận, chờ CK)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { customer_name, phone, email, address, city, district, note, payment_method, items, user_id, voucher_code } = req.body;

  if (!customer_name || !phone || !address || !items?.length) {
    return res.status(400).json({ error: 'Thiếu thông tin đơn hàng' });
  }
  if (!/^\d+$/.test(phone)) return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });

  const method = payment_method || 'cod';
  const validMethods = ['cod', 'bank', 'momo', 'vnpay', 'vietqr'];
  if (!validMethods.includes(method)) return res.status(400).json({ error: 'Phương thức thanh toán không hợp lệ' });

  // Determine initial status
  // COD   → 'pending' (đợi admin xác nhận)
  // bank / vietqr → 'pending' (đợi khách chuyển khoản và admin/webhook xác nhận)
  // momo / vnpay → 'pending'
  const initialStatus = 'pending';

  let subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  let discountAmount = 0;

  // Apply voucher if provided
  if (voucher_code) {
    const v = db.prepare('SELECT * FROM vouchers WHERE code=? AND is_active=1').get(voucher_code.toUpperCase());
    if (v && subtotal >= v.min_order_value) {
      if (v.type === 'percent') {
        discountAmount = Math.floor(subtotal * v.value / 100);
        if (v.max_discount > 0) discountAmount = Math.min(discountAmount, v.max_discount);
      } else {
        discountAmount = Math.min(v.value, subtotal);
      }
      // Increment used count
      db.prepare('UPDATE vouchers SET used_count=used_count+1 WHERE id=?').run(v.id);
    }
  }

  // Free shipping applies based on subtotal BEFORE discounts (business choice)
  const shipping_fee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
  const total = subtotal - discountAmount + shipping_fee;
  const code = generateOrderCode();

  const orderResult = db.prepare(`
    INSERT INTO orders (code, user_id, customer_name, phone, email, address, city, district, note,
      payment_method, status, subtotal, shipping_fee, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    code,
    user_id || null,
    customer_name, phone, email || '', address,
    city || '', district || '', note || '',
    method, initialStatus,
    subtotal, shipping_fee, total
  );

  const orderId = orderResult.lastInsertRowid;
  console.log(`📝 [Order] Created: ${code} (ID=${orderId})`);
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal) VALUES (?,?,?,?,?,?,?)`
  );

  items.forEach(item => {
    // Chống lỗi Foreign Key do ID giỏ hàng (Local Storage) không khớp ID thật trong SQLite
    const dbProduct = db.prepare('SELECT id FROM products WHERE name = ? LIMIT 1').get(item.name);
    const validProductId = dbProduct ? dbProduct.id : null;

    insertItem.run(orderId, validProductId, item.name, item.image || '', item.price, item.quantity, item.price * item.quantity);
    if (validProductId) {
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.quantity, validProductId);
    }
  });

  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(orderId);

  // Send emails asynchronously (don't block response)
  const emailPromises = [];

  if (method === 'cod') {
    // Customer: pending notification
    if (email) emailPromises.push(sendOrderEmail(order, orderItems, 'cod_customer'));
    // Admin: new order alert
    emailPromises.push(sendOrderEmail(order, orderItems, 'cod_admin'));
  } else if (method === 'bank') {
    // Customer: confirmed + bank info
    if (email) emailPromises.push(sendOrderEmail(order, orderItems, 'bank_customer'));
  } else if (method === 'momo') {
    // Customer: confirmed + momo info
    if (email) emailPromises.push(sendOrderEmail(order, orderItems, 'momo_customer'));
  } else if (method === 'vietqr') {
    // Customer: confirmed + vietqr info
    if (email) emailPromises.push(sendOrderEmail(order, orderItems, 'vietqr_customer'));
  }

  Promise.allSettled(emailPromises).then(results =>
    results.forEach((r, i) => r.status === 'rejected' && console.error(`Email ${i} failed:`, r.reason?.message))
  );

  const savedOrder = db.prepare('SELECT * FROM orders WHERE code=?').get(code);
  console.log(`✅ [Order] Response sending: ${code}, DB has order:`, !!savedOrder);

  res.status(201).json({
    success: true,
    orderId,
    code,
    total,
    discount: discountAmount,
    status: initialStatus,
    payment_status: 'unpaid',
    payment_method: method,
    message: method === 'cod'
      ? 'Đặt hàng thành công! Đơn hàng đang chờ xác nhận từ admin.'
      : 'Đặt hàng thành công! Đơn hàng đã được tiếp nhận và chờ thanh toán.',
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/orders/:id/status – ADMIN
// When admin confirms cod order → send email to customer
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/status', auth, adminOnly, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Trạng thái không hợp lệ' });

  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });

  db.prepare(`UPDATE orders SET status=?, updated_at=datetime('now','localtime') WHERE id=?`).run(status, req.params.id);

  // If admin confirms a COD order → notify customer
  if (status === 'confirmed' && order.status === 'pending' && order.payment_method === 'cod' && order.email) {
    const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
    const updatedOrder = db.prepare('SELECT * FROM orders WHERE id=?').get(req.params.id);
    sendOrderEmail(updatedOrder, items, 'confirmed_customer').catch(e => console.error('Email error:', e.message));
  }

  res.json({ message: 'Cập nhật trạng thái thành công', status });
});

// DELETE /api/orders/:id – admin
router.delete('/:id', auth, adminOnly, (req, res) => {
  const result = db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  res.json({ message: 'Đã xóa đơn hàng' });
});

// PUT /api/orders/:id/customer-cancel
router.put('/:id/customer-cancel', auth, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id=? AND user_id=?').get(req.params.id, req.user.id);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  if (order.status !== 'pending') return res.status(400).json({ error: 'Chỉ có thể hủy đơn hàng khi đang chờ xác nhận' });

  // Restore stock
  const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id=?').all(order.id);
  for (const item of items) {
    if (item.product_id) {
      db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
    }
  }

  db.prepare(`UPDATE orders SET status='cancelled', updated_at=datetime('now','localtime') WHERE id=?`).run(req.params.id);
  res.json({ success: true, message: 'Đã hủy đơn hàng' });
});

module.exports = router;
