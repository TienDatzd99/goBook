const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/PaymentReturnPage.jsx',
  'src/pages/LoginPage.jsx',
  'src/pages/CheckoutPage.jsx',
  'src/context/AuthContext.jsx',
  'src/components/Header/SearchDropdown.jsx',
  'src/admin/api.js'
];

files.forEach(relativePath => {
  const file = path.join(__dirname, relativePath);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // AuthContext
    if (file.includes('AuthContext')) {
      content = content.replace(/const API = 'http:\/\/localhost:3001\/api\/auth';/, "const API = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth`;");
    }
    // Api.js
    if (file.includes('admin/api.js')) {
      content = content.replace(/const API_BASE = 'http:\/\/localhost:3001\/api';/, "const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api`;");
    }
    // LoginPage
    if (file.includes('LoginPage')) {
      content = content.replace(/'http:\/\/localhost:3001\/api\/auth\/google'/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/google`");
    }
    // CheckoutPage
    if (file.includes('CheckoutPage')) {
      content = content.replace(/'http:\/\/localhost:3001\/api\/vouchers\/validate'/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/vouchers/validate`");
      content = content.replace(/'http:\/\/localhost:3001\/api\/orders'/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/orders`");
      content = content.replace(/'http:\/\/localhost:3001\/api\/payment\/vnpay\/create'/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/vnpay/create`");
      content = content.replace(/'http:\/\/localhost:3001\/api\/payment\/momo\/create'/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/momo/create`");
    }
    // PaymentReturnPage
    if (file.includes('PaymentReturnPage')) {
      content = content.replace(/`http:\/\/localhost:3001\/api\/payment\/vnpay\/callback\?\${queryString}`/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/vnpay/callback?${queryString}`");
      content = content.replace(/`http:\/\/localhost:3001\/api\/payment\/momo\/callback\?\${queryString}`/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/momo/callback?${queryString}`");
    }
    // SearchDropdown
    if (file.includes('SearchDropdown')) {
      content = content.replace(/`http:\/\/localhost:3001\/api\/search\/suggest\?q=\${encodeURIComponent\(query\)}`/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/search/suggest?q=${encodeURIComponent(query)}`");
    }

    fs.writeFileSync(file, content);
    console.log(`Patched ${file}`);
  }
});
