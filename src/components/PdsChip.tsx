import { useEffect, useState } from 'react';
import { useMode } from '../context/ModeContext';
import { zoneForPds, zoneLabel, zoneVar } from '../utils/zone';
import styles from './PdsChip.module.css';

export function PdsChip({ pds }: { pds: number | null }) {
  const { mode } = useMode();
  const [display, setDisplay] = useState(pds ?? 0);

  useEffect(() => {
    if (pds === null) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplay(pds);
      return;
    }
    const start = display;
    const delta = pds - start;
    if (delta === 0) return;
    const duration = 400;
    const startTime = performance.now();
    let frame: number;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      setDisplay(Math.round(start + delta * t));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pds]);

  if (mode === 'base' || pds === null) {
    return (
      <div className={styles.chip} aria-live="polite">
        <span className={styles.notTracked}>PDS — not tracked</span>
      </div>
    );
  }

  const zone = zoneForPds(display);

  return (
    <div className={styles.chip} data-zone={zone} aria-live="polite">
      <span key={zone} className={styles.dot} style={{ background: zoneVar(zone) }} />
      <span className={styles.value}>PDS {display}</span>
      <span className={styles.zoneName}>· {zoneLabel(zone)}</span>
    </div>
  );
}
