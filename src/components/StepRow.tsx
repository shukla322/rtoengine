import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useMotionValue, useMotionValueEvent } from 'motion/react';
import type { MotionValue } from 'motion/react';
import type { Mode, Step } from '../data/types';
import { LeakTag } from './LeakTag';
import { ToolChip } from './ToolChip';
import styles from './StepRow.module.css';

interface StepRowProps {
  step: Step;
  rowIndex: number;
  mode: Mode;
  lineColor: string;
  opacity: number;
  spacing: number;
  isExpanded: boolean;
  onToggle: () => void;
  dashed?: boolean;
  current?: boolean;
  /** Which side of the center line the content card sits on. Defaults to the
   * classic "content always on the right, leak chip on the left" layout used
   * by the scripted story pages. The live simulation alternates sides instead
   * (see buildTimelineRows) since it never sets a leak chip, which otherwise
   * left the entire left column empty on every row. */
  align?: 'left' | 'right';
  /** False when the caller draws one continuous line overlay instead of a
   * per-row segment (see buildTimelineRows' `scrollProgress`). */
  showConnector?: boolean;
  /** Live simulation only: the shared scroll-linked progress (0–1) that
   * drives the central line overlay. Combined with `activationThreshold`,
   * this row activates (and stays activated) once scroll has carried the
   * line down to its position, and reverts if scrolled back above it. */
  scrollProgress?: MotionValue<number>;
  /** This row's own position along `scrollProgress`'s 0–1 range. Undefined
   * (the scripted-page default) means the row is always considered active. */
  activationThreshold?: number;
  /** Reports this row's dot element so the caller can measure its position
   * and compute `activationThreshold`. */
  registerDot?: (el: HTMLSpanElement | null) => void;
}

const ROW_SPRING = { type: 'spring', stiffness: 260, damping: 26 } as const;
const PANEL_SPRING = { type: 'spring', stiffness: 320, damping: 32 } as const;

export function StepRow({
  step,
  rowIndex,
  mode,
  lineColor,
  opacity,
  spacing,
  isExpanded,
  onToggle,
  dashed,
  current,
  align = 'right',
  showConnector = true,
  scrollProgress,
  activationThreshold,
  registerDot,
}: StepRowProps) {
  const fallbackProgress = useMotionValue(0);
  const progress = scrollProgress ?? fallbackProgress;
  const [crossed, setCrossed] = useState(activationThreshold === undefined);

  useEffect(() => {
    if (activationThreshold === undefined) {
      setCrossed(true);
      return;
    }
    setCrossed(progress.get() >= activationThreshold);
    // Re-check only when the measured threshold itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activationThreshold]);

  useMotionValueEvent(progress, 'change', (latest) => {
    if (activationThreshold === undefined) return;
    const next = latest >= activationThreshold;
    setCrossed((prev) => (prev === next ? prev : next));
  });

  const style = { gridRow: rowIndex, opacity, minHeight: spacing } as CSSProperties;
  const rightStyle = { gridRow: rowIndex, minHeight: spacing } as CSSProperties;
  const connectorStyle = dashed ? { color: lineColor } : { background: lineColor };
  const dotActive = mode === 'etdb' && !!step.tool;

  let leakVariant: 'default' | 'failed' | 'prevented' = 'default';
  if (step.leak) {
    if (mode === 'etdb') leakVariant = 'prevented';
    else if (mode === 'base' && step.failsHere) leakVariant = 'failed';
  }

  const panelId = `step-panel-${step.id}`;

  return (
    <>
      <div className={styles.cellLeft} data-align={align} style={style}>
        {step.leak && <LeakTag leak={step.leak} variant={leakVariant} />}
      </div>
      <div className={styles.cellCenter} style={style} data-scroll={!!scrollProgress}>
        {showConnector && (
          <span className={styles.connector} style={connectorStyle} data-dashed={dashed ?? false} aria-hidden="true" />
        )}
        <span
          ref={registerDot}
          className={styles.dot}
          data-active={dotActive && crossed}
          data-outcome={crossed ? (step.outcome ?? '') : ''}
          data-current={(current ?? false) && crossed}
          data-crossed={crossed}
          aria-hidden="true"
        />
      </div>
      <motion.div
        className={styles.cellRight}
        data-align={align}
        data-current={current ?? false}
        data-scroll={!!scrollProgress}
        data-crossed={crossed}
        style={rightStyle}
        initial={scrollProgress ? false : { opacity: 0, y: 10 }}
        animate={{ opacity, y: 0 }}
        transition={ROW_SPRING}
      >
        <button
          type="button"
          className={styles.trigger}
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-controls={panelId}
        >
          <span className={styles.headline}>
            {step.time !== '—' && (
              <span className={styles.time} data-crossed={crossed}>
                {step.time}
              </span>
            )}
            <span className={styles.title} data-crossed={crossed}>
              {step.title}
            </span>
            {step.outcome === 'delivered' && <span className={styles.outcomeGood}>OK</span>}
            {(step.outcome === 'rto' || step.outcome === 'returned') && <span className={styles.outcomeBad}>HOLD</span>}
          </span>
          <motion.span className={styles.chevron} animate={{ rotate: isExpanded ? 180 : 0 }} transition={PANEL_SPRING} aria-hidden="true">
            ▾
          </motion.span>
        </button>
        <p className={styles.detail} data-crossed={crossed}>
          {step.detail}
        </p>
        {mode === 'etdb' && step.tool && (
          <div className={styles.toolRow}>
            <ToolChip tool={step.tool} />
          </div>
        )}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="panel"
              id={panelId}
              className={styles.panel}
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={PANEL_SPRING}
              style={{ overflow: 'hidden' }}
            >
              <p className={styles.panelWhy}>
                <strong>Why this step matters:</strong> {step.why}
              </p>
              {step.formula && <pre className={styles.panelFormula}>{step.formula}</pre>}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
