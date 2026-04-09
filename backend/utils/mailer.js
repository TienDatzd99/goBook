const nodemailer = require('nodemailer');

// ── Tạo transporter (dùng Gmail App Password hoặc Ethereal cho dev) ──
let transporter = null;
const MAIL_TIMEOUT_MS = Number(process.env.MAIL_TIMEOUT_MS || 10000);

function getMailUser() {
  return (process.env.MAIL_USER || '').trim();
}

function getMailPass() {
  // Gmail app password is often copied with spaces every 4 chars.
  return (process.env.MAIL_PASS || '').replace(/\s+/g, '');
}

function getMailFrom() {
  const configured = (process.env.MAIL_FROM || '').trim();
  if (configured) return configured;

  const mailUser = getMailUser();
  if (mailUser) return `goBook <${mailUser}>`;

  return '"goBook" <noreply@minhlongbook.vn>';
}

function hasMailCredentials() {
  const mailUser = getMailUser();
  const mailPass = getMailPass();
  return Boolean(
    mailUser &&
    mailPass &&
    !mailPass.includes('your_app_password')
  );
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
}

function createSmtpTransport(config) {
  return nodemailer.createTransport({
    ...config,
    connectionTimeout: MAIL_TIMEOUT_MS,
    greetingTimeout: MAIL_TIMEOUT_MS,
    socketTimeout: MAIL_TIMEOUT_MS,
  });
}

function getMailHost() {
  return (process.env.MAIL_HOST || 'smtp.gmail.com').trim();
}

function getMailPort() {
  const parsed = Number(process.env.MAIL_PORT);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 587;
}

function getMailSecure(port) {
  if (typeof process.env.MAIL_SECURE !== 'undefined') {
    return String(process.env.MAIL_SECURE).toLowerCase() === 'true';
  }
  return Number(port) === 465;
}

function isMailConfigured() {
  return hasMailCredentials();
}

async function getTransporter() {
  if (transporter) return transporter;

  const hasCredentials = hasMailCredentials();

  if (hasCredentials) {
    const mailUser = getMailUser();
    const mailPass = getMailPass();
    const host = getMailHost();
    const port = getMailPort();
    const secure = getMailSecure(port);

    // Production: Gmail SMTP
    transporter = createSmtpTransport({
      host,
      port,
      secure,
      requireTLS: !secure,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });
    console.log('📧 Mail: Using Gmail SMTP');
  } else {
    if (isProductionRuntime()) {
      throw new Error('MAIL_NOT_CONFIGURED');
    }

    // Development: Ethereal (fake SMTP – emails viewable at ethereal.email)
    const testAccount = await nodemailer.createTestAccount();
    transporter = createSmtpTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Mail: Using Ethereal (dev mode)');
    console.log(`   Ethereal user: ${testAccount.user}`);
  }

  return transporter;
}

// ── Send verification email ──
async function sendVerificationEmail(to, name, token) {
  let t = await getTransporter();
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/xac-thuc-email?token=${token}`;

  const payload = {
    from: getMailFrom(),
    to,
    subject: '✅ Xác nhận tài khoản - goBook',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .card { max-width: 520px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #d32f2f, #7b1fa2); padding: 36px 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 24px; }
    .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .greeting { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; }
    .text { color: #555; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
    .btn { display: block; text-align: center; background: linear-gradient(135deg, #d32f2f, #7b1fa2); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 700; margin: 0 auto; max-width: 240px; }
    .note { margin-top: 24px; font-size: 12px; color: #999; border-top: 1px solid #f0f0f0; padding-top: 16px; }
    .link-alt { word-break: break-all; color: #d32f2f; font-size: 12px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>📚 goBook</h1>
      <p>Ươm mầm tri thức</p>
    </div>
    <div class="body">
      <div class="greeting">Xin chào ${name}! 👋</div>
      <p class="text">
        Cảm ơn bạn đã đăng ký tài khoản tại <strong>goBook</strong>.<br/>
        Vui lòng nhấn nút bên dưới để xác nhận email và kích hoạt tài khoản:
      </p>
      <a href="${verifyUrl}" class="btn">✅ Xác nhận email</a>
      <div class="note">
        Link có hiệu lực trong <strong>24 giờ</strong>.<br/>
        Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.<br/>
        <div class="link-alt">Hoặc copy link: ${verifyUrl}</div>
      </div>
    </div>
  </div>
</body>
</html>
    `,
  };

  let info;
  try {
    info = await t.sendMail(payload);
  } catch (err) {
    const host = getMailHost();
    const port = getMailPort();
    if ((err?.code === 'ETIMEDOUT' || /timeout/i.test(err?.message || '')) && host === 'smtp.gmail.com' && port === 587) {
      // Fallback for environments where STARTTLS on 587 is unstable.
      t = createSmtpTransport({
        host,
        port: 465,
        secure: true,
        auth: { user: getMailUser(), pass: getMailPass() },
      });
      info = await t.sendMail(payload);
    } else {
      throw err;
    }
  }

  // In link preview trong console (dev mode)
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
    console.log(`📧 [DEV] Xem email tại: ${previewUrl}`);
  }

  return { messageId: info.messageId, previewUrl };
}

// ── Send welcome email after verification ──
async function sendWelcomeEmail(to, name) {
  let t = await getTransporter();
  const payload = {
    from: getMailFrom(),
    to,
    subject: '🎉 Chào mừng đến với goBook!',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#d32f2f,#7b1fa2);padding:36px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;">🎉 Chào mừng!</h1>
    </div>
    <div style="padding:32px;">
      <p style="font-size:18px;font-weight:700;color:#1a1a2e;">Xin chào ${name}!</p>
      <p style="color:#555;line-height:1.6;">Tài khoản của bạn đã được <strong>xác nhận thành công</strong>. Bây giờ bạn có thể:</p>
      <ul style="color:#555;line-height:2;">
        <li>🛒 Mua sắm hàng ngàn đầu sách hay</li>
        <li>❤️ Lưu sách yêu thích</li>
        <li>📦 Theo dõi đơn hàng dễ dàng</li>
        <li>🎟️ Nhận voucher ưu đãi độc quyền</li>
      </ul>
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display:block;text-align:center;background:linear-gradient(135deg,#d32f2f,#7b1fa2);color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;margin-top:16px;">
        Bắt đầu mua sắm →
      </a>
    </div>
  </div>
</body>
</html>
    `,
  };

  try {
    await t.sendMail(payload);
  } catch (err) {
    const host = getMailHost();
    const port = getMailPort();
    if ((err?.code === 'ETIMEDOUT' || /timeout/i.test(err?.message || '')) && host === 'smtp.gmail.com' && port === 587) {
      t = createSmtpTransport({
        host,
        port: 465,
        secure: true,
        auth: { user: getMailUser(), pass: getMailPass() },
      });
      await t.sendMail(payload);
      return;
    }
    throw err;
  }
}

module.exports = { sendVerificationEmail, sendWelcomeEmail, getTransporter, isMailConfigured, getMailFrom };
