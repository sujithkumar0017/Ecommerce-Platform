import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money } from '../utils.jsx';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (includeArchived) params.set('include_archived', 'true');
    try { setProducts((await api.get(`/products?${params}`)).products); }
    catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, [includeArchived]);

  async function toggleArchive(p) {
    await api.patch(`/products/${p.id}/archive`, { archived: !p.is_archived });
    load();
  }

  return (
    <div>
      <div className="topbar">
        <h1>Products & Inventory</h1>
        <Link to="/products/new" className="btn">+ New product</Link>
      </div>

      <div className="card">
        <form className="row" onSubmit={(e) => { e.preventDefault(); load(); }}>
          <input placeholder="Search name or brand…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-sm" type="submit">Search</button>
          <label className="row" style={{ whiteSpace: 'nowrap', marginBottom: 0 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)} /> Show archived
          </label>
        </form>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Product</th><th>Category</th><th>Brand</th><th>Base price</th><th>Variants</th><th>Total stock</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/products/${p.id}`}>{p.name}</Link></td>
                <td>{p.category}</td>
                <td>{p.brand || '—'}</td>
                <td>{money(p.base_price)}</td>
                <td>{p.variant_count}</td>
                <td>{p.total_stock === 0 ? <span className="badge s-cancelled">0</span> : p.total_stock}</td>
                <td>{p.is_archived ? <span className="badge archived">archived</span> : <span className="badge s-delivered">active</span>}</td>
                <td className="row">
                  <Link className="link-btn" to={`/products/${p.id}`}>Edit</Link>
                  <button className="link-btn" onClick={() => toggleArchive(p)}>
                    {p.is_archived ? 'Restore' : 'Archive'}
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && <tr><td colSpan="8" className="muted">No products.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
