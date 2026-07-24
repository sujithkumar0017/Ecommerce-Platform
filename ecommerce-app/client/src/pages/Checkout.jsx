import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useCart } from '../context/CartContext.jsx';
import { money } from '../utils.jsx';
import AddressForm from '../components/AddressForm.jsx';

export default function Checkout() {
  const { cart, refresh, coupon, setCart } = useCart();
  const nav = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [placing, setPlacing] = useState(false);

  async function loadAddresses() {
    const d = await api.get('/addresses');
    setAddresses(d.addresses);
    const def = d.addresses.find((a) => a.is_default) || d.addresses[0];
    setSelected((s) => s || def?.id || null);
  }

  useEffect(() => { refresh(); loadAddresses().catch((e) => setError(e.message)); }, []);

  if (!cart) return <div className="container">Loading…</div>;
  if (cart.items.length === 0) {
    return <div className="container"><div className="card center">
      <p>Your cart is empty.</p><Link to="/products" className="btn">Shop</Link></div></div>;
  }

  async function placeOrder() {
    setError(''); setPlacing(true);
    try {
      const { order } = await api.post('/orders', { address_id: selected, coupon_code: coupon || null });
      setCart(null);
      nav(`/orders/${order.id}?justPlaced=1`);
    } catch (e) {
      setError(e.message);
    } finally { setPlacing(false); }
  }

  return (
    <div className="container checkout-2">
      <section>
        <h1>Checkout</h1>
        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <div className="between">
            <h2 style={{ marginTop: 0 }}>Delivery address</h2>
            <button className="btn btn-sm btn-ghost" onClick={() => setAdding((v) => !v)}>
              {adding ? 'Cancel' : '+ New address'}
            </button>
          </div>

          {adding && (
            <AddressForm onSaved={async () => { setAdding(false); await loadAddresses(); }} />
          )}

          {addresses.length === 0 && !adding && <p className="muted">Add an address to continue.</p>}

          {addresses.map((a) => (
            <label key={a.id} className="row" style={{ alignItems: 'flex-start', padding: '10px 0', borderTop: '1px solid var(--line)' }}>
              <input type="radio" name="addr" style={{ width: 'auto', marginTop: 4 }}
                checked={selected === a.id} onChange={() => setSelected(a.id)} />
              <div>
                <strong>{a.recipient_name}</strong> {a.is_default && <span className="badge stock">Default</span>}
                <div className="muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postal_code}</div>
                <div className="muted">{a.phone}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <aside className="card">
        <h2 style={{ marginTop: 0 }}>Order summary</h2>
        {cart.items.map((it) => (
          <div key={it.cart_item_id} className="summary-row">
            <span>{it.product_name} <span className="muted">×{it.quantity}</span></span>
            <span>{money(it.unit_price * it.quantity)}</span>
          </div>
        ))}
        <div className="summary-row" style={{ borderTop: '1px solid var(--line)', marginTop: 6 }}>
          <span>Subtotal</span><span>{money(cart.subtotal)}</span></div>
        <div className="summary-row"><span>Discount</span><span>−{money(cart.discount)}</span></div>
        <div className="summary-row"><span>Tax</span><span>{money(cart.tax)}</span></div>
        <div className="summary-row"><span>Shipping</span><span>{cart.shipping_fee === 0 ? 'Free' : money(cart.shipping_fee)}</span></div>
        <div className="summary-row summary-total"><span>Total</span><span>{money(cart.total)}</span></div>

        <div className="spacer" />
        <button className="btn btn-block" disabled={!selected || placing} onClick={placeOrder}>
          {placing ? 'Placing order…' : 'Place order'}
        </button>
        <p className="muted center spacer">You’ll pay on the next screen (mock payment).</p>
      </aside>
    </div>
  );
}
