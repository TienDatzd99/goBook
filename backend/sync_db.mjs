import Database from 'better-sqlite3';
import { mlbProducts } from '../src/data/products_real.js';

const db = new Database('./data/minhlongbook.db');

try {
  // Add new columns to support the newly scraped data (ignore if exists)
  try { db.prepare('ALTER TABLE products ADD COLUMN pdf_url TEXT').run(); } catch(e){}
  try { db.prepare('ALTER TABLE products ADD COLUMN images TEXT').run(); } catch(e){}

  // Get categories to map slug to ID
  const cats = db.prepare('SELECT id, slug FROM categories').all();
  const catMap = {};
  cats.forEach(c => { catMap[c.slug] = c.id; });

  // Delete all old mock products to ensure clean state
  // (We'll keep combo products as mock for now if they are not in the scraper, 
  // but wait, mlbProducts contains 'combo'?? Let's check. Actually delete all except maybe combos? 
  // Just delete all to maintain clean state, cascading if needed, or disable foreign keys temporarily)
  
  db.prepare('PRAGMA foreign_keys = OFF').run();
  db.prepare('DELETE FROM products').run();
  
  let inserted = 0;

  const insertStmt = db.prepare(`
    INSERT INTO products (name, slug, price, original_price, discount, stock, category_id, publisher, author, description, image, is_new, is_bestseller, sku, rating, review_count, pdf_url, images)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  console.log(`Starting to import ${mlbProducts.length} products...`);
  
  db.transaction(() => {
    for (const p of mlbProducts) {
      // Provide default fallback category if not found
      const catId = catMap[p.category] || catMap['van-hoc'] || 1; 
      
      insertStmt.run(
        p.name || 'Unknown',
        p.slug || 'unknown-' + Math.random(),
        p.price || 0,
        p.originalPrice || 0,
        p.discount || 0,
        p.stock || 50,
        catId,
        p.publisher || '',
        p.author || '',
        p.description || '',
        p.image || '',
        p.isNew ? 1 : 0,
        p.isBestseller ? 1 : 0,
        p.sku || '',
        p.rating || 4.5,
        p.reviews || 0,
        p.pdfUrl || null,
        p.images ? JSON.stringify(p.images) : null
      );
      inserted++;
    }
  })();
  
  db.prepare('PRAGMA foreign_keys = ON').run();
  
  console.log(`Successfully synced ${inserted} real products into the database.`);
} catch (err) {
  console.error("Error syncing DB:", err);
}

db.close();
