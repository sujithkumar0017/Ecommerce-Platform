import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { AUTH_PHOTO } from '../utils.jsx';

export default function Login() {
  const { login } = useAuth();
  const { refresh } = useCart();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await login(form.email, form.password);
      await refresh();
      nav(loc.state?.from || '/');
    } catch (err) {
      setError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="auth-split">
      <aside className="auth-visual reveal-l">
        <span className="auth-bg" style={{ backgroundImage: `url(${AUTH_PHOTO})` }} aria-hidden="true" />
        <Link to="/" className="brand auth-brand" style={{ color: '#fff' }}><span className="dot" aria-hidden="true" />ShopKart</Link>
        <div className="auth-copy">
          <h2>Welcome back to the good stuff.</h2>
          <p>Log in to track orders, save favourites and check out in seconds.</p>
          <div className="auth-stats">
            <div><div className="n">10k+</div><div className="l">Happy shoppers</div></div>
            <div><div className="n">4.9★</div><div className="l">Average rating</div></div>
            <div><div className="n">2-day</div><div className="l">Delivery</div></div>
          </div>
        </div>
      </aside>

      <div className="auth-form-side reveal-r">
        <div className="auth-inner">
          <h1>Log in</h1>
          <p className="muted" style={{ marginTop: -6 }}>Enter your details to continue.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit} className="card">
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} required
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} required
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="btn btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
          </form>
          <p className="center spacer">No account? <Link to="/signup">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
}
