import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';

import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductEdit from './pages/ProductEdit.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import CustomerTrace from './pages/CustomerTrace.jsx';
import ProductTrace from './pages/ProductTrace.jsx';
import RecordsSearch from './pages/RecordsSearch.jsx';

function Shell({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const link = ({ isActive }) => (isActive ? 'active' : '');
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="logo">ShopKart <span style={{ color: '#5eead4' }}>Admin</span></div>
        <NavLink to="/" end className={link}>Dashboard</NavLink>
        <NavLink to="/products" className={link}>Products & Inventory</NavLink>
        <NavLink to="/orders" className={link}>Orders</NavLink>
        <div style={{ margin: '14px 8px 6px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', opacity: .5 }}>Traceability</div>
        <NavLink to="/trace/customers" className={link}>Customer → Purchases</NavLink>
        <NavLink to="/trace/products" className={link}>Product → Buyers</NavLink>
        <NavLink to="/trace/records" className={link}>Combined Search + CSV</NavLink>
        <div style={{ position: 'absolute', bottom: 18, fontSize: 13 }}>
          <div className="muted" style={{ color: '#93a3b5' }}>{user?.email}</div>
          <button className="link-btn" style={{ color: '#5eead4' }}
            onClick={() => { logout(); nav('/login'); }}>Log out</button>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40 }}>Loading…</div>;
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProductEdit />} />
        <Route path="/products/:id" element={<ProductEdit />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/trace/customers" element={<CustomerTrace />} />
        <Route path="/trace/products" element={<ProductTrace />} />
        <Route path="/trace/records" element={<RecordsSearch />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="*" element={<div><h1>404</h1></div>} />
      </Routes>
    </Shell>
  );
}
