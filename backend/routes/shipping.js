const express = require('express');
const { calculateFee, createOrder, getDistricts, getGhnConfig, getProvinces, getWards, isGhnConfigured, maskValue } = require('../services/ghn');

const router = express.Router();

function ensureConfigured(res) {
  if (!isGhnConfigured()) {
    res.status(503).json({
      error: 'GHN chưa được cấu hình đầy đủ. Vui lòng điền GHN_TOKEN, GHN_CLIENT_ID, GHN_SHOP_ID trong .env',
    });
    return false;
  }
  return true;
}

router.get('/ghn/config', (req, res) => {
  const config = getGhnConfig();
  res.json({
    configured: isGhnConfigured(),
    baseURL: config.baseURL,
    token: maskValue(config.token),
    clientId: maskValue(config.clientId),
    shopId: maskValue(config.shopId),
    fromProvinceId: config.fromProvinceId || null,
    fromDistrictId: config.fromDistrictId || null,
    fromWardCode: config.fromWardCode || null,
    serviceTypeId: config.serviceTypeId || null,
  });
});

router.get('/ghn/provinces', async (req, res) => {
  try {
    if (!ensureConfigured(res)) return;
    const data = await getProvinces();
    res.json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Không tải được danh sách tỉnh/thành từ GHN';
    res.status(status).json({ error: message });
  }
});

router.get('/ghn/districts/:provinceId', async (req, res) => {
  try {
    if (!ensureConfigured(res)) return;
    const data = await getDistricts(req.params.provinceId);
    res.json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Không tải được danh sách quận/huyện từ GHN';
    res.status(status).json({ error: message });
  }
});

router.get('/ghn/wards/:districtId', async (req, res) => {
  try {
    if (!ensureConfigured(res)) return;
    const data = await getWards(req.params.districtId);
    res.json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Không tải được danh sách phường/xã từ GHN';
    res.status(status).json({ error: message });
  }
});

router.post('/ghn/fee', async (req, res) => {
  try {
    if (!ensureConfigured(res)) return;

    const { to_district_id, to_ward_code, weight, length, width, height, cod_value, insurance_value, service_type_id, coupon } = req.body || {};
    if (!to_district_id || !to_ward_code) {
      return res.status(400).json({ error: 'Thiếu to_district_id hoặc to_ward_code' });
    }

    const data = await calculateFee({
      to_district_id,
      to_ward_code,
      weight,
      length,
      width,
      height,
      cod_value,
      insurance_value,
      service_type_id,
      coupon,
      from_district_id: req.body.from_district_id,
      from_ward_code: req.body.from_ward_code,
    });

    res.json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Không tính được phí GHN';
    res.status(status).json({ error: message });
  }
});

router.post('/ghn/order', async (req, res) => {
  try {
    if (!ensureConfigured(res)) return;
    const data = await createOrder(req.body || {});
    res.json(data);
  } catch (err) {
    const status = err?.response?.status || 500;
    const message = err?.response?.data?.message || err?.response?.data?.error || err.message || 'Không tạo được đơn GHN';
    res.status(status).json({ error: message });
  }
});

module.exports = router;