// The KPI framework (North Star, success KPIs and the four KPI groups), each measured on the
// synthetic cohort and paired with its Base-case benchmark from the workbooks where one exists.
import { combinedModel, redZoneShare, zoneRto, NETWORK, PDS } from '../../utils/financialModel';
import { fmt, pct, ratio, rupees, type byDay, type Summary } from '../../utils/dashboardData';
import type { KpiRow } from './ui';

const base = combinedModel('Base');
const yellow = base.pds.zones[1], red = base.pds.zones[2];
const contactedPer1000 = yellow.orders + red.orders; // every Yellow and non-converted Red order gets the app touch

export const BENCHMARK = {
  effectiveRto: base.stepdown.afterRts,
  rtoBeforePds: base.stepdown.today,
  rtoAfterPds: base.stepdown.afterPds,
  preventionRate: base.pds.relativeReduction,
  costPerPrevented: base.pds.costPerAvoided,
  rtsRecovery: base.rts.recoveryRateEligible,
  localReuse: base.rts.levels[0].delivered / base.rts.eligible,
  rerouteEnRoute: (base.rts.levels[1].delivered + base.rts.levels[2].delivered) / base.rts.eligible,
  reRto: base.rts.reRtoRate,
  reverseAvoided: base.rts.reverseAvoidedRate,
  rtsNetPer1000: base.rts.net,
  pdsNetPer1000: base.pds.net,
  pdsReturn: base.pds.returnPerRupee,
  rtsReturn: base.rts.returnPerRupee,
  codRtoAfterPds: base.pds.codRtoAfter,
  identified: (yellow.rtos + red.rtos + base.pds.converted * zoneRto.Red) / (1000 * NETWORK.codRto),
  safeFlagged: (1000 * redZoneShare * (1 - zoneRto.Red)) / (1000 * (1 - NETWORK.codRto)),
  escalation: (yellow.orders * PDS.layers[2].reach.Yellow + red.orders * PDS.layers[2].reach.Red) / contactedPer1000,
  zoneAfter: {
    Green: zoneRto.Green,
    Yellow: (yellow.rtos - yellow.avoided) / yellow.orders,
    Red: (red.rtos - red.avoided + base.pds.converted * NETWORK.prepaidRto) / (1000 * redZoneShare),
  },
};

export const effectiveRto = (m: Summary) => ratio(m.returned, m.closed);

export function predictionRows(m: Summary): KpiRow[] {
  const zoneRate = (z: 'Green' | 'Yellow' | 'Red') => ratio(m.zone[z].refused, m.zone[z].orders);
  const z = BENCHMARK.zoneAfter;
  return [
    { label: 'RTO % across Green / Yellow / Red', value: `${pct(zoneRate('Green'), 0)} / ${pct(zoneRate('Yellow'), 0)} / ${pct(zoneRate('Red'), 0)}`, help: 'Original RTO by zone at placement, COD orders, after PDS', model: `${pct(z.Green, 0)} / ${pct(z.Yellow, 0)} / ${pct(z.Red, 0)}` },
    { label: 'Safe orders wrongly flagged risky', value: pct(ratio(m.safeFlagged, m.safe)), help: 'Red-zone share of COD orders that would have delivered anyway', model: pct(BENCHMARK.safeFlagged) },
    { label: 'Actual RTOs identified beforehand', value: pct(ratio(m.codBaselineFlagged, m.codBaseline)), help: 'Would-be RTOs scored Yellow or Red at placement', model: pct(BENCHMARK.identified) },
    { label: 'Predicted risk vs actual RTO', value: `${pct(ratio(m.predictedRisk, m.codClosed))} → ${pct(ratio(m.codRefused, m.codClosed))}`, help: 'Mean predicted COD risk vs observed COD RTO after PDS', model: `${pct(NETWORK.codRto)} → ${pct(base.pds.codRtoAfter)}` },
    { label: 'Score change through the journey', value: `${ratio(m.scoreChange, m.closed) >= 0 ? '+' : ''}${ratio(m.scoreChange, m.closed).toFixed(1)} pts`, help: 'Latest PDS minus PDS at placement, averaged over completed orders' },
  ];
}

