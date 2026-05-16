const express = require('express');
const db = require('../database');
const router = express.Router();

// Helper xoá dấu tiếng Việt
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
};

router.get('/suggest', (req, res) => {
  const query = (req.query.q || '').trim().toLowerCase();
  
  if (!query || query.length < 1) {
    return res.json({ suggestions: [], products: [] });
  }

  const cleanQuery = removeAccents(query);

  try {
    // 1. Dùng p.slug để hứng các từ khóa gõ không dấu (sach -> sach-...)
    const products = db.prepare(`
      SELECT 
        p.id, p.name, p.slug, p.image, p.author,
        COALESCE(camp.campaign_price, p.price) as price,
        CASE WHEN camp.campaign_price IS NOT NULL THEN p.price ELSE p.original_price END as originalPrice,
        CASE WHEN camp.campaign_price IS NOT NULL THEN camp.discount_percent ELSE p.discount END as discount,
        CASE WHEN camp.campaign_price IS NOT NULL THEN 1 ELSE 0 END as is_flash_sale
      FROM products p
      LEFT JOIN (
        SELECT product_id, MIN(campaign_price) as campaign_price, discount_percent
        FROM campaign_items ci
        JOIN campaigns c2 ON ci.campaign_id = c2.id
        WHERE c2.is_active = 1
        GROUP BY product_id
      ) camp ON p.id = camp.product_id
      WHERE p.slug LIKE ? OR p.name LIKE ? OR p.author LIKE ? OR p.publisher LIKE ?
      LIMIT 30
    `).all(`%${cleanQuery}%`, `%${query}%`, `%${query}%`, `%${query}%`);

    // 2. Smart N-Gram Keyword Extraction
    const suggestionsSet = new Set();
    
    products.forEach(p => {
      const texts = [p.name, p.author].filter(Boolean);
      
      texts.forEach(text => {
        // Tách chuỗi thành mảng các từ thật (giữ nguyên dấu)
        const words = text.split(/[\s,:;.-]+/);
        
        for (let i = 0; i < words.length; i++) {
          if (!words[i]) continue;
          
          const wordNoAccent = removeAccents(words[i]).toLowerCase();
          
          // So sánh phiên bản không dấu của từ với từ khóa tìm kiếm (cũng không dấu)
          if (wordNoAccent.startsWith(cleanQuery)) {
            // Lưu lại phiên bản có dấu gốc
            if (words[i].length > query.length) {
                suggestionsSet.add(words[i]);
            }
            if (i + 1 < words.length) {
                suggestionsSet.add(`${words[i]} ${words[i+1]}`);
            }
            if (i + 2 < words.length) {
                suggestionsSet.add(`${words[i]} ${words[i+1]} ${words[i+2]}`);
            }
          }
        }
      });
    });

    // 3. Score and Filter Suggestions
    let suggestions = Array.from(suggestionsSet)
      .filter(s => s.trim().length > 2)
      .sort((a, b) => a.length - b.length) // Shorter (more concise) phrases first
      .slice(0, 8); // Top 8 smartest tags

    res.json({
      suggestions: suggestions,
      products: products.slice(0, 4) // Top 4 matched products for quick preview
    });
  } catch (err) {
    console.error('Search Suggest Error:', err);
    res.status(500).json({ error: 'Search mapping failed' });
  }
});

module.exports = router;
