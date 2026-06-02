# 📚 Chi Tiết Luồng Đặt Sách Với Thanh Toán QR (VietQR/PayOS)

## 🎯 Tổng Quan
Luồng đặt sách với thanh toán QR là quy trình khách hàng:
1. **Thêm sản phẩm vào giỏ hàng**
2. **Xem giỏ hàng & Thanh toán**
3. **Điền thông tin giao hàng**
4. **Chọn phương thức thanh toán "Chuyển khoản QR"**
5. **Tạo đơn hàng**
6. **Nhận mã QR thanh toán**
7. **Quét QR để chuyển tiền**
8. **Hệ thống tự động xác nhận thanh toán**

---

## 🛍️ TOÀN BỘ LUỒNG - TỪ THÊM SẢN PHẨM ĐẾN THANH TOÁN THÀNH CÔNG

### **GIAI ĐOẠN 1️⃣: THÊM SẢN PHẨM VÀO GIỎ HÀNG**

#### **1.1 - Khách click "Thêm vào giỏ hàng"**

**Các trang có chức năng này**:
- [`src/pages/ProductDetailPage.jsx`](src/pages/ProductDetailPage.jsx) - Chi tiết sản phẩm
- [`src/pages/CategoryPage.jsx`](src/pages/CategoryPage.jsx) - Trang danh mục (quick add)
- [`src/components/ProductCard/ProductCard.jsx`](src/components/ProductCard/ProductCard.jsx) - Thẻ sản phẩm

**Code ví dụ** (ProductDetailPage):
```jsx
import { useCart } from '../context/CartContext';

function ProductDetailPage() {
  const { addItem } = useCart();
  
  const handleAddToCart = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: selectedQuantity,  // Từ input
    });
    alert('Đã thêm vào giỏ hàng!');
  };
  
  return (
    <button onClick={handleAddToCart} className="btn-add-cart">
      🛒 Thêm vào giỏ hàng
    </button>
  );
}
```

#### **1.2 - CartContext xử lý thêm sản phẩm**

**File**: [`src/context/CartContext.jsx`](src/context/CartContext.jsx)

```javascript
import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  
  // Lấy từ localStorage khi component mount
  useEffect(() => {
    const saved = localStorage.getItem('cart');
    if (saved) setItems(JSON.parse(saved));
  }, []);
  
  // Lưu vào localStorage mỗi khi items thay đổi
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);
  
  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        // Nếu sản phẩm đã có → tăng quantity
        return prev.map(i => 
          i.id === product.id 
            ? { ...i, quantity: i.quantity + (product.quantity || 1) }
            : i
        );
      }
      // Nếu chưa có → thêm sản phẩm mới
      return [...prev, { ...product, quantity: product.quantity || 1 }];
    });
  };
  
  const removeItems = (ids) => {
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
  };
  
  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== productId));
    } else {
      setItems(prev => prev.map(i => 
        i.id === productId ? { ...i, quantity } : i
      ));
    }
  };
  
  const clearCart = () => setItems([]);
  
  return (
    <CartContext.Provider value={{ items, addItem, removeItems, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
```

**Dữ liệu lưu trong localStorage**:
```json
[
  {
    "id": 1,
    "name": "Harry Potter - Tập 1",
    "price": 85000,
    "image": "/images/hp1.jpg",
    "quantity": 1
  },
  {
    "id": 2,
    "name": "Percy Jackson - Tập 1",
    "price": 95000,
    "image": "/images/pj1.jpg",
    "quantity": 2
  }
]
```

---

### **GIAI ĐOẠN 2️⃣: XEM GIỎ HÀNG & THANH TOÁN**

#### **2.1 - Khách click icon giỏ hàng / "Xem giỏ hàng"**

**2.1a - CartDrawer (Mini cart - hiện trên header)**

**File**: [`src/components/CartDrawer/CartDrawer.jsx`](src/components/CartDrawer/CartDrawer.jsx)

```jsx
import { useCart } from '../../context/CartContext';
import { useNavigate, useLocation } from 'react-router-dom';

function CartDrawer() {
  const { items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  // Auto-detect hiện tại user ở trang nào
  const getCurrentPageForBackLink = () => {
    const path = location.pathname;
    if (path.includes('/san-pham/')) {
      const slug = path.split('/san-pham/')[1];
      return `/san-pham/${slug}`;
    }
    if (path === '/') return '/';
    if (path.includes('/danh-muc/')) return path;
    if (path.includes('/tim-kiem')) return `/tim-kiem?q=${location.search.split('q=')[1] || ''}`;
    return '/';
  };
  
  const handleCheckout = () => {
    const currentPage = getCurrentPageForBackLink();
    navigate('/thanh-toan', {
      state: {
        from: currentPage,  // Để user quay lại được
        selectedIds: items.map(i => i.id)
      }
    });
    setIsOpen(false);
  };
  
  return (
    <>
      {/* Icon giỏ hàng */}
      <button onClick={() => setIsOpen(true)} className="cart-icon">
        🛒 ({items.length})
      </button>
      
      {/* Drawer panel */}
      {isOpen && (
        <div className="cart-drawer">
          <div className="cart-header">
            <h3>Giỏ hàng ({items.length})</h3>
            <button onClick={() => setIsOpen(false)}>✕</button>
          </div>
          
          <div className="cart-items">
            {items.length === 0 ? (
              <p>Giỏ hàng trống</p>
            ) : (
              items.map(item => (
                <div key={item.id} className="cart-item">
                  <img src={item.image} alt={item.name} />
                  <div>
                    <div>{item.name}</div>
                    <div className="price">{item.price.toLocaleString('vi-VN')}₫</div>
                    <div>SL: {item.quantity}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="cart-footer">
            <button onClick={() => navigate('/gio-hang')} className="btn-view-cart">
              Xem giỏ hàng →
            </button>
            <button onClick={handleCheckout} className="btn-checkout">
              Thanh toán ngay
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

**2.1b - CartPage (Trang giỏ hàng đầy đủ)**

**File**: [`src/pages/CartPage.jsx`](src/pages/CartPage.jsx)

```jsx
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';

