import { useMode } from '../context/ModeContext';
import styles from './ModeToggle.module.css';

export function ModeToggle() {
  const { mode, setMode } = useMode();

  return (
    <div className={styles.group} role="group" aria-label="Order journey mode" data-mode={mode}>
      <span className={styles.thumb} aria-hidden="true" />
      <button
        type="button"
        className={styles.segment}
        data-active={mode === 'base'}
        aria-pressed={mode === 'base'}
        onClick={() => setMode('base')}
      >
        Without tools
      </button>
      <button
        type="button"
        className={styles.segment}
        data-active={mode === 'etdb'}
        aria-pressed={mode === 'etdb'}
        onClick={() => setMode('etdb')}
      >
        With RTO Engine
      </button>
    </div>
  );
}
