import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money, fmtDate, StatusBadge } from '../utils.jsx';

// Product -> every customer who ever bought it (traced through orders).
export default function ProductTrace() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  async function search(e) {
    e?.preventDefault();
    setError(''); setData(null); setSelected(null);
    try { setResults((await api.get(`/trace/products?q=${encodeURIComponent(q)}`)).products); }
    catch (e) { setError(e.message); }
  }
  async function pick(p) {
    setSelected(p); setError('');
    try { setData(await api.get(`/trace/products/${p.id}/buyers`)); }
    catch (e) { setError(e.message); }
  }

  const unitsSold = data?.buyers
    ?.filter((b) => b.order_status !== 'cancelled')
    .reduce((s, b) => s + b.quantity, 0) || 0;
  const uniqueBuyers = new Set(data?.buyers?.map((b) => b.customer_id)).size;

  return (
    <div>
      <div className="topbar">
        <h1>Product → Buyers</h1>
        <Link to="/trace/customers" className="btn btn-ghost btn-sm">Flip: Customer → Purchases ⇄</Link>
      </div>
      <p className="muted" style={{ marginTop: -8 }}>
        Search a product, then see every customer who bought it — traced through their actual orders.
      </p>

      <div className="card">
        <form className="row" onSubmit={search}>
          <input placeholder="Search by product name, SKU, or product ID…" value={q}
            onChange={(e) => setQ(e.target.value)} autoFocus />
          <button className="btn btn-sm" type="submit">Search</button>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {results.length > 0 && !selected && (
        <div className="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Product</th><th>Category</th><th>Brand</th><th></th></tr></thead>
            <tbody>
              {results.map((p) => (
                <tr key={p.id}>
                  <td>#{p.id}</td><td>{p.name}</td><td>{p.category}</td><td>{p.brand || '—'}</td>
                  <td><button className="link-btn" onClick={() => pick(p)}>View buyers →</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {results.length === 0 && q && !selected && !error && <p className="muted">No products found.</p>}

      {selected && data && (
        <div>
          <div className="card between">
            <div>
              <h2 style={{ margin: 0 }}>{data.product.name}</h2>
              <div className="muted">{data.product.category}{data.product.brand ? ` · ${data.product.brand}` : ''} · Product #{data.product.id}</div>
            </div>
            <div className="right">
              <div><span className="chip">{unitsSold} units sold</span><span className="chip">{uniqueBuyers} buyers</span></div>
              <button className="link-btn" onClick={() => { setSelected(null); setData(null); }}>← Back to results</button>
            </div>
          </div>

          {data.buyers.length === 0 ? <p className="muted">No one has bought this product yet.</p> : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Customer</th><th>Email</th><th>Phone</th><th>SKU</th><th>Price paid</th><th>Qty</th><th>Order</th><th>Status</th><th>Purchased</th></tr>
                </thead>
                <tbody>
                  {data.buyers.map((b) => (
                    <tr key={b.order_id + '-' + b.sku + '-' + b.customer_id}>
                      <td><Link to="/trace/customers">{b.customer_name}</Link></td>
                      <td>{b.customer_email}</td>
                      <td>{b.customer_phone || '—'}</td>
                      <td>{b.sku}<div className="muted">{b.variant_name}</div></td>
                      <td>{money(b.unit_price)}</td>
                      <td>{b.quantity}</td>
                      <td><Link to={`/orders/${b.order_id}`}>{b.order_number}</Link></td>
                      <td><StatusBadge status={b.order_status} /></td>
                      <td className="muted">{fmtDate(b.placed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
