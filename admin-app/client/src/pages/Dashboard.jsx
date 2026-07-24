import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { money, fmtDay } from '../utils.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.get('/reports/summary').then(setData).catch((e) => setError(e.message)); }, []);

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!data) return <p>Loading…</p>;

  const maxRev = Math.max(...data.revenue_by_day.map((d) => Number(d.revenue)), 1);
  const maxUnits = Math.max(...data.top_products.map((p) => p.units_sold), 1);

  return (
    <div>
      <div className="topbar"><h1>Dashboard</h1></div>

      <div className="stat-grid">
        <div className="stat"><div className="n">{money(data.totals.total_revenue)}</div><div className="l">Revenue (paid)</div></div>
        <div className="stat"><div className="n">{data.totals.total_orders}</div><div className="l">Total orders</div></div>
        <div className="stat"><div className="n">{data.totals.total_customers}</div><div className="l">Customers</div></div>
        <div className="stat"><div className="n">{data.totals.active_products}</div><div className="l">Active products</div></div>
        <div className="stat"><div className="n">{data.repeat_customers.repeat_rate_pct}%</div><div className="l">Repeat-customer rate</div></div>
      </div>

      <div className="spacer" />
      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Top-selling products</h2>
          {data.top_products.length === 0 ? <p className="muted">No sales yet.</p> : (
            <table>
              <thead><tr><th>Product</th><th>Units</th><th className="right">Revenue</th></tr></thead>
              <tbody>
                {data.top_products.map((p) => (
                  <tr key={p.product_id}>
                    <td>{p.product_name}
                      <div className="bar" style={{ width: `${(p.units_sold / maxUnits) * 100}%`, marginTop: 4 }} />
                    </td>
                    <td>{p.units_sold}</td>
                    <td className="right">{money(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Revenue by day</h2>
          {data.revenue_by_day.length === 0 ? <p className="muted">No revenue yet.</p> : (
            <table>
              <thead><tr><th>Day</th><th>Orders</th><th className="right">Revenue</th></tr></thead>
              <tbody>
                {data.revenue_by_day.map((d) => (
                  <tr key={d.day}>
                    <td>{fmtDay(d.day)}
                      <div className="bar" style={{ width: `${(Number(d.revenue) / maxRev) * 100}%`, marginTop: 4, background: 'var(--blue)' }} />
                    </td>
                    <td>{d.orders}</td>
                    <td className="right">{money(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted spacer">
            Repeat customers: {data.repeat_customers.repeat_customers} of {data.repeat_customers.customers_with_orders} who ordered.
          </p>
        </div>
      </div>
    </div>
  );
}
