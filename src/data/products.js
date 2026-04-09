// Dữ liệu sản phẩm thật từ minhlongbook.vn (500 sản phẩm)
import { mlbProducts } from './products_real.js';

const rawCategories = [
  { id: 1, name: 'Sách Kỹ Năng Sống', slug: 'ky-nang-song' },
  { id: 2, name: 'Sách Thiếu Nhi', slug: 'sach-thieu-nhi' },
  { id: 3, name: 'Sách Giáo Khoa', slug: 'giao-khoa' },
  { id: 4, name: 'Quản Trị Kinh Doanh', slug: 'quan-tri' },
  { id: 5, name: 'Văn Học Truyện', slug: 'van-hoc' },
  { id: 6, name: 'Nuôi Dạy Con', slug: 'nuoi-day-con' },
  { id: 7, name: 'Tâm Lý Học', slug: 'tam-ly-hoc' },
  { id: 8, name: 'Đồ Chơi Giáo Dục', slug: 'do-choi' },
  { id: 9, name: 'Combo Sách', slug: 'combo' },
  { id: 10, name: 'Sách Tiếng Anh', slug: 'tieng-anh' },
];

export const publishers = ['NXB Hà Nội', 'NXB Văn Học', 'NXB Phụ Nữ', 'NXB Trẻ', 'Hồng Đức', 'NXB Mỹ Thuật'];

// Dùng toàn bộ dữ liệu thật làm products chính
export const products = mlbProducts;

export const categories = rawCategories.map(cat => ({
  ...cat,
  count: products.filter(p => p.category === cat.slug).length
}));

// Book categories (tất cả trừ đồ chơi)
export const bookCategories = categories.filter(c => c.slug !== 'do-choi');

// Derived collections — Sách (không bao gồm đồ chơi)
export const flashSaleProducts = products
  .filter(p => p.discount >= 25 && p.available && p.category !== 'do-choi')
  .slice(0, 8)
  .map(p => ({ ...p, soldPercent: Math.floor(Math.random() * 60) + 30 }));

export const newProducts = products
  .filter(p => p.available && p.category !== 'do-choi')
  .sort((a, b) => b.id - a.id)
  .slice(0, 10);

export const bestsellerProducts = products
  .filter(p => p.available && p.reviews >= 200 && p.category !== 'do-choi')
  .slice(0, 10);

export const comboProducts = products
  .filter(p => p.category === 'combo' && p.available)
  .slice(0, 8);

export const toyProducts = products.filter(p => p.category === 'do-choi').slice(0, 8);

// Lookup helpers — products đã có images[] và pdfUrl sẵn từ scraper
export const getProductBySlug = (slug) => products.find(p => p.slug === slug) || null;
export const getProductsByCategory = (slug) => products.filter(p => p.category === slug);
export const getRelatedProducts = (product, limit = 5) =>
  products.filter(p => p.category === product.category && p.id !== product.id).slice(0, limit);
