import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion } from 'motion/react';
import s from './Dashboard.module.css';

/** Categorical slots, validated for lightness, chroma and colour-blind separation on the light surface. */
export const COLORS = { pds: '#9b2f78', rts: '#d97f0f', combined: '#119b85', muted: '#cdbfcb' };
export const ZONE_COLORS = { Green: '#1f8a55', Yellow: '#d9a21b', Red: '#c23b3b' } as const;

const draw = { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 0.9, ease: 'easeOut' } } as const;

function useWidth<T extends HTMLElement>(fallback = 640) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.abs(v) < step / 1e6 ? 0 : v);
  return ticks;
}

export interface Series { key: string; label: string; color: string; values: number[] }

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className={s.legend}>
      {items.map(i => <span key={i.label}><i style={{ background: i.color }} className={i.dashed ? s.legendDashed : ''} />{i.label}</span>)}
    </div>
  );
}

/**
 * Time series with a crosshair tooltip. `stacked` draws filled areas that add up to a total;
 * otherwise each series is a line. Hover, touch or arrow keys move the crosshair.
 */
export function TimeChart({ labels, series, format, stacked = false, height = 250, markers = [], ariaLabel }: {
  labels: string[]; series: Series[]; format: (n: number) => string; stacked?: boolean; height?: number;
  markers?: { index: number; label: string }[]; ariaLabel: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = labels.length;
  const pad = { l: 58, r: 16, t: 14, b: 30 };
  const plotW = Math.max(10, width - pad.l - pad.r), plotH = height - pad.t - pad.b;

  const layers = useMemo(() => {
    let floor = Array(n).fill(0);
    return series.map(se => {
      const base = stacked ? floor : Array(n).fill(0);
      const top = se.values.map((v, i) => base[i] + v);
      if (stacked) floor = top;
      return { ...se, base, top };
    });
  }, [series, stacked, n]);
  const all = layers.flatMap(l => [...l.top, ...l.base]);
  const ticks = niceTicks(Math.min(0, ...all), Math.max(1, ...all));
  const lo = ticks[0], hi = ticks[ticks.length - 1];
  const x = (i: number) => pad.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => pad.t + plotH - ((v - lo) / (hi - lo || 1)) * plotH;
  const line = (vals: number[]) => vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = (top: number[], base: number[]) => `${line(top)} ${base.map((_, i) =>`L${x(n - 1 - i).toFixed(1)},${y(base[n - 1 - i]).toFixed(1)}`).join(' ')} Z`;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(plotW / 78))));

  const pick = (e: PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(n - 1, Math.round(((e.clientX - box.left) / box.width) * (n - 1)))));
  };
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover(h => Math.min(n - 1, (h ?? -1) + 1));
    if (e.key === 'ArrowLeft') setHover(h => Math.max(0, (h ?? n) - 1));
    if (e.key === 'Escape') setHover(null);
  };
  // The tooltip sits beside the crosshair, on whichever side has more room.
  const tipStyle = hover === null ? {} : x(hover) > width / 2
    ? { left: x(hover) - 14, transform: 'translateX(-100%)' } : { left: x(hover) + 14 };

  return (
    <div ref={ref} className={s.chartFrame} tabIndex={0} role="img" aria-label={ariaLabel} onKeyDown={keys} onBlur={() => setHover(null)}>
      <svg width={width} height={height} className={s.chart}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} className={t === 0 ? s.axisZero : s.grid} />
            <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end">{format(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (i % labelEvery === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= labelEvery * 0.6)
          ? <text key={i} x={x(i)} y={height - 9} textAnchor="middle">{l}</text> : null)}
        {stacked && layers.map(l => <motion.path key={`a-${l.key}`} d={area(l.top, l.base)} fill={l.color} initial={{ opacity: 0 }} animate={{ opacity: 0.14 }} transition={{ duration: 0.6 }} />)}
        {layers.map(l => <motion.path key={`l-${l.key}-${n}`} d={line(l.top)} fill="none" stroke={l.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" {...draw} />)}
        {markers.map((mk, i) => (
          <g key={mk.label} className={s.marker}>
            <line x1={x(mk.index)} x2={x(mk.index)} y1={pad.t} y2={pad.t + plotH} />
            <text x={x(mk.index) + 5} y={pad.t + 10 + i * 15}>{mk.label}</text>
          </g>
        ))}
        {layers.map(l => <circle key={`end-${l.key}`} cx={x(n - 1)} cy={y(l.top[n - 1])} r={4} fill={l.color} className={s.dotRing} />)}
        {hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + plotH} className={s.crosshair} />
            {layers.map(l => <circle key={l.key} cx={x(hover)} cy={y(l.top[hover])} r={5} fill={l.color} className={s.dotRing} />)}
          </g>
        )}
        <rect x={pad.l} y={pad.t} width={plotW} height={plotH} fill="transparent" onPointerMove={pick} onPointerDown={pick} onPointerLeave={() => setHover(null)} />
      </svg>
      {hover !== null && (
        <div className={s.tooltip} style={tipStyle}>
          <b>{labels[hover]}</b>
          {/* Stacked charts list top layer first; line charts follow the legend order. */}
          {(stacked ? [...layers].reverse() : layers).map(l => <span key={l.key}><i style={{ background: l.color }} />{l.label}<em>{format(l.values[hover])}</em></span>)}
          {stacked && layers.length > 1 && <span className={s.tooltipTotal}>Total<em>{format(layers[layers.length - 1].top[hover])}</em></span>}
        </div>
      )}
    </div>
  );
}

