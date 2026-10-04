import { forwardRef, useEffect, useState } from 'react';
import { useMotionValue, useMotionValueEvent, type MotionValue } from 'motion/react';
import type { CSSProperties } from 'react';
import styles from './DayPill.module.css';

interface DayPillProps {
  label: string;
  dayNo: number;
  state: 'active' | 'past' | 'future';
  rowIndex: number;
  scrollProgress?: MotionValue<number>;
  activationThreshold?: number;
}

export const DayPill = forwardRef<HTMLHeadingElement, DayPillProps>(function DayPill(
  { label, dayNo, state, rowIndex, scrollProgress, activationThreshold },
  ref,
) {
  const style = { gridRow: rowIndex } as CSSProperties;
  const fallback = useMotionValue(0);
  const progress = scrollProgress ?? fallback;
  const [crossed, setCrossed] = useState(false);
  useEffect(() => {
    setCrossed(progress.get() >= (activationThreshold ?? 1));
  }, [progress, activationThreshold]);
  useMotionValueEvent(progress, 'change', (value) => {
    setCrossed(value >= (activationThreshold ?? 1));
  });

  return (
    <h2 ref={ref} id={`day-${dayNo}`} className={styles.wrap} style={style} data-state={state} data-scroll={!!scrollProgress} data-crossed={crossed}>
      <span className={styles.pill}>
        {label}
        <span className={styles.dayNo}> · DAY {dayNo}</span>
      </span>
    </h2>
  );
});
