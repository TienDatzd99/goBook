const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const db = require('../database');

router.get('/homepage', (req, res) => {
  try {
    const layout = db.prepare('SELECT * FROM homepage_layout ORDER BY order_index ASC').all();
    res.json(layout);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi lấy cấu hình trang chủ' });
  }
});

router.put('/homepage', auth, adminOnly, (req, res) => {
  try {
    const { layout } = req.body;
    if (!Array.isArray(layout)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }

    const upsertStmt = db.prepare(`
      INSERT INTO homepage_layout (section_id, name, order_index, is_visible, item_count, selected_items, is_manual)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(section_id) DO UPDATE SET
        name = excluded.name,
        order_index = excluded.order_index,
        is_visible = excluded.is_visible,
        item_count = excluded.item_count,
        selected_items = excluded.selected_items,
        is_manual = excluded.is_manual,
        updated_at = datetime('now','localtime')
    `);
    
    db.transaction(() => {
      layout.forEach((item, index) => {
        const itemCount = item.item_count !== undefined ? item.item_count : 10;
        const selectedItems = typeof item.selected_items === 'string' ? item.selected_items : JSON.stringify(item.selected_items || []);
        const isManual = item.is_manual ? 1 : 0;
        upsertStmt.run(item.section_id, item.name, index + 1, item.is_visible ? 1 : 0, itemCount, selectedItems, isManual);
      });
    })();

    const updatedLayout = db.prepare('SELECT * FROM homepage_layout ORDER BY order_index ASC').all();
    res.json(updatedLayout);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi cập nhật cấu hình' });
  }
});

// Generic Settings API
router.get('/:key', (req, res) => {
  try {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key);
    if (setting) {
      res.json(JSON.parse(setting.value));
    } else {
      res.json(null);
    }
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi lấy cấu hình' });
  }
});

router.put('/:key', auth, adminOnly, (req, res) => {
  try {
    const { data } = req.body;
    const stmt = db.prepare(`
      INSERT INTO settings (key, value, updated_at) 
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `);
    stmt.run(req.params.key, JSON.stringify(data));
    res.json({ message: 'Cập nhật cấu hình thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi server khi cập nhật cấu hình' });
  }
});

module.exports = router;
