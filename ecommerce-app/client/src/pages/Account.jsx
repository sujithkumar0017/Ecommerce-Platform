import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import AddressForm from '../components/AddressForm.jsx';

export default function Account() {
  const { user, setUser } = useAuth();
  const [tab, setTab] = useState('profile');

  return (
    <div className="container">
      <h1>My account</h1>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className={`btn btn-sm ${tab === 'profile' ? '' : 'btn-ghost'}`} onClick={() => setTab('profile')}>Profile</button>
        <button className={`btn btn-sm ${tab === 'addresses' ? '' : 'btn-ghost'}`} onClick={() => setTab('addresses')}>Addresses</button>
      </div>
      {tab === 'profile' ? <Profile user={user} setUser={setUser} /> : <Addresses />}
    </div>
  );
}

function Profile({ user, setUser }) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  async function save(e) {
    e.preventDefault();
    setMsg(''); setError('');
    try {
      const d = await api.put('/profile', form);
      setUser(d.user);
      setMsg('Profile updated.');
    } catch (err) { setError(err.message); }
  }

  return (
    <form onSubmit={save} className="card" style={{ maxWidth: 460 }}>
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="field"><label>Email</label><input value={user.email} disabled /></div>
      <div className="field"><label>Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      <button className="btn">Save changes</button>
    </form>
  );
}

function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);

  async function load() { setAddresses((await api.get('/addresses')).addresses); }
  useEffect(() => { load(); }, []);

  async function makeDefault(id) { await api.put(`/addresses/${id}/default`); load(); }
  async function remove(id) { if (confirm('Delete this address?')) { await api.del(`/addresses/${id}`); load(); } }

  return (
    <div className="card">
      <div className="between">
        <h2 style={{ marginTop: 0 }}>Saved addresses</h2>
        <button className="btn btn-sm btn-ghost" onClick={() => { setAdding(!adding); setEditing(null); }}>
          {adding ? 'Cancel' : '+ Add address'}
        </button>
      </div>

      {adding && <AddressForm onSaved={() => { setAdding(false); load(); }} onCancel={() => setAdding(false)} />}

      {addresses.length === 0 && !adding && <p className="muted">No saved addresses.</p>}

      {addresses.map((a) => (
        <div key={a.id} style={{ borderTop: '1px solid var(--line)', padding: '12px 0' }}>
          {editing === a.id ? (
            <AddressForm initial={a} onSaved={() => { setEditing(null); load(); }} onCancel={() => setEditing(null)} />
          ) : (
            <div className="between">
              <div>
                <strong>{a.recipient_name}</strong> {a.is_default && <span className="badge stock">Default</span>}
                {a.label && <span className="muted"> · {a.label}</span>}
                <div className="muted">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postal_code}</div>
                <div className="muted">{a.phone}</div>
              </div>
              <div className="row">
                {!a.is_default && <button className="link-btn" onClick={() => makeDefault(a.id)}>Set default</button>}
                <button className="link-btn" onClick={() => setEditing(a.id)}>Edit</button>
                <button className="link-btn" style={{ color: 'var(--red)' }} onClick={() => remove(a.id)}>Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
