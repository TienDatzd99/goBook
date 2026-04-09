import { useCart } from '../../context/CartContext';
import './ToastContainer.css';

export default function ToastContainer() {
  const { toasts } = useCart();
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast-item toast-${t.type}`}>
          <span className="toast-icon">
            {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
