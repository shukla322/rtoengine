import { useEffect } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import type { Zone } from '../data/types';
import { zoneForPds, zoneVar } from '../utils/zone';
import styles from './PdsGauge.module.css';

const R = 54;
const CIRC = 2 * Math.PI * R;
const clip = (v: number) => Math.max(0, Math.min(100, v));

export function PdsGauge({ pds, zone: zoneOverride, riskLabel }: { pds: number; zone?: Zone; riskLabel?: string }) {
  const clamped = clip(pds);
  const zone = zoneOverride ?? zoneForPds(clamped);
  const label = riskLabel ?? `${zone} risk`;
  const reduceMotion = useReducedMotion();

  const target = useMotionValue(clamped);
  const spring = useSpring(target, { stiffness: 130, damping: 22, mass: 1 });
  const offset = useTransform(spring, (v) => CIRC * (1 - clip(v) / 100));
  const numberText = useTransform(spring, (v) => clip(v).toFixed(1));

  useEffect(() => {
    target.set(clamped);
  }, [clamped, target]);

  const staticOffset = CIRC * (1 - clamped / 100);

  return (
    <div className={styles.wrap} data-zone={zone}>
      <svg viewBox="0 0 128 128" className={styles.svg} role="img" aria-label={`PDS ${clamped.toFixed(1)}, ${label}`}>
        <circle cx="64" cy="64" r={R} className={styles.track} />
        <motion.circle
          cx="64"
          cy="64"
          r={R}
          className={styles.progress}
          style={{ stroke: zoneVar(zone), strokeDasharray: CIRC, strokeDashoffset: reduceMotion ? staticOffset : offset }}
        />
      </svg>
      <div className={styles.center}>
        {reduceMotion ? <span className={styles.number}>{clamped.toFixed(1)}</span> : <motion.span className={styles.number}>{numberText}</motion.span>}
        <span className={styles.tag}>PDS</span>
      </div>
      <span className={styles.zoneBadge} data-zone={zone}>
        {label}
      </span>
    </div>
  );
}