function CartPage() {
  const { items, updateQuantity, removeItems } = useCart();
  const navigate = useNavigate();
  
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const handleCheckout = () => {
    if (items.length === 0) {
      alert('Giỏ hàng trống!');
      return;
    }
    
    navigate('/thanh-toan', {
      state: {
        from: '/gio-hang',
        selectedIds: items.map(i => i.id)
      }
    });
  };
  
  return (
    <div className="cart-page">
      <h1>Giỏ hàng của bạn</h1>
      
      {items.length === 0 ? (
        <p>Giỏ hàng trống</p>
      ) : (
        <>
          <div className="cart-items">
            {items.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div className="item-info">
                  <h3>{item.name}</h3>
                  <div className="price">{(item.price * item.quantity).toLocaleString('vi-VN')}₫</div>
                </div>
                
                <div className="quantity-control">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>−</button>
                  <input type="number" value={item.quantity} readOnly />
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                </div>
                
                <button onClick={() => removeItems([item.id])} className="btn-remove">
                  🗑️ Xóa
                </button>
              </div>
            ))}
          </div>
          
          <div className="cart-summary">
            <div className="summary-line">
              <span>Tổng tiền:</span>
              <span className="total">{total.toLocaleString('vi-VN')}₫</span>
            </div>
            <button onClick={handleCheckout} className="btn-checkout-main">
              Tiến hành thanh toán
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### **GIAI ĐOẠN 3️⃣: TRANG CHECKOUT - ĐIỀN THÔNG TIN**

#### **3.1 - Vào trang CheckoutPage**

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx)

```jsx
export default function CheckoutPage() {
  const { items } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Lấy state từ CartPage hoặc CartDrawer
  const fromPage = location.state?.from;        // '/gio-hang', '/', ...
  const selectedIds = location.state?.selectedIds; // [1, 2, ...]
  
  // Lọc các sản phẩm được chọn
  const cartItems = selectedIds ? items.filter(i => selectedIds.includes(i.id)) : items;
  
  // Nếu không có sản phẩm → quay lại
  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <h2>Không có sản phẩm để thanh toán</h2>
        <button onClick={() => navigate(fromPage || '/gio-hang')}>← Quay lại</button>
      </div>
    );
  }
  
  return (
    <div className="checkout-page">
      {/* Form điền thông tin (xem BƯỚC 2 dưới) */}
    </div>
  );
}
```

#### **3.2 - Form điền thông tin giao hàng**

```jsx
const [form, setForm] = useState({
  name: user?.name || '',
  phone: '',
  email: user?.email || '',
  address: '',
  city: '',
  district: '',
  note: '',
});

const [payment, setPayment] = useState('vietqr');  // Mặc định chọn VietQR

const handleChange = (e) => {
  const { name, value } = e.target;
  setForm(f => ({ ...f, [name]: value }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validation
  if (!form.name || !form.phone || !form.address) {
    alert('Vui lòng điền đầy đủ thông tin!');
    return;
  }
  
  // Gọi API tạo order (xem BƯỚC 4 dưới)
  // ...
};

return (
  <form onSubmit={handleSubmit}>
    {/* Thông tin giao hàng */}
    <div className="form-group">
      <label>Họ tên</label>
      <input 
        name="name" 
        value={form.name} 
        onChange={handleChange} 
        placeholder="VD: Nguyễn Văn A"
      />
    </div>
    
    <div className="form-group">
      <label>Số điện thoại</label>
      <input 
        name="phone" 
        value={form.phone} 
        onChange={handleChange}
        placeholder="VD: 0987654321"
      />
    </div>
    
    <div className="form-group">
      <label>Email</label>
      <input 
        name="email" 
        value={form.email} 
        onChange={handleChange}
        type="email"
      />
    </div>
    
    <div className="form-group">
      <label>Địa chỉ giao hàng</label>
      <input 
        name="address" 
        value={form.address} 
        onChange={handleChange}
        placeholder="VD: 123 Nguyễn Trãi, Quận 1"
      />
    </div>
    
    <div className="form-group">
      <label>Tỉnh/Thành phố</label>
      <select name="city" value={form.city} onChange={handleChange}>
        <option value="">-- Chọn tỉnh/thành phố --</option>
        <option value="Hà Nội">Hà Nội</option>
        <option value="TP.HCM">TP. Hồ Chí Minh</option>
        {/* ... */}
      </select>
    </div>
    
    {/* Phương thức thanh toán */}
    <div className="form-group">
      <label>Phương thức thanh toán</label>
      <select value={payment} onChange={e => setPayment(e.target.value)}>
        <option value="cod">💵 Thanh toán khi nhận hàng (COD)</option>
        <option value="bank">🏧 Chuyển khoản ngân hàng</option>
        <option value="vietqr">📱 Chuyển khoản QR - VietQR của PayOS</option>
        <option value="momo">💳 Thanh toán MoMo</option>
      </select>
    </div>
    
    {/* Giỏ hàng summary */}
    <div className="checkout-summary">
      <h3>Tóm tắt đơn hàng</h3>
      {cartItems.map(item => (
        <div key={item.id} className="summary-item">
          <span>{item.name} x{item.quantity}</span>
          <span>{(item.price * item.quantity).toLocaleString('vi-VN')}₫</span>
        </div>
      ))}
      <div className="summary-total">
        <strong>Tổng cộng: {total.toLocaleString('vi-VN')}₫</strong>
      </div>
    </div>
    
    <button type="submit" className="btn-place-order">
      Đặt hàng
    </button>
  </form>
);
```

---

### **GIAI ĐOẠN 4️⃣: TẠO ĐƠN HÀNG (Backend)**

#### **4.1 - Frontend gọi API `POST /api/orders`**

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    // Gọi API tạo order
    const res = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customer_name: form.name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        city: form.city,
        district: form.district,
        note: form.note,
        payment_method: payment,      // 'vietqr'
        user_id: user?.id || null,
        voucher_code: voucherCode || null,
        items: cartItems.map(i => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
          image: i.image,
        })),
      }),
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      setError(data.error || 'Đặt hàng thất bại');
      return;
    }
    
    // Lưu order result
    setOrderResult(data);  // Trigger render QrPaymentScreen hoặc SuccessScreen
    
  } catch (err) {
    setError('Lỗi kết nối. Vui lòng thử lại.');
  } finally {
    setLoading(false);
  }
};
```

#### **4.2 - Backend xử lý `POST /api/orders`**

**File**: [`backend/routes/orders.js`](backend/routes/orders.js) - [Line 205-290](backend/routes/orders.js#L205-L290)

```javascript
router.post('/', async (req, res) => {
  const { 
    customer_name, phone, email, address, city, district, note,
    payment_method, items, user_id, voucher_code 
  } = req.body;
  
  // Validation
  if (!customer_name || !phone || !address || !items?.length) {
    return res.status(400).json({ error: 'Thiếu thông tin đơn hàng' });
  }
  
  if (!/^\d{10}$/.test(phone.replace(/\D/g, ''))) {
    return res.status(400).json({ error: 'Số điện thoại không hợp lệ' });
  }
  
  // Tính tổng tiền
  let subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  
  // Kiểm tra & áp dụng voucher
  let discountAmount = 0;
  if (voucher_code) {
    const voucher = db.prepare('SELECT * FROM vouchers WHERE code=? AND is_active=1')
      .get(voucher_code.toUpperCase());
    
    if (voucher && subtotal >= voucher.min_order_value) {
      if (voucher.type === 'percent') {
        discountAmount = Math.floor(subtotal * voucher.value / 100);
        if (voucher.max_discount > 0) {
          discountAmount = Math.min(discountAmount, voucher.max_discount);
        }
      } else {
        discountAmount = Math.min(voucher.value, subtotal);
      }
      
      // Tăng số lần sử dụng voucher
      db.prepare('UPDATE vouchers SET used_count=used_count+1 WHERE id=?')
        .run(voucher.id);
    }
  }
  
  // Tính phí vận chuyển
  const FREE_SHIPPING_THRESHOLD = 200000;
  const DEFAULT_SHIPPING_FEE = 30000;
  const shipping_fee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
  
  const total = subtotal - discountAmount + shipping_fee;
  
  // Tạo mã đơn hàng (VD: MLB20260528001)
  const code = generateOrderCode();  // Function tạo mã unique
  
  // INSERT order
  const orderResult = db.prepare(`
    INSERT INTO orders 
    (code, user_id, customer_name, phone, email, address, city, district, note,
     payment_method, status, payment_status, subtotal, shipping_fee, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    code, user_id, customer_name, phone, email, address, city, district, note,
    payment_method, 'pending', 'unpaid', subtotal, shipping_fee, total
  );
  
  const orderId = orderResult.lastInsertRowid;
  
  // INSERT order items
  items.forEach(item => {
    const dbProduct = db.prepare('SELECT id FROM products WHERE name=? LIMIT 1')
      .get(item.name);
    const productId = dbProduct ? dbProduct.id : null;
    
    db.prepare(`
      INSERT INTO order_items 
      (order_id, product_id, product_name, product_image, price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId, productId, item.name, item.image || '', 
      item.price, item.quantity, item.price * item.quantity
    );
    
    // Trừ stock sản phẩm
    if (productId) {
      db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?')
        .run(item.quantity, productId);
    }
  });
  
  // Gửi email (async, không chặn response)
  const order = db.prepare('SELECT * FROM orders WHERE id=?').get(orderId);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(orderId);
  
  if (payment_method === 'vietqr' && email) {
    sendOrderEmail(order, orderItems, 'vietqr_customer').catch(err => 
      console.error('Email error:', err.message)
    );
  }
  
  console.log(`📝 [Order] Created: ${code} (ID=${orderId})`);
  
  // Trả về response
  res.status(201).json({
    success: true,
    orderId,
    code,                    // MLB20260528001
    total,
    discount: discountAmount,
    status: 'pending',
    payment_status: 'unpaid',
    payment_method: payment_method,
    message: `Đặt hàng thành công! Mã đơn: ${code}`,
  });
});
```

---

### **GIAI ĐOẠN 5️⃣: TẠO LINK PAYOS & HIỂN THỊ QR**

#### **5.1 - Frontend gọi API `POST /api/payment/payos/create`**

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx) - [Line 760-800](src/pages/CheckoutPage.jsx#L760-L800)

```javascript
// Trong handleSubmit, sau khi nhận order result
if (payment === 'vietqr') {
  try {
    const payosRes = await fetch(`${API_BASE}/api/payment/payos/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: data.orderId,
        orderCode: data.code,
      }),
    });
    
    const payosData = await payosRes.json();
    
    if (payosRes.ok && payosData.success !== false) {
      data.payosCheckoutUrl = payosData.checkoutUrl || null;
      data.payosQrCode = payosData.qrCode || null;
      data.paymentLinkId = payosData.paymentLinkId || null;
    } else {
      data.payosError = payosData.error || 'Không tạo được link PayOS';
      // Dùng QR dự phòng
      data.payosQrCode = buildVietQrUrl(data.code, data.total);
    }
  } catch (err) {
    console.error('PayOS error:', err);
    data.payosQrCode = buildVietQrUrl(data.code, data.total);
  }
}

// Lưu order result → trigger render QrPaymentScreen
setOrderResult(data);
```

#### **5.2 - Backend tạo PayOS link**

**File**: [`backend/routes/payment.js`](backend/routes/payment.js) - [Line 432-550](backend/routes/payment.js#L432-L550)

```javascript
router.post('/payos/create', async (req, res) => {
  try {
    const { orderId, orderCode } = req.body;
    
    // Lấy order từ database
    const order = db.prepare('SELECT * FROM orders WHERE id=? OR code=?')
      .get(orderId || null, orderCode || null);
    
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    
    // Lấy PayOS client
    const payos = getPayOSClient();
    if (!payos) {
      return res.status(503).json({ 
        error: 'PayOS chưa được cấu hình (thiếu PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY)' 
      });
    }
    
    // Nếu order đã có link → reuse
    if (order.payment_ref) {
      try {
        const existingLink = await payos.paymentRequests.get(order.payment_ref);
        if (existingLink?.paymentLinkId) {
          return res.json({
            success: true,
            checkoutUrl: existingLink.checkoutUrl,
            qrCode: existingLink.qrCode,
            paymentLinkId: order.payment_ref,
            reused: true,
          });
        }
      } catch (err) {
        console.log('Reuse failed, creating new...');
      }
    }
    
    // Tạo payment link mới
    const orderCodeNumeric = Number(order.code.replace(/\D/g, '')) || order.id;
    const webhookUrl = process.env.PAYOS_WEBHOOK_URL || 
      `${req.protocol}://${req.get('host')}/api/payment/payos/webhook`;
    
    const paymentLink = await payos.paymentRequests.create({
      orderCode: orderCodeNumeric,
      amount: Number(order.total),
      description: order.code,
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/thanh-toan/ket-qua?orderCode=${order.code}`,
      cancelUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/thanh-toan`,
      notifyUrl: webhookUrl,
    });
    
    // Lưu payment link ID
    if (paymentLink.paymentLinkId) {
      db.prepare(`
        UPDATE orders SET payment_ref=?, updated_at=datetime('now','localtime') 
        WHERE code=?
      `).run(String(paymentLink.paymentLinkId), order.code);
    }
    
    console.log(`💳 [PayOS] Created link for order ${order.code}`);
    
    res.json({
      success: true,
      provider: 'payos',
      code: order.code,
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
      paymentLinkId: paymentLink.paymentLinkId,
      amount: Number(order.total),
    });
    
  } catch (err) {
    console.error('PayOS create error:', err.message);
    res.status(500).json({ error: 'Lỗi tạo link PayOS: ' + err.message });
  }
});
```

#### **5.3 - Frontend hiển thị QR Payment Screen**

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx) - [Line 200-380](src/pages/CheckoutPage.jsx#L200-L380)

```jsx
function QrPaymentScreen({ result, onBackEdit }) {
  const [paid, setPaid] = useState(false);
  
  // Polling mỗi 3 giây
  useEffect(() => {
    if (paid) return;
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/payment/status/${result.code}`);
        const data = await res.json();
        
        if (data.status === 'confirmed' || data.payment_status === 'paid') {
          setPaid(true);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [paid, result.code]);
  
  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <h1>Đơn hàng #{result.code}</h1>
        
        {!paid && (
          <>
            <div className="qr-section">
              <h2>🔲 Quét mã QR để thanh toán</h2>
              
              {result.payosQrCode && (
                <div className="qr-box">
                  <img src={result.payosQrCode} alt="PayOS QR Code" />
                  <p className="qr-label">Quét mã Napas 247</p>
                </div>
              )}
              
              <div className="payment-info">
                <div className="info-row">
                  <span>Nội dung chuyển:</span>
                  <strong>{result.code}</strong>
                </div>
                <div className="info-row">
                  <span>Số tiền:</span>
                  <strong className="amount">{result.total.toLocaleString('vi-VN')}₫</strong>
                </div>
                <div className="info-row">
                  <span>Tài khoản:</span>
                  <span>LE TIEN DAT</span>
                </div>
              </div>
              
              <p className="instruction">
                💡 Mở app ngân hàng, quét mã QR hoặc chuyển tiền theo nội dung trên
              </p>
              
              <button onClick={onBackEdit} className="btn-back">
                ← Quay lại chỉnh sửa
              </button>
            </div>
            
            <div className="waiting-status">
              <div className="spinner"></div>
              <p>⏳ Chờ xác nhận thanh toán...</p>
            </div>
          </>
        )}
        
        {paid && (
          <div className="success-section">
            <div className="success-box">
              <div className="success-icon">✓</div>
              <h2>Thanh toán thành công!</h2>
              <p>Đơn hàng của bạn đã được xác nhận</p>
              <p className="order-status">Trạng thái: <strong style={{color: '#2e7d32'}}>ĐÃ THANH TOÁN</strong></p>
              
              <div className="success-actions">
                <button onClick={() => navigate('/')} className="btn-home">
                  ← Trang chủ
                </button>
                <button onClick={() => navigate('/tra-cuu-don-hang')} className="btn-track">
                  Theo dõi đơn hàng →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### **GIAI ĐOẠN 6️⃣: KHÁCH QUÉT QR & CHUYỂN TIỀN**

#### **6.1 - Khách quét mã QR**

Khách hàng:
1. Mở app ngân hàng (VietcomBank, BIDV, Agribank, etc.)
2. Chọn "Quét mã QR"
3. Quét mã QR được hiển thị trên screen

#### **6.2 - Xác nhận thông tin chuyển khoản**

App ngân hàng hiển thị:
```
Chuyển tiền
├─ Số tài khoản: 1054599581
├─ Tên tài khoản: LE TIEN DAT
├─ Ngân hàng: VietcomBank
├─ Nội dung: MLB20260528001
└─ Số tiền: 500,000₫
```

Khách nhập OTP/mật khẩu → Xác nhận → **Giao dịch thành công**

---

### **GIAI ĐOẠN 7️⃣: PAYOS WEBHOOK - XÁC NHẬN THANH TOÁN**

#### **7.1 - PayOS gửi Webhook về server**

**Endpoint**: `POST /api/payment/payos/webhook`

**File**: [`backend/routes/payment.js`](backend/routes/payment.js) - [Line 614-700](backend/routes/payment.js#L614-L700)

PayOS tự động gửi POST request:

```json
{
  "code": "00",
  "desc": "Giao dịch thành công",
  "status": "PAID",
  "orderCode": "12345678",
  "amount": 500000,
  "reference": "TXN12345",
  "paymentLinkId": "abc123xyz",
  "transactionDateTime": "2026-05-28T14:30:00Z",
  "signature": "..."
}
```

#### **7.2 - Backend xử lý webhook**

```javascript
router.post('/payos/webhook', async (req, res) => {
  try {
    const payos = getPayOSClient();
    
    // Verify webhook signature
    const verified = await payos.webhooks.verify(req.body);
    
    if (verified.code !== '00') {
      console.warn('Webhook not success:', verified.code, verified.desc);
      return res.json({ success: false, message: verified.desc });
    }
    
    // Extract order code
    const orderCodeFromDesc = String(verified.description || '').match(/MLB\d{8}/i)?.[0] || null;
    const orderCode = orderCodeFromDesc;
    
    if (!orderCode) {
      return res.status(400).json({ success: false, message: 'Missing orderCode' });
    }
    
    // Lấy order từ database
    const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderCode);
    if (!order) {
      console.log(`Order ${orderCode} not found`);
      return res.json({ success: true, message: 'Order not found' });
    }
    
    // Nếu đã confirmed → skip
    if (order.status === 'confirmed') {
      console.log(`Order ${orderCode} already confirmed`);
      return res.json({ success: true, message: 'Already confirmed' });
    }
    
    // Kiểm tra số tiền
    const amount = Number(verified.amount || verified.data?.amount || 0);
    const TOLERANCE = 1000;
    
    if (amount >= (order.total - TOLERANCE)) {
      // ✅ UPDATE order status
      db.prepare(`
        UPDATE orders SET 
        status='confirmed', 
        payment_status='paid', 
        payment_ref=?,
        updated_at=datetime('now','localtime')
        WHERE code=?
      `).run(String(verified.paymentLinkId || verified.reference), orderCode);
      
      console.log(`✅ [PayOS Webhook] Confirmed: ${orderCode} amount:${amount}`);
      
      // Gửi email xác nhận
      const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
      sendOrderEmail(order, items, 'payment_confirmed').catch(err =>
        console.error('Email error:', err.message)
      );
      
      return res.json({ success: true, message: 'Payment confirmed', code: orderCode });
    }
    
    // Amount mismatch
    console.warn(`Amount mismatch for ${orderCode}: got ${amount}, expected ${order.total}`);
    return res.json({ 
      success: false, 
      message: 'Amount mismatch',
      got: amount,
      expected: order.total 
    });
    
  } catch (err) {
    console.error('PayOS webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Kết quả**:
```sql
-- Database UPDATE
UPDATE orders 
SET status='confirmed', payment_status='paid', updated_at=NOW() 
WHERE code='MLB20260528001';
```

---

### **GIAI ĐOẠN 8️⃣: FRONTEND POLLING - NHẬN BIẾT THANH TOÁN**

#### **8.1 - Frontend check status mỗi 3 giây**

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx) - [Line 38-75](src/pages/CheckoutPage.jsx#L38-L75)

```javascript
useEffect(() => {
  if (paid) return;  // Nếu đã thanh toán → stop polling
  
  const interval = setInterval(async () => {
    try {
      // Gọi endpoint kiểm tra status
      const res = await fetch(`${API_BASE}/api/payment/status/${result.code}`);
      const data = await res.json();
      
      console.log('Polling result:', data);
      
      // Nếu status = 'confirmed' hoặc payment_status = 'paid'
      if (data.status === 'confirmed' || data.payment_status === 'paid') {
        setPaid(true);
        clearInterval(interval);
        console.log('✅ Payment confirmed!');
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 3000);  // 3 giây kiểm tra 1 lần
  
  return () => clearInterval(interval);  // Cleanup khi component unmount
}, [paid, result.code]);
```

#### **8.2 - Kiểm tra status endpoint**

**File**: [`backend/routes/payment.js`](backend/routes/payment.js)

```javascript
router.get('/status/:orderCode', (req, res) => {
  const order = db.prepare(
    'SELECT id, code, status, payment_method, payment_status, total FROM orders WHERE code=?'
  ).get(req.params.orderCode);
  
  if (!order) {
    return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
  }
  
  res.json(order);
  // Response: { id: 1, code: 'MLB20260528001', status: 'confirmed', payment_status: 'paid', ... }
});
```

#### **8.3 - UI cập nhật**

```
⏳ Chờ xác nhận thanh toán...
     ↓ (3 giây sau)
GET /api/payment/status/MLB20260528001
     ↓ (trả về status = 'confirmed')
     ↓
setPaid(true)
     ↓
UI hiển thị:
   ✓ Thanh toán thành công!
   (ẩn QR code, show nút "Quay về trang chủ", "Theo dõi đơn hàng")
```

---

## 📍 BẮT ĐẦU TỪ ĐÂU?

### Frontend - Entry Points
1. **Từ trang chủ (Home)**: Nút "Thanh toán ngay" trong CartDrawer
2. **Từ giỏ hàng (CartPage)**: Nút "Thanh toán"
3. **Từ chi tiết sản phẩm (ProductDetailPage)**: Nút "Mua ngay"
4. **Từ CartDrawer**: Nút "Thanh toán ngay"

### Frontend - File chính: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx)
- Địa chỉ: `d:\TMDT2\src\pages\CheckoutPage.jsx`
- Kích thước: ~800+ dòng
- Chủ yếu chứa 2 components chính:
  - `SuccessScreen` (hiển thị sau thanh toán COD/MoMo)
  - `QrPaymentScreen` (hiển thị mã QR thanh toán)
  - `CheckoutPage` (component chính)

---

## 🔄 LUỒNG CHI TIẾT

### BƯỚC 1️⃣: Người dùng vào trang CheckoutPage

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx) - [Line 708-800](src/pages/CheckoutPage.jsx#L708-L800)

```javascript
export default function CheckoutPage() {
  const { items, freeShipThreshold, removeItems, clearCart } = useCart();
  const { user, getToken } = useAuth();
  
  // Lấy thông tin từ location.state
  const selectedIds = location.state?.selectedIds;  // ID sản phẩm được chọn
  const fromPage = location.state?.from;             // Trang trước đó (để quay lại)
  const paymentOrderId = location.state?.paymentOrderId; // Nếu edit order
```

**Chức năng**:
- Lấy danh sách sản phẩm từ giỏ hàng
- Tính tổng tiền (bao gồm phí ship)
- Lấy danh sách địa chỉ của user (nếu đã đăng nhập)
- Hiển thị form điền thông tin

---

### BƯỚC 2️⃣: Form thanh toán

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx) - [Line 850-920](src/pages/CheckoutPage.jsx#L850-L920)

**HTML Form** (phía dưới page):
```jsx
<form onSubmit={handleSubmit}>
  {/* Thông tin giao hàng */}
  <input name="name" value={form.name} onChange={handleChange} />
  <input name="phone" value={form.phone} onChange={handleChange} />
  <input name="email" value={form.email} onChange={handleChange} />
  <input name="address" value={form.address} onChange={handleChange} />
  
  {/* Chọn phương thức thanh toán */}
  <select value={payment} onChange={e => setPayment(e.target.value)}>
    <option value="cod">Thanh toán khi nhận hàng</option>
    <option value="bank">Chuyển khoản ngân hàng</option>
    <option value="momo">MoMo</option>
    <option value="vietqr">Chuyển khoản QR - VietQR của PayOS</option>
  </select>
  
  {/* Nút đặt hàng */}
  <button type="submit">Đặt hàng</button>
</form>
```

**Chức năng**:
- User chọn "Chuyển khoản QR - VietQR của PayOS" (`payment = 'vietqr'`)
- Nhập thông tin giao hàng (họ tên, SĐT, địa chỉ)
- Áp dụng voucher (nếu có)

---

### BƯỚC 3️⃣: Submit form → Gọi API tạo đơn hàng

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx) - [Line 743-780](src/pages/CheckoutPage.jsx#L743-L780)

**Function**: `handleSubmit()`

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Gọi API tạo đơn hàng
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer_name: orderData.name,
      phone: orderData.phone,
      email: orderData.email,
      address: orderData.address,
      city: orderData.city,
      payment_method: payment,  // 'vietqr' nếu chọn QR
      user_id: user?.id || null,
      voucher_code: voucherResult?.code || null,
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        image: i.image,
      })),
    }),
  });
  
  const data = await res.json();
  setOrderResult(data);  // Lưu kết quả để hiển thị QR screen
};
```

**API Endpoint được gọi**: `POST /api/orders`  
**Backend File**: [`backend/routes/orders.js`](backend/routes/orders.js) - [Line 205-290](backend/routes/orders.js#L205-L290)

---

### BƯỚC 4️⃣: Backend - Tạo đơn hàng trong Database

**File**: [`backend/routes/orders.js`](backend/routes/orders.js) - [Line 205-260](backend/routes/orders.js#L205-L260)

**Logic**:
```javascript
router.post('/', async (req, res) => {
  const { customer_name, phone, email, address, payment_method, items, user_id, voucher_code } = req.body;
  
  // Kiểm tra dữ liệu đầu vào
  if (!customer_name || !phone || !address || !items?.length) {
    return res.status(400).json({ error: 'Thiếu thông tin đơn hàng' });
  }
  
  // Tính tổng tiền
  let subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  
  // Áp dụng voucher
  let discountAmount = 0;
  if (voucher_code) {
    const v = db.prepare('SELECT * FROM vouchers WHERE code=?').get(voucher_code.toUpperCase());
    if (v && subtotal >= v.min_order_value) {
      if (v.type === 'percent') {
        discountAmount = Math.floor(subtotal * v.value / 100);
      } else {
        discountAmount = Math.min(v.value, subtotal);
      }
      db.prepare('UPDATE vouchers SET used_count=used_count+1 WHERE id=?').run(v.id);
    }
  }
  
  // Tính phí ship
  const shipping_fee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : DEFAULT_SHIPPING_FEE;
  const total = subtotal - discountAmount + shipping_fee;
  
  // Tạo mã đơn hàng (dạng MLB20260528001)
  const code = generateOrderCode();
  
  // INSERT vào database
  const orderResult = db.prepare(`
    INSERT INTO orders (code, user_id, customer_name, phone, email, address, payment_method, status, subtotal, shipping_fee, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    code, user_id, customer_name, phone, email, address,
    payment_method,  // 'vietqr'
    'pending',       // Trạng thái: pending
    subtotal, shipping_fee, total
  );
  
  const orderId = orderResult.lastInsertRowid;
  
  // Thêm chi tiết từng sản phẩm
  items.forEach(item => {
    db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(orderId, validProductId, item.name, item.price, item.quantity, item.price * item.quantity);
    
    // Trừ stock
    db.prepare('UPDATE products SET stock = MAX(0, stock - ?) WHERE id = ?').run(item.quantity, validProductId);
  });
  
  // Gửi email async (không chặn response)
  if (payment_method === 'vietqr' && email) {
    sendOrderEmail(order, orderItems, 'vietqr_customer');
  }
  
  // Trả về response với order code
  res.status(201).json({
    success: true,
    orderId,
    code,           // Mã đơn hàng (dùng cho PayOS)
    total,
    status: 'pending',
    payment_status: 'unpaid',
    payment_method: 'vietqr',
  });
});
```

**Database Tables**:
- `orders` - Bản ghi đơn hàng chính
- `order_items` - Chi tiết từng sản phẩm trong đơn
- `products` - Cập nhật stock

---

### BƯỚC 5️⃣: Frontend - Nhận dữ liệu order, gọi API tạo link PayOS

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx) - [Line 750-780](src/pages/CheckoutPage.jsx#L750-L780)

```javascript
if (payment === 'vietqr') {
  // Gọi API PayOS để tạo payment link
  const payosRes = await fetch(`${API_BASE}/api/payment/payos/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      orderId: data.orderId,        // ID đơn hàng (số)
      orderCode: data.code          // Mã đơn hàng (MLB20260528001)
    }),
  });
  
  const payosData = await payosRes.json();
  
  // Lưu dữ liệu PayOS
  data.payosCheckoutUrl = payosData.checkoutUrl;     // Link checkout PayOS
  data.payosQrCode = payosData.qrCode;               // Mã QR ảnh
  data.paymentLinkId = payosData.paymentLinkId;      // ID link (dùng để check)
}

