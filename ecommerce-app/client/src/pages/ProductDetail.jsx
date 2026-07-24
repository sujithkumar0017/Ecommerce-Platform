import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';
import { money, Stars, fmtDate } from '../utils.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [variant, setVariant] = useState(null);
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  const [eligibility, setEligibility] = useState(null);

  async function load() {
    const d = await api.get(`/products/${id}`);
    setProduct(d.product);
    setVariant(d.product.variants.find((v) => v.stock > 0) || d.product.variants[0] || null);
  }

  useEffect(() => { load().catch((e) => setError(e.message)); }, [id]);

  useEffect(() => {
    if (user && product) {
      api.get(`/reviews/eligibility/${product.id}`).then(setEligibility).catch(() => setEligibility(null));
    }
  }, [user, product]);

  if (error) return <div className="container"><div className="alert alert-error">{error}</div></div>;
  if (!product) return <div className="container">Loading…</div>;

  async function handleAdd() {
    setError(''); setMsg(null);
    if (!user) return nav('/login', { state: { from: `/products/${id}` } });
    if (!variant) return;
    try {
      await addItem(variant.id, qty);
      setMsg('Added to cart.');
    } catch (e) { setError(e.message); }
  }

  const img = product.images[0]?.url || 'https://placehold.co/600x600?text=No+Image';

  return (
    <div className="container">
      <div className="layout-2 pdp-grid">
        <div>
          <img src={img} alt={product.name} style={{ width: '100%', borderRadius: 12, background: 'var(--surface-2)' }} />
          <div className="row wrap" style={{ marginTop: 10 }}>
            {product.images.map((im) => (
              <img key={im.id} src={im.url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--line)' }} />
            ))}
          </div>
        </div>

        <div>
          <div className="muted">{product.category}{product.brand ? ` · ${product.brand}` : ''}</div>
          <h1 style={{ marginTop: 4 }}>{product.name}</h1>
          <div className="row">
            <Stars value={product.avg_rating} />
            <span className="muted">{Number(product.avg_rating).toFixed(1)} · {product.review_count} review(s)</span>
          </div>
          <p>{product.description}</p>

          <div className="price" style={{ fontSize: 24, margin: '10px 0' }}>
            {variant ? money(variant.price) : money(product.base_price)}
          </div>

          <div className="field">
            <label>Choose option</label>
            <div className="row wrap">
              {product.variants.map((v) => (
                <button key={v.id}
                  className={`btn btn-sm ${variant?.id === v.id ? '' : 'btn-ghost'}`}
                  disabled={v.stock === 0}
                  onClick={() => setVariant(v)}
                  title={v.stock === 0 ? 'Out of stock' : ''}>
                  {v.variant_name}{v.stock === 0 ? ' (out)' : ''}
                </button>
              ))}
            </div>
          </div>

          {variant && (
            <div className="muted" style={{ marginBottom: 10 }}>
              SKU {variant.sku} · {variant.stock > 0 ? `${variant.stock} in stock` : 'Out of stock'}
            </div>
          )}

          {msg && <div className="alert alert-success">{msg} <a href="/cart">Go to cart →</a></div>}
          {error && <div className="alert alert-error">{error}</div>}

          <div className="row">
            <input className="qty" type="number" min="1" max={variant?.stock || 1} value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || '1', 10)))} />
            <button className="btn" onClick={handleAdd} disabled={!variant || variant.stock === 0}>
              Add to cart
            </button>
          </div>
        </div>
      </div>

      <div className="spacer" />
      <Reviews product={product} eligibility={eligibility} reload={async () => { await load(); const e = await api.get(`/reviews/eligibility/${product.id}`); setEligibility(e); }} />
    </div>
  );
}

function Reviews({ product, eligibility, reload }) {
  const { user } = useAuth();
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Customer reviews</h2>

      {user && eligibility && (
        <ReviewForm product={product} eligibility={eligibility} reload={reload} />
      )}
      {user && eligibility && !eligibility.has_delivered && !eligibility.review && (
        <div className="alert alert-info">You can review this product once you’ve received it in a delivered order.</div>
      )}

      {product.reviews.length === 0
        ? <p className="muted">No reviews yet.</p>
        : product.reviews.map((r) => (
          <div key={r.id} style={{ borderTop: '1px solid var(--line)', padding: '12px 0' }}>
            <div className="between">
              <strong>{r.author}</strong>
              <span className="muted">{fmtDate(r.created_at)}</span>
            </div>
            <Stars value={r.rating} />
            {r.title && <div style={{ fontWeight: 600 }}>{r.title}</div>}
            {r.body && <p style={{ margin: '4px 0 0' }}>{r.body}</p>}
          </div>
        ))}
    </div>
  );
}

function ReviewForm({ product, eligibility, reload }) {
  const existing = eligibility.review;
  const [rating, setRating] = useState(existing?.rating || 5);
  const [title, setTitle] = useState(existing?.title || '');
  const [body, setBody] = useState(existing?.body || '');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  const canWrite = eligibility.can_review;      // delivered + no review yet
  const canEdit = existing && eligibility.can_edit; // within edit window
  if (!canWrite && !canEdit) return null;

  async function submit(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      if (existing) {
        await api.put(`/reviews/${existing.id}`, { rating, title, body });
        setMsg('Review updated.');
      } else {
        await api.post('/reviews', { product_id: product.id, rating, title, body });
        setMsg('Thanks for your review!');
      }
      await reload();
    } catch (e) { setError(e.message); }
  }

  return (
    <form onSubmit={submit} style={{ background: 'var(--surface-2)', padding: 14, borderRadius: 10, marginBottom: 16 }}>
      <strong>{existing ? 'Edit your review' : 'Write a review'}</strong>
      {error && <div className="alert alert-error" style={{ marginTop: 8 }}>{error}</div>}
      {msg && <div className="alert alert-success" style={{ marginTop: 8 }}>{msg}</div>}
      <div className="field" style={{ marginTop: 8 }}>
        <label>Rating</label>
        <select style={{ width: 120 }} value={rating} onChange={(e) => setRating(Number(e.target.value))}>
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} ★</option>)}
        </select>
      </div>
      <div className="field">
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div className="field">
        <label>Review</label>
        <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </div>
      <button className="btn btn-sm">{existing ? 'Update review' : 'Submit review'}</button>
      {canEdit && <span className="muted" style={{ marginLeft: 10 }}>Editable for a short window after posting.</span>}
    </form>
  );
}
