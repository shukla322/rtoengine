// Workbook engine. A direct translation of PDS_Financial_Model.xlsx and RTS_Financial_Model.xlsx.
// Cell references are noted next to each input so the two stay in sync. Base outputs are
// checked against the workbooks' cached values in tests/dashboard.cjs.

export type Scenario = 'Bear' | 'Base' | 'Bull';
export const SCENARIOS: Scenario[] = ['Bear', 'Base', 'Bull'];
const pick = <T,>(s: Scenario, values: [T, T, T]) => values[SCENARIOS.indexOf(s)];

export type Zone = 'Green' | 'Yellow' | 'Red';
export type Level = 'P1' | 'P2' | 'P3';

/** Shared operating data (both workbooks, Assumptions B1–B5, C1, C5). */
export const NETWORK = {
  codShare: 0.8,
  codRto: 0.2,
  prepaidRto: 0.05,
  forwardCost: 50,
  lossPerRto: 120,
  ordersPerYear: 2.7e9,
  daysPerMonth: 365 / 12,
  discountRate: 0.12,
};

/** PDS_Financial_Model.xlsx › Assumptions. */
export const PDS = {
  zones: { Green: { share: 0.5, rto: 0.09 }, Yellow: { share: 0.35, rto: 0.24 } }, // D1–D5; Red is derived (M2 D7)
  layers: [ // J1–J4
    { name: 'App notification', cost: 0.05, save: 0.04, reach: { Green: 0, Yellow: 1, Red: 1 } },
    { name: 'WhatsApp', cost: 0.3, save: 0.08, reach: { Green: 0, Yellow: 0.5, Red: 1 } },
    { name: 'AI voice call', cost: 5, save: 0.2, reach: { Green: 0, Yellow: 0.15, Red: 0.6 } },
    { name: 'Support executive', cost: 20, save: 0.3, reach: { Green: 0, Yellow: 0, Red: 0.25 } },
  ],
  effectiveness: [0.5, 1, 1.25] as [number, number, number], // E1
  channelCost: [1.5, 1, 0.8] as [number, number, number],    // E2
  fixedCost: [1.3, 1, 0.9] as [number, number, number],      // E3
  prepaidOffered: 1,                                          // F1
  prepaidTakeUp: [0.08, 0.15, 0.22] as [number, number, number], // F2
  prepaidIncentive: 15,                                       // F3
  falsePositiveRate: 0.005,                                   // G1
  falsePositiveCost: 50,                                      // G2
  buildCost: 7.5e6,                                           // H1
  runCostMonthly: 1.2e6,                                      // H2
  pilot: { clusters: 2, ordersPerDay: 8000, treatment: [0, 0.5, 0.8], oneTime: 1.5e6, runMonthly: 4e5 }, // I1–I7
  rampCoverage: [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, ...Array(14).fill(1)], // M7 row 6
};

/** RTS_Financial_Model.xlsx › Assumptions. */
export const RTS = {
  codRtoAfterPds: 0.1622,   // D2, typed in from the PDS model
  pdsAnnualNet: 597.78,     // D3
  eligibility: 0.9,         // F1
  levels: [                 // F2–F8, G3–G5, M2 rows 6 and 8
    { name: 'P1' as Level, label: 'Reuse locally', match: [0.03, 0.06, 0.09], reRto: 0.08, reverseAvoided: 70, movement: 21, incentive: 15 },
    { name: 'P2' as Level, label: 'Reroute', match: [0.02, 0.04, 0.06], reRto: 0.1, reverseAvoided: 70, movement: 36, incentive: 10 },
    { name: 'P3' as Level, label: 'Recover en route', match: [0.015, 0.03, 0.045], reRto: 0.1, reverseAvoided: 33.6, movement: 31, incentive: 10 },
  ],
  reRtoMultiplier: [1.5, 1, 0.75] as [number, number, number], // F5
  freshShipmentShare: 0.7,  // G1
  handling: 4,              // G2
  screening: 1,             // G6
  festiveVolume: 0.3,       // H1
  festiveMatch: 0.2,        // H2
  buildCost: 1e7,           // I1
  runCostMonthly: 1.5e6,    // I2
  fixedCost: [1.3, 1, 0.9] as [number, number, number], // I3
  pilot: { clusters: 2, ordersPerDay: 8000, live: [0, 0, 1], oneTime: 2e6, runMonthly: 3e5 }, // J1–J7
  rampCoverage: [0, 0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, ...Array(14).fill(1)], // M6 row 6
  festive: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0],         // M6 row 7
};

