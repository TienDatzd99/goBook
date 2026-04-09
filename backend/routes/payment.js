const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const db = require('../database');
const router = express.Router();

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

module.exports = router;
