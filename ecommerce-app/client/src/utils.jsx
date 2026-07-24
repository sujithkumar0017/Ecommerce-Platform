export const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

export function Stars({ value = 0 }) {
  const v = Math.round(Number(value));
  return <span className="stars" title={`${value} / 5`}>{'★'.repeat(v)}{'☆'.repeat(5 - v)}</span>;
}

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '';

/* Decorative, realistic category cover photos (Unsplash CDN — visual only).
   Maps known seed categories; falls back to a generic shopping shot. */
const U = (id, w = 640) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

const CAT_PHOTO = {
  'Electronics': U('1505740420928-5e560c06d30e'),
  'Apparel': U('1490481651871-ab68de25d43d'),
  'Fashion': U('1483985988355-763728e1935b'),
  'Home & Kitchen': U('1556909114-f6e7ad7d3136'),
  'Beauty': U('1596462502278-27bfdc403348'),
  'Sports & Fitness': U('1517836357463-d25dfeac3438'),
  'Sports': U('1517836357463-d25dfeac3438'),
  'Footwear': U('1542291026-7eec264c27ff'),
  'Accessories': U('1523275335684-37898b6baf30'),
  'Toys & Games': U('1607083206869-4c7672e72a8a'),
  'Books': U('1512820790803-83ca734da794'),
  'Grocery': U('1556742049-0cfed4f6a45d'),
};
const CAT_FALLBACK = U('1441986300917-64674bd600d8');

export const categoryPhoto = (c) => CAT_PHOTO[c] || CAT_FALLBACK;

/* Large lifestyle shots for hero / auth backdrops. */
export const HERO_PHOTO = U('1441984904996-e0b6ba687e04', 1400);
export const HERO_SHOT = U('1441986300917-64674bd600d8', 900);
export const AUTH_PHOTO = U('1472851294608-062f824d29cc', 1200);
export const PROMO_PINK = U('1445205170230-053b83016050', 1000);
export const PROMO_VIOLET = U('1483985988355-763728e1935b', 1000);
