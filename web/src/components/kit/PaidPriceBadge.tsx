import styles from "./PaidPriceBadge.module.css";

type PriceLabel = { paid: boolean; text: string };

/** Keeps the Point amount distinct from the action label on paid buttons. */
export function PaidPriceBadge({ price }: { price: PriceLabel }) {
  if (!price.paid) return null;
  return <> {" "}<span className={styles.badge}>{price.text}</span></>;
}
