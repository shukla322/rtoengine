import { useCallback, useEffect, useState } from 'react';
import { isClosed, makeOrder, nextStatus, seedOrders, type DashboardOrder, type Status } from '../../utils/dashboardData';

export interface FeedEvent { key: string; orderId: string; status: Status; at: string }

interface StoreState {
  seededAt: string;
  orders: DashboardOrder[];
  /** Status changes made to seeded orders since they were generated. */
  overrides: Record<string, [Status, string]>;
  liveCount: number;
  events: FeedEvent[];
}

const STORAGE_KEY = 'valmo-dashboard-v3'; // v3: release-gate rule (held orders, gate PDS)
const LIVE_ID_BASE = 900000;
const MAX_LIVE_SAVED = 400;
const MAX_EVENTS = 40;
const TICK_MS = 4000;
const SEED_MAX_AGE_MS = 86400000;
/** Orders created by the live simulation (as opposed to the deterministic seed). */
const isLiveOrder = (o: DashboardOrder) => Number(o.id.slice(3)) >= LIVE_ID_BASE + 260000;

// Kept for the browser session so switching away from the dashboard doesn't rebuild 36k orders.
let retained: StoreState | undefined;

function initialEvents(orders: DashboardOrder[]): FeedEvent[] {
  return [...orders].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 24)
    .map(o => ({ key: `${o.id}-${o.status}`, orderId: o.id, status: o.status, at: o.updated }));
}

function fresh(): StoreState {
  const seededAt = new Date();
  const orders = seedOrders(seededAt);
  return { seededAt: seededAt.toISOString(), orders, overrides: {}, liveCount: 0, events: initialEvents(orders) };
}

/** Rebuilds the deterministic seed, then replays what happened in earlier visits. */
function restore(): StoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fresh();
    const saved = JSON.parse(raw);
    if (saved.v !== 3 || Date.now() - new Date(saved.seededAt).getTime() > SEED_MAX_AGE_MS) return fresh();
    const seeded = seedOrders(new Date(saved.seededAt)).map(o => {
      const change = saved.overrides[o.id];
      return change ? { ...o, status: change[0], updated: change[1] } : o;
    });
    return { seededAt: saved.seededAt, orders: [...saved.live, ...seeded], overrides: saved.overrides, liveCount: saved.liveCount, events: saved.events };
  } catch {
    return fresh();
  }
}

function persist(s: StoreState) {
  try {
    const live = s.orders.filter(isLiveOrder).slice(0, MAX_LIVE_SAVED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 3, seededAt: s.seededAt, live, overrides: s.overrides, liveCount: s.liveCount, events: s.events }));
  } catch { /* storage unavailable: the session still works */ }
}

/** Moves one or two in-flight orders a step along their journey; every other tick a new order ships. */
function tick(s: StoreState, n: number): StoreState {
  const now = new Date().toISOString();
  const orders = [...s.orders];
  const overrides = { ...s.overrides };
  const events = [...s.events];
  const active = orders.map((o, i) => [o, i] as const).filter(([o]) => !isClosed(o))
    .sort((a, b) => a[0].updated.localeCompare(b[0].updated)).slice(0, 12);
  const advances = active.length ? 1 + (n % 3 === 0 ? 1 : 0) : 0;
  for (let k = 0; k < advances && active.length; k++) {
    const [o, i] = active.splice(Math.floor(Math.random() * active.length), 1)[0];
    const status = nextStatus(o);
    orders[i] = { ...o, status, updated: now };
    if (!isLiveOrder(o)) overrides[o.id] = [status, now];
    events.unshift({ key: `${o.id}-${status}`, orderId: o.id, status, at: now });
  }
  let liveCount = s.liveCount;
  if (n % 2 === 0) {
    const order = makeOrder(LIVE_ID_BASE + liveCount++, new Date(), 0);
    orders.unshift(order);
    events.unshift({ key: `${order.id}-${order.status}`, orderId: order.id, status: order.status, at: now });
  }
  return { ...s, orders, overrides, liveCount, events: events.slice(0, MAX_EVENTS) };
}

export function useOrderStore() {
  const [state, setState] = useState<StoreState>(() => retained ?? restore());
  const [live, setLive] = useState(true);

  useEffect(() => { retained = state; persist(state); }, [state]);

  useEffect(() => {
    if (!live) return;
    let n = 0;
    const timer = setInterval(() => setState(s => tick(s, ++n)), TICK_MS);
    return () => clearInterval(timer);
  }, [live]);

  const reset = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setState(fresh());
  }, []);

  return { orders: state.orders, events: state.events, seededAt: state.seededAt, live, setLive, reset, tickMs: TICK_MS };
}
