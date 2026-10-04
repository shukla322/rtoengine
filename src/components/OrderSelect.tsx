import { useOrderSet } from '../context/OrderSetContext';
import styles from './OrderSelect.module.css';

export function OrderSelect() {
  const { sets, activeKey, setActiveKey } = useOrderSet();

  return (
    <label className={styles.wrap}>
      <span className={styles.label}>Order</span>
      <select
        className={styles.select}
        value={activeKey}
        onChange={(e) => setActiveKey(e.target.value)}
        aria-label="Choose an order to view"
      >
        {sets.map((set) => (
          <option key={set.key} value={set.key}>
            {set.label} · {set.region} region
          </option>
        ))}
      </select>
    </label>
  );
}
