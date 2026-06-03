import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', parts: [{ text: 'Xin chào Admin! Tôi là Trợ lý ảo AI. Tôi có thể giúp bạn kiểm tra doanh thu, tìm kiếm đơn hàng, duyệt đơn hàng hoặc hủy đơn tự động.' }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', parts: [{ text }] };
    // Optimistic UI update
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
        },
        body: JSON.stringify({
          message: text,
          // Convert current UI messages back to Gemini history format, skipping the very first greeting
          history: messages.slice(1).map(m => ({
            role: m.role,
            parts: m.parts
          }))
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: data.text }] }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', parts: [{ text: `❌ Lỗi: ${data.error}` }] }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '❌ Lỗi kết nối đến server.' }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 100,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #d32f2f, #7b1fa2)',
          color: 'white',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(211,47,47,0.4)',
          zIndex: 9999,
          transition: 'transform 0.2s',
          fontSize: 28
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        ✨
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 380,
          height: 600,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #d32f2f, #7b1fa2)',
            padding: '16px 20px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 16 }}>Admin AI Agent</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Trợ lý quản trị thông minh</div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}
            >
              ✖
            </button>
          </div>

          {/* Chat Body */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: 20,
            background: '#f9f9f9',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? '#d32f2f' : '#fff',
                color: m.role === 'user' ? '#fff' : '#333',
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                fontSize: 14,
                lineHeight: 1.5
              }}>
                {m.role === 'user' ? (
                  m.parts[0].text
                ) : (
                  <div className="markdown-body" style={{ fontSize: 14 }}>
                    <ReactMarkdown>{m.parts[0].text}</ReactMarkdown>
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', background: '#fff', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', fontSize: 14, color: '#888' }}>
                <span className="dot-typing">AI đang suy nghĩ và thực thi...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div style={{
            padding: '10px 16px',
            background: '#fff',
            borderTop: '1px solid #eee',
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none'
          }}>
            <button 
              onClick={() => handleSend('Doanh thu hôm nay thế nào?')}
              style={{ padding: '6px 12px', background: '#f0f0f0', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer', color: '#555' }}
            >💰 Doanh thu</button>
            <button 
              onClick={() => handleSend('Duyệt toàn bộ đơn hàng pending')}
              style={{ padding: '6px 12px', background: '#f0f0f0', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer', color: '#555' }}
            >✅ Duyệt đơn</button>
            <button 
              onClick={() => handleSend('Sách nào đang hết hàng?')}
              style={{ padding: '6px 12px', background: '#f0f0f0', border: 'none', borderRadius: 20, fontSize: 12, cursor: 'pointer', color: '#555' }}
            >📦 Tồn kho</button>
          </div>

          {/* Input Area */}
          <div style={{
            padding: 16,
            background: '#fff',
            borderTop: '1px solid #eee',
            display: 'flex',
            gap: 10
          }}>
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(input)}
              placeholder="Giao việc cho AI..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: '1px solid #ddd',
                borderRadius: 24,
                outline: 'none',
                fontSize: 14
              }}
            />
            <button 
              onClick={() => handleSend(input)}
              disabled={isLoading || !input.trim()}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: input.trim() && !isLoading ? '#d32f2f' : '#ccc',
                color: 'white',
                border: 'none',
                cursor: input.trim() && !isLoading ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              ➤
            </button>
          </div>
        </div>
      )}
      <style>{`
        .markdown-body p { margin: 0 0 8px 0; }
        .markdown-body p:last-child { margin: 0; }
        .markdown-body ul, .markdown-body ol { margin: 0; padding-left: 20px; }
        .markdown-body li { margin-bottom: 4px; }
        .markdown-body strong { color: #d32f2f; }
        .dot-typing { animation: blink 1.5s infinite; }
        @keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
      `}</style>
    </>
  );
}
