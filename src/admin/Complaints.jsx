import { useState, useEffect } from 'react';
import { AlertTriangle, Search, Filter, MessageSquare, Send, X, Clock, CheckCircle } from 'lucide-react';

export default function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/complaints`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` }
      });
      const data = await res.json();
      if (res.ok) setComplaints(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchComplaints(); }, []);

  const handleUpdate = async (id, status, reply) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/complaints/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}` 
        },
        body: JSON.stringify({ status, admin_reply: reply })
      });
      setActiveComplaint(null);
      setReplyText('');
      fetchComplaints();
    } catch (e) { console.error(e); }
  };

  const statusMap = {
    'pending': { label: 'Chờ xử lý', color: '#ed6c02', bg: '#fff4e5', icon: <Clock size={14} /> },
    'processing': { label: 'Đang xử lý', color: '#0288d1', bg: '#e1f5fe', icon: <MessageSquare size={14} /> },
    'resolved': { label: 'Đã giải quyết', color: '#2e7d32', bg: '#e8f5e9', icon: <CheckCircle size={14} /> }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.order_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="admin-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, margin: 0, color: '#333', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={28} color="#c62828" />
          Quản lý Khiếu nại
        </h2>
        
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ position: 'relative', width: 250 }}>
            <select 
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: 8, border: '1px solid #ddd', outline: 'none', appearance: 'none', cursor: 'pointer' }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="processing">Đang xử lý</option>
              <option value="resolved">Đã giải quyết</option>
            </select>
            <Filter size={18} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ position: 'relative', width: 250 }}>
            <input 
              type="text" 
              placeholder="Tìm theo mã ĐH, khách..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: 8, border: '1px solid #ddd', outline: 'none' }}
            />
            <Search size={18} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#666' }}>Đang tải dữ liệu...</div>
        ) : (
          <table className="admin-table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f8f9fa' }}>
              <tr>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Khách hàng</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Đơn hàng</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Vấn đề & Chi tiết</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee' }}>Trạng thái</th>
                <th style={{ padding: '16px', textAlign: 'left', color: '#555', fontWeight: 600, borderBottom: '2px solid #eee', width: '30%' }}>Xử lý / Phản hồi</th>
              </tr>
            </thead>
            <tbody>
              {filteredComplaints.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: '#999' }}>Không tìm thấy khiếu nại nào</td></tr>
              ) : filteredComplaints.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #eee', transition: 'background 0.2s' }} onMouseEnter={e=>e.currentTarget.style.background='#fcfcfc'} onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                  <td style={{ padding: '16px', fontSize: 14, color: '#333' }}>
                    <div style={{ fontWeight: 600 }}>{c.customer_name}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{new Date(c.created_at).toLocaleDateString('vi-VN')}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <a href={`/admin/orders?code=${c.order_code}`} style={{ fontSize: 14, fontWeight: 600, color: '#1976d2', textDecoration: 'none', background: '#e3f2fd', padding: '4px 8px', borderRadius: 4 }}>{c.order_code}</a>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'inline-block', background: '#ffebee', color: '#c62828', padding: '4px 8px', borderRadius: 4, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{c.type}</div>
                    <div style={{ fontSize: 14, color: '#555', lineHeight: 1.5, maxWidth: 350 }}>{c.description}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ 
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      background: statusMap[c.status]?.bg || '#f5f5f5', 
                      color: statusMap[c.status]?.color || '#333', 
                      padding: '6px 12px', borderRadius: 20, 
                      fontSize: 12, fontWeight: 600 
                    }}>
                      {statusMap[c.status]?.icon}
                      {statusMap[c.status]?.label || c.status}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    {activeComplaint === c.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: '#f9f9f9', padding: 12, borderRadius: 6 }}>
                        <select 
                          defaultValue={c.status} 
                          id={`status-select-${c.id}`}
                          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, outline: 'none', cursor: 'pointer' }}
                        >
                          <option value="pending">Chờ xử lý</option>
                          <option value="processing">Đang xử lý</option>
                          <option value="resolved">Đã giải quyết</option>
                        </select>
                        <textarea 
                          rows="2"
                          placeholder="Nhập nội dung phản hồi cho khách..."
                          value={replyText} 
                          onChange={e => setReplyText(e.target.value)} 
                          style={{ padding: '8px 12px', border: '1px solid #ddd', borderRadius: 4, width: '100%', resize: 'vertical', outline: 'none', fontSize: 13 }} 
                        />
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => setActiveComplaint(null)} style={{ background: 'transparent', color: '#666', border: '1px solid #ccc', padding: '6px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><X size={14} /> Hủy</button>
                          <button onClick={() => {
                            const newStatus = document.getElementById(`status-select-${c.id}`).value;
                            handleUpdate(c.id, newStatus, replyText);
                          }} style={{ background: '#2e7d32', color: 'white', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Send size={14} /> Lưu & Phản hồi</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {c.admin_reply && (
                          <div style={{ fontSize: 13, background: '#f0f4f8', padding: '8px 12px', borderRadius: 6, color: '#1a365d', display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                            <MessageSquare size={16} style={{ marginTop: 2, flexShrink: 0 }} />
                            <div>
                              <strong style={{ display: 'block', marginBottom: 2 }}>Shop phản hồi:</strong> 
                              {c.admin_reply}
                            </div>
                          </div>
                        )}
                        <button onClick={() => {setActiveComplaint(c.id); setReplyText(c.admin_reply || '');}} style={{ background: 'transparent', border: '1px dashed #ccc', padding: '6px 12px', borderRadius: 4, color: '#666', cursor: 'pointer', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'all 0.2s' }} onMouseEnter={e=>{e.currentTarget.style.borderColor='#1976d2'; e.currentTarget.style.color='#1976d2'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#ccc'; e.currentTarget.style.color='#666'}}>
                          {c.admin_reply ? 'Cập nhật phản hồi' : 'Xử lý khiếu nại'}
                        </button>
                      </div>
                    )}
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
