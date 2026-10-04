import type { Day, Order, OrderSet, Step } from '../types';
import { L, T } from './shared';

const order: Order = {
  id: 'S5 · The Lost Cause',
  eyebrow: 'ORDER S5 · COD · ₹399 BEDSHEET · SELLER LUDHIANA',
  route: 'LUDHIANA → BARMER',
  titles: {
    etdb: { text: 'CANCELLED IN ', highlight: '5 DAYS', zone: 'red' },
    base: { text: 'RETURNED IN ', highlight: '13 DAYS', zone: 'red' },
  },
  kpis: {
    etdb: ['RS 27 · Low region', 'Opens in Red, stays Red', 'Resold locally in 2 days — no last-mile trip'],
    base: ['RS 27 · Low region', 'No hold gate', 'Refused at the door · full reverse trip'],
  },
};

const journey: Day[] = [
  { date: '2026-10-01', label: 'THU 01 OCT', dayNo: 0, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'E01', time: '22:20', modes: 'both', title: 'Selects product',
      detail: 'Buyer picks a bedsheet set.', why: 'Starting point.' },
    { kind: 'step', id: 'E02', time: '22:22', modes: 'both', title: 'Adds to cart',
      detail: 'Order creation is initiated.', why: 'Nothing unusual yet — the risk here is almost entirely in the region and the buyer\'s thin history.' },
    { kind: 'step', id: 'E03', time: '22:30', modes: 'both', title: 'Enters delivery address',
      detail: 'Barmer. Region Score: RTO 52% · Call response 18% · 35 km · 250 orders/day → RS 27.',
      leak: L.address, tool: T.rsAi, pds: 26.0,
      why: 'RS below 40 triggers the one-time address-check AI call — and a thin history means US can\'t carry this one.',
      formula: 'RS = 0.40(48) + 0.25(18) + 0.20(12.5) + 0.15(5.2) = 27.0\nUS = 100×(1÷4) = 25 (N = 4)\nC = 0.30 + 0.40×4÷9 = 0.478\nPDS = 0.522(27.0) + 0.478(25) = 26.0' },
    { kind: 'step', id: 'E04', time: '22:35', modes: 'both', title: 'Chooses payment · COD',
      detail: 'Buyer stays on COD.', leak: L.cod, tool: T.cod, pds: 26.0,
      why: 'A buyer with a thin order history — US 25, only 1 of the last 4 orders delivered.' },
  ]},
  { date: '2026-10-02', label: 'FRI 02 OCT', dayNo: 1, phase: 'prevent', modes: 'both', items: [
    { kind: 'event', time: '10:00', modes: 'etdb', text: 'Address-check call not answered — RS stays at 27, no rescue', pdsFrom: 26.0, pds: 26.0 },
    { kind: 'step', id: 'E05', time: '11:00', modes: 'both', title: 'Order placed',
      detail: 'The one call this region rule gets went unanswered — a first, quiet warning sign.', pds: 26.0,
      why: 'Before the trigger even fires, this order is already trending the wrong way.' },
    { kind: 'step', id: 'E06', time: '11:15', modes: 'both', title: 'Seller receives order',
      detail: 'PDS engine starts tracking.', tool: T.pds, pds: 26.0,
      why: 'Same engine as every other order — here it just has almost nothing to work with.',
      base: { detail: 'Order placed. No address check at all.' } },
  ]},
  { date: '2026-10-03', label: 'SAT 03 OCT', dayNo: 2, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'E07', time: '12:00', modes: 'both', title: 'Seller packs and verifies',
      detail: 'Packing photo matched to listing. Pickup assigned.', pds: 26.0,
      why: 'Routine check — nothing about this order\'s risk shows up at the packing stage.' },
    { kind: 'step', id: 'E08', time: '13:00', modes: 'both', title: 'Picked up → source sort centre',
      detail: 'Departs for Barmer.', pds: 26.0, why: 'Long, quiet corridor — same as every low-region order in this set.' },
  ]},
  { date: '2026-10-04', label: 'SUN 04 OCT', dayNo: 3, phase: 'prevent', modes: 'both', items: [
    { kind: 'step', id: 'E08b', time: '—', modes: 'both', title: 'In line-haul', detail: 'Approaching Barmer.', pds: 26.0,
      why: 'No app opens since the order was placed — that silence is the signal.' },
  ]},
  { date: '2026-10-05', label: 'MON 05 OCT', dayNo: 4, phase: 'prevent', modes: 'both', items: [
    { kind: 'event', time: '08:44', modes: 'etdb', text: 'Trigger reached (τ = 0.62) · no app opens since ordering — ladder starts straight in Red', pdsFrom: 26.0, pds: 36.9 },
    { kind: 'step', id: 'E09a', time: '08:44', modes: 'both', title: 'Red ladder · step ① WhatsApp',
      detail: 'Direct WhatsApp nudge.', leak: L.unreach, tool: T.nudge, pds: 36.9,
      why: 'A weak region and a thin history mean the ladder starts in red, not yellow.',
      base: { detail: 'No activity at all since the order was placed.' } },
    { kind: 'event', time: '10:44', modes: 'etdb', text: 'Ignored — a return-policy visit appears', pdsFrom: 36.9, pds: 33.0 },
    { kind: 'step', id: 'E09b', time: '10:44', modes: 'both', title: 'Red ladder · step ② AI call',
      detail: 'Automated voice call — not answered.', leak: L.unreach, tool: T.nudge, pds: 33.0,
      why: 'Escalating past WhatsApp to a voice channel.' },
    { kind: 'step', id: 'E09c', time: '14:44', modes: 'both', title: 'Red ladder · step ③ support executive',
      detail: 'A human reaches the buyer: "Don\'t want it, ordered by mistake."', leak: L.refusalIntent, tool: T.nudge, pds: 33.0,
      why: 'The clearest possible negative signal — this is exactly the case the ladder exists to catch early.' },
    { kind: 'event', time: '14:44', modes: 'etdb', text: 'Explicit refusal — same-category and exit-intent both bottom out', pdsFrom: 33.0, pds: 25.7 },
  ]},
  { date: '2026-10-06', label: 'TUE 06 OCT', dayNo: 5, phase: 'deliver', modes: 'both', items: [
    { kind: 'step', id: 'E10', time: '06:00', modes: 'both', title: 'Destination sort centre',
      detail: 'Scanned in at Barmer DSC.', pds: 25.7,
      why: 'Still red on arrival.' },
    { kind: 'step', id: 'E11', time: '06:15', modes: 'both', title: 'Colour-coded sort',
      detail: 'Lane colour RED ▼ printed on label; flagged for the hold gate.', tool: T.colour, pds: 25.7,
      why: 'Colour coding gives the hub a simple physical signal to hold this one rather than send it out.' },
    { kind: 'step', id: 'E12', time: '07:00', modes: 'both', title: 'At last-mile hub · gate check',
      detail: 'Still red on arrival — the gate has to decide whether to release it.', tool: T.hold, pds: 25.7,
      why: 'PDS doesn\'t save every order the same way — here the gate has to decide whether to release a parcel that has already shown a clear refusal signal.',
      base: { detail: 'Arrives at the hub. Queued for a delivery attempt nobody has reason to expect will work.' } },
    { kind: 'step', id: 'E13', time: '07:05', modes: 'etdb', title: 'Held · cancelled before dispatch',
      detail: 'Still red. Cancelled at the hub — never sent out for delivery.', pds: 25.7, outcome: 'rto',
      why: 'PDS doesn\'t save every order. Here it caught the refusal two days early, before a single rupee of last-mile cost was spent.' },
    { kind: 'step', id: 'E14', time: '12:00', modes: 'base', title: 'Rider assigned',
      detail: 'Rider assigned. Only a phone number to go on — nobody rescued this one.',
      why: 'Same buyer, same refusal — but nothing caught it before the last-mile trip was spent.' },
    { kind: 'step', id: 'E15', time: '13:00', modes: 'base', title: 'Rider confirms buyer will receive',
      detail: 'Buyer confirms she ordered by mistake and refuses the parcel.', leak: L.refusalIntent, failsHere: true,
      why: 'The same refusal — just found three days later, after the full forward trip was already spent.' },
  ]},
  { date: '2026-10-06', label: 'TUE 06 OCT · RTS', dayNo: 6, phase: 'recover', modes: 'etdb', items: [
    { kind: 'step', id: 'E16', time: 'Day 5–7', modes: 'etdb', title: 'RTS boost in the Barmer/Jodhpur region',
      detail: 'Promoted for 2 days across the region.', tool: T.rts,
      why: 'The parcel is already local — reuse is almost always cheaper than a full reverse trip.' },
  ]},
  { date: '2026-10-07', label: 'WED 07 OCT', dayNo: 6, phase: 'deliver', modes: 'base', items: [
    { kind: 'step', id: 'E15r', time: '10:00', modes: 'base', title: 'Marked RTO · Day 6',
      detail: 'NDR: customer refused delivery. Reverse trip to Ludhiana booked.', leak: L.reverse, outcome: 'rto',
      why: 'The ₹50 forward cost is lost, and the ₹120 reverse trip begins.' },
  ]},
  { date: '2026-10-08', label: 'THU 08 OCT', dayNo: 8, phase: 'recover', modes: 'etdb', items: [
    { kind: 'step', id: 'E17', time: '—', modes: 'etdb', title: 'Resold locally · RTS Reuse',
      detail: 'A same-SKU buyer in Balotra places a matching order. Delivered there instead.', tool: T.rts, outcome: 'delivered',
      why: 'Not a delivered promise kept — a loss turned into a sale, with no last-mile trip wasted.' },
  ]},
  { date: '2026-10-14', label: 'WED 14 OCT', dayNo: 13, phase: 'deliver', modes: 'base', items: [
    { kind: 'step', id: 'E20', time: '15:00', modes: 'base', title: 'Back at seller',
      detail: 'Full reverse trip from Barmer to Ludhiana.', outcome: 'returned',
      why: 'Nothing recovered — RTS is part of the RTO Engine.' },
  ]},
];

const recovery: Step[] = [
  { kind: 'step', id: 'E16r', time: 'reference', modes: 'etdb', title: 'This order\'s actual recovery is shown above',
    detail: 'Unlike the other orders in this set, the RTS engine genuinely fired here — see the "RTS" band mid-timeline.', tool: T.rts,
    why: 'Kept here only for layout consistency with the rest of the set.' },
];

export const s5: OrderSet = {
  key: 's5',
  label: 'S5 · The Lost Cause',
  region: 'Low',
  order,
  journey,
  recovery,
};
