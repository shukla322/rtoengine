import type { Day, Order, OrderSet, Step } from '../types';
import { L, T } from './shared';

const order: Order = {
  id: 'S3 · The Flagship',
  eyebrow: 'ORDER S3 · COD · ₹499 KURTI · SELLER DELHI',
  route: 'DELHI → GUWAHATI',
  titles: {
    etdb: { text: 'DELIVERED IN ', highlight: '6 DAYS', zone: 'green' },
    base: { text: 'RETURNED IN ', highlight: '8 DAYS', zone: 'red' },
  },
  kpis: {
    etdb: ['RS 57 · Mid region', 'Yellow dip; notification fails, WhatsApp lifts it', 'Delivered Day 6'],
    base: ['RS 57 · Mid region', 'No nudge ladder', 'RTO Day 8'],
  },
};

const journey: Day[] = [
  { date: '2026-10-01', label: 'THU 01 OCT', dayNo: 0, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'C01', time: '10:02', modes: 'both', title: 'Selects product',
      detail: 'Buyer browses and picks the kurti.', why: 'Starting point.' },
    { kind: 'step', id: 'C02', time: '10:04', modes: 'both', title: 'Adds to cart',
      detail: 'Order creation is initiated.', why: 'The order everything else in this set gets compared against.' },
    { kind: 'step', id: 'C03', time: '10:07', modes: 'both', title: 'Enters delivery address',
      detail: 'Guwahati. Region Score computed: RTO 28% · Call response 55% · 24 km · 1,920 orders/day.',
      leak: L.address, tool: T.rs, pds: 53.4,
      why: 'A mid region — not risky enough to flag hard, not safe enough to ignore.',
      formula: 'RS = 0.40(72) + 0.25(55) + 0.20(40) + 0.15(40) = 56.6',
      base: { detail: 'Free-text address. No validation.' } },
    { kind: 'step', id: 'C04', time: '10:08', modes: 'both', title: 'Chooses payment · COD',
      detail: 'Prepaid discount offered; buyer stays on COD.', leak: L.cod, tool: T.cod, pds: 53.4,
      why: 'COD RTO is 20% vs 5% for prepaid — an operational risk, not a PDS term.',
      base: { detail: 'COD selected. No offer shown.' } },
    { kind: 'step', id: 'C05', time: '10:09', modes: 'both', title: 'Order placed',
      detail: 'RS frozen at 57. PDS initialised at 53.4 (Yellow).', tool: T.rs, pds: 53.4,
      why: 'The order everything else in this set gets compared against.',
      formula: 'US = 100×(2÷4) = 50 (N = 4, 2 accepted)\nC = 0.30 + 0.40×4÷9 = 0.478\nPDS = 0.522(56.6) + 0.478(50) = 53.4',
      base: { detail: 'Order placed. No risk score.' } },
    { kind: 'step', id: 'C06', time: '11:30', modes: 'both', title: 'Seller receives order',
      detail: 'PDS engine starts tracking; Intent Score stays neutral until the trigger point.', tool: T.pds, pds: 53.4,
      why: 'From here the score can move with buyer behaviour.' },
  ]},
  { date: '2026-10-02', label: 'FRI 02 OCT', dayNo: 1, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'C07', time: '11:00', modes: 'both', title: 'Seller packs and verifies',
      detail: 'Packing photo matched to listing. Pickup assigned.', pds: 53.4,
      why: 'Routine check, clean pass.' },
    { kind: 'step', id: 'C08', time: '18:00', modes: 'both', title: 'Picked up → source sort centre',
      detail: 'Line-haul to Guwahati departs overnight. ~1,900 km by road.', pds: 53.4,
      why: 'Start of the longest leg.' },
  ]},
  { date: '2026-10-03', label: 'SAT 03 OCT', dayNo: 2, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'C08b', time: '—', modes: 'both', title: 'In line-haul',
      detail: 'Delhi → Lucknow → Siliguri corridor.', pds: 53.4,
      why: 'Buyer intent is most likely to decay during this silent stretch.' },
  ]},
  { date: '2026-10-04', label: 'SUN 04 OCT', dayNo: 3, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'C08c', time: '—', modes: 'both', title: 'In line-haul',
      detail: 'Crossing Siliguri.', leak: L.intent, pds: 53.4,
      why: 'Still quiet — the trigger hasn\'t fired yet.' },
  ]},
  { date: '2026-10-05', label: 'MON 05 OCT', dayNo: 4, phase: 'prevent', modes: 'both', items: [
    { kind: 'event', time: '12:20', modes: 'etdb', text: 'Trigger reached (τ = 0.66) · barely any app use, no tracking, a similar-product cart-add and a return-policy visit', pdsFrom: 53.4, pds: 46.1 },
    { kind: 'step', id: 'C09a', time: '12:25', modes: 'both', title: 'Yellow ladder · step ① notification',
      detail: 'In-app notification: order approaching.', leak: L.unreach, tool: T.nudge, pds: 46.1,
      why: 'The cheapest rung fires first.',
      base: { detail: 'Unloaded. Buyer has not opened the app in 3 days; nobody knows.' } },
    { kind: 'event', time: '14:20', modes: 'etdb', text: 'Ignored, engagement dips further', pdsFrom: 46.1, pds: 45.9 },
    { kind: 'step', id: 'C09b', time: '14:20', modes: 'both', title: 'Yellow ladder · step ② WhatsApp',
      detail: '"Arriving Wednesday: Track / Confirm."', leak: L.unreach, tool: T.nudge, pds: 45.9,
      why: 'Step ① didn\'t land, so the ladder escalates.' },
    { kind: 'event', time: '14:45', modes: 'etdb', text: 'Replies "Yes" → ladder stops, score rising', pdsFrom: 45.9, pds: 53.0 },
  ]},
  { date: '2026-10-06', label: 'TUE 06 OCT', dayNo: 5, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'C10', time: '08:00', modes: 'both', title: 'Destination sort centre',
      detail: 'Scanned in at Guwahati DSC.', pds: 53.0,
      why: 'PDS is recomputed on every scan and every app or tracking event.' },
    { kind: 'step', id: 'C11', time: '09:00', modes: 'both', title: 'Colour-coded sort',
      detail: 'Lane colour GREEN ▲ printed on label; placed in the green cart.', leak: L.missort, tool: T.colour, pds: 53.0,
      why: 'Barcode scans don\'t stop a human putting a parcel in the wrong cart.',
      base: { detail: 'Scanned and sorted by barcode only.' } },
    { kind: 'event', time: '15:10', modes: 'etdb', text: 'Opens tracking 3× — Tracking Engagement rises to 100', pdsFrom: 53.0, pds: 60.7 },
    { kind: 'step', id: 'C12', time: '18:00', modes: 'both', title: 'At last-mile hub · gate check',
      detail: 'PDS 60.7 (Yellow) — well clear of the hold threshold. Released to rider.', tool: T.hold, pds: 60.7,
      why: 'Last cheap exit. This order clears it comfortably.',
      base: { detail: 'Arrives at LMDC. Queued for delivery.' } },
  ]},
  { date: '2026-10-07', label: 'WED 07 OCT', dayNo: 6, phase: 'deliver', modes: 'both', items: [
    { kind: 'step', id: 'C13', time: '08:30', modes: 'both', title: 'Rider assigned',
      detail: 'Buyer shares live location and picks a slot on WhatsApp.', tool: T.bridge, pds: 62.2,
      why: 'Rider ↔ Valmo ↔ buyer chat with masked numbers.',
      base: { detail: 'Rider assigned. Only a phone number to go on.' } },
    { kind: 'event', time: '08:30', modes: 'etdb', text: 'Picks slot and shares location on the WhatsApp Bridge', pdsFrom: 60.7, pds: 62.2 },
    { kind: 'step', id: 'C14', time: '13:40', modes: 'both', title: 'Rider confirms buyer will receive',
      detail: 'Call missed → Bridge auto-WhatsApp → buyer replies.', leak: L.calls, tool: T.geo, pds: 62.2,
      why: 'Turns a missed call into a reply.',
      base: { detail: 'Two calls missed (buyer in class). Rider marks "customer unavailable."', failsHere: true } },
    { kind: 'step', id: 'C15', time: '14:15', modes: 'etdb', title: 'Delivered · Day 6',
      detail: 'COD collected. Outcome logged for model training.', outcome: 'delivered',
      why: 'One dip, one notification that failed, one WhatsApp that worked.' },
  ]},
  { date: '2026-10-08', label: 'THU 08 OCT', dayNo: 7, phase: 'deliver', modes: 'base', items: [
    { kind: 'step', id: 'C14r', time: '12:10', modes: 'base', title: 'Re-attempt fails',
      detail: 'Call unanswered again. Parcel returned to hub.', leak: L.calls, failsHere: true,
      why: 'Without a second channel, the same failure repeats.' },
  ]},
  { date: '2026-10-09', label: 'FRI 09 OCT', dayNo: 8, phase: 'deliver', modes: 'base', items: [
    { kind: 'step', id: 'C15r', time: '10:00', modes: 'base', title: 'Marked RTO · Day 8',
      detail: 'NDR: customer unavailable. Reverse trip to Delhi booked.', leak: L.reverse, outcome: 'rto',
      why: 'The ₹50 forward cost is lost, and the ₹120 reverse trip begins.' },
  ]},
  { date: '2026-10-17', label: 'SAT 17 OCT', dayNo: 16, phase: 'deliver', modes: 'base', items: [
    { kind: 'step', id: 'C20', time: '16:00', modes: 'base', title: 'Back at seller',
      detail: 'Inventory stuck in transit for 8 days; seller credit delayed.', outcome: 'returned',
      why: 'Full reverse cost paid.' },
  ]},
];

const recovery: Step[] = [
  { kind: 'step', id: 'C16', time: 'Day 8–10', modes: 'etdb', title: 'RTS boost in Guwahati region',
    detail: 'Promoted for 2 days: faster delivery, small discount, cart and wishlist holders first.', tool: T.rts,
    why: 'The parcel would already sit next to local demand.' },
  { kind: 'step', id: 'C20r', time: 'fallback', modes: 'etdb', title: 'Return to seller',
    detail: 'Only if all RTS levels fail.', outcome: 'returned',
    why: 'This is the only path in the baseline — never reached here, since this order delivers.' },
];

export const s3: OrderSet = {
  key: 's3',
  label: 'S3 · The Flagship',
  region: 'Mid',
  order,
  journey,
  recovery,
};
