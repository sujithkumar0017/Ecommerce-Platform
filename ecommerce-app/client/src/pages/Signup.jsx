import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { AUTH_PHOTO } from '../utils.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await signup(form);
      nav('/');
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
          <h2>Join the club. Shop smarter.</h2>
          <p>Create an account for faster checkout, order tracking and members-only offers.</p>
          <div className="auth-stats">
            <div><div className="n">Free</div><div className="l">To join</div></div>
            <div><div className="n">10%</div><div className="l">Off first order</div></div>
            <div><div className="n">Secure</div><div className="l">Checkout</div></div>
          </div>
        </div>
      </aside>

      <div className="auth-form-side reveal-r">
        <div className="auth-inner">
          <h1>Create your account</h1>
          <p className="muted" style={{ marginTop: -6 }}>It only takes a minute.</p>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={submit} className="card">
            <div className="field">
              <label>Full name</label>
              <input value={form.name} required onChange={set('name')} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} required onChange={set('email')} />
            </div>
            <div className="field">
              <label>Phone</label>
              <input value={form.phone} onChange={set('phone')} />
            </div>
            <div className="field">
              <label>Password (min 6 chars)</label>
              <input type="password" value={form.password} required minLength={6} onChange={set('password')} />
            </div>
            <button className="btn btn-block" disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
          </form>
          <p className="center spacer">Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}
