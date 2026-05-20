#!/usr/bin/env node
/**
 * Test PayOS Webhook Handler
 * Generates valid PayOS webhook payload with HMAC-SHA256 signature and sends to localhost:3001
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load .env
function loadEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  content.split('\n').forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !line.startsWith('#')) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

const envPath = path.join(__dirname, '.env');
const env = loadEnv(envPath);

const CHECKSUM_KEY = env.PAYOS_CHECKSUM_KEY;
const WEBHOOK_URL = 'http://localhost:3001/api/payment/payos/webhook';

if (!CHECKSUM_KEY) {
  console.error('❌ PAYOS_CHECKSUM_KEY not found in .env');
  process.exit(1);
}

console.log('🧪 Testing PayOS Webhook Handler');
console.log('='.repeat(60));
console.log(`Checksum Key: ${CHECKSUM_KEY.substring(0, 20)}...`);
console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log('='.repeat(60));

// Test 1: Valid payload with order code in description
async function testValidPayload() {
  console.log('\n📝 Test 1: Valid PayOS webhook with order code in description');
  
  const orderCode = 'MLB00000047';
  const amount = 1500000; // 1.5M VND
  
  const paymentData = {
    orderCode: 123,
    amount: amount,
    description: `VQRIO ${orderCode}`, // Order code here
    accountNumber: '12345678',
    reference: 'TF230204212323',
    transactionDateTime: '2024-01-15 10:30:00',
    currency: 'VND',
    paymentLinkId: '124c33293c43417ab7879e14c8d9eb18',
  };

  // Generate signature: HMAC-SHA256(JSON.stringify(paymentData), CHECKSUM_KEY)
  const signature = crypto
    .createHmac('sha256', CHECKSUM_KEY)
    .update(JSON.stringify(paymentData))
    .digest('hex');

  const payload = {
    code: '00',
    desc: 'success',
    success: true,
    data: paymentData,
    signature: signature,
  };

  console.log('Payload (partial):', JSON.stringify({ ...payload, data: { ...paymentData, description: orderCode } }).substring(0, 300) + '...');
  console.log('Signature:', signature.substring(0, 40) + '...');

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log('Response:', result);
    console.log(result.success ? '✅ Test 1 PASSED' : '⚠️ Test 1 returned false');
  } catch (err) {
    console.error('❌ Test 1 FAILED:', err.message);
  }
}

// Test 2: Invalid signature
async function testInvalidSignature() {
  console.log('\n📝 Test 2: Invalid signature (should reject)');
  
  const paymentData = {
    orderCode: 456,
    amount: 2000000,
    description: 'VQRIO MLB00000048',
  };

  // Use wrong key for signature
  const wrongKey = 'wrong_key_12345';
  const signature = crypto
    .createHmac('sha256', wrongKey)
    .update(JSON.stringify(paymentData))
    .digest('hex');

  const payload = {
    code: '00',
    desc: 'success',
    success: true,
    data: paymentData,
    signature: signature,
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log('Response:', result);
    console.log(!result.success ? '✅ Test 2 PASSED (correctly rejected)' : '⚠️ Test 2 should have failed');
  } catch (err) {
    console.error('Test 2 error:', err.message);
  }
}

// Test 3: Failed payment (code != 00)
async function testFailedPayment() {
  console.log('\n📝 Test 3: Failed payment (code=01, should not confirm)');
  
  const paymentData = {
    orderCode: 789,
    amount: 1000000,
    description: 'VQRIO MLB00000049',
  };

  const signature = crypto
    .createHmac('sha256', CHECKSUM_KEY)
    .update(JSON.stringify(paymentData))
    .digest('hex');

  const payload = {
    code: '01', // Not '00', so should fail
    desc: 'Payment failed',
    success: false,
    data: paymentData,
    signature: signature,
  };

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    console.log('Response:', result);
    console.log(!result.success ? '✅ Test 3 PASSED (correctly rejected failed payment)' : '⚠️ Test 3 should have failed');
  } catch (err) {
    console.error('Test 3 error:', err.message);
  }
}

// Run all tests
async function runTests() {
  await testValidPayload();
  await testInvalidSignature();
  await testFailedPayment();
  console.log('\n' + '='.repeat(60));
  console.log('🏁 All tests completed');
  process.exit(0);
}

runTests().catch(console.error);
