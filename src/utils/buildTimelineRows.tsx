import type { CSSProperties, ReactNode } from 'react';
import type { MotionValue } from 'motion/react';
import type { Day, JourneyItem, Mode, Step } from '../data/types';
import { includesMode, resolveStep } from './resolve';
import { DayPill } from '../components/DayPill';
import { StepRow } from '../components/StepRow';
import { EventRow } from '../components/EventRow';
import styles from '../App.module.css';

/**
 * Shared timeline row builder — same rendering logic used by both the scripted
 * story orders and the live simulation, so both draw from one code path.
 */
export function buildTimelineRows({
  journey,
  recovery,
  mode,
  expanded,
  toggleStep,
  activeDayNo,
  registerPill,
  showRecovery = true,
  recoveryNote = 'if this order still failed to deliver, here is the safety net',
  progressMode = false,
  currentStepId = null,
  scrollProgress,
  getStepThreshold,
  registerDot,
}: {
  journey: Day[];
  recovery: Step[];
  mode: Mode;
  expanded: Set<string>;
  toggleStep: (id: string) => void;
  activeDayNo: number | null;
  registerPill?: (id: string, el: Element | null) => void;
  showRecovery?: boolean;
  recoveryNote?: string;
  /** Live simulation mode: every rendered step has already been "reached", so the
   * connector shows progress (solid) rather than tool-presence, and the current
   * step gets a pulsing marker instead of content trickling in over time. */
  progressMode?: boolean;
  currentStepId?: string | null;
  /** Live simulation only: a shared scroll-linked progress value (0–1) driving
   * one continuous line overlay rendered by the caller. When present, per-row
   * connector segments (including day/phase risers) are suppressed and each
   * step's dot/content instead activates as this progress crosses its own
   * measured position (see getStepThreshold, registerDot). */
  scrollProgress?: MotionValue<number>;
  getStepThreshold?: (stepId: string) => number;
  registerDot?: (stepId: string, el: HTMLElement | null) => void;
}): ReactNode[] {
  const overlayLine = !!scrollProgress;
  const visibleDays = journey.filter((day) => includesMode(day.modes, mode));

  let rowIndex = 0;
  let stepCount = 0;
  let lastPhase: Day['phase'] | null = null;
  let onRtoBranch = false;
  const rows: ReactNode[] = [];

  // Scripted story pages (progressMode false) keep their original
  // content-always-on-the-right layout, where the left column is reserved
  // for leak chips. The live simulation (progressMode true) has no leak
  // chips, so its step content alternates left/right instead, to use the
  // width evenly — same idea as the fixed orders, just driven by step
  // count rather than a leak chip. Engine-event rows (trigger/nudge/
  // response) are not rendered on the timeline at all in this mode.
  const stepAlign = (): 'left' | 'right' => {
    const align = progressMode ? (stepCount % 2 === 0 ? 'right' : 'left') : 'right';
    stepCount += 1;
    return align;
  };

  const pushConnector = (key: string, color: string, dashed?: boolean) => {
    if (overlayLine) return;
    rows.push(
      <span
        key={key}
        className={styles.lineConnector}
        style={dashed ? { gridRow: rowIndex, color } : { gridRow: rowIndex, background: color }}
        data-dashed={dashed ?? false}
        aria-hidden="true"
      />,
    );
  };

  const pushPhaseBand = (phase: Day['phase'], note?: string) => {
    rowIndex += 1;
    const style = { gridRow: rowIndex } as CSSProperties;
    pushConnector(`phase-bar-${phase}-${rowIndex}`, mode === 'base' && onRtoBranch ? 'var(--zone-red)' : 'var(--line-muted)', mode === 'base' && onRtoBranch);
    rows.push(
      <div key={`phase-${phase}-${rowIndex}`} className={styles.phaseBand} style={style}>
        <span className={styles.phaseLabel}>
          {phase === 'prevent' && 'PHASE 1 · PREVENT'}
          {phase === 'deliver' && 'PHASE 2 · DELIVER'}
          {phase === 'recover' && 'PHASE 3 · RECOVER'}
        </span>
        {note && <span className={styles.phaseNote}>{note}</span>}
      </div>,
    );
  };

  visibleDays.forEach((day) => {
    if (day.phase !== lastPhase) {
      pushPhaseBand(day.phase);
      lastPhase = day.phase;
    }

    rowIndex += 1;
    const state: 'active' | 'past' | 'future' =
      activeDayNo === null ? 'future' : day.dayNo === activeDayNo ? 'active' : day.dayNo < activeDayNo ? 'past' : 'future';
    pushConnector(
      `day-bar-${mode}-${day.dayNo}`,
      mode === 'base' && onRtoBranch ? 'var(--zone-red)' : 'var(--line-muted)',
      mode === 'base' && onRtoBranch,
    );
    rows.push(
      <DayPill
        key={`${mode}-day-${day.dayNo}`}
        ref={(el) => {
          registerPill?.(`day-${day.dayNo}`, el);
          if (overlayLine) registerDot?.(`day-${day.dayNo}`, el);
        }}
        label={day.label}
        dayNo={day.dayNo}
        state={state}
        rowIndex={rowIndex}
        scrollProgress={scrollProgress}
        activationThreshold={overlayLine ? getStepThreshold?.(`day-${day.dayNo}`) : undefined}
      />,
    );

    day.items.forEach((item: JourneyItem, itemIndex: number) => {
      if (!includesMode(item.modes, mode)) return;
      rowIndex += 1;

      if (item.kind === 'event') {
        if (progressMode) {
          // Engine-event annotations (trigger/nudge/response) are shown in the
          // PDS engine panel already; keep the center timeline to just the
          // order steps so it stays uniform with the fixed orders.
          rowIndex -= 1;
          return;
        }
        rows.push(<EventRow key={`${mode}-${day.dayNo}-${itemIndex}`} event={item} rowIndex={rowIndex} align="right" />);
        return;
      }

      const step = resolveStep(item, mode);
      const isRto = mode === 'base' && (onRtoBranch || step.failsHere || step.outcome === 'rto' || step.outcome === 'returned');
      if (mode === 'base' && (step.failsHere || step.outcome === 'rto')) onRtoBranch = true;

      const failedOutcome = step.outcome === 'rto' || step.outcome === 'returned';
      const lineColor = progressMode
        ? failedOutcome
          ? 'var(--zone-red)'
          : 'var(--highlight)'
        : isRto
          ? 'var(--zone-red)'
          : mode === 'etdb' && item.tool
            ? 'var(--highlight)'
            : 'var(--line-muted)';

      rows.push(
        <StepRow
          key={`${mode}-${step.id}`}
          step={step}
          rowIndex={rowIndex}
          mode={mode}
          lineColor={lineColor}
          opacity={1}
          spacing={68}
          isExpanded={expanded.has(step.id)}
          onToggle={() => toggleStep(step.id)}
          dashed={isRto}
          current={progressMode && step.id === currentStepId}
          align={stepAlign()}
          showConnector={!overlayLine}
          scrollProgress={overlayLine ? scrollProgress : undefined}
          activationThreshold={overlayLine ? (getStepThreshold?.(step.id) ?? 1) : undefined}
          registerDot={overlayLine && registerDot ? (el) => registerDot(step.id, el) : undefined}
        />,
      );
    });
  });

  if (showRecovery && mode === 'etdb' && recovery.length > 0) {
    pushPhaseBand('recover', recoveryNote);
    recovery.forEach((step) => {
      if (!includesMode(step.modes, mode)) return;
      rowIndex += 1;
      rows.push(
        <StepRow
          key={`${mode}-${step.id}`}
          step={step}
          rowIndex={rowIndex}
          mode={mode}
          lineColor={step.tool ? 'var(--highlight)' : 'var(--line-muted)'}
          opacity={1}
          spacing={68}
          isExpanded={expanded.has(step.id)}
          onToggle={() => toggleStep(step.id)}
        />,
      );
    });
  }

  return rows;
}
