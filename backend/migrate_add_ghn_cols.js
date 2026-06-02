const Database = require('better-sqlite3');
const path = require('path');
const mountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const DB_PATH = path.join(mountPath, 'minhlongbook.db');
const db = new Database(DB_PATH);
console.log('DB:', DB_PATH);
const existing = db.prepare("PRAGMA table_info('orders')").all().map(r=>r.name);
console.log('Existing columns:', existing);
const stmts = [];
if (!existing.includes('ghn_to_district_id')) stmts.push("ALTER TABLE orders ADD COLUMN ghn_to_district_id INTEGER DEFAULT NULL");
if (!existing.includes('ghn_to_ward_code')) stmts.push("ALTER TABLE orders ADD COLUMN ghn_to_ward_code TEXT DEFAULT NULL");
if (!existing.includes('ghn_fee')) stmts.push("ALTER TABLE orders ADD COLUMN ghn_fee INTEGER NOT NULL DEFAULT 0");
if (!existing.includes('ghn_order_code')) stmts.push("ALTER TABLE orders ADD COLUMN ghn_order_code TEXT DEFAULT NULL");
for (const s of stmts) {
  try {
    console.log('Running:', s);
    db.prepare(s).run();
  } catch (e) {
    console.error('Err running:', s, e.message);
  }
}
console.log('Done. Columns now:');
console.log(db.prepare("PRAGMA table_info('orders')").all().map(r=>r.name));
db.close();
