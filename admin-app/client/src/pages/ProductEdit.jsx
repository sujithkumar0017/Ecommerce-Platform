import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { money } from '../utils.jsx';

const BLANK = { name: '', category: '', brand: '', base_price: '', description: '', image_url: '' };

export default function ProductEdit() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();

  const [form, setForm] = useState(BLANK);
  const [variants, setVariants] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function load() {
    const { product } = await api.get(`/products/${id}`);
    setForm({
      name: product.name, category: product.category, brand: product.brand || '',
      base_price: product.base_price, description: product.description || '', image_url: '',
    });
    setVariants(product.variants);
  }
  useEffect(() => { if (!isNew) load().catch((e) => setError(e.message)); }, [id]);

  async function saveProduct(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      if (isNew) {
        const { product } = await api.post('/products', { ...form, base_price: Number(form.base_price) || 0 });
        nav(`/products/${product.id}`);
      } else {
        await api.put(`/products/${id}`, { ...form, base_price: Number(form.base_price) || 0 });
        setMsg('Product saved.');
      }
    } catch (e) { setError(e.message); }
  }

  return (
    <div>
      <div className="topbar">
        <h1>{isNew ? 'New product' : `Edit: ${form.name}`}</h1>
        <button className="btn-ghost btn btn-sm" onClick={() => nav('/products')}>← Back</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      {msg && <div className="alert alert-success">{msg}</div>}

      <div className="grid-2">
        <form className="card" onSubmit={saveProduct}>
          <h2 style={{ marginTop: 0 }}>Details</h2>
          <div className="field"><label>Name *</label><input value={form.name} required onChange={set('name')} /></div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}><label>Category *</label><input value={form.category} required onChange={set('category')} /></div>
            <div className="field" style={{ flex: 1 }}><label>Brand</label><input value={form.brand} onChange={set('brand')} /></div>
          </div>
          <div className="field"><label>Base price</label><input type="number" step="0.01" value={form.base_price} onChange={set('base_price')} /></div>
          <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={set('description')} /></div>
          {isNew && <div className="field"><label>Image URL</label><input value={form.image_url} onChange={set('image_url')} placeholder="https://…" /></div>}
          <button className="btn">{isNew ? 'Create product' : 'Save changes'}</button>
          {isNew && <p className="muted spacer">Add variants/SKUs after creating the product.</p>}
        </form>

        {!isNew && <Variants productId={id} variants={variants} reload={load} />}
      </div>
    </div>
  );
}

function Variants({ productId, variants, reload }) {
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ sku: '', variant_name: '', price: '', stock: '' });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function addVariant(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/products/${productId}/variants`, {
        sku: form.sku, variant_name: form.variant_name || 'Default',
        price: Number(form.price), stock: Number(form.stock) || 0,
      });
      setForm({ sku: '', variant_name: '', price: '', stock: '' });
      setAdding(false); reload();
    } catch (e) { setError(e.message); }
  }

  async function setStock(variantId, value) {
    await api.patch(`/products/variants/${variantId}/stock`, { stock: Number(value) });
    reload();
  }
  async function adjust(variantId, delta) {
    await api.patch(`/products/variants/${variantId}/stock`, { delta });
    reload();
  }
  async function toggleActive(v) {
    await api.put(`/products/variants/${v.id}`, { is_active: !v.is_active });
    reload();
  }

  return (
    <div className="card">
      <div className="between">
        <h2 style={{ marginTop: 0 }}>Variants & stock (SKU)</h2>
        <button className="btn btn-sm btn-ghost" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Add SKU'}</button>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      {adding && (
        <form onSubmit={addVariant} style={{ background: '#f7f9fb', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <div className="row">
            <div className="field" style={{ flex: 1 }}><label>SKU *</label><input value={form.sku} required onChange={set('sku')} /></div>
            <div className="field" style={{ flex: 1 }}><label>Variant name</label><input value={form.variant_name} onChange={set('variant_name')} placeholder="e.g. M / Black" /></div>
          </div>
          <div className="row">
            <div className="field" style={{ flex: 1 }}><label>Price *</label><input type="number" step="0.01" value={form.price} required onChange={set('price')} /></div>
            <div className="field" style={{ flex: 1 }}><label>Stock</label><input type="number" value={form.stock} onChange={set('stock')} /></div>
          </div>
          <button className="btn btn-sm">Add SKU</button>
        </form>
      )}

      <div className="table-wrap">
        <table>
          <thead><tr><th>SKU</th><th>Variant</th><th>Price</th><th>Stock</th><th></th></tr></thead>
          <tbody>
            {variants.map((v) => (
              <tr key={v.id} style={{ opacity: v.is_active ? 1 : .5 }}>
                <td>{v.sku}</td>
                <td>{v.variant_name}</td>
                <td>{money(v.price)}</td>
                <td>
                  <div className="row">
                    <button className="btn btn-sm btn-ghost" onClick={() => adjust(v.id, -1)}>−</button>
                    <input style={{ width: 64 }} type="number" defaultValue={v.stock}
                      onBlur={(e) => setStock(v.id, e.target.value)} key={v.stock} />
                    <button className="btn btn-sm btn-ghost" onClick={() => adjust(v.id, 1)}>+</button>
                  </div>
                </td>
                <td><button className="link-btn" onClick={() => toggleActive(v)}>{v.is_active ? 'Deactivate' : 'Activate'}</button></td>
              </tr>
            ))}
            {variants.length === 0 && <tr><td colSpan="5" className="muted">No variants yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
