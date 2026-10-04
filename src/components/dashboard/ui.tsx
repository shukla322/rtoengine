import { useEffect, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Sparkline } from './charts';
import s from './Dashboard.module.css';

const enter = { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, ease: 'easeOut' } } as const;

export function Card({ title, subtitle, action, children, className = '' }: {
  title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <motion.section className={`${s.card} ${className}`} {...enter}>
      <div className={s.cardHeading}>
        <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
        {action}
      </div>
      {children}
    </motion.section>
  );
}

/** Springs to each new value and writes the formatted text straight to the DOM. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const target = useMotionValue(0);
  const spring = useSpring(target, { stiffness: 90, damping: 22 });
  const text = useTransform(() => format(spring.get()));
  useEffect(() => { target.set(value); }, [value, target]);
  return <motion.span>{text}</motion.span>;
}

export function StatTile({ label, value, format, note, benchmark, trend, color, accent = false }: {
  label: string; value: number; format: (n: number) => string; note: string;
  benchmark?: string; trend?: number[]; color?: string; accent?: boolean;
}) {
  return (
    <motion.div className={`${s.stat} ${accent ? s.statAccent : ''}`} {...enter}>
      <span className={s.statLabel}>{label}</span>
      <strong><AnimatedNumber value={value} format={format} /></strong>
      {trend && <Sparkline values={trend} color={color} />}
      <small>{note}</small>
      {benchmark && <span className={s.benchmark}>{benchmark}</span>}
    </motion.div>
  );
}

export interface KpiRow { label: string; value: string; help: string; model?: string }

/** A KPI list as in the KPI framework: label, cohort value, and the workbook benchmark when one exists. */
export function KpiList({ rows }: { rows: KpiRow[] }) {
  return (
    <dl className={s.kpiList}>
      {rows.map(r => (
        <div key={r.label}>
          <dt>{r.label}<small>{r.help}</small></dt>
          <dd>{r.value}{r.model && <span className={s.modelValue}>Plan {r.model}</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className={s.segmented} role="radiogroup" aria-label={label}>
      {options.map(o => (
        <button key={o} role="radio" aria-checked={value === o} onClick={() => onChange(o)}>
          {value === o && <motion.span layoutId={`seg-${label}`} className={s.segmentedThumb} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className={s.segmentedText}>{o}</span>
        </button>
      ))}
    </div>
  );
}

export function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return <div className={s.sectionTitle}><span className={s.eyebrow}>{eyebrow}</span><h2>{title}</h2></div>;
}