/** Small trend line for stat tiles. Decorative: the tile's value carries the number. */
export function Sparkline({ values, color = COLORS.pds }: { values: number[]; color?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>(160);
  const h = 34;
  if (values.length < 2) return <div ref={ref} className={s.spark} />;
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  const pts = values.map((v, i) => [3 + (i / (values.length - 1)) * (width - 8), 4 + (1 - (v - min) / span) * (h - 8)]);
  const last = pts[pts.length - 1];
  return (
    <div ref={ref} className={s.spark} aria-hidden="true">
      <svg width={width} height={h}>
        <path d={`M${pts[0][0]},${h} ${pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} L${last[0]},${h} Z`} fill={color} opacity={0.08} />
        <motion.path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} fill="none" stroke={color} strokeWidth={1.75} strokeLinejoin="round" {...draw} />
        <circle cx={last[0]} cy={last[1]} r={3} fill={color} className={s.dotRing} />
      </svg>
    </div>
  );
}

/** Part-to-whole ring. Hovering a slice or its legend row shows that slice in the centre. */
export function Donut({ slices, centerLabel, format }: {
  slices: { label: string; value: number; color: string; note?: string }[]; centerLabel: string; format: (n: number) => string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((a, b) => a + b.value, 0) || 1;
  const r = 62, c = 2 * Math.PI * r, gap = 3;
  let offset = 0;
  const shown = active === null ? null : slices[active];
  return (
    <div className={s.donut}>
      <svg viewBox="0 0 160 160" role="img" aria-label={`${centerLabel}: ${slices.map(sl => `${sl.label} ${format(sl.value)}`).join(', ')}`}>
        <circle cx="80" cy="80" r={r} fill="none" className={s.donutTrack} strokeWidth="20" />
        {slices.map((sl, i) => {
          const len = (sl.value / total) * c;
          const el = (
            <motion.circle key={sl.label} cx="80" cy="80" r={r} fill="none" stroke={sl.color} strokeWidth={active === i ? 24 : 20}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 80 80)"
              initial={{ opacity: 0 }} animate={{ opacity: active === null || active === i ? 1 : 0.35 }} transition={{ duration: 0.4, delay: i * 0.08 }}
              onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} />
          );
          offset += len;
          return el;
        })}
        <text x="80" y="76" textAnchor="middle" className={s.donutValue}>{shown ? format(shown.value) : format(total)}</text>
        <text x="80" y="94" textAnchor="middle" className={s.donutLabel}>{shown ? shown.label : centerLabel}</text>
      </svg>
      <ul className={s.donutLegend}>
        {slices.map((sl, i) => (
          <li key={sl.label} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
            <i style={{ background: sl.color }} /><span>{sl.label}{sl.note && <small>{sl.note}</small>}</span><b>{((sl.value / total) * 100).toFixed(1)}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Horizontal bar with its label above and the value at the right. */
export function BarRow({ label, share, display, color = COLORS.pds, note }: { label: string; share: number; display: string; color?: string; note?: string }) {
  return (
    <div className={s.barRow}>
      <div><span>{label}{note && <small>{note}</small>}</span><b>{display}</b></div>
      <div className={s.track}>
        <motion.span style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, Math.max(0, share * 100))}%` }} transition={{ duration: 0.7, ease: 'easeOut' }} />
      </div>
    </div>
  );
}

/** Two bars per category against one shared scale (e.g. predicted vs actual). */
export function PairedBars({ rows, keys, format }: {
  rows: { label: string; values: [number, number] }[]; keys: [{ label: string; color: string }, { label: string; color: string }]; format: (n: number) => string;
}) {
  const max = Math.max(...rows.flatMap(r => r.values), 0.0001);
  return (
    <div className={s.paired}>
      <Legend items={keys} />
      {rows.map(r => (
        <div key={r.label} className={s.pairedRow}>
          <span>{r.label}</span>
          <div>
            {r.values.map((v, i) => (
              <div key={i} className={s.pairedBar} title={`${keys[i].label}: ${format(v)}`}>
                <motion.i style={{ background: keys[i].color }} initial={{ width: 0 }} animate={{ width: `${(v / max) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.08 }} />
                <b>{format(v)}</b>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Bridge from gross savings to net: positive steps rise, costs fall, the total lands on the baseline. */
export function Waterfall({ steps, format }: { steps: { label: string; short: string; value: number; color: string; total?: boolean }[]; format: (n: number) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const height = 230, pad = { l: 8, r: 8, t: 22, b: 40 };
  let run = 0;
  const bars = steps.map(st => {
    const from = st.total ? 0 : run;
    const to = st.total ? st.value : run + st.value;
    if (!st.total) run = to;
    return { ...st, from, to };
  });
  const max = Math.max(1, ...bars.map(b => Math.max(b.from, b.to)));
  const min = Math.min(0, ...bars.map(b => Math.min(b.from, b.to)));
  const plotH = height - pad.t - pad.b;
  const y = (v: number) => pad.t + plotH - ((v - min) / (max - min)) * plotH;
  const slot = (width - pad.l - pad.r) / bars.length;
  const barW = Math.min(44, slot * 0.5);
  const narrow = slot < 90; // phones: one short label per bar, smaller value text
  return (
    <div ref={ref} className={s.chartFrame}>
      <svg width={width} height={height} className={s.chart} role="img" aria-label={bars.map(b => `${b.label} ${format(b.value)}`).join(', ')}>
        <line x1={pad.l} x2={width - pad.r} y1={y(0)} y2={y(0)} className={s.axisZero} />
        {bars.map((b, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const top = y(Math.max(b.from, b.to)), h = Math.max(2, Math.abs(y(b.from) - y(b.to)));
          return (
            <g key={b.label} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              {i > 0 && !b.total && <line x1={cx - slot + barW / 2} x2={cx - barW / 2} y1={y(b.from)} y2={y(b.from)} className={s.connector} />}
              <motion.rect x={cx - barW / 2} width={barW} rx={4} fill={b.color} opacity={hover === null || hover === i ? 1 : 0.45}
                initial={{ y: y(0), height: 0 }} animate={{ y: top, height: h }} transition={{ duration: 0.7, delay: i * 0.08, ease: 'easeOut' }} />
              <text x={cx} y={top - 7} textAnchor="middle" className={s.capLabel} fontSize={narrow ? 9.5 : undefined}>{format(b.value)}</text>
              {narrow ? <text x={cx} y={height - 16} textAnchor="middle">{b.short}</text> : <>
                <text x={cx} y={height - 22} textAnchor="middle">{b.label.split(' ')[0]}</text>
                <text x={cx} y={height - 9} textAnchor="middle">{b.label.split(' ').slice(1).join(' ')}</text>
              </>}
              <rect x={cx - slot / 2} y={pad.t} width={slot} height={plotH} fill="transparent" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Sensitivity tornado: each input's downside and upside swing around the Base case. */
export function Tornado({ rows, format }: { rows: { label: string; low: number; high: number }[]; format: (n: number) => string }) {
  const max = Math.max(...rows.flatMap(r => [Math.abs(r.low), Math.abs(r.high)]), 0.0001);
  return (
    <div className={s.tornado}>
      <Legend items={[{ label: 'Downside', color: COLORS.rts }, { label: 'Upside', color: COLORS.combined }]} />
      {rows.map((r, i) => (
        <div key={r.label} className={s.tornadoRow}>
          <span>{r.label}</span>
          <div className={s.tornadoBars}>
            <div className={s.tornadoLeft}>
              <b>{format(r.low)}</b>
              <motion.i style={{ background: COLORS.rts }} initial={{ width: 0 }} animate={{ width: `${(Math.abs(r.low) / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
            </div>
            <div className={s.tornadoRight}>
              <motion.i style={{ background: COLORS.combined }} initial={{ width: 0 }} animate={{ width: `${(Math.abs(r.high) / max) * 100}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} />
              <b>+{format(r.high)}</b>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
