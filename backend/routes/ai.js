const express = require('express');
const db = require('../database');
const { auth, adminOnly } = require('../middleware/auth');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { sendAICustomEmail } = require('../utils/mailer');
const router = express.Router();

let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (e) {
  console.error("Failed to initialize Gemini:", e.message);
}

// ─────────────────────────────────────────────────────────────
// SYSTEM INSTRUCTION
// ─────────────────────────────────────────────────────────────
const systemInstruction = `
Bạn là Trợ lý Quản trị viên (Admin AI Agent) cao cấp của hệ thống thương mại điện tử goBook.
Bạn có quyền truy cập trực tiếp vào Cơ sở dữ liệu và có thể thực thi các hành động thông qua công cụ (Tools).

Các bảng trong Database (SQLite):
1. users (id, name, email, role, phone, is_active, created_at)
2. products (id, name, slug, price, original_price, stock, category_id, is_active, sku)
3. orders (id, code, user_id, customer_name, email, phone, address, total, status, created_at, payment_method)
   - status: 'pending' (chờ duyệt), 'confirmed' (đã duyệt), 'shipping' (đang giao), 'delivered' (hoàn thành), 'cancelled' (đã hủy)
4. order_items (id, order_id, product_id, product_name, price, quantity, subtotal)
5. categories (id, name, slug)

Nhiệm vụ của bạn:
- Lắng nghe yêu cầu của Admin.
- Tự động gọi các Tool (Function Calling) để lấy thông tin hoặc thực thi lệnh (Duyệt đơn, Hủy đơn).
- Nếu cần truy vấn dữ liệu bất kỳ, hãy dùng tool query_database_read_only. Nhớ viết câu lệnh SQLite hợp lệ.
- Trả lời bằng tiếng Việt, ngắn gọn, súc tích, định dạng Markdown đẹp mắt.
`;

// ─────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────
const tools = [
  {
    name: 'query_database_read_only',
    description: 'Thực thi câu lệnh SQL SELECT để lấy dữ liệu từ cơ sở dữ liệu (SQLite). TUYỆT ĐỐI CHỈ DÙNG LỆNH SELECT.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sqlQuery: { type: 'STRING', description: 'Câu lệnh SQL SELECT hợp lệ.' }
      },
      required: ['sqlQuery']
    }
  },
  {
    name: 'approve_orders',
    description: 'Duyệt các đơn hàng đang ở trạng thái pending (chờ duyệt). Cần cung cấp thông tin để lọc đơn hàng.',
    parameters: {
      type: 'OBJECT',
      properties: {
        customerName: { type: 'STRING', description: 'Tên khách hàng cần duyệt đơn (gần đúng).' },
        customerEmail: { type: 'STRING', description: 'Email khách hàng cần duyệt đơn.' },
        orderCode: { type: 'STRING', description: 'Mã đơn hàng (ví dụ: MLB00000001).' }
      }
    }
  },
  {
    name: 'cancel_orders_by_product',
    description: 'Hủy tất cả các đơn hàng (pending hoặc confirmed) chứa một sản phẩm cụ thể và gửi email thông báo lý do.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productName: { type: 'STRING', description: 'Tên sách (tìm kiếm gần đúng).' },
        sku: { type: 'STRING', description: 'Mã SKU của sách.' },
        reason: { type: 'STRING', description: 'Lý do hủy đơn để gửi email cho khách.' }
      },
      required: ['reason']
    }
  }
];

