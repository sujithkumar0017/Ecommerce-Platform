import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from './AuthContext.jsx';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(null);
  const [coupon, setCoupon] = useState('');

  const refresh = useCallback(async () => {
    if (!user) { setCart(null); return; }
    const q = coupon ? `?coupon=${encodeURIComponent(coupon)}` : '';
    const data = await api.get(`/cart${q}`);
    setCart(data);
  }, [user, coupon]);

  async function addItem(variant_id, quantity = 1) {
    const data = await api.post('/cart/items', { variant_id, quantity });
    setCart(data);
    return data;
  }
  async function updateItem(variant_id, quantity) {
    setCart(await api.put(`/cart/items/${variant_id}`, { quantity }));
  }
  async function removeItem(variant_id) {
    setCart(await api.del(`/cart/items/${variant_id}`));
  }
  async function applyCoupon(code) {
    const data = await api.post('/cart/coupon', { code });
    setCoupon(code);
    setCart(data);
  }
  function removeCoupon() {
    setCoupon('');
    refresh();
  }

  const count = cart?.items?.reduce((s, it) => s + it.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{ cart, count, coupon, refresh, addItem, updateItem, removeItem, applyCoupon, removeCoupon, setCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
