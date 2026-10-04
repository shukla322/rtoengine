export type RtsStage = 'rider' | 'hub' | 'p1' | 'p2' | 'p3' | 'dispatch' | 'delivery' | 'return' | 'closed';
export interface RtsEvent { title: string; detail: string; at: string }
export interface Sale { price: number; cost: number; order: string; dc: string; eta: string }
export interface RtsCase {
  id: string; sku: string; originalPrice: number; stage: RtsStage; reason: string;
  seal: boolean | null; checks: { weight: boolean; scan: boolean; condition: boolean } | null;
  stop: number; boostedStops: number[]; location: string; sale: Sale | null; soldAt: string | null;
  status: string; events: RtsEvent[];
}
export const RETURN_STOPS = ['Return transit DC 1', 'Return transit DC 2', 'Seller-side DC'];
export const RTS_LABELS: Record<RtsStage, string> = {
  rider: 'Rider refusal & seal check', hub: 'Hub verification', p1: 'P1 - Fulfil locally',
  p2: 'P2 - Reroute nationally', p3: 'P3 - Sell on reroute', dispatch: 'Confirm parcel routing',
  delivery: 'Resale delivery outcome', return: 'Return to seller', closed: 'Case closed',
};
export type RtsAction =
  | { type: 'rider'; intact: boolean }
  | { type: 'hub'; weight: boolean; scan: boolean; condition: boolean }
  | { type: 'unsold' }
  | { type: 'boost' }
  | { type: 'sold'; sale: Sale }
  | { type: 'dispatch' }
  | { type: 'delivery'; delivered: boolean }
  | { type: 'returned' };
function event(title: string, detail: string): RtsEvent { return { title, detail, at: new Date().toLocaleTimeString() }; }
export function createRts(sku: string, originalPrice: number, reason: string): RtsCase {
  return { id: `RTS-${Date.now()}`, sku, originalPrice, reason, stage: 'rider', seal: null, checks: null,
    stop: 0, boostedStops: [], location: 'Destination DC', sale: null, soldAt: null, status: 'Undelivered - awaiting rider check',
    events: [event('Original order undelivered', reason)] };
}
export function transitionRts(previous: RtsCase, action: RtsAction): RtsCase {
  const s = { ...previous, events: [...previous.events] };
  const add = (title: string, detail: string) => s.events.push(event(title, detail));
  if (action.type === 'rider' && s.stage === 'rider') {
    s.seal = action.intact; s.stage = 'hub'; s.status = 'Awaiting hub verification';
    add('Rider records refusal + seal check', `${s.reason}. Seal ${action.intact ? 'intact' : 'broken / uncertain'}.`);
  } else if (action.type === 'hub' && s.stage === 'hub') {
    s.checks = { weight: action.weight, scan: action.scan, condition: action.condition };
    const eligible = s.seal && action.weight && action.scan && action.condition;
    s.stage = eligible ? 'p1' : 'return'; s.status = eligible ? 'Unsold - local demand search' : 'Normal RTO - not resellable';
    add('Hub verifies weight / scan / condition', `Weight ${action.weight ? 'passed' : 'failed'}; SKU scan ${action.scan ? 'passed' : 'failed'}; condition ${action.condition ? 'passed' : 'failed'}.`);
    add(eligible ? 'Resellable - enter RTS / P1' : 'Not resellable - normal RTO', eligible ? `Find exact-SKU demand near ${s.location}.` : 'Return parcel to seller; resale is blocked.');
  } else if (action.type === 'boost' && s.stage === 'p3' && !s.boostedStops.includes(s.stop)) {
    s.boostedStops = [...s.boostedStops, s.stop];
    add('Demand boost simulated', `${s.location}: same-SKU offer promoted for this intercept window. Await a confirmed buyer or continue unsold.`);
  } else if (action.type === 'unsold' && ['p1', 'p2', 'p3'].includes(s.stage)) {
    add(`${RTS_LABELS[s.stage]} - unsold`, 'No valid match within this search window.');
    if (s.stage === 'p1') { s.stage = 'p2'; s.status = 'Unsold - national demand search'; add(RTS_LABELS.p2, 'Find exact-SKU demand on a viable national route.'); }
    else if (s.stage === 'p2') { s.stage = 'p3'; s.location = RETURN_STOPS[0]; s.status = 'Unsold - return journey active'; add(RTS_LABELS.p3, `Return route: ${RETURN_STOPS.join(' -> ')} -> Seller. One sale decision covers the return journey.`); }
    else {
      s.stage = 'return'; s.stop = RETURN_STOPS.length - 1; s.location = RETURN_STOPS[s.stop];
      s.status = 'Unsold - final return to seller';
      add('Final fallback - return to seller', `No sale on the return journey. Continue via ${RETURN_STOPS.join(' -> ')} to the seller; awaiting receipt.`);
    }
  } else if (action.type === 'sold' && ['p1', 'p2', 'p3'].includes(s.stage)) {
    const sale = action.sale;
    if (!Number.isFinite(sale.price) || sale.price <= 0 || !Number.isFinite(sale.cost) || sale.cost < 0 || !sale.order.trim() || !sale.dc.trim() || !sale.eta.trim()) return previous;
    s.sale = { ...sale, order: sale.order.trim(), dc: sale.dc.trim(), eta: sale.eta.trim() };
    s.soldAt = s.stage.toUpperCase(); s.stage = 'dispatch'; s.status = 'Sold - awaiting parcel routing';
    add(`${s.soldAt} - resale done`, `${sale.order}: Rs ${sale.price.toFixed(2)}; routing cost Rs ${sale.cost.toFixed(2)}; destination ${sale.dc}; ETA ${sale.eta}.`);
    add(s.soldAt === 'P3' ? 'Intercept requested' : s.soldAt === 'P2' ? 'National reroute requested' : 'Local fulfilment requested', 'Confirm parcel scan and routing before resale delivery.');
  } else if (action.type === 'dispatch' && s.stage === 'dispatch' && s.sale) {
    s.location = s.sale.dc; s.stage = 'delivery'; s.status = 'Sold - out for resale delivery';
    add(s.soldAt === 'P3' ? 'Intercept confirmed' : 'Routing confirmed', `Parcel scanned at ${s.location}; resale done ${s.sale.order} assigned for delivery.`);
  } else if (action.type === 'delivery' && s.stage === 'delivery') {
    s.stage = action.delivered ? 'closed' : 'return'; s.status = action.delivered ? 'RTS recovered - delivered' : 'Resale undelivered - return to seller';
    add(action.delivered ? 'Resale delivered' : 'Resale delivery failed', action.delivered ? 'Recovery completed. Original order remains undelivered.' : 'Sale not recovered; return parcel to seller.');
  } else if (action.type === 'returned' && s.stage === 'return') {
    s.stage = 'closed'; s.location = 'Seller'; s.status = 'Returned to seller'; add('Seller receives returned parcel', 'Return receipt confirmed; case closed.');
  } else return previous;
  return s;
}