export const redZoneShare = 1 - PDS.zones.Green.share - PDS.zones.Yellow.share;
/** M2 D7: Red RTO is solved so the zone mix reconciles to the 20% COD RTO. */
export const redZoneRto = (NETWORK.codRto - PDS.zones.Green.share * PDS.zones.Green.rto - PDS.zones.Yellow.share * PDS.zones.Yellow.rto) / redZoneShare;
export const zoneRto: Record<Zone, number> = { Green: PDS.zones.Green.rto, Yellow: PDS.zones.Yellow.rto, Red: redZoneRto };
export const zoneShare: Record<Zone, number> = { Green: PDS.zones.Green.share, Yellow: PDS.zones.Yellow.share, Red: redZoneShare };
export const rtsLevelEconomics = RTS.levels.map(l => ({
  ...l,
  freshAvoided: NETWORK.forwardCost * RTS.freshShipmentShare,
  valueIfDelivered: l.reverseAvoided + NETWORK.forwardCost * RTS.freshShipmentShare - l.movement - RTS.handling - l.incentive,
  lossIfReRto: l.movement + RTS.handling,
}));

const monthlyRate = (1 + NETWORK.discountRate) ** (1 / 12) - 1;
const npv = (flows: number[]) => flows[0] + flows.slice(1).reduce((s, f, i) => s + f / (1 + monthlyRate) ** (i + 1), 0);
const cumulative = (flows: number[]) => flows.reduce<number[]>((acc, f) => [...acc, (acc.at(-1) ?? 0) + f], []);
const paybackMonth = (cum: number[]) => { const m = cum.findIndex(v => v >= 0); return m < 0 ? null : m; };
const pilotOrdersPerMonth = (p: { clusters: number; ordersPerDay: number }) => p.clusters * p.ordersPerDay * NETWORK.daysPerMonth;

/** Optional overrides used by the sensitivity tornado (PDS M8 rows 6–11). */
export interface PdsOverrides { effectiveness?: number; channelCost?: number; takeUp?: number; fixedCost?: number; lossPerRto?: number; ordersPerYear?: number }