// Hiển thị QR Payment Screen
setOrderResult(data);  // Trigger render QrPaymentScreen
```

**API Endpoint được gọi**: `POST /api/payment/payos/create`

---

### BƯỚC 6️⃣: Backend - PayOS - Tạo Payment Link

**File**: [`backend/routes/payment.js`](backend/routes/payment.js) - [Line 432-550](backend/routes/payment.js#L432-L550)

**Hàm**: `router.post('/payos/create', ...)`

```javascript
router.post('/payos/create', async (req, res) => {
  try {
    const { orderId, orderCode } = req.body;
    
    // Lấy đơn hàng từ database
    const order = db.prepare('SELECT * FROM orders WHERE id=? OR code=?').get(orderId, orderCode);
    if (!order) {
      return res.status(404).json({ error: 'Không tìm thấy đơn hàng' });
    }
    
    // Khởi tạo PayOS client
    const payos = getPayOSClient();  // Dùng PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY
    
    // Nếu order đã có payment_ref → thử reuse
    if (order.payment_ref) {
      try {
        const existingLink = await payos.paymentRequests.get(order.payment_ref);
        if (existingLink?.paymentLinkId) {
          return res.json({
            success: true,
            checkoutUrl: existingLink.checkoutUrl,
            qrCode: existingLink.qrCode,
            paymentLinkId: order.payment_ref,
            reused: true,
          });
        }
      } catch (err) {
        console.log('Failed to reuse, creating new link...');
      }
    }
    
    // Chuẩn bị dữ liệu cho PayOS
    const returnUrl = `${FRONTEND_URL}/thanh-toan/ket-qua?orderCode=${order.code}`;
    const cancelUrl = `${FRONTEND_URL}/thanh-toan?orderCode=${order.code}`;
    const webhookUrl = `${BACKEND_URL}/api/payment/payos/webhook`;  // PayOS gọi lại endpoint này
    
    // Tạo payment link qua PayOS SDK
    const paymentLink = await payos.paymentRequests.create({
      orderCode: Number(order.code.replace(/\D/g, '')) || order.id,
      amount: Number(order.total),
      description: order.code,
      returnUrl,
      cancelUrl,
      notifyUrl: webhookUrl,  // Webhook để PayOS thông báo
    });
    
    // Lưu payment link ID vào database
    if (paymentLink.paymentLinkId) {
      db.prepare(`UPDATE orders SET payment_ref=?, updated_at=datetime('now','localtime') WHERE code=?`)
        .run(String(paymentLink.paymentLinkId), order.code);
    }
    
    // Trả về dữ liệu cho frontend
    res.json({
      success: true,
      provider: 'payos',
      code: order.code,
      checkoutUrl: paymentLink.checkoutUrl,    // Link để user click vào PayOS
      qrCode: paymentLink.qrCode,              // QR code ảnh base64
      paymentLinkId: paymentLink.paymentLinkId,
      amount: Number(order.total),
      description: order.code,
    });
    
  } catch (err) {
    console.error('PayOS create error:', err.message);
    res.status(500).json({ error: 'Lỗi tạo link PayOS' });
  }
});
```

**Hàm hỗ trợ**:
```javascript
function getPayOSClient() {
  if (payosClient) return payosClient;
  
  const clientId = process.env.PAYOS_CLIENT_ID;
  const apiKey = process.env.PAYOS_API_KEY;
  const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
  
  if (!clientId || !apiKey || !checksumKey) return null;
  
  payosClient = new PayOS({ clientId, apiKey, checksumKey });
  return payosClient;
}
```

**Biến môi trường cần thiết** (`.env`):
```env
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
PAYOS_WEBHOOK_URL=https://yourdomain.com/api/payment/payos/webhook
PAYOS_RETURN_URL=https://yourdomain.com/thanh-toan/ket-qua
```

---

### BƯỚC 7️⃣: Frontend - Hiển thị QR Payment Screen

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx) - [Line 200-380](src/pages/CheckoutPage.jsx#L200-L380)

**Component**: `QrPaymentScreen({ result, onBackEdit })`

```jsx
function QrPaymentScreen({ result, onBackEdit }) {
  const isVietqr = result.payment_method === 'vietqr';
  const payosQrCode = result.payosQrCode;        // QR code từ PayOS
  const payosCheckoutUrl = result.payosCheckoutUrl; // Link checkout PayOS
  
  const [paid, setPaid] = useState(false);  // Trạng thái thanh toán
  
  // Polling kiểm tra thanh toán mỗi 3 giây
  useEffect(() => {
    if (paid) return;
    
    const interval = setInterval(async () => {
      try {
        // 1. Kiểm tra qua PayOS
        if (result.paymentLinkId && result.payment_method === 'vietqr') {
          const checkRes = await fetch(`${API_BASE}/api/payment/payos/check-payment/${result.paymentLinkId}`);
          const checkData = await checkRes.json();
          if (checkData.status === 'PAID') {
            setPaid(true);
            clearInterval(interval);
            return;
          }
        }
        
        // 2. Kiểm tra status đơn hàng
        const res = await fetch(`${API_BASE}/api/payment/status/${result.code}`);
        const data = await res.json();
        if (data.status === 'confirmed' || data.payment_status === 'paid') {
          setPaid(true);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);  // 3 giây kiểm tra lần
    
    return () => clearInterval(interval);
  }, [paid, result]);
  
  return (
    <div className="checkout-page">
      <div className="checkout-container">
        {/* Back button */}
        {!paid && (
          <button onClick={() => onBackEdit()}>
            ← Quay lại
          </button>
        )}
        
        {/* Header */}
        <div className="success-header-block">
          <span className="status-badge">
            {paid ? 'Đã thanh toán' : 'Chờ quét QR'}
          </span>
          <h2>Đơn hàng #{result.code}</h2>
        </div>
        
        {/* QR Code Section */}
        {!paid && (
          <div className="checkout-block">
            <h3>Thanh toán qua PayOS</h3>
            <div>
              <div>Mở app ngân hàng và quét mã QR bên dưới</div>
              
              {/* Nội dung chuyển khoản */}
              <table>
                <tr><td>Nội dung</td><td>{result.code}</td></tr>
                <tr><td>Số tiền</td><td>{formatPrice(result.total)}</td></tr>
              </table>
              
              {/* Hiển thị QR code */}
              {payosQrCode && (
                <div className="qr-code-box">
                  <img src={payosQrCode} alt="PayOS QR" />
                </div>
              )}
              
              {/* Hoặc link checkout */}
              {payosCheckoutUrl && !payosQrCode && (
                <a href={payosCheckoutUrl} target="_blank">
                  Mở trang thanh toán PayOS
                </a>
              )}
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {paid && (
          <div className="success-section">
            <div style={{ background: '#e8f5e9', padding: 24 }}>
              <h2 style={{ color: '#2e7d32' }}>✓ Thanh toán thành công!</h2>
              <p>Đơn hàng của bạn đã được xác nhận.</p>
              <button onClick={() => navigate('/')}>← Quay về trang chủ</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**UI Elements**:
- Mã QR dạng ảnh
- Nội dung chuyển khoản (order code)
- Số tiền cần chuyển
- Thông tin tài khoản nhân viên
- Nút "Quay lại" khi chưa thanh toán
- Message "Đã thanh toán" khi hoàn tất

---

### BƯỚC 8️⃣: Quét QR → Chuyển Tiền

**Quy trình Manual**:
1. Khách hàng mở app ngân hàng
2. Quét mã QR
3. Xác nhận thông tin:
   - Số tiền: (từ QR code)
   - Nội dung: `MLB20260528001` (mã đơn hàng)
   - Tài khoản: `1054599581` (Vietcombank)
   - Tên tài khoản: `LE TIEN DAT`
4. Nhập OTP/PIN để xác nhận
5. Giao dịch thành công

---

### BƯỚC 9️⃣: PayOS Webhook - Xác nhận Thanh Toán

**File**: [`backend/routes/payment.js`](backend/routes/payment.js) - [Line 614-700](backend/routes/payment.js#L614-L700)

**Endpoint**: `POST /api/payment/payos/webhook`

```javascript
router.post('/payos/webhook', async (req, res) => {
  try {
    const payos = getPayOSClient();
    
    // Verify webhook signature từ PayOS
    const verified = await payos.webhooks.verify(req.body);
    
    if (verified.code !== '00') {
      return res.json({ success: false, message: verified.desc });
    }
    
    // Extract order code từ webhook data
    const orderCode = extractOrderCode(verified);
    
    // Lấy đơn hàng từ database
    const order = db.prepare('SELECT * FROM orders WHERE code=?').get(orderCode);
    if (!order) {
      return res.json({ success: true, message: 'Order not found' });
    }
    
    // Nếu đã confirmed → skip
    if (order.status === 'confirmed') {
      return res.json({ success: true, message: 'Already confirmed' });
    }
    
    // Kiểm tra số tiền
    const amount = Number(verified.amount || verified.data?.amount);
    const TOLERANCE = 1000;  // Chênh lệch cho phép (₫)
    
    if (amount >= (order.total - TOLERANCE)) {
      // Cập nhật status → confirmed
      db.prepare(`UPDATE orders SET 
        status='confirmed', 
        payment_status='paid', 
        payment_ref=?,
        updated_at=datetime('now','localtime')
      WHERE code=?`).run(verified.paymentLinkId, orderCode);
      
      console.log(`✅ [PayOS Webhook] Confirmed: ${orderCode} amount:${amount}`);
      
      // Gửi email xác nhận
      const items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(order.id);
      sendOrderEmail(order, items, 'payment_confirmed');
      
      return res.json({ success: true, message: 'Payment confirmed' });
    }
    
    // Nếu số tiền không khớp
    return res.json({ 
      success: false, 
      message: 'Amount mismatch',
      got: amount,
      expected: order.total
    });
    
  } catch (err) {
    console.error('PayOS webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**Quy trình**:
1. PayOS gửi webhook POST tới `/api/payment/payos/webhook`
2. Backend xác thực chữ ký webhook
3. Trích xuất mã đơn hàng từ webhook data
4. Tìm đơn hàng trong database
5. Kiểm tra số tiền có khớp không
6. Nếu khớp → cập nhật status = 'confirmed', payment_status = 'paid'
7. Gửi email xác nhận cho khách hàng

**Webhook Data từ PayOS** (ví dụ):
```json
{
  "code": "00",
  "desc": "Giao dịch thành công",
  "status": "PAID",
  "orderCode": "12345678",
  "amount": 500000,
  "amountPaid": 500000,
  "orderCode": "12345678",
  "paymentLinkId": "abc123xyz",
  "transactionDateTime": "2026-05-28T14:30:00Z",
  "reference": "TXN12345"
}
```

---

### BƯỚC 🔟: Frontend - Polling kiểm tra & Cập nhật UI

**File**: [`src/pages/CheckoutPage.jsx`](src/pages/CheckoutPage.jsx) - [Line 35-75](src/pages/CheckoutPage.jsx#L35-L75)

```javascript
// Trong QrPaymentScreen, mỗi 3 giây check 1 lần
useEffect(() => {
  if (paid) return;
  
  const interval = setInterval(async () => {
    try {
      // Gọi API kiểm tra status đơn hàng
      const res = await fetch(`${API_BASE}/api/payment/status/${result.code}`);
      const data = await res.json();
      
      // Nếu status = 'confirmed' hoặc payment_status = 'paid' → cập nhật UI
      if (data.status === 'confirmed' || data.payment_status === 'paid') {
        setPaid(true);
        clearInterval(interval);
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 3000);  // 3000ms = 3 giây
  
  return () => clearInterval(interval);
}, [paid]);
```

**Khi PayOS webhook được xác nhận**:
1. Backend cập nhật: `status = 'confirmed'`, `payment_status = 'paid'`
2. Frontend polling mỗi 3 giây kiểm tra endpoint `/api/payment/status/{orderCode}`
3. Khi lấy được status = 'confirmed', setPaid(true)
4. UI hiển thị "✓ Thanh toán thành công!"
5. Ẩn mã QR, hiển thị nút "Quay về trang chủ"

---

## 🔗 API ENDPOINTS TÓMLƯỢC

| Method | Endpoint | Chức năng | File |
|--------|----------|----------|------|
| POST | `/api/orders` | Tạo đơn hàng | [`backend/routes/orders.js`](backend/routes/orders.js) |
| POST | `/api/payment/payos/create` | Tạo link PayOS | [`backend/routes/payment.js`](backend/routes/payment.js) |
| POST | `/api/payment/payos/webhook` | Webhook từ PayOS | [`backend/routes/payment.js`](backend/routes/payment.js) |
| GET | `/api/payment/status/:orderCode` | Kiểm tra status đơn | [`backend/routes/payment.js`](backend/routes/payment.js) |
| GET | `/api/payment/payos/check-payment/:paymentLinkId` | Check từ PayOS API | [`backend/routes/payment.js`](backend/routes/payment.js) |

---

## 💾 DATABASE - BẢNG LIÊN QUAN

### `orders` table
```sql
CREATE TABLE orders (
  id INTEGER PRIMARY KEY,
  code TEXT UNIQUE,              -- MLB20260528001
  user_id INTEGER,               -- ID user nếu login
  customer_name TEXT,            -- Tên khách
  phone TEXT,                    -- SĐT
  email TEXT,                    -- Email
  address TEXT,                  -- Địa chỉ giao hàng
  city TEXT,
  district TEXT,
  note TEXT,
  payment_method TEXT,           -- 'vietqr', 'bank', 'cod', 'momo'
  status TEXT,                   -- 'pending', 'confirmed', 'shipping', 'delivered'
  payment_status TEXT,           -- 'unpaid', 'paid'
  payment_ref TEXT,              -- ID từ PayOS / transaction ID
  subtotal REAL,                 -- Tổng tiền hàng (trước discount, ship)
  shipping_fee REAL,             -- Phí ship
  total REAL,                    -- Tổng (sau discount)
  created_at DATETIME,
  updated_at DATETIME
);
```

### `order_items` table
```sql
CREATE TABLE order_items (
  id INTEGER PRIMARY KEY,
  order_id INTEGER,              -- FK từ orders.id
  product_id INTEGER,            -- FK từ products.id
  product_name TEXT,
  product_image TEXT,
  price REAL,                    -- Giá tại thời điểm đặt
  quantity INTEGER,
  subtotal REAL                  -- price * quantity
);
```

---

## 📧 EMAIL ĐƯỢC GỬI

### Cho khách hàng (khi chọn 'vietqr'):
```
Subject: Đơn hàng đã được tiếp nhận - MLB20260528001
Body:
  - Mã đơn hàng
  - Chi tiết sản phẩm
  - Tổng tiền
  - Hướng dẫn chuyển khoản
  - Nội dung chuyển khoản
```

---

## 🔄 LUỒNG TRƯỜNG HỢP KHÁC

### Nếu chọn COD (Thanh toán khi nhận):
1. Submit form → Tạo order với status = 'pending'
2. Hiển thị SuccessScreen (không cần QR)
3. Admin xác nhận → Gửi email thông báo khách
4. Giao hàng khi khách thanh toán

### Nếu chọn Bank (Chuyển khoản ngân hàng thường):
1. Submit form → Tạo order
2. Hiển thị QrPaymentScreen (QR dự phòng)
3. Khách tự chuyển khoản (không qua PayOS)
4. Admin kiểm tra → cập nhật status = 'confirmed' thủ công

### Nếu chọn MoMo:
1. Submit form → Tạo order
2. Gọi API MoMo tạo payment URL
3. Redirect khách tới MoMo app
4. MoMo gửi IPN → cập nhật status
5. Hiển thị success screen

---

## 🛠️ LỖI THƯỜNG GẶP & CÁCH FIX

| Lỗi | Nguyên nhân | Cách fix |
|-----|-----------|---------|
| "PayOS chưa được cấu hình" | Thiếu env vars | Điền `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY` |
| "Không tìm thấy đơn hàng" | Order không được tạo | Check POST `/api/orders` endpoint |
| "Amount mismatch" | Webhook có số tiền khác | Tăng `WEBHOOK_AMOUNT_TOLERANCE` |
| QR không hiển thị | PayOS trả về null | Dùng QR dự phòng (buildVietQrUrl) |
| Webhook không gọi | URL chưa correct | Check `PAYOS_WEBHOOK_URL` env |
| Polling không update | Endpoint `/api/payment/status` chưa sẵn | Implement endpoint này |

---

## 📱 MOBILE APP INTEGRATION (Nếu có)

Nếu tích hợp mobile app, cần:
1. Gọi API tạo order: `POST /api/orders`
2. Gọi API PayOS create: `POST /api/payment/payos/create`
3. Mở deep link MoMo / ngân hàng qua QR
4. Polling hoặc WebSocket để update status

```javascript
// Deep link MoMo
momo://app/payment?amount=500000&description=MLB20260528001

// QR code → Mở ngân hàng
// Chuẩn: EMV (Napas 247)
```

---

## 📊 TIMELINE - BẢO HÀNH THANH TOÁN

- **T+0 (lúc đặt hàng)**: Order tạo, status = 'pending'
- **T+0s (ngay lập tức)**: PayOS link tạo, hiển thị QR
- **T+30 phút**: Khách quét QR, chuyển tiền
- **T+30-60 phút**: PayOS webhook gọi, confirm payment
- **T+60 phút**: Admin đóng gói, ghi nhân
- **T+24 giờ**: Giao hàng

Nếu không thanh toán trong 24 giờ → Admin có thể hủy order

---

## 🎯 SUMMARY

**Bắt đầu**: User click "Thanh toán" → CheckoutPage  
**Form**: Điền thông tin + chọn "Chuyển khoản QR"  
**API Order**: POST `/api/orders` → Lưu order, trả code  
**API PayOS**: POST `/api/payment/payos/create` → Tạo link, trả QR  
**UI QR**: Hiển thị mã QR + hướng dẫn  
**Khách**: Quét QR → Chuyển tiền  
**Webhook**: PayOS gửi IPN → Backend cập nhật status  
**Polling**: Frontend check status mỗi 3s → Cập nhật UI "Đã thanh toán"  
**Email**: Gửi xác nhận cho khách hàng  
**Kết thúc**: Hiển thị success screen

---

*Cập nhật lần cuối: 28/05/2026*
