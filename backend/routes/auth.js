const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const db = require('../database');
const { sendVerificationEmail, sendWelcomeEmail, isMailConfigured } = require('../utils/mailer');
const router = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';

// ── Helper: sign JWT ──
function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// ── Helper: safe user object ──
function safeUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, email_verified: u.email_verified };
}

function mapMailError(err) {
  const responseCode = Number(err?.responseCode || 0);
  const code = String(err?.code || '');
  const msg = String(err?.message || '').toLowerCase();

  if (responseCode === 535 || msg.includes('invalid login') || msg.includes('bad credentials')) {
    return 'Sai MAIL_USER hoặc MAIL_PASS (App Password).';
  }
  if (responseCode === 534 || msg.includes('application-specific password')) {
    return 'Gmail yêu cầu App Password. Kiểm tra lại 2-Step Verification và tạo App Password mới.';
  }
  if (responseCode === 550 || responseCode === 553 || msg.includes('sender')) {
    return 'MAIL_FROM không hợp lệ với tài khoản gửi. Dùng MAIL_FROM=goBook <MAIL_USER>.';
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION') {
    return 'Kết nối SMTP bị timeout. Thử MAIL_PORT=465 và MAIL_SECURE=true trên Railway.';
  }
  if (code === 'ENOTFOUND') {
    return 'Không phân giải được SMTP host. Kiểm tra MAIL_HOST.';
  }

  return 'Không gửi được email xác minh. Vui lòng thử lại sau.';
}

