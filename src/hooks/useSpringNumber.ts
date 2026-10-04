import { useEffect } from 'react';
import { useMotionValue, useSpring, useTransform, type MotionValue } from 'motion/react';

/** Critically-damped — reaches the target quickly with no overshoot, appropriate for a score readout. */
const SCORE_SPRING = { stiffness: 140, damping: 24, mass: 1 };

/**
 * Springs toward `value` and returns ready-to-render text, or null while there's
 * nothing to show yet. Passing the returned MotionValue as a <motion.span>'s
 * only child lets Motion write the text directly to the DOM node on each
 * frame, without triggering a React re-render.
 */
export function useSpringNumber(value: number | null, decimals = 0): MotionValue<string> | null {
  const target = useMotionValue(value ?? 0);
  const spring = useSpring(target, SCORE_SPRING);
  const text = useTransform(spring, (v) => v.toFixed(decimals));

  useEffect(() => {
    if (value !== null) target.set(value);
  }, [value, target]);

  return value === null ? null : text;
}
