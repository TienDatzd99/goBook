/**
 * Scraper để lấy dữ liệu sản phẩm từ minhlongbook.vn
 * Chạy: node scrape_mlb.js
 * Output: src/data/products_real.js
 */

const https = require('https');
const fs = require('fs');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Extract Google Drive PDF link from HTML body
function extractPdfUrl(bodyHtml) {
  if (!bodyHtml) return null;
  const iframeMatch = bodyHtml.match(/src="(https:\/\/drive\.google\.com\/file\/d\/[^"]+\/preview)"/);
  if (iframeMatch) return iframeMatch[1];
  const driveMatch = bodyHtml.match(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
  return null;
}

// Extract plain text description from HTML
function extractDescription(bodyHtml) {
  if (!bodyHtml) return '';
  return bodyHtml
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

// Extract author from tags
function extractAuthor(tags) {
  if (!tags) return '';
  const match = tags.match(/tacgia\s+([^,]+)/i);
  return match ? match[1].trim() : '';
}

// Extract pages count from tags
function extractPages(tags) {
  if (!tags) return null;
  const match = tags.match(/sotrang[_\s]+(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

// Map product type to category slug
function mapCategory(productType, tags) {
  const type = (productType || '').toLowerCase();
  const tagStr = (tags || '').toLowerCase();
  if (type.includes('thiếu nhi') || tagStr.includes('thieu-nhi')) return 'sach-thieu-nhi';
  if (type.includes('kỹ năng') || tagStr.includes('ky-nang')) return 'ky-nang-song';
  if (type.includes('kinh doanh') || tagStr.includes('kinh-doanh')) return 'quan-tri';
  if (type.includes('văn học') || tagStr.includes('van-hoc')) return 'van-hoc';
  if (type.includes('nuôi dạy') || tagStr.includes('nuoi-day')) return 'nuoi-day-con';
  if (type.includes('tâm lý') || tagStr.includes('tam-ly')) return 'tam-ly-hoc';
  if (type.includes('giáo khoa') || tagStr.includes('giao-khoa')) return 'giao-khoa';
  if (type.includes('tham khảo') || tagStr.includes('tham-khao')) return 'giao-khoa';
  if (type.includes('combo') || tagStr.includes('sach-combo')) return 'combo';
  if (type.includes('đồ chơi') || tagStr.includes('do-choi')) return 'do-choi';
  return 'van-hoc';
}

async function scrapeProducts() {
  const allProducts = [];
  let page = 1;
  const maxPages = 10; // lấy tối đa 10 trang (500 sản phẩm)

  console.log('Bắt đầu scrape minhlongbook.vn...');

  while (page <= maxPages) {
    const url = `https://minhlongbook.vn/collections/tat-ca-san-pham/products.json?limit=50&page=${page}`;
    console.log(`Đang lấy trang ${page}...`);
    
    try {
      const data = await fetchJson(url);
      if (!data.products || data.products.length === 0) break;

      for (const p of data.products) {
        const variant = p.variants?.[0] || {};
        const price = parseFloat(variant.price || 0);
        const originalPrice = parseFloat(variant.compare_at_price || 0);
        const discount = originalPrice > price && originalPrice > 0
          ? Math.round((1 - price / originalPrice) * 100) : 0;

        const images = (p.images || []).map(img => img.src);
        const pdfUrl = extractPdfUrl(p.body_html);
        const author = extractAuthor(p.tags);
        const pages = extractPages(p.tags);

        const product = {
          id: p.id,
          name: p.title?.replace(/^Sách:\s*/i, '').replace(/^Đồ Chơi [^:]+:\s*/i, ''),
          slug: p.handle,
          price,
          originalPrice: originalPrice || price,
          discount,
          category: mapCategory(p.product_type, p.tags),
          publisher: p.vendor || 'Minh Long Book',
          author,
          pages,
          image: p.image?.src || images[0] || '',
          images,
          pdfUrl,
          isNew: false,
          isBestseller: false,
          rating: 4.5 + Math.random() * 0.5,
          reviews: Math.floor(50 + Math.random() * 400),
          description: extractDescription(p.body_html),
          sku: variant.barcode || variant.sku || '',
          stock: variant.inventory_quantity || 0,
          available: p.available !== false,
          mlbUrl: `https://minhlongbook.vn/products/${p.handle}`,
        };

        allProducts.push(product);
      }

      page++;
      // Delay nhẹ để không quá tải server
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`Lỗi trang ${page}:`, err.message);
      break;
    }
  }

  console.log(`\n✅ Đã scrape ${allProducts.length} sản phẩm`);
  console.log(`   - Có PDF đọc thử: ${allProducts.filter(p => p.pdfUrl).length}`);
  console.log(`   - Có nhiều ảnh (>3): ${allProducts.filter(p => p.images.length > 3).length}`);

  // Xuất ra file JS
  const output = `// Auto-generated from minhlongbook.vn - ${new Date().toISOString()}
// Tổng: ${allProducts.length} sản phẩm, ${allProducts.filter(p => p.pdfUrl).length} có PDF đọc thử

export const mlbProducts = ${JSON.stringify(allProducts, null, 2)};

export const getMlbProductBySlug = (slug) => mlbProducts.find(p => p.slug === slug);
export const getMlbProductsByCategory = (cat) => mlbProducts.filter(p => p.category === cat);
`;

  fs.writeFileSync('src/data/products_real.js', output, 'utf8');
  console.log('\n📂 Đã lưu vào: src/data/products_real.js');

  // Thống kê theo category
  const cats = {};
  allProducts.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  console.log('\nThống kê category:');
  Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`));
}

scrapeProducts().catch(console.error);
