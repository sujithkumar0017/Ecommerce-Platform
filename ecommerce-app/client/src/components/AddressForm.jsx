import { useState } from 'react';
import { api } from '../api.js';

const EMPTY = {
  label: '', recipient_name: '', phone: '', line1: '', line2: '',
  city: '', state: '', postal_code: '', country: 'India', is_default: false,
};

export default function AddressForm({ initial, onSaved, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      if (initial?.id) await api.put(`/addresses/${initial.id}`, form);
      else await api.post('/addresses', form);
      onSaved?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 10, margin: '10px 0' }}>
      {error && <div className="alert alert-error">{error}</div>}
      <div className="field"><label>Label (Home/Work)</label><input value={form.label} onChange={set('label')} /></div>
      <div className="field"><label>Recipient name *</label><input value={form.recipient_name} required onChange={set('recipient_name')} /></div>
      <div className="field"><label>Phone *</label><input value={form.phone} required onChange={set('phone')} /></div>
      <div className="field"><label>Address line 1 *</label><input value={form.line1} required onChange={set('line1')} /></div>
      <div className="field"><label>Address line 2</label><input value={form.line2} onChange={set('line2')} /></div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}><label>City *</label><input value={form.city} required onChange={set('city')} /></div>
        <div className="field" style={{ flex: 1 }}><label>State *</label><input value={form.state} required onChange={set('state')} /></div>
      </div>
      <div className="row">
        <div className="field" style={{ flex: 1 }}><label>Postal code *</label><input value={form.postal_code} required onChange={set('postal_code')} /></div>
        <div className="field" style={{ flex: 1 }}><label>Country</label><input value={form.country} onChange={set('country')} /></div>
      </div>
      <label className="row" style={{ fontWeight: 400 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={form.is_default} onChange={set('is_default')} />
        Set as default address
      </label>
      <div className="row spacer">
        <button className="btn btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
        {onCancel && <button type="button" className="btn btn-sm btn-ghost" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
