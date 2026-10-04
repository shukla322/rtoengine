import { useEffect, useMemo, useState } from 'react';
import { financials, isClosed, rupees, type DashboardOrder, type Status } from '../../utils/dashboardData';
import type { FeedEvent } from './useOrderStore';
import { Card, Segmented } from './ui';
import s from './Dashboard.module.css';

const VIEWS = ['Live events', 'Ongoing', 'Completed'] as const;
const FEED_ROWS = 8;
type View = typeof VIEWS[number];

export const STATUS_META: Record<Status, { title: string; icon: string; tone: 'neutral' | 'progress' | 'good' | 'bad' }> = {
  'In transit': { title: 'Shipped · in transit', icon: '→', tone: 'neutral' },
  'Held at hub': { title: 'Held at hub · Red, awaiting confirmation', icon: '‖', tone: 'bad' },
  'Out for delivery': { title: 'Out for delivery · cleared Green', icon: '◎', tone: 'progress' },
  'RTS matching': { title: 'Refused · RTS matching', icon: '⟲', tone: 'progress' },
  'Resale in transit': { title: 'Matched · resale in transit', icon: '⇄', tone: 'progress' },
  Delivered: { title: 'Delivered', icon: '✓', tone: 'good' },
  'Resale done': { title: 'Recovered · resale delivered', icon: '★', tone: 'good' },
  'Returned to seller': { title: 'Returned to seller', icon: '↩', tone: 'bad' },
};

function ago(at: string, now: number) {
  const sec = Math.max(0, Math.round((now - new Date(at).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function FeedRow({ order, status, at, now, onSelect }: { order: DashboardOrder; status: Status; at: string; now: number; onSelect: () => void }) {
  const meta = STATUS_META[status];
  const net = financials(order).net;
  const title = status === 'Resale in transit' && order.stage ? `Matched ${order.stage} · resale to ${order.resaleTo}` : meta.title;
  return (
    <button className={s.feedRow} onClick={onSelect}>
      <span className={`${s.feedIcon} ${s[meta.tone]}`} aria-hidden="true">{meta.icon}</span>
      <span className={s.feedText}>
        <strong>{title}</strong>
        <small>{order.product} · {order.from} → {order.to} · {rupees(order.price)}</small>
      </span>
      <span className={s.feedMeta}>
        <time dateTime={at}>{ago(at, now)}</time>
        {isClosed(order) && Math.abs(net) >= 0.01 && <em className={net > 0 ? s.positive : s.negative}>{net > 0 ? '+' : ''}{rupees(net)}</em>}
      </span>
    </button>
  );
}

export function LiveFeed({ orders, events, live, setLive, onSelect, tickMs }: {
  orders: DashboardOrder[]; events: FeedEvent[]; live: boolean; setLive: (v: boolean) => void;
  onSelect: (o: DashboardOrder) => void; tickMs: number;
}) {
  const [view, setView] = useState<View>('Live events');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const byId = useMemo(() => new Map(orders.map(o => [o.id, o])), [orders]);
  const ongoing = useMemo(() => orders.filter(o => !isClosed(o)), [orders]);
  const rows = useMemo(() => {
    if (view === 'Live events') return events.slice(0, FEED_ROWS).flatMap(e => {
      const order = byId.get(e.orderId);
      return order ? [{ key: e.key, order, status: e.status, at: e.at }] : [];
    });
    // Orders are newest-first, so the most recently closed ones sit near the front.
    const pool = view === 'Ongoing' ? ongoing : orders.slice(0, 3000).filter(isClosed);
    return [...pool].sort((a, b) => (a.updated < b.updated ? 1 : -1)).slice(0, FEED_ROWS)
      .map(o => ({ key: `${o.id}-${o.status}`, order: o, status: o.status, at: o.updated }));
  }, [view, events, byId, ongoing, orders]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const closedToday = orders.reduce((n, o) => n + (isClosed(o) && new Date(o.updated) >= today ? 1 : 0), 0);

  return (
    <Card title="Live order feed" subtitle={`Network events · refreshed every ${tickMs / 1000}s`}
      action={<button className={s.ghostButton} onClick={() => setLive(!live)}>{live ? 'Pause' : 'Resume'}</button>}>
      <div className={s.feedStats}>
        <span><i className={live ? s.liveDot : s.pausedDot} />{live ? 'Live' : 'Paused'}</span>
        <span><b>{ongoing.length}</b> ongoing</span>
        <span><b>{closedToday}</b> completed today</span>
      </div>
      <Segmented options={VIEWS} value={view} onChange={setView} label="Feed view" />
      <ul className={s.feedList} aria-live="off">
        {/* Fixed slots: a new event takes the top slot (with a short fade-in, keyed so only it animates)
            and the others move down one slot. Nothing resizes, so the card never stretches. */}
        {rows.map(r => (
          <li key={r.key} className={s.feedSlot}>
            <FeedRow order={r.order} status={r.status} at={r.at} now={now} onSelect={() => onSelect(r.order)} />
          </li>
        ))}
      </ul>
      {!rows.length && <p className={s.empty}>Nothing here yet.</p>}
    </Card>
  );
}
