import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { SkeletonGrid } from '../components/Skeleton.jsx';
import { categoryPhoto, HERO_PHOTO, HERO_SHOT, PROMO_PINK, PROMO_VIOLET } from '../utils.jsx';

export default function Home() {
  const [latest, setLatest] = useState([]);
  const [topRated, setTopRated] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/products?sort=newest&limit=8').then((d) => setLatest(d.products)).catch(() => {}).finally(() => setLoading(false));
    api.get('/products?sort=rating&limit=4').then((d) => setTopRated(d.products)).catch(() => {});
    api.get('/products/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  return (
    <div className="container">
      {/* Hero — dark editorial, real photography */}
      <section className="hero reveal" style={{ '--hero-img': `url(${HERO_PHOTO})` }}>
        <span className="hero-bg" aria-hidden="true" />
        <span className="blob b1" aria-hidden="true" />
        <span className="blob b2" aria-hidden="true" />
        <span className="blob b3" aria-hidden="true" />
        <div className="hero-content">
          <span className="eyebrow">✦ New season, new you</span>
          <h1>Shop premium picks<br /><span className="grad-text">that inspire.</span></h1>
          <p>Top-quality electronics, fashion, home essentials & more — delivered fast with free shipping on orders over ₹999.</p>
          <div className="row wrap">
            <Link to="/products" className="btn btn-outline">🛍️ Shop all products</Link>
            <Link to="/products?sort=rating" className="btn btn-accent">⚡ Shop top rated</Link>
          </div>
          <div className="hero-trust">
            <div className="ht"><span className="ic">🚚</span><span><b>Free shipping</b>On orders over ₹999</span></div>
            <div className="ht"><span className="ic">↩️</span><span><b>Easy cancellations</b>Before it ships</span></div>
            <div className="ht"><span className="ic">🔒</span><span><b>Secure checkout</b>100% protected</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="shot"><img src={HERO_SHOT} alt="" loading="eager" /></div>
          <div className="glass-chip tl"><span className="em">⭐</span><span><b>4.9/5</b>Rated by shoppers</span></div>
          <div className="glass-chip br"><span className="em">📦</span><span><b>2-day</b>Fast delivery</span></div>
        </div>
      </section>

      {/* Promo band — real photo backgrounds */}
      <section className="promo-grid">
        <Link to="/products?sort=rating" className="promo pink reveal-l">
          <span className="promo-bg" style={{ backgroundImage: `url(${PROMO_PINK})` }} aria-hidden="true" />
          <span className="kicker">⭐ Customer favourites</span>
          <h3>Top-rated deals</h3>
          <p>Shop the products our customers love most.</p>
          <span className="btn btn-sm">Shop now</span>
          <span className="emoji" aria-hidden="true">🎁</span>
        </Link>
        <Link to="/products" className="promo violet reveal-r">
          <span className="promo-bg" style={{ backgroundImage: `url(${PROMO_VIOLET})` }} aria-hidden="true" />
          <span className="kicker">First order offer</span>
          <h3>Extra 10% off</h3>
          <p>Use code at checkout on your first order.</p>
          <span className="code">WELCOME10</span>
          <span className="emoji" aria-hidden="true">🛍️</span>
        </Link>
      </section>

      {/* Categories — real photo covers */}
      {categories.length > 0 && (
        <section className="section">
          <div className="section-head">
            <div><h2>Shop by category</h2><div className="sub">Find exactly what you’re looking for.</div></div>
            <Link to="/products" className="link-btn">View all →</Link>
          </div>
          <div className="cat-row stagger">
            {categories.map((c) => (
              <Link key={c.category} to={`/products?category=${encodeURIComponent(c.category)}`} className="cat-tile">
                <span className="cat-photo" style={{ backgroundImage: `url(${categoryPhoto(c.category)})` }} aria-hidden="true" />
                <span className="cat-name">{c.category}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New arrivals */}
      <section className="section">
        <div className="section-head">
          <div><h2>New arrivals</h2><div className="sub">Fresh additions to the store.</div></div>
          <Link to="/products?sort=newest" className="link-btn">View all →</Link>
        </div>
        {loading
          ? <SkeletonGrid count={8} />
          : <div className="grid products-grid stagger">{latest.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </section>

      {/* Top rated */}
      {topRated.some((p) => Number(p.review_count) > 0) && (
        <section className="section">
          <div className="section-head">
            <div><h2>Top rated</h2><div className="sub">Loved by our customers.</div></div>
            <Link to="/products?sort=rating" className="link-btn">View all →</Link>
          </div>
          <div className="grid products-grid stagger">{topRated.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {/* Trust strip */}
      <section className="feature-strip">
        <div className="feature"><div className="ic">🚚</div><div><div className="t">Free shipping</div><div className="d">On all orders over ₹999.</div></div></div>
        <div className="feature"><div className="ic">🔒</div><div><div className="t">Secure checkout</div><div className="d">Your details stay protected.</div></div></div>
        <div className="feature"><div className="ic">↩️</div><div><div className="t">Easy cancellations</div><div className="d">Cancel anytime before it ships.</div></div></div>
        <div className="feature"><div className="ic">⭐</div><div><div className="t">Verified reviews</div><div className="d">Only from customers who received it.</div></div></div>
      </section>
    </div>
  );
}
