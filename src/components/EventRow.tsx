import type { CSSProperties } from 'react';
import type { EngineEvent } from '../data/types';
import styles from './EventRow.module.css';

export function EventRow({ event, rowIndex, align = 'right' }: { event: EngineEvent; rowIndex: number; align?: 'left' | 'right' }) {
  const style = { gridRow: rowIndex, '--ri': rowIndex } as CSSProperties;

  return (
    <>
      <div className={styles.cellLeft} data-align={align} style={style} aria-hidden="true" />
      <div className={styles.cellCenter} style={style}>
        <div className={styles.bar} aria-hidden="true" />
        <span className={styles.pip} aria-hidden="true" />
      </div>
      <div className={styles.cellRight} data-align={align} style={style}>
        <div className={styles.row}>
          {event.time !== '—' && <span className={styles.time}>{event.time}</span>}
          <span className={styles.text}>{event.text}</span>
          {typeof event.pds === 'number' && (
            <span className={styles.pds}>
              {typeof event.pdsFrom === 'number' ? `${event.pdsFrom} → ${event.pds}` : `PDS ${event.pds}`}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
