import { rtsModel } from '../../../utils/financialModel';
import { financials, fmt, pct, ratio, rupees, type DashboardOrder, type Summary } from '../../../utils/dashboardData';
import { BENCHMARK, rolling, rtsRows, type Daily } from '../kpis';
import { BarRow, COLORS } from '../charts';
import { Card, KpiList, StatTile } from '../ui';
import { STATUS_META } from '../LiveFeed';
import s from '../Dashboard.module.css';

const levels = rtsModel('Base').levels;
const LEVEL_COLORS = [COLORS.pds, COLORS.rts, COLORS.combined];

export function RtsTab({ orders, m, daily, onSelect }: { orders: DashboardOrder[]; m: Summary; daily: Daily; onSelect: (o: DashboardOrder) => void }) {
  const rtsNet = m.rtsGross - m.rtsCost;
  // Only parcels already refused at the door: an order still out for delivery hasn't become an RTS case yet.
  const recoveries = orders.filter(o => o.refused && o.eligible && !['In transit', 'Held at hub', 'Out for delivery'].includes(o.status)).slice(0, 12);
  const maxValue = Math.max(...levels.map(l => l.valueIfDelivered));
  let reaching = m.eligible;
  return (
    <>
      <div className={s.stats}>
        <StatTile accent label="Parcels recovered" value={m.recovered} format={fmt} note="Refused parcels delivered to a new buyer"
          trend={rolling(daily, d => d.recovered, () => 1)} color={COLORS.rts} />
        <StatTile label="Net RTS savings" value={rtsNet} format={v => rupees(v, true)} note="Avoided reverse + fresh shipments − all RTS spend"
          benchmark={`Plan ${rupees(BENCHMARK.rtsNetPer1000)} per 1k parcels`} trend={rolling(daily, d => d.rtsGross - d.rtsCost, () => 1)} color={COLORS.rts} />
        <StatTile label="Return per ₹1 spent" value={ratio(m.rtsGross, m.rtsCost)} format={v => `${v.toFixed(2)}×`}
          note="Money saved / intervention cost" benchmark={`Plan ${BENCHMARK.rtsReturn.toFixed(2)}×`} trend={rolling(daily, d => d.rtsGross, d => d.rtsCost)} color={COLORS.rts} />
        <StatTile label="RTS cases in progress" value={m.activeRts} format={fmt} note="Parcels being matched or in transit to a resale buyer" color={COLORS.rts} />
      </div>

      <div className={s.twoColumns}>
        <Card title="Recovery by level" subtitle="Sequential funnel · a level only sees parcels the earlier levels missed">
          {levels.map((l, i) => {
            const reached = reaching;
            reaching -= m.matchedBy[l.name];
            const won = m.recoveredBy[l.name];
            return <BarRow key={l.name} label={`${l.name} · ${l.label}`} note={`${fmt(reached)} parcels reached this level · plan match ${pct(l.match, 0)}`}
              share={ratio(won, reached) / 0.08} display={`${fmt(won)} resold · ${pct(ratio(won, reached))}`} color={LEVEL_COLORS[i]} />;
          })}
          <p className={s.note}>Bar length is on a 0–8% scale. Base-case match rates: {levels.map(l => pct(l.match, 0)).join(', ')} of parcels reaching each level.</p>
        </Card>
        <Card title="RTS & value recovery" subtitle="Actuals against the base-case plan"><KpiList rows={rtsRows(m)} /></Card>
      </div>

      <div className={s.twoColumns}>
        <Card title="Value of one recovered parcel" subtitle="What each level avoids and spends">
          {levels.map((l, i) => (
            <div className={s.economyRow} key={l.name}>
              <span className={s.stageCode} style={{ borderColor: LEVEL_COLORS[i] }}>{l.name}</span>
              <div className={s.economyBody}>
                <BarRow label={l.label} share={l.valueIfDelivered / maxValue} display={`${rupees(l.valueIfDelivered)} if delivered`} color={LEVEL_COLORS[i]}
                  note={`${rupees(l.reverseAvoided)} reverse + ₹35 fresh shipment − ${rupees(l.movement)} movement − ₹4 handling − ${rupees(l.incentive)} incentive`} />
                <small>Expected value after re-RTO risk {rupees(l.expectedValue)} · still pays while re-RTO stays below {pct(l.breakEvenReRto, 0)}</small>
              </div>
            </div>
          ))}
          <p className={s.note}>P3 parcels are intercepted at the reverse sort hub, so ₹36.40 of the ₹70 reverse journey is already spent. A failed resale loses its movement and handling cost.</p>
        </Card>
        <Card title="Recovery cases" subtitle="Latest eligible refusals">
          <div className={s.recoveryList}>
            {recoveries.map(o => (
              <button key={o.id} onClick={() => onSelect(o)}>
                <span className={s.stageCode}>{o.stage ?? 'RTO'}</span>
                <span><strong>{o.product}</strong><small>{o.id} · {o.to}{o.stage ? ` → ${o.resaleTo}` : ''}</small></span>
                <span className={s[STATUS_META[o.status].tone]}>{o.status}<small>{rupees(financials(o).net)} net</small></span>
              </button>
            ))}
          </div>
          {!recoveries.length && <p className={s.empty}>No RTS cases in this period.</p>}
        </Card>
      </div>
    </>
  );
}
