import { motion } from 'motion/react';
import { NETWORK, combinedModel } from '../../../utils/financialModel';
import { crore, fmt, pct, ratio, rupees, type DashboardOrder, type Summary } from '../../../utils/dashboardData';
import { BENCHMARK, LEAD_DAYS, effectiveRto, rolling, type Daily } from '../kpis';
import { BarRow, COLORS, Legend, Sparkline, TimeChart, Waterfall } from '../charts';
import { AnimatedNumber, Card, StatTile } from '../ui';
import { LiveFeed } from '../LiveFeed';
import { OrderTable, shortDate } from '../OrderTable';
import type { FeedEvent } from '../useOrderStore';
import s from '../Dashboard.module.css';

const base = combinedModel('Base');
const fixedRunCostCrore = base.pds.annualFixed + base.rts.annualFixed;

export function Overview({ orders, allOrders, m, daily, events, live, setLive, tickMs, onSelect, openOrders }: {
  orders: DashboardOrder[]; allOrders: DashboardOrder[]; m: Summary; daily: Daily; events: FeedEvent[];
  live: boolean; setLive: (v: boolean) => void; tickMs: number; onSelect: (o: DashboardOrder) => void; openOrders: () => void;
}) {
  const visible = daily.slice(LEAD_DAYS);
  const labels = visible.map(d => shortDate(d.date));
  let pdsRun = 0, rtsRun = 0;
  const pdsCum = visible.map(d => (pdsRun += d.m.pdsGross - d.m.pdsCost));
  const rtsCum = visible.map(d => (rtsRun += d.m.rtsGross - d.m.rtsCost));

  const pdsNet = m.pdsGross - m.pdsCost, rtsNet = m.rtsGross - m.rtsCost;
  const runRate = ratio(m.netClosed, m.closed) * NETWORK.ordersPerYear / 1e7 - fixedRunCostCrore;
  const pdsShare = ratio(Math.max(0, pdsNet), Math.max(0, pdsNet) + Math.max(0, rtsNet));
  const before = ratio(m.baseline, m.closed), afterPds = ratio(m.refused, m.closed), afterRts = effectiveRto(m);

  return (
    <>
      <div className={s.heroGrid}>
        <motion.div className={s.northStar} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className={s.eyebrow}>North Star · RTO rate</span>
          <div className={s.bigNumber}>
            <AnimatedNumber value={afterRts * 100} format={v => `${v.toFixed(1)}%`} />
            <span>of shipped orders return to origin</span>
          </div>
          <p>{fmt(m.returned)} returned to seller of {fmt(m.closed)} completed shipments · plan {pct(BENCHMARK.effectiveRto, 2)}</p>
          <Sparkline values={rolling(daily, d => d.returned, d => d.closed)} color="#f4c27a" />
          <div className={s.stepdown}>
            {[['Before PDS', before, BENCHMARK.rtoBeforePds], ['After PDS', afterPds, BENCHMARK.rtoAfterPds], ['After PDS + RTS', afterRts, BENCHMARK.effectiveRto]].map(([label, v, model]) => (
              <div key={label as string}>
                <span>{label}</span>
                <b>{pct(v as number)}</b>
                <i style={{ width: `${((v as number) / 0.2) * 100}%` }} />
                <small>Plan {pct(model as number)}</small>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div className={s.savingsHero} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <span className={s.eyebrow}>Net variable savings · selected period</span>
          <strong><AnimatedNumber value={m.net} format={v => rupees(v, true)} /></strong>
          <p>Prevented RTO losses plus avoided logistics cost, less intervention spend</p>
          <div className={s.splitBar} aria-hidden="true">
            <motion.span style={{ background: COLORS.pds }} initial={{ width: 0 }} animate={{ width: `${pdsShare * 100}%` }} transition={{ duration: 0.8 }} />
            <motion.span style={{ background: COLORS.rts }} initial={{ width: 0 }} animate={{ width: `${(1 - pdsShare) * 100}%` }} transition={{ duration: 0.8 }} />
          </div>
          <div className={s.splitLegend}>
            <span><i style={{ background: COLORS.pds }} />PDS prevention<b>{rupees(pdsNet, true)}</b></span>
            <span><i style={{ background: COLORS.rts }} />RTS recovery<b>{rupees(rtsNet, true)}</b></span>
          </div>
          <div className={s.scaleNote}>
            <span>Annualised at network scale (2.7 bn orders a year)</span>
            <b>{crore(runRate)} / year</b>
            <small>Net saving per order × annual order volume, less fixed run costs · plan {crore(base.combinedAnnual)}</small>
          </div>
        </motion.div>
      </div>

      <div className={s.stats}>
        <StatTile label="First-attempt delivery rate" value={ratio(m.firstAttempt, m.closed) * 100} format={v => `${v.toFixed(1)}%`}
          note="Delivered on first attempt / completed shipments" trend={rolling(daily, d => d.firstAttempt, d => d.closed)} color={COLORS.combined} />
        <StatTile label="RTO prevention rate" value={ratio(m.prevented, m.codBaseline) * 100} format={v => `${v.toFixed(1)}%`}
          note={`${fmt(m.prevented)} of ${fmt(m.codBaseline)} would-be COD RTOs prevented`} benchmark={`Plan ${pct(BENCHMARK.preventionRate)}`}
          trend={rolling(daily, d => d.prevented, d => d.codBaseline)} color={COLORS.pds} />
        <StatTile label="Cost per RTO prevented" value={ratio(m.pdsCostClosed, m.prevented)} format={v => rupees(v)}
          note="All PDS spend / RTOs prevented · lower is better" benchmark={`Plan ${rupees(BENCHMARK.costPerPrevented)}`}
          trend={rolling(daily, d => d.pdsCostClosed, d => d.prevented)} color={COLORS.pds} />
        <StatTile label="RTS recovery rate" value={ratio(m.recovered, m.eligible) * 100} format={v => `${v.toFixed(1)}%`}
          note={`${fmt(m.recovered)} resold of ${fmt(m.eligible)} eligible refusals`} benchmark={`Plan ${pct(BENCHMARK.rtsRecovery)}`}
          trend={rolling(daily, d => d.recovered, d => d.eligible)} color={COLORS.rts} />
      </div>

      <div className={s.twoColumns}>
        <Card title="Cumulative savings" subtitle="Net variable savings by order date · hover or use arrow keys to inspect">
          {/* Separate lines, not stacked: each line sits at its own value, so RTS is never drawn above PDS unless it really is larger. */}
          <Legend items={[{ label: 'Total', color: COLORS.combined }, { label: 'PDS prevention', color: COLORS.pds }, { label: 'RTS recovery', color: COLORS.rts }]} />
          <TimeChart labels={labels} format={v => rupees(v, true)} ariaLabel="Cumulative PDS and RTS net savings over the selected period"
            series={[
              { key: 'total', label: 'Total', color: COLORS.combined, values: pdsCum.map((v, i) => v + rtsCum[i]) },
              { key: 'pds', label: 'PDS prevention', color: COLORS.pds, values: pdsCum },
              { key: 'rts', label: 'RTS recovery', color: COLORS.rts, values: rtsCum },
            ]} />
        </Card>
        <Card title="Where the value comes from" subtitle="Gross avoided cost, less total intervention spend">
          <Waterfall format={v => rupees(v, true)} steps={[
            { label: 'PDS avoided loss', short: 'PDS', value: m.pdsGross, color: COLORS.pds },
            { label: 'RTS avoided cost', short: 'RTS', value: m.rtsGross, color: COLORS.rts },
            { label: 'PDS spend', short: 'PDS −', value: -m.pdsCost, color: COLORS.muted },
            { label: 'RTS spend', short: 'RTS −', value: -m.rtsCost, color: COLORS.muted },
            { label: 'Net savings', short: 'Net', value: m.net, color: COLORS.combined, total: true },
          ]} />
          <p className={s.note}>{fmt(m.prevented)} RTOs prevented × ₹120 · {fmt(m.recovered)} parcels resold. Resale merchandise value of {rupees(m.resale, true)} is tracked separately and not counted as a saving.</p>
        </Card>
      </div>

      <div className={s.twoColumns}>
        <Card title="RTS recovery funnel" subtitle="Completed refusals in the selected period · each level only sees parcels the previous one missed">
          <BarRow label="Refused at the door" share={1} display={fmt(m.refused)} color={COLORS.muted} />
          <BarRow label="Eligible for resale" share={ratio(m.eligible, m.refused)} display={`${fmt(m.eligible)} · ${pct(ratio(m.eligible, m.refused), 0)}`} color={COLORS.muted} note="Sealed, undamaged, resaleable" />
          <BarRow label="Reassigned to a new buyer" share={ratio(m.matched, m.refused)} display={`${fmt(m.matched)} · P1 ${m.matchedBy.P1} · P2 ${m.matchedBy.P2} · P3 ${m.matchedBy.P3}`} color={COLORS.rts} />
          <BarRow label="Delivered to the new buyer" share={ratio(m.recovered, m.refused)} display={`${fmt(m.recovered)} · ${pct(ratio(m.recovered, m.eligible))} of eligible`} color={COLORS.combined} />
          <div className={s.pipelineFoot}>
            <span>{fmt(m.returned)} returned to seller</span>
            <span>{fmt(m.activeRts)} RTS cases in progress</span>
          </div>
        </Card>
        <LiveFeed orders={allOrders} events={events} live={live} setLive={setLive} onSelect={onSelect} tickMs={tickMs} />
      </div>

      <Card title="Recent orders" subtitle="Open any record for its route, journey and savings">
        <OrderTable orders={orders.slice(0, 6)} onSelect={onSelect} />
        <button className={s.textButton} onClick={openOrders}>View all {fmt(orders.length)} orders →</button>
      </Card>
    </>
  );
}
