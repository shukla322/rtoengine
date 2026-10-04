import type { RtsCase, Sale } from './rts';

export interface RtsMatch extends Sale {
  sku: string; distance: number; transitHours: number; slaHours: number; net: number; eligible: boolean;
}

// Deterministic demo demand; no live buyer or carrier API is connected.
export function rtsMatches(value: RtsCase): RtsMatch[] {
  const local = value.stage === 'p1';
  const routes = local
    ? [ { dc: value.location, distance: 3, hours: 4, sla: 12, cost: 20, discount: 0 },
        { dc: value.location, distance: 6, hours: 6, sla: 12, cost: 25, discount: 10 },
        { dc: value.location, distance: 9, hours: 8, sla: 24, cost: 30, discount: 15 },
        { dc: value.location, distance: 12, hours: 10, sla: 24, cost: 35, discount: 20 } ]
    : [ { dc: 'Hyderabad DC', distance: 570, hours: 24, sla: 36, cost: 55, discount: 0 },
        { dc: 'Chennai DC', distance: 350, hours: 18, sla: 24, cost: 45, discount: 20 },
        { dc: 'Pune DC', distance: 840, hours: 36, sla: 48, cost: 75, discount: 10 },
        { dc: 'Delhi DC', distance: 2100, hours: 60, sla: 48, cost: 110, discount: 0 } ];
  return routes.map((route, i) => {
    const price = Math.max(1, value.originalPrice - route.discount);
    return { order: `DEMO-${value.id.slice(4)}-${value.stage.toUpperCase()}-${i + 1}`, sku: value.sku,
      dc: route.dc, distance: route.distance, transitHours: route.hours, slaHours: route.sla,
      cost: route.cost, price, eta: `Within ${route.hours} hours`, net: price - route.cost,
      eligible: route.hours <= route.sla && price > route.cost };
  }).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.net - a.net || a.transitHours - b.transitHours);
}

export function returnRouteSale(value: RtsCase): Sale {
  return { order: `DEMO-${value.id.slice(4)}-P3-${value.stop + 1}`, price: Math.round(value.originalPrice * 0.9),
    cost: 35, dc: value.location, eta: 'Within 24 hours' };
}
