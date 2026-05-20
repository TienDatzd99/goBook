import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Hourglass, PartyPopper, CreditCard, Smartphone, Search, ShoppingCart, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import './PaymentReturnPage.css';

export default function PaymentReturnPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | failed
  const [data, setData] = useState(null);

  useEffect(() => {
    async function verify() {
      try {
        // Detect which gateway returned
        const isVNPay = searchParams.has('vnp_ResponseCode');
        const isMomo  = searchParams.has('resultCode');
        const isPayOS = searchParams.get('provider') === 'payos' || searchParams.has('orderCode') || searchParams.has('payos');

        if (!isVNPay && !isMomo && !isPayOS) {
          setStatus('failed');
          setData({ message: 'Không xác định được cổng thanh toán.' });
          return;
        }

        let endpoint, queryString;

        if (isVNPay) {
          queryString = searchParams.toString();
          endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/vnpay/callback?${queryString}`;
        } else if (isPayOS) {
          const orderCode = searchParams.get('orderCode');
          if (!orderCode) {
            setStatus('failed');
            setData({ message: 'Thiếu mã đơn hàng PayOS.' });
            return;
          }

          endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/status/${encodeURIComponent(orderCode)}`;
        } else {
          queryString = searchParams.toString();
          endpoint = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/momo/callback?${queryString}`;
        }

        const res = await fetch(endpoint);
        const result = await res.json();

        if (isPayOS) {
          const code = result.code || searchParams.get('orderCode');
          const confirmed = result.status === 'confirmed' || result.payment_status === 'paid';

          if (confirmed) {
            setData({ ...result, provider: 'payos', code });
            setStatus('success');
            return;
          }

          // Poll briefly in case the webhook arrives a few seconds after the user returns.
          let attempts = 0;
          while (attempts < 15) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            const pollRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/payment/status/${encodeURIComponent(code)}`);
            const pollData = await pollRes.json();
            if (pollData.status === 'confirmed' || pollData.payment_status === 'paid') {
              setData({ ...pollData, provider: 'payos', code });
              setStatus('success');
              return;
            }
            attempts += 1;
          }

          setData({ ...result, provider: 'payos', code, message: 'Đang chờ PayOS xác nhận giao dịch. Vui lòng kiểm tra lại sau ít phút.' });
          setStatus('failed');
          return;
        }

        setData({ ...result, provider: isVNPay ? 'vnpay' : 'momo' });
        setStatus(result.success ? 'success' : 'failed');
      } catch (err) {
        setStatus('failed');
        setData({ message: 'Lỗi kết nối khi xác minh thanh toán.' });
      }
    }

    verify();
  }, []);

  if (status === 'loading') {
    return (
      <div className="payment-return-page">
        <div className="return-card loading">
          <div className="spinner"><Hourglass size={48} color="#f57c00" /></div>
          <h2>Đang xác nhận thanh toán...</h2>
          <p>Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="payment-return-page">
        <div className="return-card success">
          <div className="return-icon"><PartyPopper size={48} color="#2e7d32" /></div>
          <h2>Thanh toán thành công!</h2>
          <div className="return-order-code">
            Mã đơn hàng: <strong>{data?.code}</strong>
          </div>
          <p className="return-message">
            Đơn hàng đã được xác nhận và đang được chuẩn bị giao đến bạn.
          </p>
          <div className="return-provider">
            {data?.provider === 'vnpay' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CreditCard size={18} /> Thanh toán qua VNPay</span> : data?.provider === 'payos' ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><CreditCard size={18} /> Thanh toán qua PayOS</span> : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Smartphone size={18} /> Thanh toán qua MoMo</span>}
          </div>
          <div className="return-actions">
            <Link to="/tra-cuu-don-hang" className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Search size={18} /> Theo dõi đơn hàng</Link>
            <Link to="/" className="btn btn-primary btn-lg" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShoppingCart size={18} /> Tiếp tục mua sắm</Link>
          </div>
        </div>
      </div>
    );
  }

  // Failed
  const failCode = searchParams.get('vnp_ResponseCode') || searchParams.get('resultCode');
  const isCancelled = failCode === '24' || failCode === '1006' || failCode === '1002';

  return (
    <div className="payment-return-page">
      <div className="return-card failed">
        <div className="return-icon">{isCancelled ? <XCircle size={48} color="#d32f2f" /> : <AlertTriangle size={48} color="#f57c00" />}</div>
        <h2>{isCancelled ? 'Giao dịch đã bị hủy' : 'Thanh toán thất bại'}</h2>
        <p className="return-message">{data?.message || 'Giao dịch không thành công. Vui lòng thử lại.'}</p>
        {failCode && (
          <div className="return-error-code">Mã lỗi: {failCode}</div>
        )}
        <div className="return-actions">
          <Link to="/gio-hang" className="btn btn-outline">← Quay lại giỏ hàng</Link>
          <Link to="/thanh-toan" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><RefreshCw size={18} /> Thử lại</Link>
        </div>
      </div>
    </div>
  );
}
