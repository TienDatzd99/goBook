// Central configuration for shipping thresholds and fees
const FREE_SHIPPING_THRESHOLD = parseInt(process.env.FREE_SHIPPING_THRESHOLD || '300000', 10);
const DEFAULT_SHIPPING_FEE = parseInt(process.env.DEFAULT_SHIPPING_FEE || '30000', 10);

module.exports = {
  FREE_SHIPPING_THRESHOLD,
  DEFAULT_SHIPPING_FEE,
};
