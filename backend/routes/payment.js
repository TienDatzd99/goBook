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
// PAYOS HELPERS (debugging only)
// - GET  /api/payment/payos/config   -> show masked env status
// - POST /api/payment/payos/simulate -> simulate webhook processing (no signature)
//   Enabled only when PAYOS_ALLOW_SIMULATE=true in env
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payos/config', (req, res) => {
  const clientId = process.env.PAYOS_CLIENT_ID || null;
  const apiKey = process.env.PAYOS_API_KEY || null;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY || null;
  const allowSimulate = process.env.PAYOS_ALLOW_SIMULATE === 'true';

  function mask(v) {
    if (!v) return null;
    if (v.length <= 8) return '****' + v.slice(-4);
    return v.slice(0, 4) + '...' + v.slice(-4);
  }

  res.json({
    payosConfigured: Boolean(clientId && apiKey && checksumKey),
    clientId: mask(clientId),
    apiKeySet: Boolean(apiKey),
    checksumKeySet: Boolean(checksumKey),
    allowSimulate,
  });
});

router.post('/payos/simulate', async (req, res) => {
  if (process.env.PAYOS_ALLOW_SIMULATE !== 'true') {
    return res.status(403).json({ error: 'Simulation disabled. Set PAYOS_ALLOW_SIMULATE=true to enable.' });
  }

  try {
    const payload = req.body || {};

    // Use the same parsing logic as real webhook after verification
    const verified = payload; // treat as already-verified

    console.log('🔧 [PayOS Simulate] payload received:', JSON.stringify(verified).slice(0, 1000));

    if (verified.code && verified.code !== '00') {
      return res.json({ success: false, message: 'Simulated payment not successful', code: verified.code, desc: verified.desc });
    }

    const orderCodeFromDescription = String(verified.description || '').match(/MLB\d{8}/i)?.[0]?.toUpperCase() || null;
    const orderCodeFromNumber = String(verified.orderCode || '').trim()
      ? `MLB${String(verified.orderCode).replace(/\D/g, '').padStart(8, '0')}`
      : null;
    const orderCode = orderCodeFromDescription || orderCodeFromNumber;

    if (!orderCode) return res.status(400).json({ success: false, message: 'Missing orderCode in simulated payload' });

    const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderCode);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.status === 'confirmed') return res.json({ success: true, message: 'Already confirmed' });

    const rawAmount = verified.amount ?? verified.data?.amount ?? verified.total ?? verified.data?.total ?? verified.sotien ?? verified.soTien ?? 0;
    const amount = Number(String(rawAmount).replace(/[^0-9.-]+/g, '')) || 0;
    const TOLERANCE = Number(process.env.WEBHOOK_AMOUNT_TOLERANCE) || 1000;

    const paymentRef = verified.reference || verified.transactionId || verified.paymentLinkId || verified.data?.transaction_id || verified.data?.trans_id || verified.data?.id || null;

    if (amount >= (order.total - TOLERANCE)) {
      db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', payment_ref=?, updated_at=datetime('now','localtime') WHERE code=?`).run(paymentRef, orderCode);
      console.log(`✅ [PayOS Simulate] Confirmed: ${orderCode} amount:${amount} ref:${paymentRef}`);
      return res.json({ success: true, message: 'Simulated payment confirmed', code: orderCode });
    }

    return res.json({ success: false, message: 'Amount mismatch in simulation', got: amount, expected: order.total });
  } catch (err) {
    console.error('PayOS simulate error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

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

    // If order already has payment_ref, try to reuse the existing PayOS link
    if (order.payment_ref) {
      try {
        console.log(`ℹ️ [PayOS Create] Order ${order.code} already has payment_ref: ${order.payment_ref}, fetching existing link...`);
        const existingLink = await payos.paymentRequests.get(order.payment_ref);
        if (existingLink && existingLink.paymentLinkId) {
          const checkoutUrl = existingLink.checkoutUrl || existingLink.data?.checkoutUrl || null;
          const qrCode = existingLink.qrCode || existingLink.data?.qrCode || null;
          console.log(`✅ [PayOS Create] Reusing existing link: ${order.payment_ref}`);
          return res.json({
            success: true,
            provider: 'payos',
            code: order.code,
            checkoutUrl,
            qrCode,
            paymentLinkId: order.payment_ref,
            amount: Number(order.total),
            description: order.code,
            reused: true,
          });
        }
      } catch (errReuse) {
        console.log(`⚠️ [PayOS Create] Failed to reuse existing link (${order.payment_ref}), will create new: ${errReuse.message}`);
        // Continue to create new link
      }
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
    const returnUrl = process.env.PAYOS_RETURN_URL || `${frontendBase}/thanh-toan/ket-qua?provider=payos&orderCode=${encodeURIComponent(order.code)}`;
    const cancelUrl = process.env.PAYOS_CANCEL_URL || `${frontendBase}/thanh-toan?provider=payos&orderCode=${encodeURIComponent(order.code)}`;

    const numericOrderCode = Number(String(order.code).replace(/\D/g, '')) || order.id;

    // Prefer to set notifyUrl so PayOS will POST server-to-server notifications
    const webhookUrl = process.env.PAYOS_WEBHOOK_URL || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/payment/payos/webhook` : null) || `${req.protocol}://${req.get('host')}/api/payment/payos/webhook`;

    // Try creating payment link requesting PayOS to notify our webhook.
    // Some PayOS tenants reject `notifyUrl`/`notify_url` fields (code:20).
    // In that case retry without those fields so link creation still succeeds.
    // If PayOS rejects with code 231 (link exists), retry with random orderCode suffix.
    let paymentLink;
    let orderCodeWithSuffix = numericOrderCode;
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        paymentLink = await payos.paymentRequests.create({
          orderCode: orderCodeWithSuffix,
          amount: Number(order.total),
          description: order.code,
          returnUrl,
          cancelUrl,
          // may be rejected by some PayOS setups
          notifyUrl: webhookUrl,
          notify_url: webhookUrl,
        });
        break; // Success
      } catch (errCreate) {
        const msg = String(errCreate?.message || errCreate || '');
        const code = errCreate?.code || errCreate?.response?.data?.code;
        
        // Handle code 231: link exists, retry with different orderCode
        if (code === 231 || msg.includes('231') || msg.includes('đã tồn tại')) {
          retryCount++;
          if (retryCount < maxRetries) {
            orderCodeWithSuffix = numericOrderCode + retryCount * 10000;
            console.log(`⚠️ [PayOS Create] Link exists (231), retrying with orderCode: ${orderCodeWithSuffix}`);
            continue;
          }
        }
        
        // Handle notifyUrl rejection
        if (msg.includes('notifyUrl') || msg.includes('notify_url') || msg.includes('code: 20') || msg.includes('property notifyUrl')) {
          console.log('⚠️ PayOS create rejected notifyUrl — retrying without notify fields');
          try {
            paymentLink = await payos.paymentRequests.create({
              orderCode: orderCodeWithSuffix,
              amount: Number(order.total),
              description: order.code,
              returnUrl,
              cancelUrl,
            });
            break; // Success
          } catch (err2) {
            console.error('PayOS create retry failed:', err2.message || err2);
            throw err2;
          }
        }
        
        throw errCreate;
      }
    }

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
// GET /api/payment/payos/check-payment/:paymentLinkId
// Query PayOS to check if payment is PAID; if so, auto-confirm order
// ─────────────────────────────────────────────────────────────────────────────
router.get('/payos/check-payment/:paymentLinkId', async (req, res) => {
  try {
    const paymentLinkId = req.params.paymentLinkId;
    if (!paymentLinkId) return res.status(400).json({ error: 'Missing paymentLinkId' });

    const payos = getPayOSClient();
    if (!payos) {
      return res.status(503).json({ error: 'PayOS chưa được cấu hình' });
    }

    // Query PayOS to get payment link details
    const paymentLink = await payos.paymentRequests.get(paymentLinkId);

    console.log(`🔍 [PayOS Check] Link ${paymentLinkId}: status=${paymentLink.status}`);
    console.log(`   Response:`, JSON.stringify(paymentLink).slice(0, 300));

    // If PayOS reports status='PAID', find & confirm the order
    if (paymentLink.status === 'PAID') {
      // Lookup order from DB using paymentLinkId (stored as payment_ref)
      const order = db.prepare('SELECT * FROM orders WHERE payment_ref=?').get(paymentLinkId);

      if (order && order.status !== 'confirmed') {
        db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', updated_at=datetime('now','localtime') WHERE id=?`).run(order.id);
        console.log(`✅ [PayOS Check] Auto-confirmed: ${order.code}`);
        return res.json({ success: true, message: 'Payment confirmed from PayOS', status: 'PAID', code: order.code, paymentLinkId });
      } else if (order && order.status === 'confirmed') {
        console.log(`ℹ️ [PayOS Check] Order ${order.code} already confirmed`);
        return res.json({ success: true, message: 'Order already confirmed', status: 'PAID', code: order.code, paymentLinkId });
      }
    }

    res.json({ success: true, status: paymentLink.status, paymentLinkId });
  } catch (err) {
    console.error('PayOS check-payment error:', err.message || err);
    res.status(500).json({ error: 'Không thể kiểm tra thanh toán: ' + (err.message || 'Unknown error') });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PAYOS WEBHOOK – Per https://payos.vn/docs/du-lieu-tra-ve/webhook/
// POST /api/payment/payos/webhook
router.post('/payos/webhook', async (req, res) => {
  try {
    const payos = getPayOSClient();
    if (!payos) {
      return res.status(503).json({ success: false, message: 'PayOS chưa được cấu hình đầy đủ' });
    }

    const verified = await payos.webhooks.verify(req.body);
    console.log('✅ PayOS webhook verified:', JSON.stringify(verified).slice(0, 500));

    if (verified.code !== '00') {
      console.log('⚠️ PayOS webhook not success:', verified.code, verified.desc);
      return res.json({ success: false, message: verified.desc || 'Payment failed' });
    }

    const orderCodeFromDescription = String(verified.description || '').match(/MLB\d{8}/i)?.[0]?.toUpperCase() || null;
    const orderCodeFromNumber = String(verified.orderCode || '').trim()
      ? `MLB${String(verified.orderCode).replace(/\D/g, '').padStart(8, '0')}`
      : null;
    const orderCode = orderCodeFromDescription || orderCodeFromNumber;

    if (!orderCode) {
      return res.status(400).json({ success: false, message: 'Missing orderCode' });
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

    // Try multiple possible fields for amount (depends on PayOS payload shape)
    const rawAmount = verified.amount ?? verified.data?.amount ?? verified.total ?? verified.data?.total ?? verified.sotien ?? verified.soTien ?? 0;
    const amount = Number(String(rawAmount).replace(/[^0-9.-]+/g, '')) || 0;
    const TOLERANCE = Number(process.env.WEBHOOK_AMOUNT_TOLERANCE) || 1000;

    // Normalize several possible payment reference fields
    const paymentRef = verified.reference || verified.transactionId || verified.paymentLinkId || verified.data?.transaction_id || verified.data?.trans_id || verified.data?.id || null;

    if (amount >= (order.total - TOLERANCE)) {
      db.prepare(`UPDATE orders SET status='confirmed', payment_status='paid', payment_ref=?, updated_at=datetime('now','localtime') WHERE code=?`).run(paymentRef, orderCode);
      console.log(`✅ [PayOS Webhook] Confirmed: ${orderCode} amount:${amount} ref:${paymentRef}`);
      return res.json({ success: true, message: 'Payment confirmed', code: orderCode });
    }

    // Log helpful debug info for mismatches (trim long payload)
    try {
      const snippet = JSON.stringify(verified).slice(0, 2000);
      console.log(`⚠️ [PayOS Webhook] Amount mismatch for ${orderCode}: got ${amount}, expected ${order.total}. payload: ${snippet}`);
    } catch (e) {
      console.log(`⚠️ [PayOS Webhook] Amount mismatch for ${orderCode}: got ${amount}, expected ${order.total}. (failed to stringify payload)`);
    }

    res.json({ success: false, message: 'Amount mismatch', got: amount, expected: order.total });
  } catch (err) {
    console.error('PayOS webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
