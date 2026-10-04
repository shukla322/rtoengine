// Synthetic order cohort. Every probability and rupee value comes from the workbook engine
// (financialModel.ts), so the cohort converges on the model's Base case as volume grows.
import { NETWORK, PDS, RTS, rtsLevelEconomics, zoneRto, type Level, type Zone } from './financialModel';

export type Status = 'In transit' | 'Held at hub' | 'Out for delivery' | 'RTS matching' | 'Resale in transit' | 'Delivered' | 'Resale done' | 'Returned to seller';
export const ONGOING_STATUSES: Status[] = ['In transit', 'Held at hub', 'Out for delivery', 'RTS matching', 'Resale in transit'];
export const CLOSED_STATUSES: Status[] = ['Delivered', 'Resale done', 'Returned to seller'];

export interface DashboardOrder {
  id: string; product: string; category: string; price: number;
  from: string; via: string; to: string; resaleTo: string;
  date: string; updated: string; payment: 'COD' | 'Prepaid'; zone: Zone;
  /** PDS at placement, and the score at the last-mile release gate (only Green, ≥ 70, goes out for delivery). */
  initialPds: number; pds: number; baselineRisk: number; held: boolean;
  baselineRto: boolean; prevented: boolean; refused: boolean; converted: boolean;
  eligible: boolean; stage: Level | null; matched: boolean; reRto: boolean;
  status: Status; resalePrice: number; pdsCost: number; channel: string;
  contacted: boolean; responded: boolean; escalated: boolean; intentRecovered: boolean; falsePositive: boolean;
  firstAttempt: boolean; riderAttempted: boolean; riderContacted: boolean;
  addressIssue: boolean; addressResolved: boolean; geoVerified: boolean; early: boolean;
}

export const isClosed = (o: DashboardOrder) => CLOSED_STATUSES.includes(o.status);
export const levelOf = (stage: Level | null) => rtsLevelEconomics.find(l => l.name === stage);

/** Release-gate rule (logic.md): PDS ≥ 70 is Green and goes out for delivery; 40–69 Yellow; below 40 Red. */
export const GREEN_GATE = 70;
export const zoneOfScore = (score: number): Zone => (score >= GREEN_GATE ? 'Green' : score >= 40 ? 'Yellow' : 'Red');
/** Before the gate the order still carries its placement score; from the gate on, its gate score. */
export const currentPds = (o: DashboardOrder) => (o.status === 'In transit' ? o.initialPds : o.pds);
/** Statuses before a refusal is known, so no RTS cost has been incurred yet. */
const BEFORE_REFUSAL: Status[] = ['In transit', 'Held at hub', 'Out for delivery'];

/** Where an order is in its lifecycle decides which costs have actually been incurred. */
const screened = (o: DashboardOrder) => o.refused && o.eligible && !BEFORE_REFUSAL.includes(o.status);
const dispatchedToResale = (o: DashboardOrder) => o.matched && ['Resale in transit', 'Resale done', 'Returned to seller'].includes(o.status);

/** Model-priced savings for one order (PDS M4/M5, RTS M2/M4). */
export function financials(o: DashboardOrder) {
  const level = levelOf(o.stage);
  const recovered = o.status === 'Resale done';
  const pdsGross = isClosed(o) && o.prevented ? NETWORK.lossPerRto : 0;
  const rtsGross = recovered && level ? level.reverseAvoided + level.freshAvoided : 0;
  const rtsCost = (screened(o) ? RTS.screening : 0)
    + (dispatchedToResale(o) && level ? level.movement + RTS.handling : 0)
    + (recovered && level ? level.incentive : 0);
  return { pdsGross, rtsGross, rtsCost, net: pdsGross + rtsGross - o.pdsCost - rtsCost, resale: recovered ? o.resalePrice : 0 };
}

export const rupees = (n: number, compact = false) => {
  const sign = n < 0 ? '−' : '';
  const v = Math.abs(n);
  if (compact && v >= 1e7) return `${sign}₹${(v / 1e7).toFixed(2)} Cr`;
  if (compact && v >= 1e5) return `${sign}₹${(v / 1e5).toFixed(2)} L`;
  return `${sign}₹${v.toLocaleString('en-IN', { maximumFractionDigits: v < 100 ? 2 : 0 })}`;
};
export const crore = (n: number) => `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} Cr`;
export const pct = (n: number, digits = 1) => `${(n * 100).toFixed(digits)}%`;
export const ratio = (n: number, d: number) => (d ? n / d : 0);
export const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');

// ---- Synthetic catalogue -----------------------------------------------------------------

