const express = require('express');
const db = require('../database');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (e) {
  console.error("Failed to initialize Gemini:", e.message);
  // capture init error for runtime diagnostics (safe: do not log the key)
  var genAIInitError = e && e.message ? String(e.message) : String(e);
}

if (typeof genAIInitError === 'undefined') genAIInitError = null;

// ─────────────────────────────────────────────────────────────
// SYSTEM INSTRUCTION
// ─────────────────────────────────────────────────────────────
const systemInstruction = `
Bạn là Trợ lý AI Chăm sóc Khách hàng của nhà sách goBook.
Nhiệm vụ của bạn:
1. Tư vấn sách: Dựa trên nhu cầu của khách (ví dụ: sách kinh doanh, sách có bản đọc thử), sử dụng tool search_products để tìm kiếm và đề xuất.
2. Kiểm tra đơn hàng: Nếu khách cung cấp mã đơn (ví dụ MLB00000001), dùng tool check_order_status để báo cáo tình trạng đơn.
3. Hỗ trợ khiếu nại: Hướng dẫn khách hàng vào phần Tài khoản -> Đơn hàng -> bấm Khiếu nại nếu họ gặp vấn đề với đơn hàng đã giao.

QUY TẮC CỨNG:
- LUÔN LUÔN lịch sự, xưng hô "goBook" và "Quý khách" hoặc "Bạn".
- KHÔNG BAO GIỜ tiết lộ thông tin kỹ thuật, số lượng tồn kho chính xác (chỉ báo còn hay hết), hoặc thông tin của khách hàng khác.
- KHÔNG có quyền sửa đổi dữ liệu.
- Khi giới thiệu sách, BẮT BUỘC phải định dạng tên sách là một đường dẫn Markdown có thể click được, lấy từ thuộc tính url trong kết quả tìm kiếm (ví dụ: [Tên Sách](/san-pham/slug)), và hiển thị dưới dạng danh sách (bullet points).
`;

// ─────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// ─────────────────────────────────────────────────────────────
const tools = [
  {
    name: 'search_products',
    description: 'Tìm kiếm sách trong kho dựa trên từ khóa (tên sách, tác giả, hoặc thể loại). Hoặc tìm kiếm sách có bản đọc thử.',
    parameters: {
      type: 'OBJECT',
      properties: {
        keyword: { type: 'STRING', description: 'Từ khóa tìm kiếm (ví dụ: kinh doanh, thiếu nhi, đắc nhân tâm). Để trống nếu chỉ muốn tìm sách có bản đọc thử.' },
        hasPreview: { type: 'BOOLEAN', description: 'Đặt là true nếu khách hàng yêu cầu tìm sách có bản đọc thử.' }
      }
    }
  },
  {
    name: 'check_order_status',
    description: 'Kiểm tra trạng thái của một đơn hàng cụ thể dựa trên mã đơn.',
    parameters: {
      type: 'OBJECT',
      properties: {
        orderCode: { type: 'STRING', description: 'Mã đơn hàng (ví dụ: MLB00000001).' }
      },
      required: ['orderCode']
    }
  }
];

// ─────────────────────────────────────────────────────────────
// TOOL HANDLERS
// ─────────────────────────────────────────────────────────────
async function handleToolCall(functionCall) {
  const name = functionCall.name;
  const args = functionCall.args;
  console.log(`[CUSTOMER AI TOOL] ${name}`, args);

  try {
    if (name === 'search_products') {
      const keyword = args.keyword || '';
      const hasPreview = args.hasPreview === true;
      
      let query = `
        SELECT p.name, p.slug, p.price, p.discount, c.name as category_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        WHERE 1=1
      `;
      let params = [];
      
      if (keyword) {
        query += ` AND (p.name LIKE ? OR c.name LIKE ? OR p.author LIKE ?)`;
        params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
      }
      
      if (hasPreview) {
        query += ` AND (p.pdf_url IS NOT NULL AND p.pdf_url != '')`;
      }
      
      query += ` LIMIT 5`;

      const products = db.prepare(query).all(...params);

      if (products.length === 0) return { message: 'Không tìm thấy sách phù hợp.' };
      return { 
        message: 'Đây là các sách tìm thấy', 
        products: products.map(p => ({
          name: p.name,
          url: `/san-pham/${p.slug}`,
          price: p.price,
          category: p.category_name
        })) 
      };
    }

    if (name === 'check_order_status') {
      const order = db.prepare(`
        SELECT code, status, total, payment_method, created_at
        FROM orders WHERE code = ?
      `).get(args.orderCode);

      if (!order) return { message: 'Mã đơn hàng không tồn tại. Vui lòng kiểm tra lại.' };
      
      const statusMap = {
        'pending': 'Đang chờ duyệt',
        'confirmed': 'Đã xác nhận & đang chuẩn bị hàng',
        'shipping': 'Đang giao hàng',
        'delivered': 'Đã giao thành công',
        'cancelled': 'Đã hủy'
      };

      return {
        order_code: order.code,
        status: statusMap[order.status] || order.status,
        total_vnd: order.total,
        order_date: order.created_at
      };
    }

    return { error: 'Function không tồn tại' };
  } catch (error) {
    console.error('Customer Tool Error:', error);
    return { error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN CHAT ENDPOINT
// ─────────────────────────────────────────────────────────────
router.post('/chat', async (req, res) => {
  const { message, history } = req.body;

  if (!genAI) {
    return res.status(500).json({ error: 'Hệ thống Trợ lý AI đang bảo trì.' });
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

    let response = await chat.sendMessage(message);
    let functionCallsArray = response.response.functionCalls ? response.response.functionCalls() : null;
    let functionCall = functionCallsArray && functionCallsArray.length > 0 ? functionCallsArray[0] : null;

    if (functionCall) {
      const toolResult = await handleToolCall(functionCall);
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
    console.error("Customer Gemini Error:", error);
    res.status(500).json({ error: 'Lỗi hệ thống: ' + error.message });
  }
});

// Diagnostic status endpoint (safe) - does not reveal keys
router.get('/status', (req, res) => {
  try {
    return res.json({
      geminiEnvPresent: Boolean(process.env.GEMINI_API_KEY),
      genAIInitialized: Boolean(genAI),
      initError: genAIInitError ? genAIInitError : null
    });
  } catch (err) {
    return res.status(500).json({ error: 'failed' });
  }
});

module.exports = router;
