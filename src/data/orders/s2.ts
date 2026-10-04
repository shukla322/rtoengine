import type { Day, Order, OrderSet, Step } from '../types';
import { L, T } from './shared';

const order: Order = {
  id: 'S2 · The Distracted Regular',
  eyebrow: 'ORDER S2 · COD · ₹449 KURTI · SELLER JAIPUR',
  route: 'JAIPUR → PUNE',
  titles: {
    etdb: { text: 'DELIVERED IN ', highlight: '5 DAYS', zone: 'green' },
    base: { text: 'DELIVERED IN ', highlight: '6 DAYS', zone: 'red' },
  },
  kpis: {
    etdb: ['RS 90 · High region', 'Green → Yellow → back to Green', '1st-attempt delivery'],
    base: ['RS 90 · High region', 'No nudge sent, dip never caught', 'Delivered late on re-attempt'],
  },
};

const journey: Day[] = [
  { date: '2026-10-02', label: 'FRI 02 OCT', dayNo: 0, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'B01', time: '09:30', modes: 'both', title: 'Selects product',
      detail: 'Buyer browses and picks the kurti.', why: 'Starting point.' },
    { kind: 'step', id: 'B02', time: '09:32', modes: 'both', title: 'Adds to cart',
      detail: 'Order creation is initiated.', why: 'A regular buyer — US 75, 6 of her last 8 orders delivered.' },
    { kind: 'step', id: 'B03', time: '09:35', modes: 'both', title: 'Enters delivery address',
      detail: 'Pune. Region Score computed — a strong region.', tool: T.rs, pds: 81.8,
      why: 'A good region alone doesn\'t guarantee a quiet order, as this one shows.',
      formula: 'RTO 8%→92 · Calls 92%→92 · 6 km→85 · 4,200 orders/day→87.5\nRS = 0.40(92)+0.25(92)+0.20(85)+0.15(87.5) = 89.9' },
    { kind: 'step', id: 'B04', time: '09:38', modes: 'both', title: 'Chooses payment · COD',
      detail: 'Prepaid discount offered; buyer stays on COD.', leak: L.cod, tool: T.cod, pds: 81.8,
      why: 'COD carries the higher RTO risk operationally — this order still opens in Green on region and history strength alone.' },
    { kind: 'step', id: 'B05', time: '09:40', modes: 'both', title: 'Order placed',
      detail: 'RS frozen at 90. PDS initialised at 81.8 (Green).', tool: T.pds, pds: 81.8,
      why: 'Comfortably green at placement.',
      formula: 'US = 100×(6÷8) = 75 (N = 8)\nC = 0.30 + 0.40×8÷13 = 0.546\nPDS = 0.454(89.9) + 0.546(75) = 81.8' },
    { kind: 'step', id: 'B06', time: '10:15', modes: 'both', title: 'Seller receives order',
      detail: 'PDS engine starts tracking; Intent Score stays neutral until the trigger point.', pds: 81.8,
      why: 'Same engine as every other order — it just has nothing to react to yet.' },
  ]},
  { date: '2026-10-03', label: 'SAT 03 OCT', dayNo: 1, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'B07', time: '11:00', modes: 'both', title: 'Seller packs and verifies',
      detail: 'Packing photo matched to listing. Pickup assigned.', pds: 81.8,
      why: 'Routine so far.' },
    { kind: 'step', id: 'B08', time: '17:00', modes: 'both', title: 'Picked up → source sort centre',
      detail: 'Departs for the line-haul.', pds: 81.8,
      why: 'A short, well-served lane — no filler days of silence here.' },
  ]},
  { date: '2026-10-04', label: 'SUN 04 OCT', dayNo: 2, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'B09', time: '—', modes: 'both', title: 'In line-haul',
      detail: 'Jaipur → Pune corridor.', pds: 81.8,
      why: 'Quiet stretch — this is exactly where distraction sets in for a normally reliable buyer.' },
  ]},
  { date: '2026-10-05', label: 'MON 05 OCT', dayNo: 3, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'B10', time: '—', modes: 'both', title: 'In line-haul',
      detail: 'Approaching Pune.', pds: 81.8,
      why: 'Still nothing to react to — the trigger hasn\'t fired yet.' },
  ]},
  { date: '2026-10-06', label: 'TUE 06 OCT', dayNo: 4, phase: 'prevent', modes: 'both', items: [
    { kind: 'event', time: '02:21', modes: 'etdb', text: 'Trigger reached (τ = 0.72) · normal activity, tracking + a viewed complementary item', pdsFrom: 81.8, pds: 82.8 },
    { kind: 'step', id: 'B11', time: '06:00', modes: 'both', title: 'Destination sort centre',
      detail: 'Scanned in at Pune DSC.', pds: 82.8,
      why: 'Still green on arrival.' },
    { kind: 'step', id: 'B12', time: '06:15', modes: 'both', title: 'Colour-coded sort',
      detail: 'Lane colour GREEN ▲ printed on label; placed in the green cart.', tool: T.colour, pds: 82.8,
      why: 'Barcode scans don\'t stop a human putting a parcel in the wrong cart.' },
    { kind: 'event', time: '14:00', modes: 'etdb', text: 'No app opens for 36 h, no tracking, a return-policy visit → crosses into Yellow', pdsFrom: 82.8, pds: 64.9 },
    { kind: 'step', id: 'B13', time: '14:05', modes: 'both', title: 'Yellow ladder · step ① notification',
      detail: '"Your order is in Pune, tap to track."', leak: L.unreach, tool: T.nudge, pds: 64.9,
      why: 'The cheapest rung fires first — a free in-app nudge, no cost if it works.',
      base: { detail: 'Buyer goes quiet for 36 h. Nobody notices — there is no ladder to fire it.' } },
    { kind: 'event', time: '16:00', modes: 'etdb', text: 'Ignored, engagement stays flat', pdsFrom: 64.9, pds: 64.7 },
    { kind: 'step', id: 'B14', time: '16:00', modes: 'both', title: 'Yellow ladder · step ② WhatsApp',
      detail: '"Arriving tomorrow: Track live / Pick a slot."', leak: L.unreach, tool: T.nudge, pds: 64.7,
      why: 'Step ① didn\'t land, so the ladder escalates — a ₹2–3 WhatsApp, still cheap.',
      base: { detail: 'Still no one has reached out. The buyer has no idea the parcel is close.' } },
    { kind: 'event', time: '16:22', modes: 'etdb', text: 'Taps Track Live, picks the 11–1 slot → ladder stops, back in Green', pdsFrom: 64.7, pds: 75.7 },
  ]},
  { date: '2026-10-07', label: 'WED 07 OCT', dayNo: 5, phase: 'deliver', modes: 'both', items: [
    { kind: 'event', time: '08:00', modes: 'etdb', text: 'Opens app again next morning (τ = 0.90) — tracking, browsing, slot confirmed', pdsFrom: 75.7, pds: 84.3 },
    { kind: 'step', id: 'B15', time: '08:30', modes: 'both', title: 'At last-mile hub · gate check',
      detail: 'Back in Green — released to rider without a second thought.', tool: T.hold, pds: 84.3,
      why: 'The ladder did its job upstream; the gate has nothing left to catch.',
      base: { detail: 'Arrives at the hub. No score, no flag — just queued for delivery.' } },
    { kind: 'step', id: 'B16', time: '10:00', modes: 'both', title: 'Rider assigned',
      detail: 'Buyer confirmed a slot the day before — an easy handoff.', tool: T.bridge, pds: 84.3,
      why: 'A buyer who replied once tends to be reachable again.',
      base: { detail: 'Rider assigned. Only a phone number to go on.' } },
    { kind: 'step', id: 'B17', time: '12:30', modes: 'both', title: 'Rider confirms buyer will receive',
      detail: 'Buyer confirms she\'s home; rider closes in for the drop.', tool: T.geo, pds: 84.3,
      why: 'Turns a quiet parcel into a confirmed handoff — same idea as every last-mile bridge call in this set.',
      base: { detail: 'Call missed — buyer is in a meeting. Rider marks "customer unavailable."' } },
    { kind: 'step', id: 'B18', time: '13:00', modes: 'etdb', title: 'Delivered · Day 5',
      detail: 'Delivered on the first attempt.', outcome: 'delivered',
      why: 'Same buyer, same distraction risk — the only difference is whether anyone caught the dip.' },
  ]},
  { date: '2026-10-08', label: 'THU 08 OCT', dayNo: 6, phase: 'deliver', modes: 'base', items: [
    { kind: 'step', id: 'B19', time: '11:15', modes: 'base', title: 'Re-attempt · Delivered · Day 6',
      detail: 'Buyer answers this time. Delivered a day later than the RTO Engine twin.', outcome: 'delivered',
      why: 'Not a failure, just a slower, messier version of the same order — one missed dip cost a full extra day.' },
  ]},
];

const recovery: Step[] = [
  { kind: 'step', id: 'B20', time: 'if needed', modes: 'etdb', title: 'RTS boost in Pune region',
    detail: 'Held in reserve — never triggered for this order.', tool: T.rts,
    why: 'Shown for consistency: every order carries this safety net, whether or not it ever fires.' },
];

export const s2: OrderSet = {
  key: 's2',
  label: 'S2 · The Distracted Regular',
  region: 'High',
  order,
  journey,
  recovery,
};
