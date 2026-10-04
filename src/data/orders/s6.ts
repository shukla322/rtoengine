import type { Day, Order, OrderSet, Step } from '../types';
import { L, T } from './shared';

const order: Order = {
  id: 'S6 · The Genuine Newcomer',
  eyebrow: 'ORDER S6 · COD · ₹1,199 EARBUDS · SELLER KOLKATA',
  route: 'KOLKATA → SILCHAR',
  titles: {
    etdb: { text: 'DELIVERED IN ', highlight: '5 DAYS', zone: 'green' },
    base: { text: 'DELIVERED IN ', highlight: '5 DAYS', zone: 'green' },
  },
  kpis: {
    etdb: ['RS 48 · Mid region', 'Yellow the whole way — cleared by a notification alone', '< 2% genuine held guardrail'],
    base: ['RS 48 · Mid region', 'No tools, no difference here', 'Also delivered'],
  },
};

const journey: Day[] = [
  { date: '2026-10-02', label: 'FRI 02 OCT', dayNo: 0, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'F01', time: '15:15', modes: 'both', title: 'Selects product',
      detail: 'First-ever order on the platform — no history to score against yet.', leak: L.newUser,
      why: 'A new user is not the same risk as a bad one — US starts neutral at 50, not low, and C sits at its floor of 0.30 so the region carries most of the weight.' },
    { kind: 'step', id: 'F02', time: '15:16', modes: 'both', title: 'Adds to cart',
      detail: 'Order creation is initiated.', why: 'Nothing unusual yet — the newcomer signal shows up in the scoring, not here.' },
    { kind: 'step', id: 'F03', time: '15:18', modes: 'both', title: 'Enters delivery address',
      detail: 'Silchar. Region Score: RTO 38% · Call response 35% · 20 km · 1,440 orders/day → RS 48.',
      tool: T.rs, pds: 48.6,
      why: 'RS 48 is Mid, not Low — well above the 40 line, so no address-check call fires here.',
      formula: 'RS = 0.40(62) + 0.25(35) + 0.20(50) + 0.15(30) = 48.1\nUS = 50 (new customer, no history) · C = 0.30 + 0.40×0÷5 = 0.30\nPDS = 0.70(48.1) + 0.30(50) = 48.6' },
    { kind: 'step', id: 'F04', time: '15:19', modes: 'both', title: 'Chooses payment · COD',
      detail: 'Buyer stays on COD.', tool: T.cod, pds: 48.6,
      why: 'COD is the default for a first-time buyer with nothing prepaid to compare against.' },
    { kind: 'step', id: 'F05', time: '15:20', modes: 'both', title: 'Order placed',
      detail: 'RS frozen at 48. PDS initialised at 48.6 (Yellow).', pds: 48.6,
      why: 'A brand-new buyer starts in Yellow, not Red — the system withholds judgement until there\'s a real signal.' },
    { kind: 'step', id: 'F06', time: '16:00', modes: 'both', title: 'Seller receives order',
      detail: 'PDS engine starts tracking; Intent Score stays neutral until the trigger point.', pds: 48.6,
      why: 'Same engine as every other order — it just has no history to lean on yet.' },
  ]},
  { date: '2026-10-03', label: 'SAT 03 OCT', dayNo: 1, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'F07', time: '10:00', modes: 'both', title: 'Seller packs and verifies',
      detail: 'Packing photo matched to listing. Pickup assigned.', pds: 48.6,
      why: 'Routine check, clean pass.' },
    { kind: 'step', id: 'F08', time: '11:00', modes: 'both', title: 'Picked up → source sort centre',
      detail: 'Departs for Silchar.', pds: 48.6, why: 'Routine so far.' },
  ]},
  { date: '2026-10-04', label: 'SUN 04 OCT', dayNo: 2, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'F08b', time: '—', modes: 'both', title: 'In line-haul', detail: 'Approaching Silchar.', pds: 48.6,
      why: 'Low app use here is completely normal for a first-time buyer — not yet a red flag.' },
  ]},
  { date: '2026-10-05', label: 'MON 05 OCT', dayNo: 3, phase: 'prevent', modes: 'both', items: [
    { kind: 'event', time: '20:35', modes: 'etdb', text: 'Trigger reached (τ = 0.64) · low app use, normal for a new user', pdsFrom: 48.6, pds: 52.2 },
    { kind: 'step', id: 'F09a', time: '20:35', modes: 'both', title: 'Yellow ladder · step ① notification',
      detail: 'A single in-app notification — the cheapest possible nudge.', leak: L.unreach, tool: T.nudge, pds: 52.2,
      why: 'This is the guardrail in action: the lightest possible touch, tried before anything heavier.',
      base: { detail: 'No score, no notification — just a quiet order in transit.' } },
    { kind: 'event', time: '20:39', modes: 'etdb', text: 'Taps the notification, opens tracking → ladder stops, no WhatsApp needed', pdsFrom: 52.2, pds: 56.9 },
  ]},
  { date: '2026-10-06', label: 'TUE 06 OCT', dayNo: 4, phase: 'prevent', modes: 'both', items: [
    { kind: 'event', time: '11:00', modes: 'etdb', text: 'Keeps tracking and browsing (τ = 0.85) — views a complementary item', pdsFrom: 56.9, pds: 66.9 },
    { kind: 'step', id: 'F10', time: '17:00', modes: 'both', title: 'Destination sort centre',
      detail: 'Scanned in at Silchar DSC.', pds: 66.9,
      why: 'Nothing left to catch by this point — just routine handling.' },
    { kind: 'step', id: 'F11', time: '17:15', modes: 'both', title: 'Colour-coded sort',
      detail: 'Lane colour GREEN ▲ printed on label; placed in the green cart.', tool: T.colour, pds: 66.9,
      why: 'Barcode scans don\'t stop a human putting a parcel in the wrong cart.' },
    { kind: 'step', id: 'F12', time: '18:00', modes: 'both', title: 'At last-mile hub · gate check',
      detail: 'PDS 66.9 — comfortably clear of the hold threshold. Released to rider.', tool: T.hold, pds: 66.9,
      why: 'There was never a call, never a hold. Four minutes of buyer attention resolved this entirely.',
      base: { detail: 'Arrives at the hub. Queued for delivery.' } },
  ]},
  { date: '2026-10-07', label: 'WED 07 OCT', dayNo: 5, phase: 'deliver', modes: 'both', items: [
    { kind: 'step', id: 'F13', time: '11:00', modes: 'both', title: 'Rider assigned',
      detail: 'Straightforward handoff.', tool: T.bridge, pds: 66.9,
      why: 'Nothing left to catch by this point.',
      base: { detail: 'Rider assigned.' } },
    { kind: 'step', id: 'F14', time: '14:00', modes: 'both', title: 'Rider confirms buyer will receive',
      detail: 'Straightforward call; buyer confirms she\'s home.', tool: T.geo, pds: 66.9,
      why: 'One clean call — the same tool that rescues messier orders elsewhere in this set has nothing to do here.',
      base: { detail: 'Rider confirms buyer will receive.' } },
    { kind: 'step', id: 'F15', time: '17:00', modes: 'both', title: 'Delivered · Day 5',
      detail: 'First order, first delivery — a clean data point for this buyer\'s next order.', outcome: 'delivered',
      why: 'A genuine buyer was flagged yellow, but the lightest step cleared it in four minutes. No call, no hold — the < 2% genuine-held guardrail holding the line.' },
  ]},
];

const recovery: Step[] = [
  { kind: 'step', id: 'F16', time: 'if needed', modes: 'etdb', title: 'RTS boost in Silchar region',
    detail: 'Held in reserve — never triggered for this order.', tool: T.rts,
    why: 'Shown for consistency: every order carries this safety net, whether or not it ever fires.' },
];

export const s6: OrderSet = {
  key: 's6',
  label: 'S6 · The Genuine Newcomer',
  region: 'Mid',
  order,
  journey,
  recovery,
};
