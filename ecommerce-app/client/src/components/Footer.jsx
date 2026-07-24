import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <Link to="/" className="brand"><span className="dot" aria-hidden="true" />ShopKart</Link>
          <p className="blurb" style={{ marginTop: 12 }}>
            A premium shopping experience — quality picks across electronics, apparel, home and more.
          </p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link to="/products">All products</Link>
          <Link to="/products?sort=newest">New arrivals</Link>
          <Link to="/products?sort=rating">Top rated</Link>
          <Link to="/cart">Your cart</Link>
        </div>
        <div>
          <h4>Account</h4>
          <Link to="/account">Profile</Link>
          <Link to="/orders">Orders</Link>
          <Link to="/account">Addresses</Link>
        </div>
        <div>
          <h4>Help</h4>
          <Link to="/products">Browse catalog</Link>
          <Link to="/orders">Track an order</Link>
          <Link to="/cart">Coupons & offers</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {year} ShopKart. Crafted for a smooth shopping experience.</span>
        <span>Free shipping over ₹999 · Secure checkout</span>
      </div>
    </footer>
  );
}
