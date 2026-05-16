const db = require('./database');
const rows = db.prepare(`
SELECT 
  p.id, p.name,
  COALESCE(camp.campaign_price, p.price) as price,
  CASE WHEN camp.campaign_price IS NOT NULL THEN p.price ELSE p.original_price END as original_price,
  CASE WHEN camp.campaign_price IS NOT NULL THEN camp.discount_percent ELSE p.discount END as discount,
  camp.campaign_price
FROM products p
LEFT JOIN (
  SELECT product_id, MIN(campaign_price) as campaign_price, discount_percent
  FROM campaign_items ci
  JOIN campaigns c2 ON ci.campaign_id = c2.id
  WHERE c2.is_active = 1
  GROUP BY product_id
) camp ON p.id = camp.product_id
LIMIT 5
`).all();
console.log(rows);
