import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useNavigate } from 'react-router-dom';

export default function CustomerAI() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', parts: [{ text: 'Xin chào! Mình là Trợ lý AI của goBook. Mình có thể giúp gì cho bạn hôm nay? (Tìm sách, Tư vấn chọn sách, Kiểm tra tình trạng đơn hàng...)' }] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (text) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user', parts: [{ text }] };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/customer-ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: messages.slice(1).map(m => ({ role: m.role, parts: m.parts }))
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
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: '❌ Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau.' }] }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkClick = (e) => {
    const href = e.target.getAttribute('href');
    if (href && href.startsWith('/')) {
      e.preventDefault();
      setIsOpen(false);
      navigate(href);
    }
  };

  return (
    <>
      <style>{`
        .markdown-body a {
          font-weight: bold;
          text-decoration: underline;
          color: #c92127;
        }
        .markdown-body ul {
          list-style: none;
          padding-left: 0;
          margin: 8px 0;
        }
        .markdown-body li {
          margin-bottom: 6px;
          position: relative;
          padding-left: 14px;
        }
        .markdown-body li::before {
          content: "-";
          position: absolute;
          left: 0;
          color: #555;
        }
      `}</style>
      <div 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: 100,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: '#c92127',
          color: 'white',
          display: isOpen ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(201,33,39,0.4)',
          zIndex: 9999,
          transition: 'transform 0.2s',
          fontSize: 28
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        💬
      </div>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 350,
          height: 550,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 9999,
          overflow: 'hidden',
          border: '1px solid #eee'
        }}>
          <div style={{
            background: '#c92127',
            padding: '16px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 16 }}>goBook AI</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>Luôn sẵn sàng hỗ trợ</div>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}
            >
              ✖
            </button>
          </div>

          <div 
            onClick={handleLinkClick}
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: 16,
              background: '#fcfcfc',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? '#f5f5f5' : '#e3f2fd',
                color: '#333',
                padding: '10px 14px',
                borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                fontSize: 14,
                lineHeight: 1.5,
                border: '1px solid',
                borderColor: m.role === 'user' ? '#eee' : '#bbdefb'
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
              <div style={{ alignSelf: 'flex-start', background: '#e3f2fd', padding: '10px 14px', borderRadius: '16px 16px 16px 4px', fontSize: 14, color: '#666', border: '1px solid #bbdefb' }}>
                <span className="dot-typing">Đang trả lời...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{
            padding: '8px 12px',
            background: '#fff',
            borderTop: '1px solid #eee',
            display: 'flex',
            gap: 6,
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            scrollbarWidth: 'none'
          }}>
            <button 
              onClick={() => handleSend('Tôi muốn tìm sách Kỹ năng sống')}
              style={{ padding: '6px 10px', background: '#fff', border: '1px solid #c92127', borderRadius: 20, fontSize: 12, cursor: 'pointer', color: '#c92127' }}
            >🔍 Tìm sách</button>
            <button 
              onClick={() => handleSend('Làm sao để khiếu nại đơn hàng?')}
              style={{ padding: '6px 10px', background: '#fff', border: '1px solid #c92127', borderRadius: 20, fontSize: 12, cursor: 'pointer', color: '#c92127' }}
            >⚠️ Khiếu nại</button>
          </div>

          <div style={{
            padding: 12,
            background: '#fff',
            display: 'flex',
            gap: 8
          }}>
            <input 
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend(input)}
              placeholder="Nhập câu hỏi..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px 14px',
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
                background: input.trim() && !isLoading ? '#c92127' : '#ccc',
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
    </>
  );
}