/** PDS M2–M8 for one scenario, per 1,000 COD orders and at network scale. */
export function pdsModel(scenario: Scenario, o: PdsOverrides = {}) {
  const effectiveness = o.effectiveness ?? pick(scenario, PDS.effectiveness);
  const channel = o.channelCost ?? pick(scenario, PDS.channelCost);
  const takeUp = o.takeUp ?? pick(scenario, PDS.prepaidTakeUp);
  const fixed = o.fixedCost ?? pick(scenario, PDS.fixedCost);
  const loss = o.lossPerRto ?? NETWORK.lossPerRto;
  const ordersPerYear = o.ordersPerYear ?? NETWORK.ordersPerYear;

  // M3 step 1: prepaid offer on Red orders.
  const redOrders = 1000 * redZoneShare;
  const converted = redOrders * PDS.prepaidOffered * takeUp;
  const incentiveCost = converted * PDS.prepaidIncentive;
  const eligible: Record<Zone, number> = { Green: 1000 * zoneShare.Green, Yellow: 1000 * zoneShare.Yellow, Red: redOrders - converted };

  // M3 step 3 + M4: touches, cost, save rate and false positives by zone.
  const zones = (['Green', 'Yellow', 'Red'] as Zone[]).map(zone => {
    const orders = eligible[zone];
    const nudgeCost = PDS.layers.reduce((s, l) => s + orders * l.reach[zone] * l.cost * channel, 0);
    const saveRate = Math.min(1, PDS.layers.reduce((s, l) => s + l.reach[zone] * l.save, 0) * effectiveness);
    const rtos = orders * zoneRto[zone];
    const strongReach = PDS.layers[2].reach[zone] + PDS.layers[3].reach[zone];
    const falsePositiveCost = orders * (1 - zoneRto[zone]) * strongReach * PDS.falsePositiveRate * PDS.falsePositiveCost;
    return { zone, orders, rtos, saveRate, avoided: rtos * saveRate, nudgeCost, falsePositiveCost };
  });
  const nudgeCost = zones.reduce((s, z) => s + z.nudgeCost, 0);
  const falsePositiveCost = zones.reduce((s, z) => s + z.falsePositiveCost, 0);
  const avoidedByNudges = zones.reduce((s, z) => s + z.avoided, 0);
  const avoidedByPrepaid = converted * (redZoneRto - NETWORK.prepaidRto);
  const avoided = avoidedByNudges + avoidedByPrepaid;

  // M5 unit economics.
  const gross = avoided * loss;
  const variableCost = nudgeCost + incentiveCost + falsePositiveCost;
  const net = gross - variableCost;
  const codRtoAfter = (1000 * NETWORK.codRto - avoided) / 1000;
  const blendedBefore = NETWORK.codShare * NETWORK.codRto + (1 - NETWORK.codShare) * NETWORK.prepaidRto;
  const blendedAfter = NETWORK.codShare * codRtoAfter + (1 - NETWORK.codShare) * NETWORK.prepaidRto;

  // M8 rows 29–32: steady state at full scale (₹ crore).
  const codOrdersPerYear = ordersPerYear * NETWORK.codShare;
  const annualBeforeFixed = net / 1000 * codOrdersPerYear / 1e7;
  const annualFixed = PDS.runCostMonthly * 12 * fixed / 1e7;

  // M6 pilot and M7 24-month rollout (₹ crore).
  const pilotCod = pilotOrdersPerMonth(PDS.pilot) * NETWORK.codShare;
  const pilotMonths = PDS.pilot.treatment.map((share, i) => pilotCod * share * net / 1000 - PDS.pilot.runMonthly * fixed - (i === 0 ? PDS.pilot.oneTime * fixed : 0));
  const pilotNet = pilotMonths.reduce((a, b) => a + b, 0);
  const codOrdersPerMonth = ordersPerYear / 365 * NETWORK.codShare * NETWORK.daysPerMonth;
  const flows = PDS.rampCoverage.map((coverage, m) => m === 0 ? pilotNet / 1e7
    : (codOrdersPerMonth * coverage * net / 1000 - PDS.runCostMonthly * fixed - (m === 1 ? PDS.buildCost * fixed : 0)) / 1e7);
  const cum = cumulative(flows);

  return {
    scenario, zones, converted, incentiveCost, nudgeCost, falsePositiveCost, variableCost,
    avoidedByNudges, avoidedByPrepaid, avoided, gross, net,
    returnPerRupee: variableCost ? gross / variableCost : 0,
    costPerAvoided: avoided ? variableCost / avoided : 0,
    codRtoBefore: NETWORK.codRto, codRtoAfter, blendedBefore, blendedAfter,
    relativeReduction: avoided / (1000 * NETWORK.codRto),
    annualBeforeFixed, annualFixed, annual: annualBeforeFixed - annualFixed,
    rtosAvoidedPerYearLakh: avoided / 1000 * codOrdersPerYear / 1e5,
    pilotMonths, pilotNet, flows, cumulative: cum, payback: paybackMonth(cum), npv: npv(flows),
  };
}

export interface RtsOverrides { matchMultiplier?: number; reRtoMultiplier?: number; incentiveMultiplier?: number; freshShare?: number; eligibility?: number; fixedCost?: number; ordersPerYear?: number }

