const { PayOS } = require('@payos/node');

async function run() {
  try {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!clientId || !apiKey || !checksumKey) {
      console.error('Missing PAYOS_* env vars');
      process.exit(2);
    }

    const payos = new PayOS({ clientId, apiKey, checksumKey });

    const orderCode = Math.round(Date.now() / 1000);
    const amount = 30000;
    const description = 'MLB00000052';
    const returnUrl = 'https://go-book-six.vercel.app/thanh-toan/ket-qua?provider=payos';
    const cancelUrl = 'https://go-book-six.vercel.app/thanh-toan';

    const res = await payos.paymentRequests.create({
      orderCode,
      amount,
      description,
      returnUrl,
      cancelUrl,
    });

    console.log('OK: created payment link:');
    console.log({ checkoutUrl: res.checkoutUrl || res.data?.checkoutUrl, qrCode: res.qrCode || res.data?.qrCode, paymentLinkId: res.paymentLinkId || res.data?.paymentLinkId });
  } catch (err) {
    console.error('Error creating payos link:', err && err.response ? err.response.data || err.response.statusText : err.message || err);
    process.exit(1);
  }
}

run();