function random(seed: number) {
  let x = seed | 0 || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return (x >>> 0) / 4294967296; };
}
const catalogue: [string, string, number][] = [
  ['Printed Rayon Kurti', 'Women Ethnic', 299], ['Men’s Running Shoes', 'Footwear', 399],
  ['Daily Wear Saree', 'Women Ethnic', 449], ['Skincare Essentials Kit', 'Beauty', 649],
  ['Kitchen Tools Set', 'Home & Kitchen', 549], ['Gold-Plated Earrings', 'Accessories', 199],
  ['Cotton Bedsheet Set', 'Home & Living', 599], ['Women’s Sling Bag', 'Accessories', 349],
  ['Men’s Cotton T-shirt', 'Men Fashion', 249], ['Ceramic Planter Set', 'Home & Living', 399],
  ['Kids Party Frock', 'Kids', 379], ['Bluetooth Neckband', 'Electronics', 699],
  ['Anarkali Gown', 'Women Ethnic', 799], ['Steel Water Bottle Set', 'Home & Kitchen', 329],
  ['Men’s Slim Jeans', 'Men Fashion', 549], ['Yoga Mat', 'Sports', 459],
];
const sellers = ['Surat', 'Jaipur', 'Delhi', 'Tiruppur', 'Mumbai', 'Ludhiana'];
export const cities = ['Delhi', 'Lucknow', 'Jaipur', 'Pune', 'Mumbai', 'Hyderabad', 'Bengaluru', 'Chennai', 'Kolkata', 'Patna', 'Indore', 'Ahmedabad'];
const hubFor: Record<string, string> = {
  Delhi: 'Delhi sort hub', Lucknow: 'Delhi sort hub', Jaipur: 'Delhi sort hub', Patna: 'Kolkata sort hub', Kolkata: 'Kolkata sort hub',
  Pune: 'Bhiwandi sort hub', Mumbai: 'Bhiwandi sort hub', Ahmedabad: 'Bhiwandi sort hub', Indore: 'Nagpur sort hub',
  Hyderabad: 'Hyderabad sort hub', Bengaluru: 'Bengaluru sort hub', Chennai: 'Bengaluru sort hub',
};
const neighbour = (city: string, step: number) => cities[(cities.indexOf(city) + 1 + step) % cities.length];

/**
 * One synthetic order. `progress` places an ongoing order part-way along its lifecycle
 * (0 = just shipped); closed orders pass `null`.
 */
