import type { ComplementaryActivity, ExitIntentActivity, ReadinessLevel, SameCategoryActivity } from '../utils/pds';

export interface RegionProfile {
  rtoPercent: number;
  callsAnswered: number;
  callsAttempted: number;
  distanceKm: number;
  dailyOrders: number;
}

export interface BuyerHistory {
  n: number;
  ordersAccepted: number;
  ordersPlaced: number;
}

export interface IntentProfile {
  trackingVisits: number;
  notificationsOpened: number;
  notificationsReceived: number;
  recentUsage: number;
  normalUsage: number;
  complementary: ComplementaryActivity;
  readiness: ReadinessLevel;
  sameCategory: SameCategoryActivity;
  exitIntent: ExitIntentActivity;
}

export interface SimZonePreset {
  key: 'red' | 'yellow' | 'green';
  label: string;
  address: string;
  region: RegionProfile;
  history: BuyerHistory;
  /** Baseline Intent Score inputs read at the trigger point (tau = 0.5). */
  intent: IntentProfile;
}

// Each zone carries its own region factors, order history and a baseline intent
// snapshot for that kind of address — a weak region correlates with a thinner,
// less-engaged buyer in our own story orders too, so this isn't a fudge, it's
// consistent. Numbers verified against the FINAL PDS Algorithm formula so that:
// Green opens comfortably green and only climbs further; Yellow opens yellow,
// always draws at least one nudge, and cannot fall into Red no matter how the
// buyer responds; Red opens right at the Yellow/Red line and only drops into a
// confirmed Red (held at the gate) if both nudges in the ladder are ignored —
// a single response at any point rescues it back into Yellow.
export const simZones: SimZonePreset[] = [
  {
    key: 'red',
    label: 'Red Zone Address',
    address: 'Next to Railway Station, Bengaluru, KA',
    region: { rtoPercent: 50, callsAnswered: 25, callsAttempted: 100, distanceKm: 32, dailyOrders: 600 },
    history: { n: 2, ordersAccepted: 1, ordersPlaced: 2 },
    intent: {
      trackingVisits: 0,
      notificationsOpened: 0,
      notificationsReceived: 1,
      recentUsage: 0.1,
      normalUsage: 1,
      complementary: 'none',
      readiness: 1,
      sameCategory: 'searched',
      exitIntent: 'returnPolicy',
    },
  },
  {
    key: 'green',
    label: 'Green Zone Address',
    address: '123, MG Road, Bengaluru, KA',
    region: { rtoPercent: 8, callsAnswered: 92, callsAttempted: 100, distanceKm: 6, dailyOrders: 4200 },
    history: { n: 20, ordersAccepted: 17, ordersPlaced: 20 },
    intent: {
      trackingVisits: 2,
      notificationsOpened: 2,
      notificationsReceived: 2,
      recentUsage: 0.7,
      normalUsage: 1,
      complementary: 'viewed',
      readiness: 2,
      sameCategory: 'none',
      exitIntent: 'none',
    },
  },
  {
    key: 'yellow',
    label: 'Yellow Zone Address',
    address: '45, JP Nagar, Bengaluru, KA',
    region: { rtoPercent: 28, callsAnswered: 55, callsAttempted: 100, distanceKm: 24, dailyOrders: 1920 },
    history: { n: 4, ordersAccepted: 2, ordersPlaced: 4 },
    intent: {
      trackingVisits: 1,
      notificationsOpened: 1,
      notificationsReceived: 3,
      recentUsage: 0.4,
      normalUsage: 1,
      complementary: 'none',
      readiness: 1,
      sameCategory: 'none',
      exitIntent: 'none',
    },
  },
];
