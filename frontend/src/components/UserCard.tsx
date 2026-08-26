import styles from "./UserCard.module.css";
export function UserCard({ name }: { name: string }) {
  return <div className={styles.card} data-testid="user-card">{name}</div>;
}