export function makeOrder(index: number, date: Date, progress: number | null = null): DashboardOrder {
  const r = random(index * 8191 + 17021);
  const [product, category, price] = catalogue[Math.floor(r() * catalogue.length)];
  const payment = r() < NETWORK.codShare ? 'COD' : 'Prepaid';

  // PDS zone and baseline risk (M2). Prepaid orders are auto-Green and not scored.
  const z = r();
  const zone: Zone = payment === 'Prepaid' || z < PDS.zones.Green.share ? 'Green' : z < PDS.zones.Green.share + PDS.zones.Yellow.share ? 'Yellow' : 'Red';
  const baselineRisk = payment === 'Prepaid' ? NETWORK.prepaidRto : zoneRto[zone];
  const baselineRto = r() < baselineRisk;

  // Pre-dispatch prepaid switch (M3 step 1), then the escalating nudge layers (M3 step 3).
  const converted = payment === 'COD' && zone === 'Red' && r() < PDS.prepaidOffered * PDS.prepaidTakeUp[1];
  const touched = [false, false, false, false];
  if (payment === 'COD' && !converted && zone !== 'Green') {
    const reach = PDS.layers.map(l => l.reach[zone]);
    touched[0] = r() < reach[0];
    touched[1] = r() < reach[1];
    touched[2] = r() < reach[2];
    touched[3] = touched[2] && r() < reach[3] / reach[2]; // the executive call only follows an AI call
  }
  const saveRate = converted ? 1 - NETWORK.prepaidRto / baselineRisk : PDS.layers.reduce((s, l, i) => s + (touched[i] ? l.save : 0), 0);
  const prevented = baselineRto && r() < saveRate;
  const strongTouches = Number(touched[2]) + Number(touched[3]);
  const falsePositive = !baselineRto && r() < strongTouches * PDS.falsePositiveRate;
  const refused = baselineRto && !prevented;

  // RTS sequential matching (M3): each level only sees parcels the earlier levels missed.
  const eligible = refused && r() < RTS.eligibility;
  let stage: Level | null = null;
  if (eligible) for (const l of RTS.levels) if (r() < l.match[1]) { stage = l.name; break; }
  const matched = stage !== null;
  const level = levelOf(stage);
  const reRto = matched && r() < (level?.reRto ?? 0);

  const contacted = touched.some(Boolean);
  const responded = contacted && r() < 0.74;
  const addressIssue = r() < 0.13;
  const riderAttempted = r() < 0.94;
  const to = cities[Math.floor(r() * cities.length)];
  const from = sellers[Math.floor(r() * sellers.length)];
  const initialPds = zone === 'Green' ? 72 + Math.floor(r() * 25) : zone === 'Yellow' ? 42 + Math.floor(r() * 27) : 14 + Math.floor(r() * 25);

  // Release gate. A Red COD order whose buyer never confirmed is held at the hub and returns from there
  // without going out for delivery. Every other order clears the gate only once its score is Green:
  // confirmations and nudges lift Yellow and Red orders to 70+ before the rider takes them.
  const held = payment === 'COD' && zone === 'Red' && !converted && refused && !responded;
  const gatePds = held ? Math.max(5, initialPds - 4) : Math.max(initialPds, GREEN_GATE + Math.floor(r() * 18));

  // Lifecycle: closed orders carry their final outcome; ongoing orders sit at a point on the path.
  const lastMile: Status = held ? 'Held at hub' : 'Out for delivery';
  const path: Status[] = !refused ? ['In transit', 'Out for delivery', 'Delivered']
    : !eligible ? ['In transit', lastMile, 'Returned to seller']
    : !matched ? ['In transit', lastMile, 'RTS matching', 'Returned to seller']
    : ['In transit', lastMile, 'RTS matching', 'Resale in transit', reRto ? 'Returned to seller' : 'Resale done'];
  const status = progress === null ? path[path.length - 1] : path[Math.min(path.length - 2, Math.floor(progress * (path.length - 1)))];
  const daysToClose = path.length - 1 + Math.floor(r() * 2);
  // Orders that would close in the future are treated as having closed a few hours ago.
  const closesAt = Math.min(date.getTime() + daysToClose * 86400000, Date.now() - Math.floor(r() * 8 * 3600000));
  const updated = progress === null ? new Date(Math.max(date.getTime(), closesAt)) : date;

  return {
    id: `VM-${String(index + 260000).padStart(7, '0')}`, product, category, price,
    from, via: hubFor[to], to,
    resaleTo: stage === 'P1' ? to : neighbour(to, stage === 'P2' ? index % 2 : 3 + (index % 3)),
    date: date.toISOString(), updated: updated.toISOString(), payment, zone,
    initialPds, pds: Math.min(99, gatePds), baselineRisk, held,
    baselineRto, prevented, refused, converted, eligible, stage, matched, reRto, status,
    resalePrice: matched ? price - (level?.incentive ?? 0) : 0,
    pdsCost: (converted ? PDS.prepaidIncentive : 0) + PDS.layers.reduce((s, l, i) => s + (touched[i] ? l.cost : 0), 0) + (falsePositive ? PDS.falsePositiveCost : 0),
    channel: converted ? 'Prepaid incentive' : touched[3] ? 'Support executive' : touched[2] ? 'AI voice call' : touched[1] ? 'WhatsApp' : touched[0] ? 'App notification' : 'Observe',
    contacted, responded, escalated: touched[2] || touched[3], intentRecovered: responded && (prevented || r() < 0.4), falsePositive,
    firstAttempt: !refused && r() < 0.94, riderAttempted, riderContacted: riderAttempted && r() < 0.88,
    addressIssue, addressResolved: addressIssue && r() < 0.83, geoVerified: r() < 0.92,
    early: zone === 'Red' && !refused && r() < 0.62,
  };
}

export const SEED_DAYS = 90;
const ONGOING_TODAY = 70;
/** Roughly 400 orders a day for 90 days. Deterministic for a given `seededAt`. */
export function seedOrders(seededAt = new Date()) {
  const orders: DashboardOrder[] = [];
  for (let day = SEED_DAYS - 1; day >= 0; day--) {
    const dayStart = new Date(seededAt); dayStart.setHours(0, 0, 0, 0); dayStart.setDate(dayStart.getDate() - day);
    const weekday = dayStart.getDay();
    const count = 360 + ((day * 37) % 70) + (weekday === 0 || weekday === 6 ? 40 : 0);
    const span = day === 0 ? Math.max(3600000, seededAt.getTime() - dayStart.getTime()) : 86400000;
    for (let i = 0; i < count; i++) {
      const at = new Date(dayStart.getTime() + Math.floor((i + 1) / (count + 1) * span));
      const ongoing = day === 0 ? i >= count - ONGOING_TODAY : day === 1 && i >= count - 25;
      orders.push(makeOrder(orders.length, at, ongoing ? ((i * 7) % 10) / 10 : null));
    }
  }
  return orders.reverse();
}

/** Next step in an order's lifecycle (used by the live simulation). */
export function nextStatus(o: DashboardOrder): Status {
  switch (o.status) {
    case 'In transit': return o.held ? 'Held at hub' : 'Out for delivery';
    case 'Held at hub': return o.eligible ? 'RTS matching' : 'Returned to seller';
    case 'Out for delivery': return !o.refused ? 'Delivered' : o.eligible ? 'RTS matching' : 'Returned to seller';
    case 'RTS matching': return o.matched ? 'Resale in transit' : 'Returned to seller';
    case 'Resale in transit': return o.reRto ? 'Returned to seller' : 'Resale done';
    default: return o.status;
  }
}

