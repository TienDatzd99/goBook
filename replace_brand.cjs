const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'src/pages/VerifyEmailPage.jsx',
  'src/pages/ProductDetailPage.jsx',
  'src/pages/LoginPage.jsx',
  'src/pages/CheckoutPage.jsx',
  'src/pages/BlogDetailPage.jsx',
  'src/components/Footer/Footer.jsx',
  'src/admin/AdminLayout.jsx',
  'src/admin/AdminLogin.jsx',
  'index.html',
  'backend/utils/mailer.js',
  'backend/routes/orders.js',
  'backend/routes/auth.js',
  'backend/package.json',
  'backend/database.js'
];

filesToUpdate.forEach(relativePath => {
  const file = path.join(__dirname, relativePath);
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    content = content.replace(/MINH LONG BOOKSTORE/g, 'GOBOOK STORE');
    content = content.replace(/Minh Long Book/gi, 'goBook'); // Case insensitive for "Minh Long book"
    content = content.replace(/admin@minhlongbook\.vn/g, 'admin@gobook.vn');
    content = content.replace(/Minh Long/g, 'goBook');
    
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
});
