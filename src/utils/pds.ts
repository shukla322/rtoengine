function clip(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ---------------------------------------------------------------------------
// Region Score (RS) — where is the order going?
// ---------------------------------------------------------------------------

export function computeRS(rtoPercent: number, callsAnswered: number, callsAttempted: number, distanceKm: number, dailyOrders: number): number {
  const rtoScore = clip(100 - rtoPercent, 0, 100);
  const callScore = clip(callsAttempted > 0 ? (callsAnswered / callsAttempted) * 100 : 50, 0, 100);
  const distScore = clip(100 * (1 - distanceKm / 40), 0, 100);
  const densityScore = clip(100 * (dailyOrders / 4800), 0, 100);
  return 0.4 * rtoScore + 0.25 * callScore + 0.2 * distScore + 0.15 * densityScore;
}

// ---------------------------------------------------------------------------
// User Score (US) — who is ordering?
// ---------------------------------------------------------------------------

export function computeUS(ordersAccepted: number, ordersPlaced: number): number {
  if (ordersPlaced <= 0) return 50;
  return clip(100 * (ordersAccepted / ordersPlaced), 0, 100);
}

// ---------------------------------------------------------------------------
// Weight modulation
// ---------------------------------------------------------------------------

/** C: weight on US (rest, 1-C, is the weight on RS). Driven by order history N. */
export function computeC(n: number): number {
  return 0.3 + 0.4 * (n / (n + 5));
}

/** T: weight on IS (rest, 1-T, is the static [RS/US] weight). Driven by journey progress tau. */
export function computeT(tau: number): number {
  return 0.6 * clip(tau, 0, 1);
}

export function computeTau(timeElapsed: number, promisedDeliveryTime: number): number {
  if (promisedDeliveryTime <= 0) return 1;
  return clip(timeElapsed / promisedDeliveryTime, 0, 1);
}

// ---------------------------------------------------------------------------
// Intent Score (IS) components — what is the customer doing right now?
// Each helper returns a 0-100 score per the FINAL PDS Algorithm's lookup tables.
// ---------------------------------------------------------------------------

export function teScore(trackingVisits: number): number {
  if (trackingVisits <= 0) return 50;
  if (trackingVisits === 1) return 65;
  if (trackingVisits === 2) return 80;
  return 100;
}

export function neScore(notificationsOpened: number, notificationsReceived: number): number {
  if (notificationsReceived <= 0) return 50;
  return clip(100 * (notificationsOpened / notificationsReceived), 0, 100);
}

export function aeScore(recentUsage: number, normalUsage: number): number {
  if (normalUsage <= 0) return 50;
  return clip(100 * Math.min(1, recentUsage / normalUsage), 0, 100);
}

export type ComplementaryActivity = 'none' | 'viewed' | 'cart' | 'purchased';
export function caScore(behaviour: ComplementaryActivity): number {
  switch (behaviour) {
    case 'none': return 50;
    case 'viewed': return 70;
    case 'cart': return 85;
    case 'purchased': return 100;
  }
}

/** 0 = no readiness action · 1 = address confirmed · 2 = +location/map · 3 = +delivery slot · 4 = +arrival confirmation */
export type ReadinessLevel = 0 | 1 | 2 | 3 | 4;
export function drScore(level: ReadinessLevel): number {
  switch (level) {
    case 0: return 50;
    case 1: return 65;
    case 2: return 75;
    case 3: return 90;
    case 4: return 100;
  }
}

export type SameCategoryActivity = 'none' | 'searched' | 'cart' | 'orderedElsewhere';
export function scScore(behaviour: SameCategoryActivity): number {
  switch (behaviour) {
    case 'none': return 100;
    case 'searched': return 60;
    case 'cart': return 30;
    case 'orderedElsewhere': return 0;
  }
}

export type ExitIntentActivity = 'none' | 'returnPolicy' | 'cancellationPage';
export function eiScore(behaviour: ExitIntentActivity): number {
  switch (behaviour) {
    case 'none': return 100;
    case 'returnPolicy': return 30;
    case 'cancellationPage': return 0;
  }
}

export function computeIS(te: number, ne: number, ae: number, ca: number, dr: number, sc: number, ei: number): number {
  return 0.15 * te + 0.1 * ne + 0.1 * ae + 0.2 * ca + 0.15 * dr + 0.15 * sc + 0.15 * ei;
}

// ---------------------------------------------------------------------------
// Final Pre-Delivery Score
// ---------------------------------------------------------------------------

export function computePDS(rs: number, us: number, is: number, c: number, t: number): number {
  const staticScore = (1 - c) * rs + c * us;
  return clip((1 - t) * staticScore + t * is, 0, 100);
}
