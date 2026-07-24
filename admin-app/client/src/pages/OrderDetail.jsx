import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, fmtDate, StatusBadge } from '../utils.jsx';

// Which next statuses the admin can set from the current one.
const NEXT = {
  paid: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
};

export default function OrderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');

  async function load() {
    const { order } = await api.get(`/orders/${id}`);
    setOrder(order);
    setCarrier(order.tracking_carrier || '');
    setTracking(order.tracking_number || '');
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, [id]);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!order) return <p>Loading…</p>;

  async function setStatus(status) {
    setError(''); setMsg('');
    try {
      await api.patch(`/orders/${id}/status`, {
        status,
        tracking_carrier: carrier || null,
        tracking_number: tracking || null,
      });
      await load();
      setMsg(`Order marked as ${status}.`);
    } catch (e) { setError(e.message); }
  }

  const nextOptions = NEXT[order.status] || [];

  return (
    <div>
      <div className="topbar">
        <h1>{order.order_number} <StatusBadge status={order.status} /></h1>
        <button className="btn-ghost btn btn-sm" onClick={() => nav('/orders')}>← Orders</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Items</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Product</th><th>SKU</th><th>Price paid</th><th>Qty</th><th className="right">Total</th></tr></thead>
              <tbody>
                {order.items.map((it) => (
                  <tr key={it.id}>
                    <td>{it.product_name}<div className="muted">{it.variant_name}</div></td>
                    <td>{it.sku}</td>
                    <td>{money(it.unit_price)}</td>
                    <td>{it.quantity}</td>
                    <td className="right">{money(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="spacer" />
          <div className="between"><span className="muted">Subtotal</span><span>{money(order.subtotal)}</span></div>
          <div className="between"><span className="muted">Discount</span><span>−{money(order.discount)}</span></div>
          <div className="between"><span className="muted">Tax</span><span>{money(order.tax)}</span></div>
          <div className="between"><span className="muted">Shipping</span><span>{money(order.shipping_fee)}</span></div>
          <div className="between" style={{ fontWeight: 800, fontSize: 16, marginTop: 6 }}><span>Total</span><span>{money(order.total)}</span></div>
        </div>

        <div>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Customer</h2>
            <div><strong>{order.customer_name}</strong></div>
            <div className="muted">{order.customer_email} · {order.customer_phone || '—'}</div>
            <p className="muted" style={{ marginBottom: 0 }}>
              Ship to: {order.ship_recipient}, {order.ship_line1}{order.ship_line2 ? `, ${order.ship_line2}` : ''},
              {' '}{order.ship_city}, {order.ship_state} {order.ship_postal}
            </p>
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Fulfillment</h2>
            <p className="muted">Payment: {order.payment_status} · Placed {fmtDate(order.placed_at)}</p>

            <div className="field"><label>Tracking carrier</label>
              <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. BlueDart" /></div>
            <div className="field"><label>Tracking number</label>
              <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="e.g. BD123456789" /></div>

            {nextOptions.length === 0 ? (
              <div className="alert alert-info">No further status changes available for a {order.status} order.</div>
            ) : (
              <div className="row wrap">
                {nextOptions.map((s) => (
                  <button key={s}
                    className={`btn btn-sm ${s === 'cancelled' ? 'btn-danger' : s === 'delivered' ? '' : 'btn-blue'}`}
                    onClick={() => setStatus(s)}>
                    Mark {s}
                  </button>
                ))}
              </div>
            )}
            {order.status === 'placed' && <p className="muted spacer">Waiting for customer payment before fulfillment.</p>}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Timeline</h2>
            <ul className="timeline" style={{ listStyle: 'none', paddingLeft: 0 }}>
              {[['Placed', order.placed_at], ['Paid', order.paid_at], ['Packed', order.packed_at],
                ['Shipped', order.shipped_at], ['Delivered', order.delivered_at], ['Cancelled', order.cancelled_at]]
                .filter(([, at]) => at)
                .map(([label, at]) => (
                  <li key={label} className="between" style={{ padding: '4px 0' }}>
                    <span>{label}</span><span className="muted">{fmtDate(at)}</span>
                  </li>
                ))}
            </ul>
            <Link to={`/trace/customers`} className="link-btn">View this customer’s full purchase history →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
