import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, fmtDate, StatusBadge } from '../utils.jsx';

const STATUSES = ['placed', 'paid', 'packed', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    try { setOrders((await api.get(`/orders?${params}`)).orders); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [status]);

  return (
    <div>
      <div className="topbar"><h1>Orders</h1></div>

      <div className="card">
        <form className="row wrap" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input style={{ maxWidth: 300 }} placeholder="Search order #, customer name/email…"
            value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-sm" type="submit">Search</button>
          <select style={{ maxWidth: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link to={`/orders/${o.id}`}>{o.order_number}</Link></td>
                <td>{o.customer_name}<div className="muted">{o.customer_email}</div></td>
                <td>{fmtDate(o.placed_at)}</td>
                <td>{o.item_count}</td>
                <td>{money(o.total)}</td>
                <td>{o.payment_status === 'paid' ? <span className="badge s-delivered">paid</span> : <span className="badge s-placed">unpaid</span>}</td>
                <td><StatusBadge status={o.status} /></td>
                <td><Link to={`/orders/${o.id}`}>Manage →</Link></td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan="8" className="muted">No orders.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
