import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, fmtDate } from '../utils.jsx';

export default function Orders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => { api.get('/orders').then((d) => setOrders(d.orders)); }, []);

  if (!orders) return <div className="container">Loading…</div>;
  if (orders.length === 0) {
    return <div className="container"><div className="card center">
      <h2>No orders yet</h2><Link to="/products" className="btn">Start shopping</Link></div></div>;
  }

  return (
    <div className="container">
      <h1>Your orders</h1>
      <div className="card">
        <table>
          <thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><strong>{o.order_number}</strong></td>
                <td>{fmtDate(o.placed_at)}</td>
                <td>{o.item_count}</td>
                <td>{money(o.total)}</td>
                <td><span className={`status status-${o.status}`}>{o.status}</span></td>
                <td><Link to={`/orders/${o.id}`}>View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
