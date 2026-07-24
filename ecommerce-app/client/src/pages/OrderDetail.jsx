import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, fmtDate } from '../utils.jsx';

export default function OrderDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const justPlaced = params.get('justPlaced') === '1';

  const [order, setOrder] = useState(null);
  const [track, setTrack] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const d = await api.get(`/orders/${id}`);
    setOrder(d.order);
    if (['shipped', 'delivered'].includes(d.order.status)) {
      api.get(`/orders/${id}/track`).then(setTrack).catch(() => {});
    }
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, [id]);

  if (error) return <div className="container"><div className="alert alert-error">{error}</div></div>;
  if (!order) return <div className="container">Loading…</div>;

  async function pay() {
    setBusy(true); setError(''); setMsg('');
    try { await api.post(`/orders/${id}/pay`); await load(); setMsg('Payment successful!'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!confirm('Cancel this order?')) return;
    setBusy(true); setError(''); setMsg('');
    try { await api.post(`/orders/${id}/cancel`); await load(); setMsg('Order cancelled.'); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const canPay = order.payment_status === 'unpaid' && order.status !== 'cancelled';
  const canCancel = !['shipped', 'delivered', 'cancelled'].includes(order.status);

  return (
    <div className="container">
      {justPlaced && <div className="alert alert-success">Order placed! Complete the mock payment below.</div>}
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="between">
        <h1 style={{ marginBottom: 0 }}>{order.order_number}</h1>
        <span className={`status status-${order.status}`} style={{ fontSize: 18 }}>{order.status}</span>
      </div>
      <p className="muted">Placed {fmtDate(order.placed_at)}</p>

      <div className="checkout-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Items</h2>
          <table>
            <thead><tr><th>Product</th><th>SKU</th><th>Price paid</th><th>Qty</th><th>Total</th></tr></thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.product_name}<div className="muted">{it.variant_name}</div></td>
                  <td className="muted">{it.sku}</td>
                  <td>{money(it.unit_price)}</td>
                  <td>{it.quantity}</td>
                  <td>{money(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="spacer" />
          <h2>Delivery address</h2>
          <p className="muted">
            {order.ship_recipient}<br />
            {order.ship_line1}{order.ship_line2 ? `, ${order.ship_line2}` : ''}<br />
            {order.ship_city}, {order.ship_state} {order.ship_postal}<br />
            {order.ship_country} · {order.ship_phone}
          </p>

          {track && (
            <>
              <h2>Tracking</h2>
              {track.tracking?.number
                ? <p>{track.tracking.carrier} · <strong>{track.tracking.number}</strong></p>
                : <p className="muted">Tracking details will appear once shipped.</p>}
              <ul className="timeline">
                {track.timeline.map((t) => (
                  <li key={t.step}><span className="status" style={{ textTransform: 'capitalize' }}>{t.step}</span>
                    <div className="muted">{fmtDate(t.at)}</div></li>
                ))}
              </ul>
            </>
          )}
        </section>

        <aside className="card">
          <h2 style={{ marginTop: 0 }}>Summary</h2>
          <div className="summary-row"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
          <div className="summary-row"><span>Discount</span><span>−{money(order.discount)}</span></div>
          <div className="summary-row"><span>Tax</span><span>{money(order.tax)}</span></div>
          <div className="summary-row"><span>Shipping</span><span>{order.shipping_fee === 0 ? 'Free' : money(order.shipping_fee)}</span></div>
          <div className="summary-row summary-total"><span>Total</span><span>{money(order.total)}</span></div>
          <div className="summary-row"><span>Payment</span>
            <span className={order.payment_status === 'paid' ? 'status-delivered status' : 'status-placed status'}>
              {order.payment_status}</span></div>

          <div className="spacer" />
          {canPay && <button className="btn btn-block" onClick={pay} disabled={busy}>Pay now (mock)</button>}
          {canCancel && <button className="btn btn-block btn-danger spacer" onClick={cancel} disabled={busy}>Cancel order</button>}
          {order.status === 'shipped' && <div className="alert alert-info spacer">Shipped — this order can no longer be cancelled.</div>}
          <div className="spacer" />
          <Link to="/orders">← Back to orders</Link>
        </aside>
      </div>
    </div>
  );
}
