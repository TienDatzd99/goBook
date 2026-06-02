const axios = require('axios');

function maskValue(value) {
  if (!value) return null;
  const str = String(value);
  if (str.length <= 8) return '****' + str.slice(-4);
  return `${str.slice(0, 4)}...${str.slice(-4)}`;
}

function getGhnConfig() {
  const baseURL = (process.env.GHN_BASE_URL || 'https://online-gateway.ghn.vn').replace(/\/$/, '');
  const token = (process.env.GHN_TOKEN || '').trim();
  const clientId = (process.env.GHN_CLIENT_ID || '').trim();
  const shopId = (process.env.GHN_SHOP_ID || '').trim();

  return {
    baseURL,
    token,
    clientId,
    shopId,
    fromProvinceId: (process.env.GHN_FROM_PROVINCE_ID || '').trim(),
    fromDistrictId: (process.env.GHN_FROM_DISTRICT_ID || '').trim(),
    fromWardCode: (process.env.GHN_FROM_WARD_CODE || '').trim(),
    serviceTypeId: (process.env.GHN_SERVICE_TYPE_ID || '').trim(),
  };
}

function isGhnConfigured() {
  const config = getGhnConfig();
  return Boolean(config.token && config.clientId && config.shopId);
}

function createGhnClient() {
  const config = getGhnConfig();

  if (!config.token || !config.clientId || !config.shopId) {
    throw new Error('GHN is not configured');
  }

  const client = axios.create({
    baseURL: config.baseURL,
    timeout: 15000,
    headers: {
      Token: config.token,
      ShopId: config.shopId,
      ClientId: config.clientId,
      'Content-Type': 'application/json',
    },
  });

  return { client, config };
}

async function getProvinces() {
  const { client } = createGhnClient();
  const res = await client.get('/shiip/public-api/master-data/province');
  return res.data;
}

async function getDistricts(provinceId) {
  const { client } = createGhnClient();
  const res = await client.post('/shiip/public-api/master-data/district', { province_id: Number(provinceId) });
  return res.data;
}

async function getWards(districtId) {
  const { client } = createGhnClient();
  const res = await client.get('/shiip/public-api/master-data/ward', {
    params: { district_id: Number(districtId) },
  });
  return res.data;
}

async function calculateFee(payload) {
  const { client, config } = createGhnClient();

  const body = {
    from_district_id: Number(payload.from_district_id || config.fromDistrictId || 0),
    from_ward_code: String(payload.from_ward_code || config.fromWardCode || ''),
    to_district_id: Number(payload.to_district_id),
    to_ward_code: String(payload.to_ward_code),
    service_type_id: Number(payload.service_type_id || config.serviceTypeId || 2),
    weight: Number(payload.weight || 0),
    length: Number(payload.length || 0),
    width: Number(payload.width || 0),
    height: Number(payload.height || 0),
    insurance_value: Number(payload.insurance_value || 0),
    cod_value: Number(payload.cod_value || 0),
    coupon: String(payload.coupon || ''),
  };

  try {
    const res = await client.post('/shiip/public-api/v2/shipping-order/fee', body);
    if (res && res.data) {
      console.debug('[GHN] calculateFee response:', JSON.stringify(res.data));
    }
    return res.data;
  } catch (err) {
    console.error('[GHN] calculateFee error:', err?.response?.status, err?.response?.data || err.message);
    throw err;
  }
}

async function createOrder(payload) {
  const { client, config } = createGhnClient();

  const body = {
    shop_id: Number(config.shopId),
    client_id: Number(config.clientId),
    from_district_id: Number(payload.from_district_id || config.fromDistrictId || 0),
    from_ward_code: String(payload.from_ward_code || config.fromWardCode || ''),
    to_name: payload.to_name,
    to_phone: payload.to_phone,
    to_address: payload.to_address,
    to_district_id: Number(payload.to_district_id),
    to_ward_code: String(payload.to_ward_code),
    cod_amount: Number(payload.cod_amount || 0),
    content: payload.content || 'Đơn hàng goBook',
    weight: Number(payload.weight || 0),
    length: Number(payload.length || 0),
    width: Number(payload.width || 0),
    height: Number(payload.height || 0),
    service_type_id: Number(payload.service_type_id || config.serviceTypeId || 2),
    payment_type_id: Number(payload.payment_type_id || 2),
    required_note: payload.required_note || 'KHONGCHOXEMHANG',
    note: payload.note || '',
    items: Array.isArray(payload.items) ? payload.items : [],
  };

  try {
    console.debug('[GHN] createOrder request body:', JSON.stringify({ shop_id: body.shop_id, client_id: body.client_id, to_name: body.to_name, to_phone: body.to_phone, to_address: body.to_address, to_district_id: body.to_district_id }));
    const res = await client.post('/shiip/public-api/v2/shipping-order/create', body);
    if (res && res.data) {
      console.debug('[GHN] createOrder response:', JSON.stringify(res.data));
    }
    return res.data;
  } catch (err) {
    console.error('[GHN] createOrder error:', err?.response?.status, err?.response?.data || err.message);
    throw err;
  }
}

module.exports = {
  calculateFee,
  createOrder,
  createGhnClient,
  getDistricts,
  getGhnConfig,
  getProvinces,
  getWards,
  isGhnConfigured,
  maskValue,
};