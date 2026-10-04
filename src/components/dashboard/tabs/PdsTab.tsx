import { NETWORK, PDS, zoneRto, type Zone } from '../../../utils/financialModel';
import { fmt, pct, ratio, rupees, type Summary } from '../../../utils/dashboardData';
import { BENCHMARK, deliveryRows, interventionRows, predictionRows, rolling, type Daily } from '../kpis';
import { BarRow, COLORS, Donut, PairedBars, ZONE_COLORS } from '../charts';
import { Card, KpiList, StatTile } from '../ui';
import s from '../Dashboard.module.css';

const ZONES: Zone[] = ['Green', 'Yellow', 'Red'];
const CHANNELS = ['Observe', ...PDS.layers.map(l => l.name), 'Prepaid incentive'];

export function PdsTab({ m, daily }: { m: Summary; daily: Daily }) {
  const pdsNet = m.pdsGross - m.pdsCost;
  const totalChannelCost = Object.values(m.channelCost).reduce((a, c) => a + c.cost, 0);
  return (
    <>
      <div className={s.stats}>
        <StatTile accent label="RTOs prevented" value={m.prevented} format={fmt} note="Would-be RTOs that delivered after PDS"
          trend={rolling(daily, d => d.prevented, () => 1)} color={COLORS.pds} />
        <StatTile label="PDS net savings" value={pdsNet} format={v => rupees(v, true)} note="Avoided loss − nudges, incentives and false positives"
          benchmark={`Plan ${rupees(BENCHMARK.pdsNetPer1000)} per 1k COD`} trend={rolling(daily, d => d.pdsGross - d.pdsCost, () => 1)} color={COLORS.pds} />
        <StatTile label="Return per ₹1 spent" value={ratio(m.pdsGross, m.pdsCostClosed)} format={v => `${v.toFixed(2)}×`}
          note="Gross avoided loss / PDS variable cost" benchmark={`Plan ${BENCHMARK.pdsReturn.toFixed(2)}×`} trend={rolling(daily, d => d.pdsGross, d => d.pdsCostClosed)} color={COLORS.pds} />
        <StatTile label="COD RTO after PDS" value={ratio(m.codRefused, m.codClosed) * 100} format={v => `${v.toFixed(1)}%`}
          note={`Down from ${pct(NETWORK.codRto)} without PDS`} benchmark={`Plan ${pct(BENCHMARK.codRtoAfterPds)}`} trend={rolling(daily, d => d.codRefused, d => d.codClosed)} color={COLORS.pds} />
      </div>

      <div className={s.twoColumns}>
        <Card title="Where the risk sits" subtitle="COD orders by PDS zone at placement · prepaid orders are auto-Green">
          <Donut centerLabel="COD orders" format={fmt} slices={ZONES.map(z => ({
            label: z, value: m.zone[z].orders, color: ZONE_COLORS[z], note: `Baseline RTO ${pct(zoneRto[z], 0)}`,
          }))} />
        </Card>
        <Card title="RTO by zone: predicted vs actual" subtitle="Predicted baseline risk vs observed RTO after PDS, COD orders">
          <PairedBars format={v => pct(v)} keys={[{ label: 'Predicted (no PDS)', color: COLORS.muted }, { label: 'Actual after PDS', color: COLORS.pds }]}
            rows={ZONES.map(z => ({ label: z, values: [zoneRto[z], ratio(m.zone[z].refused, m.zone[z].orders)] as [number, number] }))} />
          <p className={s.note}>Green orders get no action by design. Yellow gets light touches; Red gets the prepaid offer before dispatch, then up to four nudge layers.</p>
        </Card>
      </div>

      <div className={s.twoColumns}>
        <Card title="Prediction & PDS quality" subtitle="Does the score separate risky orders from safe ones?"><KpiList rows={predictionRows(m)} /></Card>
        <Card title="Intervention & customer intent" subtitle="What happens after the score triggers an action"><KpiList rows={interventionRows(m)} /></Card>
      </div>

      <div className={s.twoColumns}>
        <Card title="Delivery & Valmo execution" subtitle="Last-mile execution on completed shipments"><KpiList rows={deliveryRows(m)} /></Card>
        <Card title="Intervention spend by channel" subtitle="Orders grouped by the highest layer used · cost includes earlier touches">
          {CHANNELS.map(ch => {
            const c = m.channelCost[ch] ?? { orders: 0, cost: 0 };
            return <BarRow key={ch} label={`${ch} · ${fmt(c.orders)} orders`} share={ratio(c.cost, totalChannelCost)} display={rupees(c.cost, true)} />;
          })}
          <p className={s.note}>Unit costs: app ₹0.05, WhatsApp ₹0.30, AI call ₹5, support executive ₹20, prepaid incentive ₹15. Each cancellation caused by a strong nudge costs ₹50.</p>
        </Card>
      </div>
    </>
  );
}
