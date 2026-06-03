const express = require('express');
const router = express.Router();
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');

// Lấy danh sách chiến dịch
router.get('/', auth, adminOnly, (req, res) => {
  try {
    const campaigns = db.prepare('SELECT * FROM campaigns ORDER BY created_at DESC').all();
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Thêm chiến dịch mới
router.post('/', auth, adminOnly, (req, res) => {
  const { name, slug, description, banner_image, bg_color, start_date, end_date, is_active, items } = req.body;
  if (!name || !slug) return res.status(400).json({ error: 'Tên và Slug không được để trống' });

  try {
    let newId;
    db.transaction(() => {
      const insert = db.prepare(`
        INSERT INTO campaigns (name, slug, description, banner_image, bg_color, start_date, end_date, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const result = insert.run(name, slug, description || '', banner_image || '', bg_color || '', start_date || '', end_date || '', is_active !== undefined ? is_active : 1);
      newId = result.lastInsertRowid;

      if (Array.isArray(items) && items.length > 0) {
        const insertItem = db.prepare(`
          INSERT INTO campaign_items (campaign_id, product_id, campaign_price, discount_percent, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `);
        items.forEach((item, index) => {
          insertItem.run(newId, item.product_id, item.campaign_price, item.discount_percent, index);
        });
      }
    })();
    res.status(201).json({ id: newId, message: 'Tạo chiến dịch thành công' });
  } catch (error) {
    if (error.message.includes('UNIQUE')) return res.status(400).json({ error: 'Slug đã tồn tại' });
    res.status(500).json({ error: error.message });
  }
});

// Lấy chi tiết chiến dịch và các sản phẩm bên trong
router.get('/:id', auth, adminOnly, (req, res) => {
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Không tìm thấy chiến dịch' });

    const items = db.prepare(`
      SELECT ci.*, p.name as product_name, p.image as product_image, p.price as original_price, p.slug as product_slug
      FROM campaign_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.campaign_id = ?
      ORDER BY ci.sort_order ASC
    `).all(campaign.id);

    res.json({ ...campaign, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cập nhật chiến dịch
router.put('/:id', auth, adminOnly, (req, res) => {
  const { name, slug, description, banner_image, bg_color, start_date, end_date, is_active, items } = req.body;
  
  try {
    db.transaction(() => {
      // Update campaign info
      if (name && slug) {
        db.prepare(`
          UPDATE campaigns 
          SET name=?, slug=?, description=?, banner_image=?, bg_color=?, start_date=?, end_date=?, is_active=?, updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `).run(name, slug, description || '', banner_image || '', bg_color || '', start_date || '', end_date || '', is_active !== undefined ? is_active : 1, req.params.id);
      }

      // Update items if provided
      if (Array.isArray(items)) {
        db.prepare('DELETE FROM campaign_items WHERE campaign_id = ?').run(req.params.id);
        const insertItem = db.prepare(`
          INSERT INTO campaign_items (campaign_id, product_id, campaign_price, discount_percent, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `);
        items.forEach((item, index) => {
          insertItem.run(req.params.id, item.product_id, item.campaign_price, item.discount_percent, index);
        });
      }
    })();
    res.json({ message: 'Cập nhật thành công' });
  } catch (error) {
    if (error.message.includes('UNIQUE')) return res.status(400).json({ error: 'Slug đã tồn tại' });
    res.status(500).json({ error: error.message });
  }
});

// Xóa chiến dịch
router.delete('/:id', auth, adminOnly, (req, res) => {
  try {
    const campaign = db.prepare('SELECT slug FROM campaigns WHERE id = ?').get(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Không tìm thấy chiến dịch' });

    db.transaction(() => {
      // Xóa chiến dịch
      db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);

      // Xóa khỏi layout trang chủ
      db.prepare('DELETE FROM homepage_layout WHERE section_id = ?').run(`campaign_${campaign.slug}`);

      // Xóa khỏi menu header
      const menuSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('header_menu');
      if (menuSetting && menuSetting.value) {
        let menuItems = JSON.parse(menuSetting.value);
        const originalLength = menuItems.length;
        menuItems = menuItems.filter(item => item.url !== `/collections/${campaign.slug}`);
        if (menuItems.length !== originalLength) {
          db.prepare('UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(JSON.stringify(menuItems), 'header_menu');
        }
      }
    })();

    res.json({ message: 'Đã xóa chiến dịch' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
