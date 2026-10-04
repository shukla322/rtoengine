import { useEffect, useMemo, useState } from 'react';
import { fmt, isClosed, type DashboardOrder } from '../../../utils/dashboardData';
import { Card } from '../ui';
import { OrderTable, exportOrders } from '../OrderTable';
import s from '../Dashboard.module.css';

const STATUS_FILTERS = ['All statuses', 'Ongoing', 'Completed', 'Delivered', 'Resale done', 'Returned to seller', 'RTS matching', 'Resale in transit', 'In transit', 'Held at hub', 'Out for delivery'];
const PAGE_SIZE = 12;

function matchesStatus(o: DashboardOrder, filter: string) {
  if (filter === 'All statuses') return true;
  if (filter === 'Ongoing') return !isClosed(o);
  if (filter === 'Completed') return isClosed(o);
  return o.status === filter;
}

export function OrdersTab({ orders, onSelect, onReset }: { orders: DashboardOrder[]; onSelect: (o: DashboardOrder) => void; onReset: () => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All statuses');
  const [page, setPage] = useState(0);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter(o => matchesStatus(o, status) && (!q || `${o.id} ${o.product} ${o.from} ${o.to} ${o.resaleTo}`.toLowerCase().includes(q)));
  }, [orders, status, query]);
  useEffect(() => setPage(0), [query, status]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);

  return (
    <Card title="Order ledger" subtitle="Ongoing and past orders with price, route, outcome and net savings"
      action={<button className={s.export} onClick={() => exportOrders(rows)}>↓ Export orders</button>}>
      <div className={s.searchBar}>
        <input aria-label="Search orders" placeholder="Search order ID, product or city…" value={query} onChange={e => setQuery(e.target.value)} />
        <select aria-label="Order status" value={status} onChange={e => setStatus(e.target.value)}>
          {STATUS_FILTERS.map(f => <option key={f}>{f}</option>)}
        </select>
        <span>{fmt(rows.length)} orders</span>
      </div>
      {rows.length ? <OrderTable orders={rows.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)} onSelect={onSelect} /> : (
        <div className={s.empty}>No orders match these filters.<button onClick={() => { setQuery(''); setStatus('All statuses'); }}>Clear filters</button></div>
      )}
      <div className={s.pagination}>
        <span>Page {current + 1} of {fmt(pages)}</span>
        <div>
          <button disabled={current === 0} onClick={() => setPage(current - 1)}>← Previous</button>
          <button disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}>Next →</button>
        </div>
      </div>
      <p className={s.note}>Order history is retained on this device for 24 hours. <button className={s.inlineLink} onClick={onReset}>Reset order history</button></p>
    </Card>
  );
}
