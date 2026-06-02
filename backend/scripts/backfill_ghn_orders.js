const db = require('../database');
const { getProvinces, getDistricts, getWards, getGhnConfig, createGhnClient } = require('../services/ghn');

function normalize(s) {
  if (!s) return '';
  return s.toString().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^a-z0-9\s]/g, '').trim();
}

async function findProvinceIdByText(text) {
  const provinces = await getProvinces();
  const list = provinces?.data || provinces || [];
  const n = normalize(text);
  return (list.find(p => n.includes(normalize(p.ProvinceName)) || normalize(p.ProvinceName).includes(n)) || {}).ProvinceID || null;
}

async function findDistrictIdByText(provinceId, text) {
  if (!provinceId) return null;
  const res = await getDistricts(provinceId);
  const list = res?.data || res || [];
  const n = normalize(text);
  return (list.find(d => n.includes(normalize(d.DistrictName)) || normalize(d.DistrictName).includes(n)) || {}).DistrictID || null;
}

async function findWardCodeByText(districtId, text) {
  if (!districtId) return null;
  const res = await getWards(districtId);
  const list = res?.data || res || [];
  const n = normalize(text);
  const found = list.find(w => n.includes(normalize(w.WardName)) || normalize(w.WardName).includes(n));
  return found ? found.WardCode : null;
}

async function backfill({ dryRun = true, limit = 0 } = {}) {
  const orders = db.prepare('SELECT id, address, city, district FROM orders WHERE (ghn_to_district_id IS NULL OR ghn_to_ward_code IS NULL) AND status IS NOT NULL ORDER BY id ASC').all();
  console.log(`Found ${orders.length} orders with missing GHN fields`);
  let processed = 0;

  for (const o of orders) {
    if (limit && processed >= limit) break;
    processed++;
    const txt = [o.address, o.district, o.city].filter(Boolean).join(' ');
    let provinceId = await findProvinceIdByText(txt);
    let districtId = null;
    let wardCode = null;

    if (!provinceId && o.city) provinceId = await findProvinceIdByText(o.city);
    if (provinceId) districtId = await findDistrictIdByText(provinceId, txt);
    if (districtId) wardCode = await findWardCodeByText(districtId, txt);

    console.log(`Order ${o.id} -> province:${provinceId} district:${districtId} ward:${wardCode}`);
    if (!dryRun && (districtId || wardCode)) {
      db.prepare('UPDATE orders SET ghn_to_district_id=?, ghn_to_ward_code=?, updated_at=datetime(\'now\','\'localtime\') WHERE id=?')
        .run(districtId || null, wardCode || null, o.id);
      console.log(`Updated order ${o.id}`);
    }
  }

  console.log('Done');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dry = args.includes('--run') ? false : true;
  const limIndex = args.findIndex(a => a === '--limit');
  const limit = limIndex >= 0 ? Number(args[limIndex+1] || 0) : 0;
  console.log(`Backfill GHN orders (dryRun=${dry})`);
  backfill({ dryRun: dry, limit }).catch(err => { console.error(err); process.exit(1); });
}
