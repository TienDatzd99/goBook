import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('gocart_items');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  useEffect(() => {
    localStorage.setItem('gocart_items', JSON.stringify(items));
  }, [items]);

  const [isOpen, setIsOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  const addItem = useCallback((product, quantity = 1) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) {
        return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + quantity } : i);
      }
      return [...prev, { ...product, quantity }];
    });
    addToast(`Đã thêm "${product.name}" vào giỏ hàng!`, 'success');
    setIsOpen(true);
  }, [addToast]);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const removeItems = useCallback((ids) => {
    setItems(prev => prev.filter(i => !ids.includes(i.id)));
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    if (quantity <= 0) { removeItem(id); return; }
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);
  const FREE_SHIPPING_THRESHOLD = parseInt(import.meta.env.VITE_FREE_SHIPPING_THRESHOLD || '300000', 10);
  const DEFAULT_SHIPPING_FEE = parseInt(import.meta.env.VITE_DEFAULT_SHIPPING_FEE || '30000', 10);
  const freeShipThreshold = FREE_SHIPPING_THRESHOLD;
  const shippingFee = total >= freeShipThreshold ? 0 : DEFAULT_SHIPPING_FEE;
  const grandTotal = total + shippingFee;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, removeItems, updateQuantity, clearCart,
      isOpen, setIsOpen, total, count, shippingFee, grandTotal,
      freeShipThreshold, toasts, addToast
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};
