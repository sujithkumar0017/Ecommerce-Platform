import { Link } from 'react-router-dom';
import { money, Stars } from '../utils.jsx';

export default function ProductCard({ p }) {
  const inStock = Number(p.total_stock) > 0;
  const priceLabel =
    p.min_price === p.max_price ? money(p.min_price) : `${money(p.min_price)} – ${money(p.max_price)}`;
  return (
    <Link to={`/products/${p.id}`} className="product-card">
      <div className="media">
        <img src={p.image || 'https://placehold.co/600x600?text=No+Image'} alt={p.name} loading="lazy" />
      </div>
      <div className="body">
        <div className="eyebrow">{p.category}</div>
        <div className="name">{p.name}</div>
        <div className="row">
          <Stars value={p.avg_rating} />
          <span className="muted">({p.review_count})</span>
        </div>
        <div className="between" style={{ marginTop: 'auto' }}>
          <span className="price">{priceLabel}</span>
          {inStock
            ? <span className="badge stock">In stock</span>
            : <span className="badge out">Out of stock</span>}
        </div>
      </div>
    </Link>
  );
}
