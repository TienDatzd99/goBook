const { Resend } = require('resend');

// ── Initialize Resend Client ──
let resendClient = null;

function getResendClient() {
  if (resendClient) return resendClient;
  
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('placeholder') || apiKey.includes('your_')) {
    throw new Error('RESEND_API_KEY not configured');
  }
  
  resendClient = new Resend(apiKey);
  return resendClient;
}

function getMailFrom() {
  // If custom from email is set, use it. Otherwise use Resend's default onboarding email.
  const configured = (process.env.RESEND_FROM_EMAIL || '').trim();
  if (configured && !configured.includes('placeholder') && !configured.includes('your_')) {
    return configured;
  }
  
  // Fallback to Resend's default onboarding email (works immediately)
  return 'onboarding@resend.dev';
}

function isMailConfigured() {
  try {
    const apiKey = (process.env.RESEND_API_KEY || '').trim();
    return apiKey && !apiKey.includes('placeholder') && !apiKey.includes('your_');
  } catch {
    return false;
  }
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);
}

async function getTransporter() {
  if (!isMailConfigured() && isProductionRuntime()) {
    throw new Error('MAIL_NOT_CONFIGURED');
  }
  return { sendMail: async () => ({ messageId: 'resend-client' }) };
}

// ── Send verification email ──
async function sendVerificationEmail(to, name, token) {
  try {
    if (!isMailConfigured() && isProductionRuntime()) {
      throw new Error('MAIL_NOT_CONFIGURED');
    }

    if (!isMailConfigured()) {
      console.log('📧 [DEV] Mail not configured, skipping email send');
      return { messageId: 'dev-' + Math.random().toString(36).substr(2, 9), previewUrl: null };
    }

    const resend = getResendClient();
    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/xac-thuc-email?token=${token}`;

    console.log(`📬 Sending verification email to ${to}...`);

    const response = await resend.emails.send({
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
    });

    if (response.error) {
      throw new Error(`Resend error: ${response.error.message}`);
    }

    console.log(`✅ Verification email sent to ${to}, messageId: ${response.data.id}`);
    return { messageId: response.data.id, previewUrl: null };
  } catch (err) {
    console.error(`❌ Gửi email xác nhận thất bại: ${err.message}`);
    throw err;
  }
}

// ── Send password reset email ──
async function sendPasswordResetEmail(to, name, token) {
  try {
    if (!isMailConfigured()) {
      console.log('📧 [DEV] Mail not configured, skipping email send');
      return { messageId: 'dev-' + Math.random().toString(36).substr(2, 9), previewUrl: null };
    }

    const resend = getResendClient();
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dat-lai-mat-khau?token=${token}`;

    console.log(`📬 Sending password reset email to ${to}...`);

    const response = await resend.emails.send({
      from: getMailFrom(),
      to,
      subject: '🔐 Đặt lại mật khẩu - goBook',
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
    .btn { display: block; text-align: center; background: linear-gradient(135deg, #d32f2f, #7b1fa2); color: #fff !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 700; margin: 0 auto; max-width: 260px; }
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
      <div class="greeting">Xin chào ${name || 'bạn'}! 🔐</div>
      <p class="text">
        Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản goBook của bạn.<br/>
        Nhấn vào nút bên dưới để tạo mật khẩu mới:
      </p>
      <a href="${resetUrl}" class="btn">Đặt lại mật khẩu</a>
      <div class="note">
        Link có hiệu lực trong <strong>60 phút</strong> và chỉ dùng được một lần.<br/>
        Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.<br/>
        <div class="link-alt">Hoặc copy link: ${resetUrl}</div>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (response.error) {
      throw new Error(`Resend error: ${response.error.message}`);
    }

    console.log(`✅ Password reset email sent to ${to}, messageId: ${response.data.id}`);
    return { messageId: response.data.id, previewUrl: null };
  } catch (err) {
    console.error(`❌ Gửi email đặt lại mật khẩu thất bại: ${err.message}`);
    throw err;
  }
}

// ── Send welcome email after verification ──
async function sendWelcomeEmail(to, name) {
  try {
    if (!isMailConfigured()) {
      console.log('📧 [DEV] Mail not configured, skipping email send');
      return { messageId: 'dev-' + Math.random().toString(36).substr(2, 9), previewUrl: null };
    }

    const resend = getResendClient();

    console.log(`📬 Sending welcome email to ${to}...`);

    const response = await resend.emails.send({
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
    });

    if (response.error) {
      throw new Error(`Resend error: ${response.error.message}`);
    }

    console.log(`✅ Welcome email sent to ${to}, messageId: ${response.data.id}`);
    return { messageId: response.data.id, previewUrl: null };
  } catch (err) {
    console.error(`❌ Gửi email chào mừng thất bại: ${err.message}`);
    throw err;
  }
}

// ── Send Custom AI Email (For Cancellations, Approvals, etc) ──
async function sendAICustomEmail(to, name, subject, content) {
  try {
    if (!isMailConfigured()) {
      console.log('📧 [DEV] Mail not configured, skipping email send');
      return { messageId: 'dev-' + Math.random().toString(36).substr(2, 9), previewUrl: null };
    }

    const resend = getResendClient();

    console.log(`📬 Sending custom email to ${to}: "${subject}"...`);

    const response = await resend.emails.send({
      from: getMailFrom(),
      to,
      subject: subject,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="font-family:sans-serif;background:#f5f5f5;padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#d32f2f,#7b1fa2);padding:24px 32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:20px;">Thông báo từ goBook</h1>
    </div>
    <div style="padding:32px;">
      <p style="font-size:16px;font-weight:700;color:#1a1a2e;">Xin chào ${name},</p>
      <div style="color:#555;line-height:1.6;">${content}</div>
      <p style="color:#777;font-size:13px;margin-top:24px;border-top:1px solid #eee;padding-top:16px;">Đây là email tự động từ hệ thống trợ lý ảo của goBook. Vui lòng không trả lời email này.</p>
    </div>
  </div>
</body>
</html>
      `,
    });

    if (response.error) {
      throw new Error(`Resend error: ${response.error.message}`);
    }

    console.log(`✅ Custom email sent to ${to}, messageId: ${response.data.id}`);
    return { messageId: response.data.id, previewUrl: null };
  } catch (err) {
    console.error(`❌ Gửi email tùy chỉnh thất bại: ${err.message}`);
    throw err;
  }
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail, sendAICustomEmail, getTransporter, isMailConfigured, getMailFrom };
