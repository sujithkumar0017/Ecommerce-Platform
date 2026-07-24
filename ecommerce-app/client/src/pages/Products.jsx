import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import ProductCard from '../components/ProductCard.jsx';
import { SkeletonGrid } from '../components/Skeleton.jsx';

export default function Products() {
  const [params, setParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Local filter state seeded from the URL.
  const [minPrice, setMinPrice] = useState(params.get('min_price') || '');
  const [maxPrice, setMaxPrice] = useState(params.get('max_price') || '');
  const [minRating, setMinRating] = useState(params.get('min_rating') || '');
  const [inStock, setInStock] = useState(params.get('in_stock') === 'true');

  const q = params.get('q') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'newest';

  useEffect(() => {
    api.get('/products/categories').then((d) => setCategories(d.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    for (const [k, v] of params.entries()) if (v) qs.set(k, v);
    api.get(`/products?${qs.toString()}`)
      .then((d) => setProducts(d.products))
      .finally(() => setLoading(false));
  }, [params]);

  function update(next) {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === '' || v == null || v === false) merged.delete(k);
      else merged.set(k, v);
    }
    setParams(merged);
  }

  function applyFilters(e) {
    e?.preventDefault();
    update({ min_price: minPrice, max_price: maxPrice, min_rating: minRating, in_stock: inStock });
  }

  function clearFilters() {
    setMinPrice(''); setMaxPrice(''); setMinRating(''); setInStock(false);
    setParams(q ? { q } : {});
  }

  return (
    <div className="container layout-2">
      <aside className="card">
        <h2 style={{ marginTop: 0 }}>Filters</h2>

        <div className="field">
          <label>Category</label>
          <select value={category} onChange={(e) => update({ category: e.target.value })}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.category} value={c.category}>{c.category} ({c.count})</option>)}
          </select>
        </div>

        <form onSubmit={applyFilters}>
          <label>Price range</label>
          <div className="row" style={{ marginBottom: 12 }}>
            <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>

          <div className="field">
            <label>Minimum rating</label>
            <select value={minRating} onChange={(e) => setMinRating(e.target.value)}>
              <option value="">Any</option>
              <option value="4">4★ & up</option>
              <option value="3">3★ & up</option>
              <option value="2">2★ & up</option>
            </select>
          </div>

          <label className="row" style={{ fontWeight: 400, marginBottom: 14 }}>
            <input type="checkbox" style={{ width: 'auto' }} checked={inStock}
              onChange={(e) => setInStock(e.target.checked)} />
            In stock only
          </label>

          <button className="btn btn-block btn-sm" type="submit">Apply filters</button>
          <button className="link-btn spacer" type="button" onClick={clearFilters}>Clear all</button>
        </form>
      </aside>

      <section>
        <div className="between" style={{ marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0 }}>{q ? `Results for “${q}”` : category || 'All products'}</h1>
            <span className="muted">{products.length} product(s)</span>
          </div>
          <div>
            <label style={{ display: 'inline', marginRight: 6 }}>Sort</label>
            <select style={{ width: 'auto', display: 'inline-block' }} value={sort}
              onChange={(e) => update({ sort: e.target.value })}>
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>
        </div>

        {loading ? <SkeletonGrid count={9} />
          : products.length === 0
            ? <div className="card empty"><div className="ic">🔍</div><h3>No products match your filters</h3><p className="muted">Try adjusting or clearing your filters.</p></div>
            : <div className="grid products-grid stagger" key={products.map((p) => p.id).join(',')}>{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
      </section>
    </div>
  );
}
