import type { Leak } from '../data/types';
import styles from './LeakTag.module.css';

interface LeakTagProps {
  leak: Leak;
  variant?: 'default' | 'failed' | 'prevented';
}

export function LeakTag({ leak, variant = 'default' }: LeakTagProps) {
  return (
    <div className={styles.wrap} data-variant={variant}>
      <p className={styles.label}>
        {leak.label} <span className={styles.code}>{leak.code}</span>
      </p>
      <p className={styles.stat}>
        <span className={styles.statText}>{leak.stat}</span>
        {variant === 'failed' && <span className={styles.tagFailed}>✕ failed here</span>}
        {variant === 'prevented' && <span className={styles.tagPrevented}>prevented</span>}
      </p>
    </div>
  );
}
