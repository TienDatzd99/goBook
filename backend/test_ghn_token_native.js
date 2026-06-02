const https = require('https');
const { URL } = require('url');

const base = process.env.GHN_BASE_URL || process.argv[2] || 'https://online-gateway.ghn.vn';
const token = process.env.GHN_TOKEN || process.argv[3] || '';
const clientId = process.env.GHN_CLIENT_ID || process.argv[4] || '';
const shopId = process.env.GHN_SHOP_ID || process.argv[5] || '';

if (!base || !token || !clientId || !shopId) {
  console.error('Usage: GHN_BASE_URL + GHN_TOKEN + GHN_CLIENT_ID + GHN_SHOP_ID (env or args)');
  process.exit(1);
}

const url = new URL('/shiip/public-api/master-data/province', base.replace(/\/$/, ''));

const options = {
  method: 'GET',
  headers: {
    Token: token,
    ClientId: clientId,
    ShopId: shopId,
    'Content-Type': 'application/json',
  },
};

const req = https.request(url, options, (res) => {
  console.log('STATUS', res.statusCode);
  let data = '';
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    data += chunk;
    if (data.length > 2000) {
      // stop reading large bodies
      res.destroy();
    }
  });
  res.on('end', () => {
    console.log('BODY_PREVIEW');
    console.log(data.slice(0, 2000));
  });
});

req.on('error', (e) => {
  console.error('REQUEST_ERROR', e.message);
});

req.end();
