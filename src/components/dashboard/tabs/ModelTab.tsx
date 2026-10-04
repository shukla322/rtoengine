import { useMemo, useState } from 'react';
import { SCENARIOS, combinedModel, redZoneRto, pdsTornado, rtsTornado, type Scenario } from '../../../utils/financialModel';
import { crore, pct, rupees } from '../../../utils/dashboardData';
import { BarRow, COLORS, Legend, TimeChart, Tornado } from '../charts';
import { Card, KpiList, Segmented, StatTile } from '../ui';
import s from '../Dashboard.module.css';

const pdsSwings = pdsTornado();
const rtsSwings = rtsTornado();
const allScenarios = SCENARIOS.map(combinedModel);
const months = allScenarios[0].pds.flows.map((_, i) => (i === 0 ? 'Pilot' : `M${i}`));
const paybackLabel = (m: number | null) => (m === null ? 'Beyond 24 months' : m === 0 ? 'During pilot' : `Month ${m}`);

export function ModelTab() {
  const [scenario, setScenario] = useState<Scenario>('Base');
  const c = useMemo(() => combinedModel(scenario), [scenario]);
  const base = allScenarios[1];
  const vsBase = (v: number, b: number) => (scenario === 'Base' ? 'Base case' : `Base ${crore(b)}`) + (scenario === 'Base' ? '' : ` · ${v >= b ? '+' : ''}${crore(v - b)}`);
  const markers = [
    ...(c.pds.payback !== null ? [{ index: c.pds.payback, label: `PDS payback M${c.pds.payback}` }] : []),
    ...(c.rts.payback !== null && c.rts.payback !== c.pds.payback ? [{ index: c.rts.payback, label: `RTS payback M${c.rts.payback}` }] : []),
  ];

  return (
    <>
      <div className={s.modelBanner}>
        <div>
          <span className={s.eyebrow}>Business case · steady state</span>
          <h2>PDS and RTS at network scale</h2>
          <p>Annualised savings, cash flow and sensitivity at 2.7 billion orders a year, by scenario. Independent of the date and city filters.</p>
        </div>
        <Segmented options={SCENARIOS} value={scenario} onChange={setScenario} label="Financial scenario" />
      </div>

      <div className={s.stats}>
        <StatTile accent label="PDS annual net saving" value={c.pds.annual} format={crore} note="Steady state, after ₹12 L/month run cost" benchmark={vsBase(c.pds.annual, base.pds.annual)} />
        <StatTile label="RTS annual net saving" value={c.rts.annual} format={crore} note="On the RTO pool left after PDS" benchmark={vsBase(c.rts.annual, base.rts.annual)} />
        <StatTile label="Combined annual net saving" value={c.combinedAnnual} format={crore} note="PDS + RTS, no double counting" benchmark={vsBase(c.combinedAnnual, base.combinedAnnual)} />
        <StatTile label="Effective RTO at scale" value={c.stepdown.afterRts * 100} format={v => `${v.toFixed(2)}%`} note={`Down from ${pct(c.stepdown.today)} today, all orders`} />
      </div>

      <div className={s.twoColumns}>
        <Card title="24-month cumulative net cash" subtitle={`${scenario} case · pilot, build, coverage ramp and festive peaks · ₹ crore`}>
          <Legend items={[{ label: 'PDS', color: COLORS.pds }, { label: 'RTS', color: COLORS.rts }, { label: 'Combined', color: COLORS.combined }]} />
          <TimeChart labels={months} format={v => `₹${Math.round(v)} Cr`} markers={markers} ariaLabel={`Cumulative net cash over 24 months, ${scenario} scenario`}
            series={[
              { key: 'pds', label: 'PDS', color: COLORS.pds, values: c.pds.cumulative },
              { key: 'rts', label: 'RTS', color: COLORS.rts, values: c.rts.cumulative },
              { key: 'all', label: 'Combined', color: COLORS.combined, values: c.combinedCumulative },
            ]} />
        </Card>
        <Card title="RTO stepdown" subtitle="Share of all orders returning to the seller">
          <BarRow label="Today" share={c.stepdown.today / 0.2} display={pct(c.stepdown.today, 2)} color={COLORS.muted} />
          <BarRow label="After PDS" note="Fewer orders turn into RTOs" share={c.stepdown.afterPds / 0.2} display={pct(c.stepdown.afterPds, 2)} color={COLORS.pds} />
          <BarRow label="After PDS + RTS" note="Refused parcels resold instead of returned" share={c.stepdown.afterRts / 0.2} display={pct(c.stepdown.afterRts, 2)} color={COLORS.combined} />
          <KpiList rows={[
            { label: 'Payback', value: `PDS ${paybackLabel(c.pds.payback)} · RTS ${paybackLabel(c.rts.payback)}`, help: 'First month cumulative cash turns positive, pilot included' },
            { label: 'NPV, first 24 months', value: `${crore(c.pds.npv)} · ${crore(c.rts.npv)}`, help: 'PDS · RTS, at a 12% annual discount rate' },
            { label: 'Pilot net P&L (90 days)', value: `${rupees(c.pds.pilotNet, true)} · ${rupees(c.rts.pilotNet, true)}`, help: 'PDS · RTS, 2 LMDC clusters, one-time MVP cost included' },
          ]} />
        </Card>
      </div>

      <div className={s.twoColumns}>
        <Card title="PDS unit economics" subtitle="Per 1,000 COD orders">
          <KpiList rows={[
            { label: 'RTOs avoided', value: c.pds.avoided.toFixed(1), help: `${c.pds.avoidedByNudges.toFixed(1)} by nudges + ${c.pds.avoidedByPrepaid.toFixed(1)} by the prepaid switch` },
            { label: 'Gross saving', value: rupees(c.pds.gross), help: 'RTOs avoided × ₹120 loss per RTO' },
            { label: 'Variable cost', value: `−${rupees(c.pds.variableCost)}`, help: `Nudges ${rupees(c.pds.nudgeCost)} · incentive ${rupees(c.pds.incentiveCost)} · false positives ${rupees(c.pds.falsePositiveCost)}` },
            { label: 'Net saving', value: rupees(c.pds.net), help: `${c.pds.returnPerRupee.toFixed(2)}× return per ₹1 · ${rupees(c.pds.costPerAvoided)} per RTO avoided` },
            { label: 'COD RTO', value: `${pct(c.pds.codRtoBefore)} → ${pct(c.pds.codRtoAfter)}`, help: `${pct(c.pds.relativeReduction)} relative reduction` },
          ]} />
        </Card>
        <Card title="RTS unit economics" subtitle="Per 1,000 RTO parcels">
          <KpiList rows={[
            { label: 'Parcels resold', value: c.rts.delivered.toFixed(1), help: c.rts.levels.map(l => `${l.name} ${l.delivered.toFixed(1)}`).join(' · ') },
            { label: 'Money saved', value: rupees(c.rts.saved), help: `Reverse journeys ${rupees(c.rts.reverseSaved)} + fresh shipments ${rupees(c.rts.freshSaved)}` },
            { label: 'Intervention cost', value: `−${rupees(c.rts.cost)}`, help: `Movement ${rupees(c.rts.movementCost)} · handling ${rupees(c.rts.handlingCost)} · incentives ${rupees(c.rts.incentiveCost)} · screening ${rupees(c.rts.screeningCost)}` },
            { label: 'Net saving', value: rupees(c.rts.net), help: `${c.rts.returnPerRupee.toFixed(2)}× return per ₹1 spent` },
            { label: 'Recovery rate', value: pct(c.rts.recoveryRateEligible), help: `Re-RTO ${pct(c.rts.reRtoRate)} of reassigned parcels` },
          ]} />
        </Card>
      </div>

      <div className={s.twoColumns}>
        <Card title="PDS sensitivity" subtitle="Change in annual net saving vs base case, ₹ crore">
          <Tornado rows={pdsSwings} format={v => `${Math.round(v)}`} />
        </Card>
        <Card title="RTS sensitivity" subtitle="Change in annual net saving vs base case, ₹ crore">
          <Tornado rows={rtsSwings} format={v => `${Math.round(v)}`} />
        </Card>
      </div>

      <Card title="Scenario comparison" subtitle="All three cases side by side">
        <div className={s.tableWrap}>
          <table>
            <thead><tr><th>Metric</th>{SCENARIOS.map(sc => <th key={sc} className={s.num} aria-current={sc === scenario || undefined}>{sc}</th>)}</tr></thead>
            <tbody>
              {([
                ['PDS annual net saving', m => crore(m.pds.annual)],
                ['RTS annual net saving', m => crore(m.rts.annual)],
                ['Combined annual net saving', m => crore(m.combinedAnnual)],
                ['PDS net per 1,000 COD orders', m => rupees(m.pds.net)],
                ['RTS net per 1,000 RTO parcels', m => rupees(m.rts.net)],
                ['COD RTO after PDS', m => pct(m.pds.codRtoAfter)],
                ['RTS recovery rate (eligible)', m => pct(m.rts.recoveryRateEligible)],
                ['Effective RTO, all orders', m => pct(m.stepdown.afterRts, 2)],
              ] as [string, (m: ReturnType<typeof combinedModel>) => string][]).map(([label, get]) => (
                <tr key={label}><td>{label}</td>{allScenarios.map((m, i) => <td key={i} className={`${s.num} ${SCENARIOS[i] === scenario ? s.currentCol : ''}`}>{get(m)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Key assumptions" subtitle="Base-case inputs behind the figures on this tab">
        <div className={s.sourceGrid}>
          <div>
            <h3>PDS · Pre-Delivery Score</h3>
            <p>80% COD, 20% COD RTO, 5% prepaid RTO, ₹50 forward cost, ₹120 loss per RTO, 2.7 bn orders a year. Zone mix 50 / 35 / 15 with Green 9% and Yellow 24% RTO; the Red rate ({pct(redZoneRto)}) is solved so the mix reconciles to 20%.</p>
            <p>Nudge layers: app ₹0.05, WhatsApp ₹0.30, AI call ₹5, executive ₹20; save rates 4 / 8 / 20 / 30%. Prepaid take-up 8 / 15 / 22% at ₹15. False positives 0.5% at ₹50. Build ₹75 L, run ₹12 L / month.</p>
          </div>
          <div>
            <h3>RTS · Returns recovery</h3>
            <p>RTO pool after PDS: 16.22% COD RTO, held constant across scenarios. 90% eligible; match 6 / 4 / 3% (Bear half, Bull 1.5×); re-RTO 8 / 10 / 10%.</p>
            <p>Avoided reverse ₹70 / ₹70 / ₹33.60; movement ₹21 / ₹36 / ₹31; handling ₹4; incentives ₹15 / ₹10 / ₹10; fresh shipment ₹35 (70% × ₹50); screening ₹1. Festive months +30% volume, +20% matches. Build ₹1 Cr, run ₹15 L / month.</p>
          </div>
          <div>
            <h3>Methodology</h3>
            <p>Annual savings are steady state at full network coverage, after recurring run costs. Base case: PDS {crore(base.pds.annual)}, RTS {crore(base.rts.annual)}, combined {crore(base.combinedAnnual)} a year.</p>
            <p>Operational KPIs on the other tabs are measured on orders in the selected period and shown against these base-case plan values.</p>
          </div>
        </div>
      </Card>
    </>
  );
}
