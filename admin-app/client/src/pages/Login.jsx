import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(form.email, form.password); nav('/'); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <div className="card" style={{ width: 360 }}>
        <h1 style={{ marginBottom: 4 }}>ShopKart Admin</h1>
        <p className="muted" style={{ marginTop: 0 }}>Internal dashboard — admins only.</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={submit}>
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
          <button className="btn" style={{ width: '100%' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="muted spacer">Seeded admin: admin@shopkart.local / admin123</p>
      </div>
    </div>
  );
}
