import { useMode } from '../context/ModeContext';
import { useOrderSet } from '../context/OrderSetContext';
import { ModeToggle } from './ModeToggle';
import { OrderSelect } from './OrderSelect';
import { PdsChip } from './PdsChip';
import styles from './Hero.module.css';

export function Hero({ pds }: { pds: number | null }) {
  const { mode } = useMode();
  const { active } = useOrderSet();
  const { order } = active;
  const title = order.titles[mode];

  return (
    <section className={styles.hero}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>{order.eyebrow}</p>
        <h1 className={styles.title} aria-live="polite">
          <span className={styles.titleLine}>{order.route}</span>
          <span className={styles.titleLine}>
            {title.text}
            <span className={styles[`zone-${title.zone}`]}>{title.highlight}</span>
          </span>
        </h1>
        <div className={styles.controls}>
          <OrderSelect />
          <ModeToggle />
          <PdsChip pds={pds} />
        </div>
      </div>
      <div className={styles.columnHeads}>
        <span className={styles.headLeft}>What can go wrong</span>
        <span className={styles.headCenter} aria-hidden="true" />
        <span className={styles.headRight}>What happens</span>
      </div>
    </section>
  );
}
