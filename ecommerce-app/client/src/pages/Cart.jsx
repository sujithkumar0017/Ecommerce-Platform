import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { money } from '../utils.jsx';

export default function Cart() {
  const { user } = useAuth();
  const { cart, refresh, updateItem, removeItem, applyCoupon, removeCoupon, coupon } = useCart();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const nav = useNavigate();

  useEffect(() => { if (user) refresh(); }, [user, refresh]);

  if (!user) {
    return <div className="container"><div className="card center">
      <p>Please log in to view your cart.</p>
      <Link to="/login" className="btn">Log in</Link>
    </div></div>;
  }
  if (!cart) return <div className="container">Loading…</div>;

  if (cart.items.length === 0) {
    return <div className="container"><div className="card center">
      <h2>Your cart is empty</h2>
      <Link to="/products" className="btn">Start shopping</Link>
    </div></div>;
  }

  async function apply(e) {
    e.preventDefault();
    setError('');
    try { await applyCoupon(code); } catch (err) { setError(err.message); }
  }

  return (
    <div className="container checkout-2">
      <section>
        <h1>Your cart</h1>
        <div className="card">
          <table>
            <thead><tr><th>Product</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {cart.items.map((it) => (
                <tr key={it.cart_item_id}>
                  <td>
                    <div className="row">
                      <img src={it.image || 'https://placehold.co/80'} alt="" width="48" height="48"
                        style={{ borderRadius: 6, objectFit: 'cover' }} />
                      <div>
                        <Link to={`/products/${it.product_id}`}>{it.product_name}</Link>
                        <div className="muted">{it.variant_name}</div>
                      </div>
                    </div>
                  </td>
                  <td>{money(it.unit_price)}</td>
                  <td>
                    <input className="qty" type="number" min="1" max={it.stock} value={it.quantity}
                      onChange={(e) => updateItem(it.variant_id, Math.max(1, parseInt(e.target.value || '1', 10))).catch((err) => setError(err.message))} />
                  </td>
                  <td>{money(it.unit_price * it.quantity)}</td>
                  <td><button className="link-btn" onClick={() => removeItem(it.variant_id)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {error && <div className="alert alert-error spacer">{error}</div>}
      </section>

      <aside className="card">
        <h2 style={{ marginTop: 0 }}>Summary</h2>
        <div className="summary-row"><span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
        <div className="summary-row"><span>Discount</span><span>−{money(cart.discount)}</span></div>
        <div className="summary-row"><span>Tax (8%)</span><span>{money(cart.tax)}</span></div>
        <div className="summary-row"><span>Shipping</span><span>{cart.shipping_fee === 0 ? 'Free' : money(cart.shipping_fee)}</span></div>
        <div className="summary-row summary-total"><span>Total</span><span>{money(cart.total)}</span></div>

        <div className="spacer" />
        {cart.coupon ? (
          <div className="alert alert-success between">
            <span>Coupon <strong>{cart.coupon.code}</strong> applied</span>
            <button className="link-btn" onClick={removeCoupon}>Remove</button>
          </div>
        ) : (
          <form onSubmit={apply} className="row">
            <input placeholder="Coupon code" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn btn-sm" type="submit">Apply</button>
          </form>
        )}

        <div className="spacer" />
        <button className="btn btn-block" onClick={() => nav('/checkout')}>Proceed to checkout</button>
      </aside>
    </div>
  );
}
