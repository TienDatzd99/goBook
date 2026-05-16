import { useState, useEffect } from 'react';
import { Star, MessageCircle, Eye, EyeOff, Search, CheckCircle, Send, X } from 'lucide-react';

export default function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [replyId, setReplyId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reviews`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (res.ok) setReviews(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReviews(); }, []);

  const toggleVisibility = async (id, currentVal) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reviews/${id}/visibility`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ is_visible: !currentVal })
      });
      fetchReviews();
    } catch (e) { console.error(e); }
  };

  const handleReply = async (id) => {
    if (!replyText.trim()) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/reviews/${id}/reply`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ reply: replyText })
      });
      setReplyId(null);
      setReplyText('');
      fetchReviews();
    } catch (e) { console.error(e); }
  };

  const filteredReviews = reviews.filter(r => 
    r.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.order_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Star size={28} color="#f9a825" fill="#f9a825" />
          Quản lý Đánh giá
        </h2>
        
        <div style={{ position: 'relative', width: 300 }}>
          <input 
            type="text" 
            placeholder="Tìm theo sản phẩm, khách hàng, mã ĐH..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: 8, border: '1px solid #ddd', outline: 'none' }}
          />
          <Search size={18} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Đang tải dữ liệu...</div>
        ) : (
          <table className="admin-table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Sản phẩm</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Khách hàng</th>
                <th style={{ padding: '16px', textAlign: 'center', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Đánh giá</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee', width: '30%' }}>Nội dung & Phản hồi</th>
                <th style={{ padding: '16px', textAlign: 'center', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Hiển thị</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: '#999' }}>Không tìm thấy đánh giá nào</td></tr>
              ) : filteredReviews.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #eee', transition: 'background 0.2s', opacity: r.is_visible ? 1 : 0.6, background: r.is_visible ? '#fff' : '#fafafa' }} onMouseEnter={e=>e.currentTarget.style.background='#fcfcfc'} onMouseLeave={e=>e.currentTarget.style.background=r.is_visible ? '#fff' : '#fafafa'}>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={r.product_image || '/placeholder.png'} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.product_name}</div>
                        <div style={{ fontSize: 12, color: '#777', display: 'inline-block', background: '#f5f5f5', padding: '2px 6px', borderRadius: 4 }}>ĐH: {r.order_code}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px', fontSize: 14, color: '#444' }}>
                    <div style={{ fontWeight: 500 }}>{r.customer_name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{new Date(r.created_at).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                      {[1,2,3,4,5].map(star => (
                        <Star key={star} size={16} fill={star <= r.rating ? '#f9a825' : '#eee'} color={star <= r.rating ? '#f9a825' : '#eee'} />
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ fontSize: 14, color: '#333', marginBottom: 8, lineHeight: 1.5 }}>"{r.comment}"</div>
                    
                    {r.reply ? (
                      <div style={{ fontSize: 13, background: '#f0f4f8', padding: '8px 12px', borderRadius: 6, color: '#1a365d', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <MessageCircle size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                        <div>
                          <strong style={{ display: 'block', marginBottom: 2 }}>Shop phản hồi:</strong> 
                          {r.reply}
                        </div>
                      </div>
                    ) : (
                      replyId === r.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f9f9f9', padding: 12, borderRadius: 6 }}>
                          <textarea 
                            rows="2"
                            placeholder="Nhập phản hồi của bạn..."
                            value={replyText} 
                            onChange={e=>setReplyText(e.target.value)} 
                            style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, width: '100%', resize: 'vertical', outline: 'none', fontSize: 13 }} 
                          />
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button onClick={() => {setReplyId(null); setReplyText('');}} style={{ background: 'transparent', color: '#666', border: '1px solid #ccc', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><X size={14} /> Hủy</button>
                            <button onClick={() => handleReply(r.id)} style={{ background: '#0288d1', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Send size={14} /> Gửi phản hồi</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => {setReplyId(r.id); setReplyText('');}} style={{ background: 'transparent', border: '1px dashed #ccc', padding: '6px 12px', borderRadius: 4, color: '#666', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.borderColor='#0288d1'; e.currentTarget.style.color='#0288d1'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#ccc'; e.currentTarget.style.color='#666'}}>
                          <MessageCircle size={14} /> Phản hồi khách hàng
                        </button>
                      )
                    )}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button 
                      onClick={() => toggleVisibility(r.id, r.is_visible)} 
                      style={{ 
                        background: r.is_visible ? '#e8f5e9' : '#ffebee', 
                        border: 'none', 
                        cursor: 'pointer', 
                        width: 36, height: 36, 
                        borderRadius: '50%', 
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        color: r.is_visible ? '#2e7d32' : '#c62828',
                        transition: 'transform 0.2s'
                      }}
                      onMouseEnter={e=>e.currentTarget.style.transform='scale(1.1)'}
                      onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}
                      title={r.is_visible ? 'Đang hiển thị (Nhấn để ẩn)' : 'Đang ẩn (Nhấn để hiển thị)'}
                    >
                      {r.is_visible ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
