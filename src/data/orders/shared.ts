import type { Leak, Tool } from '../types';

export const L: Record<string, Leak> = {
  address: { code: 'L3', label: 'Unclear address', stat: '20% of RTO · 36.7M orders' },
  cod: { code: 'L1', label: 'COD refusal', stat: 'COD RTO 20% vs prepaid 5%' },
  intent: { code: 'L1', label: 'Intent drops in transit', stat: '40% change intent after dispatch' },
  missort: { code: 'L5', label: 'Wrong cart at sort centre', stat: 'Scanned right, placed wrong' },
  unreach: { code: 'L2', label: 'Buyer unreachable', stat: 'Comm. gap is 30% of RTO' },
  calls: { code: 'L2', label: 'Missed rider calls', stat: '30% of RTO · 55.1M orders' },
  reverse: { code: 'L6', label: 'Reverse-trip cost', stat: '₹120 per RTO' },
  cashShort: { code: 'L1', label: 'Cash-strapped at the door', stat: 'COD buyer can\'t pay on arrival' },
  newUser: { code: 'L1', label: 'New user, unproven intent', stat: 'No order history to score against' },
  refusalIntent: { code: 'L1', label: 'Wants to cancel', stat: 'Explicit negative signal mid-transit' },
};

export const T: Record<string, Tool> = {
  rs: { code: 'T1', name: 'Region Score' },
  rsAi: { code: 'T1', name: 'Region Score + AI call' },
  cod: { code: 'T2', name: 'COD → Prepaid' },
  pds: { code: 'T3', name: 'PDS engine' },
  nudge: { code: 'T4', name: 'Nudge orchestrator' },
  colour: { code: 'T6', name: 'DSC colour codes' },
  hold: { code: 'T7', name: 'LMDC hold gate' },
  bridge: { code: 'T8', name: 'WhatsApp Bridge' },
  geo: { code: 'T8', name: 'Bridge + geofence' },
  rts: { code: 'T9', name: 'Return-to-Sale' },
};