// ---- Cohort summary ----------------------------------------------------------------------

const zones: Zone[] = ['Green', 'Yellow', 'Red'];
/** Every KPI on the dashboard is a ratio of these counts, computed in one pass. */
export function summarize(orders: DashboardOrder[]) {
  const m = {
    total: orders.length, closed: 0, active: 0, activeRts: 0,
    baseline: 0, codBaseline: 0, prevented: 0, refused: 0, returned: 0,
    eligible: 0, matched: 0, reRto: 0, recovered: 0,
    recoveredBy: { P1: 0, P2: 0, P3: 0 } as Record<Level, number>,
    matchedBy: { P1: 0, P2: 0, P3: 0 } as Record<Level, number>,
    pdsGross: 0, pdsCost: 0, pdsCostClosed: 0, netClosed: 0, rtsGross: 0, rtsCost: 0, net: 0, resale: 0,
    firstAttempt: 0, riderAttempted: 0, riderContacted: 0, addressIssue: 0, addressResolved: 0, geoVerified: 0, redClosed: 0, early: 0,
    contacted: 0, responded: 0, escalated: 0, intentRecovered: 0,
    safe: 0, safeFlagged: 0, codBaselineFlagged: 0, codClosed: 0, codRefused: 0, predictedRisk: 0, scoreChange: 0,
    zone: Object.fromEntries(zones.map(z => [z, { orders: 0, baseline: 0, refused: 0 }])) as Record<Zone, { orders: number; baseline: number; refused: number }>,
    channelCost: {} as Record<string, { orders: number; cost: number }>,
  };
  for (const o of orders) {
    const f = financials(o);
    m.pdsGross += f.pdsGross; m.rtsGross += f.rtsGross; m.pdsCost += o.pdsCost; m.rtsCost += f.rtsCost; m.net += f.net; m.resale += f.resale;
    const ch = (m.channelCost[o.channel] ??= { orders: 0, cost: 0 }); ch.orders++; ch.cost += o.pdsCost;
    if (!isClosed(o)) {
      m.active++;
      if (o.status === 'RTS matching' || o.status === 'Resale in transit') m.activeRts++;
      continue;
    }
    m.closed++;
    m.pdsCostClosed += o.pdsCost; m.netClosed += f.net;
    m.baseline += +o.baselineRto; m.prevented += +o.prevented; m.refused += +o.refused;
    m.returned += +(o.status === 'Returned to seller'); m.eligible += +o.eligible;
    if (o.matched && o.stage) { m.matched++; m.matchedBy[o.stage]++; m.reRto += +o.reRto; }
    if (o.status === 'Resale done' && o.stage) { m.recovered++; m.recoveredBy[o.stage]++; }
    m.firstAttempt += +o.firstAttempt; m.riderAttempted += +o.riderAttempted; m.riderContacted += +o.riderContacted;
    m.addressIssue += +o.addressIssue; m.addressResolved += +o.addressResolved; m.geoVerified += +o.geoVerified;
    if (o.zone === 'Red' && o.payment === 'COD') { m.redClosed++; m.early += +o.early; }
    m.contacted += +o.contacted; m.responded += +o.responded; m.escalated += +o.escalated; m.intentRecovered += +o.intentRecovered;
    m.scoreChange += o.pds - o.initialPds;
    if (o.payment === 'COD') {
      m.codClosed++; m.codRefused += +o.refused; m.predictedRisk += o.baselineRisk;
      m.codBaseline += +o.baselineRto;
      if (o.baselineRto && o.zone !== 'Green') m.codBaselineFlagged++;
      if (!o.baselineRto) { m.safe++; m.safeFlagged += +(o.zone === 'Red'); }
      const zs = m.zone[o.zone]; zs.orders++; zs.baseline += +o.baselineRto; zs.refused += +o.refused;
    }
  }
  return m;
}
export type Summary = ReturnType<typeof summarize>;

/** Days ending today, oldest first; each bucket holds the orders placed that day. */
export function byDay(orders: DashboardOrder[], days: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const buckets = Array.from({ length: days }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (days - 1 - i));
    return { date: d, orders: [] as DashboardOrder[] };
  });
  const first = buckets[0].date.getTime();
  for (const o of orders) {
    const i = Math.floor((new Date(o.date).getTime() - first) / 86400000);
    if (i >= 0 && i < days) buckets[i].orders.push(o);
  }
  return buckets.map(b => ({ date: b.date, m: summarize(b.orders) }));
}
