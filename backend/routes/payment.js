const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const db = require('../database');
const router = express.Router();

const { PayOS } = require('@payos/node');

let payosClient = null;
function getPayOSClient() {
  if (payosClient) return payosClient;

  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

  if (!clientId || !apiKey || !checksumKey) return null;

  payosClient = new PayOS({
    clientId,
    apiKey,
    checksumKey,
  });

  return payosClient;
}

// ─────────────────────────────────────────────────────────────────────────────
// VNPay – dùng thư viện chính thức từ npm
// ─────────────────────────────────────────────────────────────────────────────
const { VNPay, ignoreLogger, ProductCode, VnpLocale } = require('vnpay');

function getVnpayInstance() {
  return new VNPay({
    tmnCode:      process.env.VNPAY_TMN_CODE,
    secureSecret: process.env.VNPAY_HASH_SECRET,
    vnpayHost:    'https://sandbox.vnpayment.vn',
    testMode:     true,
    logger:       ignoreLogger,
  });
}

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.ip ||
    '127.0.0.1'
  ).replace('::ffff:', '');
}

function getVNPayMessage(code) {
  const m = {
    '00': 'Giao dịch thành công',
    '07': 'Trừ tiền thành công nhưng bị nghi ngờ gian lận',
    '09': 'Thẻ/Tài khoản chưa đăng ký InternetBanking',
    '10': 'Xác thực thông tin thẻ quá 3 lần',
    '11': 'Đã hết hạn chờ thanh toán',
    '12': 'Thẻ/Tài khoản bị khóa',
    '13': 'Sai mật khẩu OTP',
    '24': 'Khách hàng hủy giao dịch',
    '51': 'Không đủ số dư',
    '65': 'Vượt hạn mức giao dịch trong ngày',
    '75': 'Ngân hàng đang bảo trì',
    '79': 'Sai mật khẩu thanh toán quá số lần quy định',
    '99': 'Lỗi không xác định',
  };
  return m[code] || `Giao dịch thất bại (mã ${code})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/vnpay/create
// ─────────────────────────────────────────────────────────────────────────────
router.post('/vnpay/create', (req, res) => {
  try {
    const { orderId, orderCode, amount } = req.body;
    if (!orderId || !amount) return res.status(400).json({ error: 'Thiếu thông tin' });

    const tmnCode = process.env.VNPAY_TMN_CODE;
    if (!tmnCode || tmnCode === 'YOUR_TMN_CODE') {
      return res.status(503).json({ error: 'VNPay chưa được cấu hình. Điền VNPAY_TMN_CODE vào .env' });
    }

    const returnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:5173/thanh-toan/ket-qua';
    const ipAddr    = getClientIp(req);
    const vnpay     = getVnpayInstance();

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount:    amount,
      vnp_IpAddr:    ipAddr,
      vnp_TxnRef:    orderCode || String(orderId),
      vnp_OrderInfo: `Thanh toan don hang ${orderCode || orderId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: returnUrl,
      vnp_Locale:    VnpLocale.VN,
    });

    db.prepare(`UPDATE orders SET payment_ref=?, updated_at=datetime('now','localtime') WHERE id=?`)
      .run(String(orderId), orderId);

    console.log(`💳 [VNPay] Created URL for order ${orderCode}`);
    res.json({ paymentUrl, provider: 'vnpay' });
  } catch (err) {
    console.error('VNPay create error:', err.message);
    res.status(500).json({ error: 'Lỗi tạo link VNPay: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/payment/vnpay/callback  – VNPay redirect back
// ─────────────────────────────────────────────────────────────────────────────
router.get('/vnpay/callback', (req, res) => {
  try {
    const vnpay  = getVnpayInstance();
    const verify = vnpay.verifyReturnUrl(req.query);

    if (verify.isSuccess) {
      const orderCode = req.query.vnp_TxnRef;
      const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderCode);
      if (order && order.status !== 'confirmed') {
        db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', updated_at=datetime('now','localtime') WHERE code=?`).run(orderCode);
        console.log(`✅ [VNPay] Confirmed: ${orderCode}`);
      }
      res.json({ success: true, code: orderCode, message: 'Thanh toán thành công!' });
    } else {
      const orderCode = req.query.vnp_TxnRef;
      res.json({ success: false, code: orderCode, responseCode: req.query.vnp_ResponseCode, message: getVNPayMessage(req.query.vnp_ResponseCode) });
    }
  } catch (err) {
    console.error('VNPay callback error:', err.message);
    res.status(500).json({ error: 'Lỗi xác thực thanh toán' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/vnpay/ipn  – VNPay server-to-server IPN
// ─────────────────────────────────────────────────────────────────────────────
router.post('/vnpay/ipn', (req, res) => {
  try {
    const vnpay  = getVnpayInstance();
    const verify = vnpay.verifyIpnCall({ ...req.query, ...req.body });
    if (!verify.isVerified) return res.json({ RspCode: '97', Message: 'Invalid signature' });

    const orderCode = req.query.vnp_TxnRef || req.body.vnp_TxnRef;
    const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderCode);
    if (!order) return res.json({ RspCode: '01', Message: 'Order not found' });
    if (order.status === 'confirmed') return res.json({ RspCode: '02', Message: 'Already confirmed' });

    const responseCode = req.query.vnp_ResponseCode || req.body.vnp_ResponseCode;
    if (responseCode === '00') {
      db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', updated_at=datetime('now','localtime') WHERE code=?`).run(orderCode);
    }
    res.json({ RspCode: '00', Message: 'Confirmed' });
  } catch (err) {
    res.json({ RspCode: '99', Message: 'Unknown error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ██████████  MOMO  ██████████
// Docs: https://developers.momo.vn
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/payment/momo/create
router.post('/momo/create', async (req, res) => {
  try {
    const { orderId, orderCode, amount } = req.body;
    if (!orderId || !amount) return res.status(400).json({ error: 'Thiếu thông tin' });

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey   = process.env.MOMO_ACCESS_KEY;
    const secretKey   = process.env.MOMO_SECRET_KEY;
    const momoUrl     = process.env.MOMO_ENDPOINT || 'https://test-payment.momo.vn/v2/gateway/api/create';
    const returnUrl   = process.env.MOMO_RETURN_URL || 'http://localhost:5173/thanh-toan/ket-qua';
    const notifyUrl   = process.env.MOMO_IPN_URL   || 'http://localhost:3001/api/payment/momo/ipn';

    if (!partnerCode || partnerCode === 'YOUR_PARTNER_CODE') {
      return res.status(503).json({ error: 'MoMo chưa được cấu hình. Điền MOMO_PARTNER_CODE vào .env' });
    }

    const requestId   = `${partnerCode}${Date.now()}`;
    const requestType = 'payWithMethod';
    const orderInfo   = `Thanh toan don hang ${orderCode || orderId}`;
    const extraData   = '';

    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${notifyUrl}`,
      `orderId=${orderCode || orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${returnUrl}`,
      `requestId=${requestId}`,
      `requestType=${requestType}`,
    ].join('&');

    const signature = crypto.createHmac('sha256', secretKey).update(rawSignature).digest('hex');

    const body = {
      partnerCode, accessKey, requestId,
      amount: String(amount),
      orderId: orderCode || String(orderId),
      orderInfo, redirectUrl: returnUrl,
      ipnUrl: notifyUrl, extraData, requestType, signature, lang: 'vi',
    };

    const response = await axios.post(momoUrl, body, { timeout: 10000 });
    const data = response.data;

    if (data.resultCode === 0) {
      db.prepare(`UPDATE orders SET payment_ref=?, updated_at=datetime('now','localtime') WHERE id=?`).run(requestId, orderId);
      console.log(`💳 [MoMo] Created payment URL for order ${orderCode}`);
      res.json({ paymentUrl: data.payUrl, provider: 'momo' });
    } else {
      console.error('[MoMo] Error:', data.message, data.resultCode);
      res.status(400).json({ error: data.message || 'MoMo trả về lỗi', resultCode: data.resultCode });
    }
  } catch (err) {
    console.error('MoMo create error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Không thể kết nối MoMo. Kiểm tra config MOMO_* trong .env' });
  }
});

// POST /api/payment/momo/ipn
router.post('/momo/ipn', (req, res) => {
  try {
    const { partnerCode, accessKey, requestId, amount, orderId, orderInfo,
            orderType, transId, resultCode, message, payType, responseTime,
            extraData, signature } = req.body;
    const secretKey = process.env.MOMO_SECRET_KEY;

    const rawData = [
      `accessKey=${accessKey}`, `amount=${amount}`, `extraData=${extraData}`,
      `message=${message}`, `orderId=${orderId}`, `orderInfo=${orderInfo}`,
      `orderType=${orderType}`, `partnerCode=${partnerCode}`, `payType=${payType}`,
      `requestId=${requestId}`, `responseTime=${responseTime}`,
      `resultCode=${resultCode}`, `transId=${transId}`,
    ].join('&');

    const expected = crypto.createHmac('sha256', secretKey).update(rawData).digest('hex');
    if (expected !== signature) return res.status(400).json({ message: 'Invalid signature' });

    if (parseInt(resultCode) === 0) {
      const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderId);
      if (order && order.status !== 'confirmed') {
        db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', updated_at=datetime('now','localtime') WHERE code=?`).run(orderId);
        console.log(`✅ [MoMo IPN] Confirmed: ${orderId}`);
      }
    }
    res.json({ status: 204, message: 'success' });
  } catch (err) {
    res.status(500).json({ message: 'error' });
  }
});

// GET /api/payment/momo/callback – MoMo redirect
router.get('/momo/callback', (req, res) => {
  const { orderId, resultCode, message, transId, amount } = req.query;
  const isSuccess = parseInt(resultCode) === 0;

  if (isSuccess) {
    const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderId);
    if (order && order.status !== 'confirmed') {
      db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', updated_at=datetime('now','localtime') WHERE code=?`).run(orderId);
      console.log(`✅ [MoMo Return] Confirmed: ${orderId}`);
    }
  }
  res.json({
    success: isSuccess,
    code: orderId,
    resultCode: parseInt(resultCode),
    message: isSuccess ? 'Thanh toán thành công!' : (message || 'Thanh toán thất bại'),
  });
});

// GET /api/payment/status/:orderCode
router.get('/status/:orderCode', (req, res) => {
  const order = db.prepare('SELECT id, code, status, payment_method, payment_status, total FROM orders WHERE code=?').get(req.params.orderCode);
  if (!order) return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  res.json(order);
});

// ─────────────────────────────────────────────────────────────────────────────
// ██████████  VIETQR WEBHOOK  ██████████
// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/vietqr/webhook
router.post('/vietqr/webhook', (req, res) => {
  try {
    const data = req.body;
    console.log('VietQR Webhook received raw:', JSON.stringify(data).slice(0, 1000));

    let transactions = [];
    if (Array.isArray(data.data)) transactions = data.data;
    else if (data.data) transactions = [data.data];
    else transactions = Array.isArray(data) ? data : [data];

    const TOLERANCE = Number(process.env.WEBHOOK_AMOUNT_TOLERANCE) || 1000;

    let successCount = 0;
    const errors = [];

    for (const tx of transactions) {
      try {
        const parts = [];
        if (tx.description) parts.push(tx.description);
        if (tx.content) parts.push(tx.content);
        if (tx.thuong_vu) parts.push(tx.thuong_vu);
        // include any other string values that may contain the order code
        Object.values(tx).forEach((v) => { if (typeof v === 'string') parts.push(v); });

        const joined = parts.join(' ').trim();
        let match = joined.match(/MLB\d{8}/i);
        if (!match) {
          const alt = joined.match(/MLB\D*(\d{6,8})/i);
          if (alt) match = ['MLB' + alt[1].padStart(8, '0')];
        }

        if (!match) continue; // no order code found

        const orderCode = match[0].toUpperCase();
        const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderCode);
        if (!order) continue;
        if (order.status === 'confirmed') continue;

        // parse amount flexibly
        let amount = 0;
        if (typeof tx.amount === 'number') amount = tx.amount;
        else if (typeof tx.amount === 'string') amount = Number(tx.amount.replace(/[^0-9.-]+/g, '')) || 0;
        else if (tx.sotien) amount = Number(String(tx.sotien).replace(/[^0-9.-]+/g, '')) || 0;

        if (amount >= (order.total - TOLERANCE)) {
          const paymentRef = tx.transaction_id || tx.trans_id || tx.id || null;
          db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', payment_ref=?, updated_at=datetime('now','localtime') WHERE code=?`).run(paymentRef, orderCode);
          console.log(`✅ [VietQR Webhook] Confirmed: ${orderCode} amount:${amount} ref:${paymentRef}`);
          successCount++;
        } else {
          console.log(`⚠️ [VietQR Webhook] Amount mismatch for ${orderCode}: got ${amount}, expected ${order.total}`);
        }
      } catch (errTx) {
        console.error('VietQR processing error for tx:', errTx && errTx.message ? errTx.message : errTx);
        errors.push(errTx && errTx.message ? errTx.message : String(errTx));
      }
    }

    res.json({ success: true, message: 'Webhook processed', count: successCount, errors });
  } catch (err) {
    console.error('VietQR webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/payment/payos/create
// Create a real payOS payment link and return checkoutUrl + qrCode
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payos/create', async (req, res) => {
  try {
    const { orderId, orderCode } = req.body;
    const order = db.prepare('SELECT * FROM orders WHERE id=? OR code=?').get(orderId || null, orderCode || null);

    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }

    const payos = getPayOSClient();
    if (!payos) {
      return res.status(503).json({ error: 'PayOS chưa được cấu hình đầy đủ. Điền PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY vào .env' });
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = process.env.PAYOS_RETURN_URL || `${frontendBase}/thanh-toan/ket-qua?provider=payos&orderCode=${encodeURIComponent(order.code)}`;
    const cancelUrl = process.env.PAYOS_CANCEL_URL || `${frontendBase}/thanh-toan?provider=payos&orderCode=${encodeURIComponent(order.code)}`;

    const numericOrderCode = Number(String(order.code).replace(/\D/g, '')) || order.id;

    const paymentLink = await payos.paymentRequests.create({
      orderCode: numericOrderCode,
      amount: Number(order.total),
      description: order.code,
      returnUrl,
      cancelUrl,
    });

    const checkoutUrl = paymentLink.checkoutUrl || paymentLink.data?.checkoutUrl || null;
    const qrCode = paymentLink.qrCode || paymentLink.data?.qrCode || null;
    const paymentLinkId = paymentLink.paymentLinkId || paymentLink.data?.paymentLinkId || null;

    if (paymentLinkId) {
      db.prepare(`UPDATE orders SET payment_ref=?, updated_at=datetime('now','localtime') WHERE code=?`).run(String(paymentLinkId), order.code);
    }

    res.json({
      success: true,
      provider: 'payos',
      code: order.code,
      checkoutUrl,
      qrCode,
      paymentLinkId,
      amount: Number(order.total),
      description: order.code,
      returnUrl,
      cancelUrl,
    });
  } catch (err) {
    console.error('PayOS create error:', err.message || err);
    res.status(500).json({ error: 'Không thể tạo link PayOS: ' + (err.message || 'Unknown error') });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYOS WEBHOOK – Per https://payos.vn/docs/du-lieu-tra-ve/webhook/
// Signature verification: HMAC-SHA256(JSON.stringify(data.data), PAYOS_CHECKSUM_KEY)
// POST /api/payment/payos/webhook
router.post('/payos/webhook', (req, res) => {
  try {
    const data = req.body;
    console.log('PayOS Webhook received:', JSON.stringify(data).slice(0, 500));

    // Verify signature per PayOS spec
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
    if (checksumKey && data.data) {
      const expected = crypto.createHmac('sha256', checksumKey).update(JSON.stringify(data.data)).digest('hex');
      if (expected !== data.signature) {
        console.warn('❌ PayOS signature mismatch', { expected, got: data.signature });
        return res.status(400).json({ success: false, message: 'Invalid signature' });
      }
      console.log('✅ PayOS signature verified');
    }

    if (data.code !== '00') {
      console.log('⚠️ PayOS webhook not success:', data.code, data.desc);
      return res.json({ success: false, message: data.desc || 'Payment failed' });
    }

    const paymentData = data.data;
    if (!paymentData) {
      console.log('PayOS webhook: missing data field');
      return res.status(400).json({ success: false, message: 'Missing data' });
    }

    // Extract order code: first try orderCode field, then description
    let orderCode = null;
    if (paymentData.orderCode) {
      orderCode = String(paymentData.orderCode);
      // Also check description for MLB\d{8} pattern
      const descMatch = String(paymentData.description || '').match(/MLB\d{8}/i);
      if (descMatch) orderCode = descMatch[0].toUpperCase();
    } else if (paymentData.description) {
      const descMatch = String(paymentData.description).match(/MLB\d{8}/i);
      if (descMatch) orderCode = descMatch[0].toUpperCase();
    }

    if (!orderCode) {
      console.log('PayOS webhook: no order code found in orderCode or description');
      return res.json({ success: true, message: 'no order code found' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderCode);
    if (!order) {
      console.log(`PayOS webhook: Order ${orderCode} not found in database`);
      return res.json({ success: true, message: 'Order not found' });
    }
    if (order.status === 'confirmed') {
      console.log(`PayOS webhook: Order ${orderCode} already confirmed`);
      return res.json({ success: true, message: 'Already confirmed' });
    }

    // Parse amount from PayOS data
    const amount = typeof paymentData.amount === 'number' ? paymentData.amount : Number(String(paymentData.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;

    const TOLERANCE = Number(process.env.WEBHOOK_AMOUNT_TOLERANCE) || 1000;
    if (amount >= (order.total - TOLERANCE)) {
      const paymentRef = paymentData.reference || paymentData.transaction_id || paymentData.trans_id || paymentData.id || null;
      db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', payment_ref=?, updated_at=datetime('now','localtime') WHERE code=?`).run(paymentRef, orderCode);
      console.log(`✅ [PayOS Webhook] Confirmed: ${orderCode} amount:${amount} ref:${paymentRef}`);
      return res.json({ success: true, message: 'Payment confirmed', code: orderCode });
    }

    console.log(`⚠️ [PayOS Webhook] Amount mismatch for ${orderCode}: got ${amount}, expected ${order.total}`);
    res.json({ success: false, message: 'Amount mismatch', got: amount, expected: order.total });
  } catch (err) {
    console.error('PayOS webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generic PayOS webhook handler (simulated) — flexible parsing like VietQR
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payos/webhook', (req, res) => {
  try {
    const data = req.body;
    console.log('PayOS Webhook received raw:', JSON.stringify(data).slice(0, 1000));

    let events = [];
    if (Array.isArray(data.data)) events = data.data;
    else if (data.event) events = [data.event];
    else if (data.data) events = [data.data];
    else events = Array.isArray(data) ? data : [data];

    const TOLERANCE = Number(process.env.WEBHOOK_AMOUNT_TOLERANCE) || 1000;
    let success = 0;

    for (const ev of events) {
      try {
        // Try common fields
        const possible = [];
        if (ev.description) possible.push(ev.description);
        if (ev.note) possible.push(ev.note);
        if (ev.order_code) possible.push(ev.order_code);
        if (ev.orderId) possible.push(String(ev.orderId));
        Object.values(ev).forEach(v => { if (typeof v === 'string') possible.push(v); });

        const joined = possible.join(' ');
        let match = joined.match(/MLB\d{8}/i);
        if (!match) {
          const alt = joined.match(/MLB\D*(\d{6,8})/i);
          if (alt) match = ['MLB' + alt[1].padStart(8, '0')];
        }
        if (!match) continue;

        const orderCode = match[0].toUpperCase();
        const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderCode);
        if (!order) continue;
        if (order.status === 'confirmed') continue;

        let amount = 0;
        if (typeof ev.amount === 'number') amount = ev.amount;
        else if (typeof ev.amount === 'string') amount = Number(ev.amount.replace(/[^0-9.-]+/g, '')) || 0;
        else if (ev.total) amount = Number(String(ev.total).replace(/[^0-9.-]+/g, '')) || 0;

        if (amount >= (order.total - TOLERANCE)) {
          const ref = ev.transaction_id || ev.txn_id || ev.id || null;
          db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', payment_ref=?, updated_at=datetime('now','localtime') WHERE code=?`).run(ref, orderCode);
          console.log(`✅ [PayOS Webhook] Confirmed: ${orderCode} amount:${amount} ref:${ref}`);
          success++;
        } else {
          console.log(`⚠️ [PayOS] Amount mismatch ${orderCode}: got ${amount}, expect ${order.total}`);
        }
      } catch (e) {
        console.error('PayOS tx error:', e && e.message ? e.message : e);
      }
    }

    res.json({ success: true, processed: success });
  } catch (err) {
    console.error('PayOS webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