// ─────────────────────────────────────────────────────────────
// TOOL HANDLERS
// ─────────────────────────────────────────────────────────────
async function handleToolCall(functionCall) {
  const name = functionCall.name;
  const args = functionCall.args;
  console.log(`[AI TOOL CALL] ${name}`, args);

  try {
    if (name === 'query_database_read_only') {
      if (!args.sqlQuery.trim().toUpperCase().startsWith('SELECT')) {
        return { error: 'Chỉ cho phép lệnh SELECT' };
      }
      const rows = db.prepare(args.sqlQuery).all();
      return { data: rows, count: rows.length };
    }

    if (name === 'approve_orders') {
      let conditions = ["status = 'pending'"];
      let params = [];

      if (args.customerName) {
        conditions.push("customer_name LIKE ?");
        params.push('%' + args.customerName + '%');
      }
      if (args.customerEmail) {
        conditions.push("email = ?");
        params.push(args.customerEmail);
      }
      if (args.orderCode) {
        conditions.push("code = ?");
        params.push(args.orderCode);
      }

      if (conditions.length === 1) {
        return { error: 'Cần ít nhất 1 điều kiện (tên, email, hoặc mã đơn).' };
      }

      const queryStr = "SELECT id, code, email, customer_name FROM orders WHERE " + conditions.join(' AND ');
      const matchingOrders = db.prepare(queryStr).all(params);

      if (matchingOrders.length === 0) {
        return { message: 'Không tìm thấy đơn hàng nào phù hợp đang chờ duyệt.' };
      }

      const orderIds = matchingOrders.map(o => o.id);
      const placeholders = orderIds.map(() => '?').join(',');
      db.prepare(`UPDATE orders SET status = 'confirmed', updated_at = datetime('now','localtime') WHERE id IN (${placeholders})`).run(orderIds);

      // Async email sending
      for (const order of matchingOrders) {
        if (order.email) {
          sendAICustomEmail(order.email, order.customer_name, `✅ Đơn hàng ${order.code} đã được duyệt`, `<p>Đơn hàng <strong>${order.code}</strong> của bạn đã được Admin duyệt thành công. Chúng tôi đang chuẩn bị giao hàng cho bạn.</p>`).catch(() => {});
        }
      }

      return {
        message: 'Thành công',
        approved_count: matchingOrders.length,
        approved_orders: matchingOrders.map(o => o.code)
      };
    }

    if (name === 'cancel_orders_by_product') {
      if (!args.productName && !args.sku) return { error: 'Thiếu tên sách hoặc SKU' };
      if (!args.reason) return { error: 'Thiếu lý do hủy' };

      let productQuery = "SELECT id, name FROM products WHERE ";
      let pParams = [];
      if (args.sku) {
        productQuery += "sku = ?";
        pParams.push(args.sku);
      } else {
        productQuery += "name LIKE ?";
        pParams.push('%' + args.productName + '%');
      }

      const products = db.prepare(productQuery).all(pParams);
      if (products.length === 0) return { error: 'Không tìm thấy sản phẩm nào khớp.' };

      const productIds = products.map(p => p.id);
      const inStr = productIds.map(() => '?').join(',');

      // Find orders containing these products that are pending or confirmed
      const orders = db.prepare(`
        SELECT DISTINCT o.id, o.code, o.email, o.customer_name
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.product_id IN (${inStr}) AND o.status IN ('pending', 'confirmed')
      `).all(productIds);

      if (orders.length === 0) return { message: 'Không có đơn hàng nào chờ duyệt/đã duyệt chứa sản phẩm này.' };

      const orderIds = orders.map(o => o.id);
      const orderInStr = orderIds.map(() => '?').join(',');

      // Update to cancelled
      db.prepare(`UPDATE orders SET status = 'cancelled', updated_at = datetime('now','localtime') WHERE id IN (${orderInStr})`).run(orderIds);

      // Restore stock
      for (const orderId of orderIds) {
        const items = db.prepare('SELECT product_id, quantity FROM order_items WHERE order_id=?').all(orderId);
        for (const item of items) {
          if (item.product_id) {
             db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
          }
        }
      }

      // Send emails
      for (const order of orders) {
        if (order.email) {
          sendAICustomEmail(
            order.email, 
            order.customer_name, 
            `❌ Thông báo hủy đơn hàng ${order.code}`, 
            `<p>Đơn hàng <strong>${order.code}</strong> của bạn đã bị hủy bởi hệ thống.</p><p><strong>Lý do:</strong> ${args.reason}</p><p>Chúng tôi thành thật xin lỗi vì sự bất tiện này.</p>`
          ).catch(() => {});
        }
      }

      return {
        message: 'Đã hủy đơn hàng thành công',
        cancelled_count: orders.length,
        cancelled_orders: orders.map(o => o.code),
        products_affected: products.map(p => p.name)
      };
    }

    return { error: 'Function không tồn tại' };
  } catch (error) {
    console.error('Tool Error:', error);
    return { error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN CHAT ENDPOINT
// ─────────────────────────────────────────────────────────────
router.post('/chat', auth, adminOnly, async (req, res) => {
  const { message, history } = req.body;

  if (!genAI) {
    return res.status(500).json({ error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng thiết lập trong .env.' });
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction,
      tools: [{ functionDeclarations: tools }]
    });

    const chat = model.startChat({
      history: history || [],
    });

    // 1. Gửi tin nhắn cho model
    let response = await chat.sendMessage(message);
    let functionCallsArray = response.response.functionCalls ? response.response.functionCalls() : null;
    let functionCall = functionCallsArray && functionCallsArray.length > 0 ? functionCallsArray[0] : null;

    // 2. Nếu model yêu cầu chạy hàm (Tool Call)
    if (functionCall) {
      const toolResult = await handleToolCall(functionCall);
      
      // 3. Phản hồi kết quả của hàm lại cho model để nó dịch thành ngôn ngữ tự nhiên
      response = await chat.sendMessage([{
        functionResponse: {
          name: functionCall.name,
          response: toolResult
        }
      }]);
    }

    res.json({
      text: response.response.text(),
      history: await chat.getHistory()
    });

  } catch (error) {
    console.error("Gemini Chat Error:", error);
    res.status(500).json({ error: 'Lỗi khi gọi AI: ' + error.message });
  }
});

module.exports = router;
