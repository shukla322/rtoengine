import type { Day, Order, OrderSet, Step } from '../types';
import { T } from './shared';

const order: Order = {
  id: 'S1 · The Loyal Prepaid',
  eyebrow: 'ORDER S1 · PREPAID · ₹799 SAREE · SELLER SURAT',
  route: 'SURAT → BENGALURU',
  titles: {
    etdb: { text: 'DELIVERED IN ', highlight: '4 DAYS', zone: 'green' },
    base: { text: 'DELIVERED IN ', highlight: '4 DAYS', zone: 'green' },
  },
  kpis: {
    etdb: ['RS 90 · High region', 'US 92 · 12 of last 13 delivered', 'Zero nudges sent'],
    base: ['RS 90 · High region', 'Prepaid · already low-risk', 'Also delivered, no tools needed'],
  },
};

const journey: Day[] = [
  { date: '2026-10-01', label: 'THU 01 OCT', dayNo: 0, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'A01', time: '19:50', modes: 'both', title: 'Selects product',
      detail: 'Buyer browses and picks the saree.', why: 'Starting point.' },
    { kind: 'step', id: 'A02', time: '19:55', modes: 'both', title: 'Adds to cart',
      detail: 'Order creation is initiated.', why: 'A repeat buyer — 12 of her last 13 orders were delivered.' },
    { kind: 'step', id: 'A03', time: '20:05', modes: 'both', title: 'Enters delivery address',
      detail: 'Bengaluru 560034. Region Score computed.',
      tool: T.rs, pds: 91.3,
      why: 'A strong region carries this order for free — no address risk to flag here.',
      formula: 'RTO 8%→92 · Calls 92%→92 · 6 km→85 · 4,200 orders/day→87.5\nRS = 0.40(92)+0.25(92)+0.20(85)+0.15(87.5) = 89.9' },
    { kind: 'step', id: 'A04', time: '20:10', modes: 'both', title: 'Chooses payment · Prepaid',
      detail: 'Buyer pays upfront by UPI — no COD lever needed.', pds: 91.3,
      why: 'Prepaid RTO is 5% vs 20% for COD — a real operational saving, but PDS itself no longer carries a payment-mode term. This order is Green on region and history alone.' },
    { kind: 'step', id: 'A05', time: '20:15', modes: 'both', title: 'Order placed',
      detail: 'RS frozen at 90. PDS initialised at 91.3 (Green).',
      tool: T.pds, pds: 91.3,
      why: 'Green from minute one. The nudge policy sends nothing here — and it shouldn\'t.',
      formula: 'US = 100×(12÷13) = 92.3 (N = 13)\nC = 0.30 + 0.40×13÷18 = 0.589\nPDS = 0.411(89.9) + 0.589(92.3) = 91.3' },
    { kind: 'step', id: 'A06', time: '21:00', modes: 'both', title: 'Seller receives order',
      detail: 'PDS engine starts tracking; Intent Score stays neutral until the trigger point.', pds: 91.3,
      why: 'Same engine as every other order — it just has nothing to react to here.' },
  ]},
  { date: '2026-10-02', label: 'FRI 02 OCT', dayNo: 1, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'A07', time: '10:30', modes: 'both', title: 'Seller packs and verifies',
      detail: 'Packing photo matched to listing. Pickup assigned.', pds: 91.3,
      why: 'Routine check, clean pass.' },
    { kind: 'step', id: 'A08', time: '17:00', modes: 'both', title: 'Picked up → source sort centre',
      detail: 'Line-haul to Bengaluru departs overnight.', pds: 91.3,
      why: 'A short, well-served lane — no filler days of silence here.' },
  ]},
  { date: '2026-10-03', label: 'SAT 03 OCT', dayNo: 2, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'A08b', time: '—', modes: 'both', title: 'In line-haul',
      detail: 'Surat → Bengaluru corridor.', pds: 91.3,
      why: 'Nothing to report — buyer engagement stays high throughout, per her order history.' },
  ]},
  { date: '2026-10-04', label: 'SUN 04 OCT', dayNo: 3, phase: 'prevent', modes: 'both', items: [
    { kind: 'event', time: '12:19', modes: 'etdb', text: 'Trigger reached (τ = 0.72) · buyer active and tracking (3 visits, cart-add on a complementary item)', pdsFrom: 91.3, pds: 92.7 },
    { kind: 'step', id: 'A09', time: '19:30', modes: 'both', title: 'Destination sort centre',
      detail: 'Scanned in at Bengaluru DSC.', pds: 92.7,
      why: 'Still green — nothing here to react to.' },
    { kind: 'step', id: 'A10', time: '20:00', modes: 'both', title: 'Colour-coded sort',
      detail: 'Lane colour GREEN ▲ printed on label; placed in the green cart.', tool: T.colour, pds: 92.7,
      why: 'Still green — the ladder has nothing to do.' },
  ]},
  { date: '2026-10-05', label: 'MON 05 OCT', dayNo: 4, phase: 'deliver', modes: 'both', items: [
    { kind: 'event', time: '07:00', modes: 'etdb', text: 'Tracking continues, slot confirmed, complementary item purchased (τ = 0.95)', pdsFrom: 92.7, pds: 96.3 },
    { kind: 'step', id: 'A11', time: '09:00', modes: 'both', title: 'At last-mile hub · gate check',
      detail: 'PDS 96.3 (Green) — nowhere near the hold threshold.', tool: T.hold, pds: 96.3,
      why: 'Released instantly. This is what the gate looks like when it has nothing to catch.' },
    { kind: 'step', id: 'A12', time: '10:30', modes: 'both', title: 'Rider assigned',
      detail: 'Buyer confirms slot on WhatsApp within minutes.', tool: T.bridge, pds: 96.3,
      why: 'A responsive buyer makes every downstream tool look easy.' },
    { kind: 'step', id: 'A13', time: '11:00', modes: 'both', title: 'Rider confirms buyer will receive',
      detail: 'Call connects on the first try; buyer confirms she\'s home.', tool: T.geo, pds: 96.3,
      why: 'One clean call was all this order ever needed.' },
    { kind: 'step', id: 'A14', time: '13:00', modes: 'both', title: 'Delivered · Day 4',
      detail: 'Prepaid order, first attempt. Outcome logged.', outcome: 'delivered',
      why: 'Zero nudges sent. Silence was never a risk here — the score just kept climbing.' },
  ]},
];

const recovery: Step[] = [
  { kind: 'step', id: 'A16', time: 'if needed', modes: 'etdb', title: 'RTS boost in Bengaluru region',
    detail: 'Held in reserve — never triggered for this order.', tool: T.rts,
    why: 'Shown for consistency: every order carries this safety net, whether or not it ever fires.' },
];

export const s1: OrderSet = {
  key: 's1',
  label: 'S1 · The Loyal Prepaid',
  region: 'High',
  order,
  journey,
  recovery,
};
