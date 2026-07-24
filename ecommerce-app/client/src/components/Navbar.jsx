import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import Icon from './Icon.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const [q, setQ] = useState('');
  const nav = useNavigate();

  function search(e) {
    e.preventDefault();
    nav(`/products?q=${encodeURIComponent(q)}`);
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link to="/" className="brand"><span className="dot" aria-hidden="true" />ShopKart</Link>
        <form className="nav-search" onSubmit={search} role="search">
          <input placeholder="Search products…" aria-label="Search products"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
        <div className="nav-links">
          <Link to="/products">Shop</Link>
          <Link to="/cart" className="nav-cart" aria-label={`Cart, ${count} items`}>
            <Icon name="cart" size={18} />
            <span className="hide-sm">Cart</span>
            {count > 0 && <span className="nav-count">{count}</span>}
          </Link>
          {user ? (
            <>
              <Link to="/orders">Orders</Link>
              <Link to="/account"><Icon name="user" size={18} />{user.name.split(' ')[0]}</Link>
              <button className="btn btn-sm btn-ghost" onClick={() => { logout(); nav('/'); }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/signup" className="btn btn-sm">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