export function interventionRows(m: Summary): KpiRow[] {
  return [
    { label: 'RTO reduction vs control', value: pct(ratio(m.prevented, m.codBaseline)), help: `${fmt(m.prevented)} prevented of ${fmt(m.codBaseline)} would-be COD RTOs, against the no-PDS baseline`, model: pct(BENCHMARK.preventionRate) },
    { label: 'Intervention response rate', value: pct(ratio(m.responded, m.contacted)), help: 'Buyers who replied / buyers contacted' },
    { label: 'Escalation rate', value: pct(ratio(m.escalated, m.contacted)), help: 'Reached an AI or executive call / contacted', model: pct(BENCHMARK.escalation) },
    { label: 'Intent recovery rate', value: pct(ratio(m.intentRecovered, m.contacted)), help: 'Confirmed purchase intent / contacted' },
    { label: 'Cost per RTO prevented', value: m.prevented ? rupees(m.pdsCostClosed / m.prevented) : 'N/A', help: 'All PDS spend incl. false positives / RTOs prevented', model: rupees(BENCHMARK.costPerPrevented) },
  ];
}

export function deliveryRows(m: Summary): KpiRow[] {
  return [
    { label: 'First-attempt delivery rate', value: pct(ratio(m.firstAttempt, m.closed)), help: 'Delivered on the first attempt / completed shipments' },
    { label: 'Buyer–rider contact rate', value: pct(ratio(m.riderContacted, m.riderAttempted)), help: 'Rider reached the buyer / rider call attempts' },
    { label: 'Address resolution rate', value: pct(ratio(m.addressResolved, m.addressIssue)), help: `${fmt(m.addressResolved)} fixed of ${fmt(m.addressIssue)} address issues` },
    { label: 'Failed contact rate', value: pct(ratio(m.riderAttempted - m.riderContacted, m.riderAttempted)), help: 'Rider could not reach the buyer / attempts' },
    { label: 'Geo-verified attempt rate', value: pct(ratio(m.geoVerified, m.closed)), help: 'Attempts with a verified GPS location at the door' },
    { label: 'High-risk early delivery %', value: pct(ratio(m.early, m.redClosed)), help: 'Red-zone COD orders delivered ahead of schedule' },
  ];
}

export function rtsRows(m: Summary): KpiRow[] {
  const netRts = m.rtsGross - m.rtsCost;
  return [
    { label: 'RTS recovery rate', value: pct(ratio(m.recovered, m.eligible)), help: `${fmt(m.recovered)} resold of ${fmt(m.eligible)} eligible refusals`, model: pct(BENCHMARK.rtsRecovery) },
    { label: 'Local reuse rate', value: pct(ratio(m.recoveredBy.P1, m.eligible)), help: 'P1 · resold to a buyer served by the same LMDC', model: pct(BENCHMARK.localReuse) },
    { label: 'Reroute / en-route recovery rate', value: pct(ratio(m.recoveredBy.P2 + m.recoveredBy.P3, m.eligible)), help: 'P2 reroute + P3 intercept on the reverse corridor', model: pct(BENCHMARK.rerouteEnRoute) },
    { label: 'Re-RTO rate', value: pct(ratio(m.reRto, m.matched)), help: 'New buyer also refused / parcels reassigned', model: pct(BENCHMARK.reRto) },
    { label: 'Reverse journey avoided %', value: pct(ratio(m.recovered, m.matched)), help: 'Reassigned parcels that skipped the seller return', model: pct(BENCHMARK.reverseAvoided) },
    { label: 'Net RTS savings', value: rupees(netRts), help: `${rupees(ratio(netRts, m.refused) * 1000)} per 1,000 refused parcels`, model: `${rupees(BENCHMARK.rtsNetPer1000)}/1k` },
  ];
}

export type Daily = ReturnType<typeof byDay>;
/** Extra days loaded before the visible range so 7-day trends are full from the first point. */
export const LEAD_DAYS = 6;

/** Trailing 7-day ratio for each visible day, so sparklines show the trend rather than daily noise. */
export function rolling(daily: Daily, num: (m: Summary) => number, den: (m: Summary) => number) {
  return daily.slice(LEAD_DAYS).map((_, i) => {
    const window = daily.slice(i, i + LEAD_DAYS + 1);
    return ratio(window.reduce((a, d) => a + num(d.m), 0), window.reduce((a, d) => a + den(d.m), 0));
  });
}
