const Database = require('better-sqlite3');
const path = require('path');
const mountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH || path.join(__dirname, 'data');
const DB_PATH = path.join(mountPath, 'minhlongbook.db');
const db = new Database(DB_PATH);
const cols = db.prepare("PRAGMA table_info('orders')").all();
console.log('DB_PATH=', DB_PATH);
console.log(cols);