/** RTS M1–M8 for one scenario, per 1,000 RTO parcels and at network scale. */
export function rtsModel(scenario: Scenario, o: RtsOverrides = {}) {
  const reRtoMultiplier = (o.reRtoMultiplier ?? 1) * pick(scenario, RTS.reRtoMultiplier);
  const fixed = o.fixedCost ?? pick(scenario, RTS.fixedCost);
  const eligibility = o.eligibility ?? RTS.eligibility;
  const fresh = NETWORK.forwardCost * (o.freshShare ?? RTS.freshShipmentShare);
  const ordersPerYear = o.ordersPerYear ?? NETWORK.ordersPerYear;

  // M2 + M3: sequential funnel. Each level only sees parcels the previous levels did not match.
  const eligible = 1000 * eligibility;
  let reaching = eligible;
  const levels = RTS.levels.map(l => {
    const match = pick(scenario, l.match as [number, number, number]) * (o.matchMultiplier ?? 1);
    const reRto = l.reRto * reRtoMultiplier;
    const incentive = l.incentive * (o.incentiveMultiplier ?? 1);
    const valueIfDelivered = l.reverseAvoided + fresh - l.movement - RTS.handling - incentive;
    const lossIfReRto = l.movement + RTS.handling;
    const expectedValue = (1 - reRto) * valueIfDelivered - reRto * lossIfReRto;
    const gate = expectedValue > 0;
    const reached = reaching;
    const matched = gate ? reached * match : 0;
    reaching -= matched;
    return {
      ...l, match, reRto, incentive, valueIfDelivered, lossIfReRto, expectedValue, gate,
      breakEvenReRto: valueIfDelivered / (valueIfDelivered + lossIfReRto),
      reached, matched, delivered: matched * (1 - reRto), reRtoParcels: matched * reRto,
    };
  });
  const matched = levels.reduce((s, l) => s + l.matched, 0);
  const delivered = levels.reduce((s, l) => s + l.delivered, 0);

  // M4 unit economics.
  const movementCost = levels.reduce((s, l) => s + l.matched * l.movement, 0);
  const handlingCost = matched * RTS.handling;
  const incentiveCost = levels.reduce((s, l) => s + l.delivered * l.incentive, 0);
  const screeningCost = eligible * RTS.screening;
  const cost = movementCost + handlingCost + incentiveCost + screeningCost;
  const reverseSaved = levels.reduce((s, l) => s + l.delivered * l.reverseAvoided, 0);
  const freshSaved = delivered * fresh;
  const saved = reverseSaved + freshSaved;
  const net = saved - cost;

  // M1: pool entering RTS, after PDS (fixed at the RTS workbook's typed rate in every scenario, as M7 does).
  const rtoRateAfterPds = NETWORK.codShare * RTS.codRtoAfterPds + (1 - NETWORK.codShare) * NETWORK.prepaidRto;
  const parcelsPerYear = ordersPerYear * rtoRateAfterPds;
  const annualCost = parcelsPerYear * cost / 1000 / 1e7;
  const annualSaved = parcelsPerYear * saved / 1000 / 1e7;
  const annualFixed = RTS.runCostMonthly * 12 * fixed / 1e7;

  // M5 pilot and M6 rollout with festive peaks (₹ crore).
  const pilotParcels = pilotOrdersPerMonth(RTS.pilot) * rtoRateAfterPds;
  const pilotMonths = RTS.pilot.live.map((share, i) => pilotParcels * share * net / 1000 - RTS.pilot.runMonthly * fixed - (i === 0 ? RTS.pilot.oneTime * fixed : 0));
  const pilotNet = pilotMonths.reduce((a, b) => a + b, 0);
  const parcelsPerMonth = ordersPerYear / 12 * rtoRateAfterPds;
  const flows = RTS.rampCoverage.map((coverage, m) => {
    if (m === 0) return pilotNet / 1e7;
    const festive = RTS.festive[m];
    const parcels = parcelsPerMonth * (1 + festive * RTS.festiveVolume) * coverage;
    const uplift = 1 + festive * RTS.festiveMatch;
    const money = parcels * saved / 1000 * uplift;
    const spend = parcels * ((cost - screeningCost) / 1000 * uplift + screeningCost / 1000);
    return (money - spend - RTS.runCostMonthly * fixed - (m === 1 ? RTS.buildCost * fixed : 0)) / 1e7;
  });
  const cum = cumulative(flows);

  return {
    scenario, eligible, levels, matched, delivered,
    returnedToSeller: 1000 - delivered,
    movementCost, handlingCost, incentiveCost, screeningCost, cost, reverseSaved, freshSaved, saved, net,
    returnPerRupee: cost ? saved / cost : 0,
    recoveryRateEligible: delivered / eligible,
    recoveryRateAll: delivered / 1000,
    reRtoRate: matched ? levels.reduce((s, l) => s + l.reRtoParcels, 0) / matched : 0,
    reverseAvoidedRate: matched ? delivered / matched : 0,
    rtoRateAfterPds, parcelsPerYearCrore: parcelsPerYear / 1e7,
    annualCost, annualSaved, annualFixed, annual: annualSaved - annualCost - annualFixed,
    recoveredPerYearLakh: parcelsPerYear * delivered / 1000 / 1e5,
    pilotMonths, pilotNet, flows, cumulative: cum, payback: paybackMonth(cum), npv: npv(flows),
  };
}

