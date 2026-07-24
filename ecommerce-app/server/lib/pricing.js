// Central pricing rules shared by cart summary and checkout so they never diverge.
import { badRequest } from './http.js';

export const TAX_RATE = 0.08;          // 8% tax on (subtotal - discount)
export const SHIPPING_FEE = 49;        // flat shipping
export const FREE_SHIPPING_THRESHOLD = 999; // free shipping over this subtotal

const round2 = (n) => Math.round(n * 100) / 100;

// Validate a coupon row against a subtotal and return the discount amount (>= 0).
// Throws a friendly error if the coupon is invalid for this cart.
export function computeCouponDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (!coupon.is_active) throw badRequest('This coupon is no longer active.');
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    throw badRequest('This coupon has expired.');
  }
  if (subtotal < Number(coupon.min_subtotal)) {
    throw badRequest(`Add items worth ₹${Number(coupon.min_subtotal).toFixed(2)} to use this coupon.`);
  }
  let discount =
    coupon.discount_type === 'percent'
      ? (subtotal * Number(coupon.discount_value)) / 100
      : Number(coupon.discount_value);

  if (coupon.max_discount != null) discount = Math.min(discount, Number(coupon.max_discount));
  discount = Math.min(discount, subtotal); // never exceed subtotal
  return round2(discount);
}

// items: [{ unit_price, quantity }]
export function computeTotals(items, coupon = null) {
  const subtotal = round2(items.reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0));
  const discount = computeCouponDiscount(coupon, subtotal);
  const taxable = Math.max(subtotal - discount, 0);
  const tax = round2(taxable * TAX_RATE);
  const shipping_fee = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = round2(taxable + tax + shipping_fee);
  return { subtotal, discount, tax, shipping_fee, total };
}
