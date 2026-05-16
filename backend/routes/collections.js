const express = require('express');
const router = express.Router();
const db = require('../database');

// Lấy chi tiết campaign kèm theo các sản phẩm để hiển thị cho KH
router.get('/:slug', (req, res) => {
  try {
    const campaign = db.prepare('SELECT * FROM campaigns WHERE slug = ? AND is_active = 1').get(req.params.slug);
    
    if (!campaign) {
      return res.status(404).json({ error: 'Không tìm thấy chiến dịch hoặc chiến dịch đã kết thúc' });
    }

    // Lấy thông tin sản phẩm và ghi đè giá từ campaign_items
    // Chúng ta trả về cấu trúc tương tự bảng products nhưng giá bị ghi đè
    const products = db.prepare(`
      SELECT 
        p.*, 
        ci.campaign_price as price, 
        p.price as original_price, 
        ci.discount_percent as discount,
        ci.sold_count as campaign_sold_count
      FROM campaign_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.campaign_id = ?
      ORDER BY ci.sort_order ASC
    `).all(campaign.id);

    res.json({ campaign, products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
