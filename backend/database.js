const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const mountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const DB_PATH = path.join(mountPath, 'minhlongbook.db');

// Create data directory if needed (fallback for localized runs)
const fs = require('fs');
if (!fs.existsSync(mountPath)) fs.mkdirSync(mountPath, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── CREATE TABLES ─────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'customer',
    is_active INTEGER NOT NULL DEFAULT 1,
    phone TEXT,
    address TEXT,
    google_id TEXT,
    avatar TEXT,
    email_verified INTEGER NOT NULL DEFAULT 0,
    verification_token TEXT,
    verification_token_expires TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS user_addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    province_id INTEGER DEFAULT NULL,
    district_id INTEGER DEFAULT NULL,
    ward_code TEXT DEFAULT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT DEFAULT '📚',
    sort_order INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    price INTEGER NOT NULL,
    original_price INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER REFERENCES categories(id),
    publisher TEXT DEFAULT '',
    author TEXT DEFAULT '',
    description TEXT DEFAULT '',
    image TEXT DEFAULT '',
    is_new INTEGER DEFAULT 0,
    is_bestseller INTEGER DEFAULT 0,
    sku TEXT DEFAULT '',
    rating REAL DEFAULT 4.5,
    review_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    address TEXT NOT NULL,
    city TEXT DEFAULT '',
    district TEXT DEFAULT '',
    note TEXT DEFAULT '',
    -- GHN shipping integration
    ghn_to_district_id INTEGER DEFAULT NULL,
    ghn_to_ward_code TEXT DEFAULT NULL,
    ghn_fee INTEGER NOT NULL DEFAULT 0,
    ghn_order_code TEXT DEFAULT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cod',
    status TEXT NOT NULL DEFAULT 'pending',
    payment_status TEXT NOT NULL DEFAULT 'unpaid',
    payment_ref TEXT DEFAULT NULL,
    subtotal INTEGER NOT NULL DEFAULT 0,
    shipping_fee INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    product_image TEXT DEFAULT '',
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS blogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    excerpt TEXT DEFAULT '',
    content TEXT DEFAULT '',
    author TEXT DEFAULT '',
    category TEXT DEFAULT '',
    image TEXT DEFAULT '',
    is_published INTEGER DEFAULT 1,
    view_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS vouchers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'percent',
    value INTEGER NOT NULL DEFAULT 0,
    min_order_value INTEGER DEFAULT 0,
    max_discount INTEGER DEFAULT 0,
    usage_limit INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS banners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    subtitle TEXT DEFAULT '',
    image TEXT DEFAULT '',
    link TEXT DEFAULT '/',
    position TEXT NOT NULL DEFAULT 'hero',
    button_text TEXT DEFAULT 'Xem ngay',
    bg_color TEXT DEFAULT 'linear-gradient(135deg,#d32f2f,#7b1fa2)',
    sort_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    click_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS homepage_layout (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_visible INTEGER NOT NULL DEFAULT 1,
    item_count INTEGER DEFAULT 10,
    selected_items TEXT DEFAULT '[]',
    is_manual INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    banner_image TEXT,
    bg_color TEXT,
    is_active INTEGER DEFAULT 1,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS campaign_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    campaign_price INTEGER NOT NULL,
    discount_percent INTEGER DEFAULT 0,
    stock_limit INTEGER DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL DEFAULT 5,
    comment TEXT,
    is_visible INTEGER DEFAULT 1,
    reply TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    admin_reply TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

// --- Migrations for new GHN columns (safe to run multiple times) ---
try {
  const existing = db.prepare("PRAGMA table_info(orders)").all().map(r => r.name);
  if (!existing.includes('ghn_to_district_id')) {
    db.prepare("ALTER TABLE orders ADD COLUMN ghn_to_district_id INTEGER DEFAULT NULL").run();
  }
  if (!existing.includes('ghn_to_ward_code')) {
    db.prepare("ALTER TABLE orders ADD COLUMN ghn_to_ward_code TEXT DEFAULT NULL").run();
  }
  if (!existing.includes('ghn_fee')) {
    db.prepare("ALTER TABLE orders ADD COLUMN ghn_fee INTEGER NOT NULL DEFAULT 0").run();
  }
  if (!existing.includes('ghn_order_code')) {
    db.prepare("ALTER TABLE orders ADD COLUMN ghn_order_code TEXT DEFAULT NULL").run();
  }
} catch (e) {
  console.warn('DB migration warning:', e.message || e);
}

// Migrate user_addresses to include GHN fields if missing
try {
  const ua = db.prepare("PRAGMA table_info(user_addresses)").all().map(r => r.name);
  if (!ua.includes('province_id')) {
    db.prepare("ALTER TABLE user_addresses ADD COLUMN province_id INTEGER DEFAULT NULL").run();
  }
  if (!ua.includes('district_id')) {
    db.prepare("ALTER TABLE user_addresses ADD COLUMN district_id INTEGER DEFAULT NULL").run();
  }
  if (!ua.includes('ward_code')) {
    db.prepare("ALTER TABLE user_addresses ADD COLUMN ward_code TEXT DEFAULT NULL").run();
  }
} catch (e) {
  console.warn('DB user_addresses migration warning:', e.message || e);
}

function ensureUserColumns() {
  const columns = db.prepare('PRAGMA table_info(users)').all().map((row) => row.name);
  const additions = [
    ['reset_password_token', 'TEXT'],
    ['reset_password_token_expires', 'TEXT'],
  ];

  for (const [columnName, columnType] of additions) {
    if (!columns.includes(columnName)) {
      db.prepare(`ALTER TABLE users ADD COLUMN ${columnName} ${columnType}`).run();
    }
  }
}

ensureUserColumns();

// ─── SEED DATA ─────────────────────────────────────────────────────────────────
async function seedDatabase() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (userCount > 0) return; // Already seeded

  console.log('🌱 Seeding database...');

  // Admin user
  const adminHash = bcrypt.hashSync('Admin@123', 10);
  db.prepare(`INSERT INTO users (name, email, password_hash, role, email_verified) VALUES (?, ?, ?, ?, 1)`)
    .run('Admin goBook', 'admin@gobook.vn', adminHash, 'admin');

  // Sample customers
  const custHash = bcrypt.hashSync('123456', 10);
  const customers = [
    ['Nguyễn Văn An', 'nguyenvanan@gmail.com', 'Hà Nội'],
    ['Trần Thị Bình', 'tranthibinh@gmail.com', 'TP. Hồ Chí Minh'],
    ['Lê Minh Cường', 'leminhcuong@gmail.com', 'Đà Nẵng'],
    ['Phạm Thu Dung', 'phamthudung@gmail.com', 'Hải Phòng'],
    ['Hoàng Văn Em', 'hoangvanem@gmail.com', 'Cần Thơ'],
  ];
  const insertUser = db.prepare(`INSERT INTO users (name, email, password_hash, role, email_verified) VALUES (?, ?, ?, 'customer', 1)`);
  customers.forEach(([name, email]) => insertUser.run(name, email, custHash));

  // Categories
  const cats = [
    ['Sách Kỹ Năng Sống', 'ky-nang-song', '🧠', 1],
    ['Sách Thiếu Nhi', 'sach-thieu-nhi', '👶', 2],
    ['Sách Giáo Khoa', 'giao-khoa', '📚', 3],
    ['Quản Trị Kinh Doanh', 'quan-tri', '💼', 4],
    ['Văn Học Truyện', 'van-hoc', '📖', 5],
    ['Nuôi Dạy Con', 'nuoi-day-con', '👨‍👧', 6],
    ['Tâm Lý Học', 'tam-ly-hoc', '🧘', 7],
    ['Đồ Chơi Giáo Dục', 'do-choi', '🎮', 8],
    ['Combo Sách', 'combo', '📦', 9],
    ['Sách Tiếng Anh', 'tieng-anh', '🌍', 10],
  ];
  const insertCat = db.prepare(`INSERT INTO categories (name, slug, icon, sort_order) VALUES (?, ?, ?, ?)`);
  cats.forEach(c => insertCat.run(...c));

  // Load real products if available
  let productsToSeed = [];
  try {
    const productsRealPath = 'file://' + path.join(__dirname, '../src/data/products_real.js').replace(/\\/g, '/');
    const module = await import(productsRealPath);
    productsToSeed = module.mlbProducts || [];
  } catch (err) {
    console.warn('Could not load products_real.js for seeding:', err.message);
  }

  // Fallback sample products if products_real is empty
  const bookCovers = [
    'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=300&h=400&fit=crop',
    'https://images.unsplash.com/photo-1476275466078-4007374efbbe?w=300&h=400&fit=crop',
  ];
  const fallbackProducts = [
    ['Chuẩn Mực Công Việc Mới', 'chuan-muc-cong-viec-moi', 71500, 110000, 35, 50, 1, 'NXB Hà Nội', 'Bùi Mạnh Chiến', 'Thay Đổi Văn Hóa Làm Việc Quá Sức', bookCovers[0], 1, 0, '8936238101603', 4.8, 124],
    ['Công Việc Của Bạn Có Đáng Làm Không', 'cong-viec-co-dang-lam', 105000, 140000, 25, 35, 1, 'NXB Hà Nội', 'Châu Thiên Ái', 'Khám Phá Và Suy Ngẫm Về Ý Nghĩa Công Việc', bookCovers[1], 1, 1, '8936238101597', 4.6, 89],
    ['Triết Lí To To Cho Đám Trẻ Nhỏ Nhỏ', 'triet-li-to-to', 156000, 195000, 20, 42, 2, 'NXB Phụ Nữ', 'Bích Hường', 'Cuốn sách tranh phổ cập triết học dành cho trẻ mẫu giáo', bookCovers[2], 1, 0, '8936238101429', 4.9, 201],
    ['Làm Chủ Cảm Xúc Làm Chủ Cuộc Đời', 'lam-chu-cam-xuc', 150000, 200000, 25, 28, 1, 'NXB Văn Học', 'Lý Lệ Quân', 'Tâm thế quyết định cảm xúc của một người', bookCovers[3], 1, 1, '8936238101436', 4.7, 156],
    ['Rèn Con Học Giỏi Cấp Tiểu Học', 'ren-con-hoc-gioi', 60000, 80000, 25, 63, 6, 'NXB Phụ Nữ', 'Như Quỳnh', 'Giúp trẻ xây dựng nền tảng học tập vững chắc', bookCovers[4], 1, 0, '8936238101108', 4.5, 78],
  ];

  const insertProd = db.prepare(`
    INSERT INTO products (name, slug, price, original_price, discount, stock, category_id, publisher, author, description, image, is_new, is_bestseller, sku, rating, review_count, pdf_url, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const catRows = db.prepare('SELECT id, slug FROM categories').all();
  const catMap = {};
  catRows.forEach(c => catMap[c.slug] = c.id);

  if (productsToSeed.length > 0) {
    productsToSeed.forEach(p => {
      try {
        const imgs = p.images ? JSON.stringify(p.images) : JSON.stringify([p.image].filter(Boolean));
        insertProd.run(
          p.name, p.slug, p.price, p.originalPrice || p.price, p.discount || 0, p.stock || 100,
          catMap[p.category] || null, p.publisher || '', p.author || '', p.description || '', p.image || '',
          p.isNew ? 1 : 0, p.isBestseller ? 1 : 0, p.sku || '', p.rating || 4.5, p.reviews || 0,
          p.pdfUrl || null, imgs
        );
      } catch(e) { }
    });
  } else {
    fallbackProducts.forEach(p => insertProd.run(...p, null, JSON.stringify([p[10]])));
  }

  // Sample orders
  const statuses = ['pending', 'confirmed', 'shipping', 'delivered', 'cancelled'];
  const paymentMethods = ['cod', 'bank', 'momo'];

  const insertOrder = db.prepare(`
    INSERT INTO orders (code, user_id, customer_name, phone, email, address, city, payment_method, status, subtotal, shipping_fee, total, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const orderData = [
    ['MLB00000001', 2, 'Nguyễn Văn An', '0966160925', 'an@gmail.com', '123 Minh Khai', 'Hà Nội', 'cod', 'delivered', 315000, 0, 315000, '2026-04-01 09:00:00'],
    ['MLB00000002', 3, 'Trần Thị Bình', '0912345678', 'binh@gmail.com', '45 Lê Lợi', 'TP. Hồ Chí Minh', 'momo', 'shipping', 262500, 0, 262500, '2026-04-03 10:30:00'],
    ['MLB00000003', 4, 'Lê Minh Cường', '0987654321', 'cuong@gmail.com', '78 Trần Phú', 'Đà Nẵng', 'bank', 'confirmed', 176750, 30000, 206750, '2026-04-05 14:00:00'],
    ['MLB00000004', null, 'Khách vãng lai', '0900123456', '', '999 Nguyễn Trãi', 'Hải Phòng', 'cod', 'pending', 97500, 30000, 127500, '2026-04-07 08:15:00'],
    ['MLB00000005', 5, 'Phạm Thu Dung', '0977888999', 'dung@gmail.com', '12 Hùng Vương', 'Cần Thơ', 'cod', 'delivered', 405000, 0, 405000, '2026-04-08 11:00:00'],
    ['MLB00000006', 6, 'Hoàng Văn Em', '0966111222', 'em@gmail.com', '56 Điện Biên Phủ', 'Hà Nội', 'momo', 'pending', 131500, 30000, 161500, '2026-04-08 20:30:00'],
  ];

  orderData.forEach((ord, i) => {
    const result = insertOrder.run(...ord);
    const oId = result.lastInsertRowid;
    // Add 1-2 items per order
    // use a fallback product from DB
    const p1 = db.prepare('SELECT id, name, image, price FROM products ORDER BY id LIMIT 1 OFFSET ?').get(i) || {id:1, name:'Book', image:'', price:100000};
    insertOrderItem.run(oId, p1.id, p1.name, p1.image, p1.price, 1, p1.price);
    if (i % 2 === 0) {
      const p2 = db.prepare('SELECT id, name, image, price FROM products ORDER BY id LIMIT 1 OFFSET ?').get(i+1) || {id:2, name:'Book 2', image:'', price:100000};
      insertOrderItem.run(oId, p2.id, p2.name, p2.image, p2.price, 1, p2.price);
    }
  });

  // Sample blogs
  const blogs = [
    ['Đừng Để Vòng Tròn Bạn Bè Gói Gọn Trong Chiếc Điện Thoại', 'vong-tron-ban-be',
     'Có phải chúng ta đang dần trở thành những người lớn ngại ngùng?',
     '<p>Nội dung bài viết đầy đủ ở đây...</p>', 'KDOL Tâm Anh', 'Kỹ Năng Sống',
     'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=400&fit=crop', 1],
    ['Hình Mẫu Nam Tính Độc Hại Trong Công Việc', 'nam-tinh-doc-hai',
     '"Đàn ông đích thực" là phi thực tế!',
     '<p>Nội dung bài viết đầy đủ ở đây...</p>', 'KDOL Tâm Anh', 'Tâm Lý Học',
     'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop', 1],
    ['Học Cách Kiên Trì Rèn Luyện Tính Kỷ Luật Qua Murakami', 'kien-tri-ky-luat-murakami',
     'Sở dĩ nhà văn Haruki Murakami có thể duy trì danh tiếng lâu dài...',
     '<p>Nội dung bài viết đầy đủ ở đây...</p>', 'KDOL Tâm Anh', 'Kỹ Năng Sống',
     'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800&h=400&fit=crop', 1],
  ];
  const insertBlog = db.prepare(`
    INSERT INTO blogs (title, slug, excerpt, content, author, category, image, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  blogs.forEach(b => insertBlog.run(...b));

  // Sample vouchers
  const vouchers = [
    ['WELCOME10', 'Chào mừng thành viên mới', 'percent', 10, 0, 50000, 100, 0, 1, '2026-01-01', '2026-12-31', 'Giảm 10% cho đơn hàng đầu tiên'],
    ['SUMMER20', 'Khuyến mãi mùa hè', 'percent', 20, 200000, 100000, 50, 12, 1, '2026-04-01', '2026-06-30', 'Giảm 20% tối đa 100k cho đơn từ 200k'],
    ['FREESHIP', 'Miễn phí vận chuyển', 'fixed', 30000, 150000, 30000, 200, 45, 1, '2026-01-01', '2026-12-31', 'Miễn phí ship cho đơn từ 150k'],
    ['FLASH50K', 'Flash Sale giảm 50k', 'fixed', 50000, 300000, 50000, 30, 30, 0, '2026-04-08', '2026-04-08', 'Giảm thẳng 50k cho đơn từ 300k'],
    ['BIRTHDAY18', 'Sinh nhật 18 tuổi', 'percent', 18, 180000, 80000, 500, 89, 1, '2026-04-01', '2026-04-30', 'Ưu đãi đặc biệt nhân dịp sinh nhật cửa hàng'],
    ['VIP30', 'Ưu đãi khách VIP', 'percent', 30, 500000, 200000, 20, 5, 1, '2026-04-01', '2026-12-31', 'Dành riêng cho khách hàng thân thiết VIP'],
  ];
  const insertVoucher = db.prepare(`
    INSERT INTO vouchers (code, name, type, value, min_order_value, max_discount, usage_limit, used_count, is_active, start_date, end_date, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  vouchers.forEach(v => insertVoucher.run(...v));

  // Sample banners
  const banners = [
    ['Mừng Sinh Nhật 18 Tuổi', 'Deal sách 18K đặc biệt - Tri ân khách hàng', 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&h=450&fit=crop', '/danh-muc/ky-nang-song', 'hero', 'Mua ngay', 'linear-gradient(135deg,#d32f2f 0%,#7b1fa2 100%)', 1, 1, '2026-04-01', '2026-04-30', 0],
    ['Sách Hot - Deal Hời Giảm 35%', 'Hàng trăm đầu sách hay với giá ưu đãi', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&h=450&fit=crop', '/danh-muc/van-hoc', 'hero', 'Khám phá', 'linear-gradient(135deg,#1565c0 0%,#0288d1 100%)', 2, 1, '2026-04-01', '2026-12-31', 0],
    ['Flash Sale Mỗi Ngày', 'Giảm đến 50% - Số lượng có hạn!', 'https://images.unsplash.com/photo-1550399105-c4db5fb85c18?w=1200&h=450&fit=crop', '/', 'hero', 'Xem flash sale', 'linear-gradient(135deg,#e65100 0%,#f57f17 100%)', 3, 1, '2026-01-01', '2026-12-31', 0],
    ['Side Banner - Sách Thiếu Nhi', 'Kho sách thiếu nhi đa dạng', 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?w=400&h=300&fit=crop', '/danh-muc/sach-thieu-nhi', 'sidebar', 'Xem ngay', '#fff3e0', 1, 1, null, null, 0],
    ['Popup Khuyến Mãi', 'Nhập WELCOME10 giảm 10% đơn đầu tiên', 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&h=300&fit=crop', '/danh-muc/ky-nang-song', 'popup', 'Lấy mã', 'linear-gradient(135deg,#2e7d32,#43a047)', 1, 0, null, null, 0],
  ];
  const insertBanner = db.prepare(`
    INSERT INTO banners (title, subtitle, image, link, position, button_text, bg_color, sort_order, is_active, start_date, end_date, click_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  banners.forEach(b => insertBanner.run(...b));
  console.log('✅ Database seeded!');
}

function seedLayout() {
  const layoutCount = db.prepare('SELECT COUNT(*) as c FROM homepage_layout').get().c;
  if (layoutCount > 0) return;

  const layouts = [
    ['flash_sale', 'Flash Sale', 1, 1],
    ['new_books', 'Sách Mới Lên Kệ', 2, 1],
    ['best_sellers', 'Top Sách Bán Chạy', 3, 1],
    ['combos', 'Combo Bán Chạy', 4, 1],
    ['toys', 'Đồ Chơi Giáo Dục', 5, 1],
    ['blog', 'Điểm Sách & Chia Sẻ', 6, 1],
    ['newsletter', 'Đăng ký nhận thông tin', 7, 1]
  ];
  const insertLayout = db.prepare(`
    INSERT INTO homepage_layout (section_id, name, order_index, is_visible)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(section_id) DO NOTHING
  `);
  layouts.forEach(l => insertLayout.run(...l));
  console.log('✅ Homepage layout seeded!');
}

async function init() {
  await seedDatabase();
  seedLayout();
}
init();

module.exports = db;
