const axios = require('axios');

function mask(v) {
  if (!v) return null;
  const s = String(v);
  if (s.length <= 8) return '****' + s.slice(-4);
  return `${s.slice(0,4)}...${s.slice(-4)}`;
}

const baseURL = process.env.GHN_BASE_URL || 'https://online-gateway.ghn.vn';
const token = process.env.GHN_TOKEN || process.argv[2] || '';
const clientId = process.env.GHN_CLIENT_ID || process.argv[3] || '';
const shopId = process.env.GHN_SHOP_ID || process.argv[4] || '';

if (!token || !clientId || !shopId) {
  console.error('Missing values. Provide GHN_TOKEN, GHN_CLIENT_ID, GHN_SHOP_ID via env or args:');
  console.error('  node backend/test_ghn_token.js <GHN_TOKEN> <GHN_CLIENT_ID> <GHN_SHOP_ID>');
  process.exit(1);
}

console.log('Testing GHN credentials:', { token: mask(token), clientId: mask(clientId), shopId: mask(shopId) });

(async () => {
  try {
    const res = await axios.get(`${baseURL.replace(/\/$/, '')}/shiip/public-api/master-data/province`, {
      headers: {
        Token: token,
        ClientId: clientId,
        ShopId: shopId,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    console.log('GHN status:', res.status);
    console.log('GHN response:', JSON.stringify(res.data, null, 2));
    process.exit(0);
  } catch (err) {
    if (err.response) {
      console.error('GHN returned error status:', err.response.status);
      try {
        console.error('GHN response body:', JSON.stringify(err.response.data, null, 2));
      } catch (e) {
        console.error('GHN response (raw):', err.response.data);
      }
    } else {
      console.error('Request error:', err.message);
    }
    process.exit(2);
  }
})();
