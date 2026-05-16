const db = require('./database');
try {
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
  upsertStmt.run('campaign_test', 'Test', 8, 1, 10, '[]', 1);
  console.log("Success!");
} catch (e) {
  console.log("Error:", e.message);
}