// ───────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ───────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, phone } = req.body;
  const emailVerificationEnabled = REQUIRE_EMAIL_VERIFICATION;
  const mailReady = isMailConfigured();

  console.log(`📝 Registration attempt: email=${email}, REQUIRE_EMAIL_VERIFICATION=${emailVerificationEnabled}, mailReady=${mailReady}`);

  // Validation: name no numbers
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Vui lòng điền đầy đủ thông tin' });
  }
  if (/\d/.test(name)) {
    return res.status(400).json({ error: 'Họ tên không được chứa số' });
  }
  if (name.trim().length < 2) {
    return res.status(400).json({ error: 'Họ tên phải có ít nhất 2 ký tự' });
  }
  // Validation: phone only digits
  if (phone && !/^\d+$/.test(phone)) {
    return res.status(400).json({ error: 'Số điện thoại chỉ được chứa chữ số' });
  }
  if (phone && phone.length < 9) {
    return res.status(400).json({ error: 'Số điện thoại phải có ít nhất 9 chữ số' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
  }

  // Check duplicate email
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email này đã được đăng ký' });
  }

  if (emailVerificationEnabled && !mailReady) {
    return res.status(503).json({ error: 'Hệ thống email chưa sẵn sàng. Vui lòng thử lại sau.' });
  }

  const verificationToken = emailVerificationEnabled ? crypto.randomBytes(32).toString('hex') : null;
  const tokenExpires = emailVerificationEnabled
    ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    : null;
  const emailVerifiedValue = emailVerificationEnabled ? 0 : 1;

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, verification_token, verification_token_expires, email_verified, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'customer')
  `).run(name.trim(), email.toLowerCase(), hash, phone || null, verificationToken, tokenExpires, emailVerifiedValue);

  if (emailVerificationEnabled) {
    // In strict mode, registration succeeds only when verification email is sent.
    try {
      console.log(`📬 Sending verification email to ${email}...`);
      const mailResult = await sendVerificationEmail(email, name.trim(), verificationToken);
      console.log(`✅ Verification email sent to ${email}, messageId: ${mailResult.messageId}`);
    } catch (mailErr) {
      console.error(`❌ Mail send failed for registration: ${mailErr.message}`);
      try {
        const deleteResult = db.prepare('DELETE FROM users WHERE id = ?').run(result.lastInsertRowid);
        console.log(`🗑️ Deleted user (id=${result.lastInsertRowid}) due to email failure. Changes: ${deleteResult.changes}`);
      } catch (deleteErr) {
        console.error(`⚠️ Failed to delete user: ${deleteErr.message}`);
      }
      return res.status(500).json({ error: mapMailError(mailErr) });
    }
  }

  res.status(201).json({
    success: true,
    message: emailVerificationEnabled
      ? 'Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản.'
      : 'Đăng ký thành công! Hệ thống email chưa cấu hình nên tài khoản được kích hoạt ngay.',
    email: email,
    needVerification: emailVerificationEnabled,
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ───────────────────────────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Vui lòng nhập email và mật khẩu' });

  const user = db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1').get(email.toLowerCase());
  if (!user || !user.password_hash) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng' });

  // Check email verification (skip for admin)
  if (user.role !== 'admin' && !user.email_verified && isMailConfigured()) {
    return res.status(403).json({
      error: 'Tài khoản chưa xác thực email. Vui lòng kiểm tra hộp thư.',
      needVerification: true,
      email: user.email,
    });
  }

  res.json({ token: signToken(user), user: safeUser(user) });
});

// ───────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google – Google OAuth login/register
// ───────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  const { credential, googleUser } = req.body;
  if (!credential && !googleUser) return res.status(400).json({ error: 'Google credential is required' });

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Server thiếu JWT_SECRET. Vui lòng cấu hình Railway Variables.' });
  }

  try {
    let payload;

    if (googleUser) {
      // Implicit flow: frontend sent userinfo directly after getting access_token
      payload = googleUser;
    } else {
      // ID token flow: verify with Google
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'your_google_client_id_here') {
        return res.status(500).json({ error: 'Server thiếu GOOGLE_CLIENT_ID. Vui lòng cấu hình Railway Variables.' });
      } else {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
        payload = ticket.getPayload();
      }
    }

    const { sub: googleId, email, name, picture } = payload;
    if (!email) return res.status(400).json({ error: 'Không lấy được thông tin từ Google' });

    // Find or create user
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    if (user) {
      // Update google_id and avatar if not set
      db.prepare('UPDATE users SET google_id=?, avatar=?, email_verified=1 WHERE id=?')
        .run(googleId, picture || user.avatar, user.id);
      user = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
    } else {
      // Create new user (pre-verified via Google)
      const result = db.prepare(`
        INSERT INTO users (name, email, google_id, avatar, email_verified, role, password_hash)
        VALUES (?, ?, ?, ?, 1, 'customer', NULL)
      `).run(name, email.toLowerCase(), googleId, picture || '');
      user = db.prepare('SELECT * FROM users WHERE id=?').get(result.lastInsertRowid);

      // Send welcome email (fire-and-forget, don't await)
      sendWelcomeEmail(email, name)
        .then((result) => console.log(`✅ Welcome email sent to new Google user ${email}`))
        .catch((err) => console.error(`⚠️ Welcome email failed: ${err.message}`));
    }

    if (!user.is_active) return res.status(403).json({ error: 'Tài khoản đã bị khóa' });

    res.json({ token: signToken(user), user: safeUser(user), isNew: !user.password_hash });
  } catch (err) {
    const detail = err?.message || 'Unknown error';
    console.error('Google auth error:', detail);

    if (/secretOrPrivateKey/i.test(detail)) {
      return res.status(500).json({ error: 'Server thiếu JWT_SECRET. Vui lòng cấu hình Railway Variables.' });
    }
    if (/audience|wrong recipient|token used too late|jwt/i.test(detail)) {
      return res.status(401).json({ error: 'GOOGLE_CLIENT_ID không khớp hoặc token Google không hợp lệ.' });
    }
    if (/SQLITE|database/i.test(detail)) {
      return res.status(500).json({ error: 'Lỗi cơ sở dữ liệu khi đăng nhập Google.' });
    }

    res.status(401).json({ error: 'Xác thực Google thất bại. Vui lòng thử lại.' });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-email?token=xxx
// ───────────────────────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token không hợp lệ' });

  const user = db.prepare('SELECT * FROM users WHERE verification_token = ?').get(token);
  if (!user) return res.status(400).json({ error: 'Token không hợp lệ hoặc đã được sử dụng' });

  // Check expiry
  if (user.verification_token_expires && new Date() > new Date(user.verification_token_expires)) {
    return res.status(400).json({ error: 'Link xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại.' });
  }

  // Mark verified
  db.prepare('UPDATE users SET email_verified=1, verification_token=NULL, verification_token_expires=NULL WHERE id=?')
    .run(user.id);

  // Send welcome email
  try { 
    const mailResult = await sendWelcomeEmail(user.email, user.name);
    console.log(`✅ Welcome email sent to ${user.email}, messageId: ${mailResult.messageId}`);
  } catch (err) {
    console.error(`⚠️ Welcome email failed for ${user.email}:`, err.message);
  }

  const updatedUser = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
  res.json({
    success: true,
    message: 'Email xác nhận thành công! Chào mừng bạn đến với goBook.',
    token: signToken(updatedUser),
    user: safeUser(updatedUser),
  });
});

// ───────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-verification
// ───────────────────────────────────────────────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Vui lòng nhập email' });

  if (!REQUIRE_EMAIL_VERIFICATION) {
    return res.status(400).json({ error: 'Xác minh email đang tắt trong cấu hình hệ thống.' });
  }

  if (!isMailConfigured()) {
    return res.status(400).json({ error: 'Hệ thống email chưa cấu hình. Tài khoản mới sẽ được kích hoạt ngay khi đăng ký.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email.toLowerCase());
  if (!user) return res.status(404).json({ error: 'Email không tồn tại' });
  if (user.email_verified) return res.status(400).json({ error: 'Email này đã được xác nhận' });

  // Generate new token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET verification_token=?, verification_token_expires=? WHERE id=?')
    .run(verificationToken, tokenExpires, user.id);

  try {
    await sendVerificationEmail(email, user.name, verificationToken);
    console.log(`✅ Verification email resent to ${email}`);
    res.json({ success: true, message: 'Email xác nhận đã được gửi lại. Vui lòng kiểm tra hộp thư.' });
  } catch (err) {
    console.error('❌ Resend verification mail failed:', err.message);
    res.status(500).json({ error: mapMailError(err) });
  }
});

// ───────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me – verify token
// ───────────────────────────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Chưa xác thực' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role, avatar, email_verified FROM users WHERE id = ?').get(decoded.id);
    res.json({ user });
  } catch {
    res.status(401).json({ error: 'Token không hợp lệ' });
  }
});

module.exports = router;
