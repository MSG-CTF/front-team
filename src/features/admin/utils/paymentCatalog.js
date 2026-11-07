export const PAYMENT_CATALOG = Object.freeze([
  { id: "chilsung-cider", name: "칠성사이다", price: 400, category: "음료", unit: "개" },
  { id: "jarritos", name: "하리토스", price: 800, category: "음료", unit: "개" },
  { id: "ginger-ale", name: "진저에일", price: 800, category: "음료", unit: "개" },
  { id: "coje", name: "코제", price: 400, category: "음료", unit: "개" },
  { id: "small-snack", name: "조마난과자", price: 500, category: "간식", unit: "개" },
  { id: "popcorn", name: "팝콘", price: 150, category: "간식", unit: "컵", note: "200ml 종이컵" },
  { id: "msg-sticker", name: "MSG 스티커", price: 150, category: "굿즈", unit: "개" },
  { id: "keycap", name: "키캡", price: 1500, category: "굿즈", unit: "개" },
].map(Object.freeze));

// 결제 메모 100자 안에 모든 상품과 수량을 남길 수 있는 범위
export const MAX_PAYMENT_QUANTITY = 99;

export function changeProductQuantity(cart, productId, delta) {
  if (!PAYMENT_CATALOG.some((product) => product.id === productId) || !Number.isSafeInteger(delta)) return cart;
  const current = cart[productId] ?? 0;
  if (!Number.isSafeInteger(current) || current < 0 || current > MAX_PAYMENT_QUANTITY) return cart;
  const quantity = Math.min(MAX_PAYMENT_QUANTITY, Math.max(0, current + delta));
  const next = { ...cart };
  if (quantity) next[productId] = quantity;
  else delete next[productId];
  return next;
}

export function productCheckout(cart) {
  const invalid = Object.entries(cart).some(([id, quantity]) =>
    !PAYMENT_CATALOG.some((product) => product.id === id) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_PAYMENT_QUANTITY,
  );
  if (invalid) return { items: [], amount: "", itemName: "" };
  const items = PAYMENT_CATALOG.filter((product) => cart[product.id]).map((product) => ({ ...product, quantity: cart[product.id] }));
  return {
    items,
    amount: items.length ? String(items.reduce((sum, item) => sum + item.price * item.quantity, 0)) : "",
    itemName: items.map((item) => `${item.name} ${item.quantity}${item.unit}`).join(", "),
  };
}