/** Both models plus the RTO stepdown (RTS M8) and combined saving (RTS Dashboard E14). */
export function combinedModel(scenario: Scenario) {
  const pds = pdsModel(scenario);
  const rts = rtsModel(scenario);
  const afterPds = pds.blendedAfter;
  const afterRts = afterPds * (1 - rts.recoveryRateAll);
  return {
    pds, rts,
    stepdown: { today: pds.blendedBefore, afterPds, afterRts },
    combinedAnnual: pds.annual + rts.annual,
    combinedCumulative: pds.cumulative.map((v, i) => v + rts.cumulative[i]),
  };
}

/** PDS M8 rows 41–46 and RTS M7 rows 47–53: change in annual net saving vs Base, ₹ crore. */
export function pdsTornado() {
  const base = pdsModel('Base').annual;
  const swing = (label: string, lo: PdsOverrides, hi: PdsOverrides) => {
    const a = pdsModel('Base', lo).annual - base, b = pdsModel('Base', hi).annual - base;
    return { label, low: Math.min(a, b), high: Math.max(a, b) };
  };
  const orders = NETWORK.ordersPerYear, loss = NETWORK.lossPerRto;
  return [
    swing('Nudge effectiveness ±50%', { effectiveness: 0.5 }, { effectiveness: 1.5 }),
    swing('Loss per RTO ±25%', { lossPerRto: loss * 0.75 }, { lossPerRto: loss * 1.25 }),
    swing('Order volume ±50%', { ordersPerYear: orders * 0.5 }, { ordersPerYear: orders * 1.5 }),
    swing('Channel cost ±50%', { channelCost: 1.5 }, { channelCost: 0.5 }),
    swing('Prepaid take-up ±50%', { takeUp: 0.075 }, { takeUp: 0.225 }),
    swing('Fixed cost ±50%', { fixedCost: 1.5 }, { fixedCost: 0.5 }),
  ].sort((a, b) => (b.high - b.low) - (a.high - a.low));
}

export function rtsTornado() {
  const base = rtsModel('Base').annual;
  const swing = (label: string, lo: RtsOverrides, hi: RtsOverrides) => {
    const a = rtsModel('Base', lo).annual - base, b = rtsModel('Base', hi).annual - base;
    return { label, low: Math.min(a, b), high: Math.max(a, b) };
  };
  const orders = NETWORK.ordersPerYear;
  return [
    swing('Match rates ±50%', { matchMultiplier: 0.5 }, { matchMultiplier: 1.5 }),
    swing('Order volume ±50%', { ordersPerYear: orders * 0.5 }, { ordersPerYear: orders * 1.5 }),
    swing('Fresh shipment avoided ×0.5 / ×1.4', { freshShare: 0.35 }, { freshShare: 0.98 }),
    swing('Eligibility ±25%', { eligibility: 0.675 }, { eligibility: 1.125 }),
    swing('Buyer incentives ±50%', { incentiveMultiplier: 1.5 }, { incentiveMultiplier: 0.5 }),
    swing('Re-RTO ±50%', { reRtoMultiplier: 1.5 }, { reRtoMultiplier: 0.5 }),
    swing('Fixed cost ±50%', { fixedCost: 1.5 }, { fixedCost: 0.5 }),
  ].sort((a, b) => (b.high - b.low) - (a.high - a.low));
}
