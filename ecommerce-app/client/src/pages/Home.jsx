import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { SkeletonGrid } from '../components/Skeleton.jsx';
import Icon from '../components/Icon.jsx';
import { categoryPhoto, HERO_SHOT, PROMO_PINK, PROMO_VIOLET } from '../utils.jsx';

/* Presentational section header — keeps spacing/typography consistent. */
function SectionHead({ title, sub, to, linkLabel = 'View all' }) {
  return (
    <div className="section-head">
      <div>
        <h2>{title}</h2>
        {sub && <div className="sub">{sub}</div>}
      </div>
      {to && (
        <Link to={to} className="link-btn">
          {linkLabel} <Icon name="arrowRight" size={16} />
        </Link>
      )}
    </div>
  );
}

const TRUST = [
  { icon: 'truck', title: 'Free shipping', desc: 'On all orders over ₹999.' },
  { icon: 'lock', title: 'Secure checkout', desc: 'Your details stay protected.' },
  { icon: 'refresh', title: 'Easy cancellations', desc: 'Cancel anytime before it ships.' },
  { icon: 'star', title: 'Verified reviews', desc: 'Only from customers who received it.' },
];

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
      {/* Hero — quiet, spacious, imagery takes centre stage */}
      <section className="hero flow-bg reveal" aria-labelledby="hero-title">
        <div className="hero-content">
          <span className="eyebrow">New season</span>
          <h1 id="hero-title">
            Discover <span className="copper">premium</span> picks that <span className="copper">inspire.</span>
          </h1>
          <p>
            Considered essentials across electronics, apparel and home — delivered fast,
            with free shipping on orders over ₹999.
          </p>
          <div className="row wrap">
            <Link to="/products" className="btn">
              Shop all products <Icon name="arrowRight" size={16} />
            </Link>
            <Link to="/products?sort=rating" className="btn btn-outline">Shop top rated</Link>
          </div>
          <div className="hero-trust">
            <div className="ht"><span className="ic"><Icon name="truck" /></span><span><b>Free shipping</b>Over ₹999</span></div>
            <div className="ht"><span className="ic"><Icon name="refresh" /></span><span><b>Easy returns</b>Before it ships</span></div>
            <div className="ht"><span className="ic"><Icon name="lock" /></span><span><b>Secure checkout</b>100% protected</span></div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="shot"><img src={HERO_SHOT} alt="" loading="eager" /></div>
          <div className="glass-chip tl" aria-hidden="true">
            <span className="em"><Icon name="star" /></span>
            <span><b>4.9</b>Rated by shoppers</span>
          </div>
          <div className="glass-chip br" aria-hidden="true">
            <span className="em"><Icon name="package" /></span>
            <span><b>2-day</b>Fast delivery</span>
          </div>
        </div>
      </section>

      {/* Promotional banners */}
      <section className="promo-grid" aria-label="Offers">
        <Link to="/products?sort=rating" className="promo pink reveal-l">
          <span className="promo-bg" style={{ backgroundImage: `url(${PROMO_PINK})` }} aria-hidden="true" />
          <span className="kicker">Customer favourites</span>
          <h3>Top-rated picks</h3>
          <p>Shop the products our customers love most.</p>
          <span className="btn btn-sm">Shop now</span>
        </Link>
        <Link to="/products" className="promo violet reveal-r">
          <span className="promo-bg" style={{ backgroundImage: `url(${PROMO_VIOLET})` }} aria-hidden="true" />
          <span className="kicker">First order offer</span>
          <h3>Extra 10% off</h3>
          <p>Use this code at checkout on your first order.</p>
          <span className="code">WELCOME10</span>
        </Link>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="section">
          <SectionHead title="Shop by category" sub="Find exactly what you’re looking for." to="/products" />
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

      {/* New arrivals — sits on a full-bleed wash of the signature pattern */}
      <section className="band">
        <SectionHead title="New arrivals" sub="Fresh additions to the store." to="/products?sort=newest" />
        {loading
          ? <SkeletonGrid count={8} />
          : <div className="grid products-grid stagger">{latest.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </section>

      {/* Top rated */}
      {topRated.some((p) => Number(p.review_count) > 0) && (
        <section className="section">
          <SectionHead title="Top rated" sub="Loved by our customers." to="/products?sort=rating" />
          <div className="grid products-grid stagger">{topRated.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      )}

      {/* Trust strip */}
      <section className="feature-strip" aria-label="Why shop with us">
        {TRUST.map((f) => (
          <div className="feature" key={f.title}>
            <div className="ic"><Icon name={f.icon} /></div>
            <div>
              <div className="t">{f.title}</div>
              <div className="d">{f.desc}</div>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
