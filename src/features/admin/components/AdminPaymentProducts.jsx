import { MAX_PAYMENT_QUANTITY, PAYMENT_CATALOG } from "../utils/paymentCatalog.js";
import { formatAdminNumber } from "../utils/adminNumber.js";
import styles from "./AdminPaymentProducts.module.css";

export default function AdminPaymentProducts({ cart, checkout, onChangeQuantity, onClear }) {
  return (
    <section aria-label="마일리지샵 상품" className={styles.products}>
      <p className={styles.hint}>상품을 누르면 1개씩 담깁니다</p>
      {["음료", "간식", "굿즈"].map((category) => (
        <div key={category} className={styles.category} role="group" aria-label={category}>
          <h4>{category}</h4>
          <div className={styles.grid}>
            {PAYMENT_CATALOG.filter((product) => product.category === category).map((product) => (
              <button
                key={product.id}
                type="button"
                className={styles.product}
                data-selected={Boolean(cart[product.id])}
                disabled={cart[product.id] >= MAX_PAYMENT_QUANTITY}
                onClick={() => onChangeQuantity(product.id, 1)}
                aria-label={`${product.name} 1${product.unit} 담기`}
              >
                <span className={styles.name}>{product.name}{cart[product.id] ? <span className={styles.badge}>{cart[product.id]}</span> : null}</span>
                {product.note && <span className={styles.note}>{product.note}</span>}
                <span className={styles.price}>{formatAdminNumber(product.price)} <small>MI / {product.unit}</small></span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {checkout.items.length > 0 && (
        <section className={styles.cart} aria-label="담은 상품">
          <div className={styles.cartHeading}><h4>담은 상품</h4><button type="button" onClick={onClear}>모두 비우기</button></div>
          <ul>
            {checkout.items.map((item) => (
              <li key={item.id}>
                <div className={styles.lineName}><strong>{item.name}</strong><span>{formatAdminNumber(item.price * item.quantity)} MI</span></div>
                <div className={styles.quantity} role="group" aria-label={`${item.name} 수량`}>
                  <button type="button" aria-label={`${item.name} 1${item.unit} 빼기`} onClick={() => onChangeQuantity(item.id, -1)}>−</button>
                  <span>{item.quantity}{item.unit}</span>
                  <button type="button" disabled={item.quantity >= MAX_PAYMENT_QUANTITY} aria-label={`${item.name} 1${item.unit} 추가`} onClick={() => onChangeQuantity(item.id, 1)}>+</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className={styles.total} role="status" aria-live="polite" aria-label="상품 결제 합계">
        <span>합계</span><strong>{formatAdminNumber(Number(checkout.amount || 0))}<small> MI</small></strong>
      </div>
    </section>
  );
}
