import { useEffect, useRef } from 'react';
import { RTS } from '../../utils/financialModel';
import { currentPds, financials, isClosed, levelOf, rupees, zoneOfScore, type DashboardOrder, type Status } from '../../utils/dashboardData';
import { STATUS_META } from './LiveFeed';
import s from './Dashboard.module.css';

export const shortDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const toneClass = (status: Status) => s[STATUS_META[status].tone];

export function OrderTable({ orders, onSelect }: { orders: DashboardOrder[]; onSelect: (o: DashboardOrder) => void }) {
  return (
    <div className={s.tableWrap}>
      <table>
        <thead>
          <tr><th>Order / product</th><th>Route</th><th className={s.num}>Price</th><th>PDS</th><th>Outcome</th><th className={s.num}>Net savings</th><th aria-label="Details" /></tr>
        </thead>
        <tbody>
          {orders.map(o => {
            const net = financials(o).net;
            return (
              <tr key={o.id}>
                <td><strong>{o.product}</strong><small>{o.id} · {shortDate(o.date)}</small></td>
                <td>{o.from} <span className={s.arrow}>→</span> {o.to}<small>{o.stage ? `${o.stage} · ${levelOf(o.stage)?.label} → ${o.resaleTo}` : `${o.payment} · ${o.category}`}</small></td>
                <td className={s.num}>{rupees(o.price)}</td>
                <td><span className={`${s.pill} ${s[zoneOfScore(currentPds(o)).toLowerCase()]}`} title={`${zoneOfScore(currentPds(o))} · placed ${o.zone}`}>{currentPds(o)}</span></td>
                <td><span className={`${s.pill} ${toneClass(o.status)}`}>{o.status}</span></td>
                <td className={`${s.num} ${net > 0 ? s.positive : net < 0 ? s.negative : ''}`}>{rupees(net)}</td>
                <td><button className={s.detailButton} aria-label={`View ${o.id}`} onClick={() => onSelect(o)}>View</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Lifecycle steps for the order's own path, with the current one highlighted. */
function journey(o: DashboardOrder): Status[] {
  if (!o.refused) return ['In transit', 'Out for delivery', 'Delivered'];
  const lastMile: Status = o.held ? 'Held at hub' : 'Out for delivery';
  if (!o.eligible) return ['In transit', lastMile, 'Returned to seller'];
  if (!o.matched) return ['In transit', lastMile, 'RTS matching', 'Returned to seller'];
  return ['In transit', lastMile, 'RTS matching', 'Resale in transit', o.reRto ? 'Returned to seller' : 'Resale done'];
}

export function OrderDialog({ order, close }: { order: DashboardOrder; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  const f = financials(order);
  const level = levelOf(order.stage);
  const steps = journey(order);
  const current = steps.indexOf(order.status);
  const rows: [string, string, string][] = [
    ['Order price', rupees(order.price), `${order.category} · ${order.payment}`],
    ['PDS score', order.status === 'In transit' ? `${order.initialPds} (${order.zone})` : `${order.initialPds} → ${order.pds}`,
      order.status === 'In transit' ? `Re-scored at the release gate; only Green (70+) goes out for delivery · ${order.channel}`
        : order.held ? `Still Red at the gate with no buyer confirmation, so held at the hub · ${order.channel}`
        : `${order.zone} at placement → Green at the release gate · ${order.channel}`],
    ['RTS route', order.stage ? `${order.to} → ${order.resaleTo}` : 'N/A', order.stage ? `${order.stage} · ${level?.label}` : 'Not reassigned'],
    ['Resale value', f.resale ? rupees(f.resale) : 'N/A', 'Merchandise value; not counted as a logistics saving'],
    ['PDS avoided loss', rupees(f.pdsGross), 'Prevented RTO × ₹120 loss per RTO'],
    ['RTS avoided cost', rupees(f.rtsGross), level ? `Reverse ₹${level.reverseAvoided} + fresh shipment ₹${level.freshAvoided}` : 'No recovery'],
    ['Intervention cost', rupees(order.pdsCost + f.rtsCost), `PDS ${rupees(order.pdsCost)} · RTS ${rupees(f.rtsCost)}`],
    ['Net variable saving', rupees(f.net), 'Avoided cost minus interventions; excludes fixed costs'],
  ];
  return (
    <dialog ref={ref} className={s.dialog} onCancel={close} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className={s.dialogTop}><span className={s.eyebrow}>Order details</span><button onClick={close} aria-label="Close order details">✕</button></div>
      <h2>{order.product}</h2>
      <p>{order.id} · placed {shortDate(order.date)} · updated {new Date(order.updated).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
      <div className={s.route}>
        <span>{order.from}<small>Seller</small></span><b>→</b>
        <span>{order.via}<small>Sort hub</small></span><b>→</b>
        <span>{order.to}<small>Buyer</small></span>
        {order.stage && <><b>→</b><span>{order.resaleTo}<small>Resale buyer</small></span></>}
      </div>
      <ol className={s.journey}>
        {steps.map((st, i) => (
          <li key={st} className={i < current ? s.done : i === current ? `${s.now} ${toneClass(st)}` : ''}>{st}</li>
        ))}
      </ol>
      <dl className={s.kpiList}>
        {rows.map(([label, value, help]) => <div key={label}><dt>{label}<small>{help}</small></dt><dd>{value}</dd></div>)}
      </dl>
      <p className={s.note}>
        {isClosed(order) ? 'Outcome final.' : 'In progress: savings are recognised once the outcome is known.'}
        {' '}RTS costs: screening ₹{RTS.screening} per eligible parcel, movement {level ? rupees(level.movement) : '₹0'}, handling ₹{RTS.handling}. A failed resale keeps its costs and earns no credit.
      </p>
      <button className={s.primary} onClick={close}>Done</button>
    </dialog>
  );
}

export function exportOrders(orders: DashboardOrder[]) {
  const headings = ['Order ID', 'Placed', 'Updated', 'Product', 'Category', 'Price INR', 'Payment', 'Seller', 'Hub', 'Buyer city', 'Zone', 'PDS', 'Status', 'RTS level', 'Resale city', 'Resale INR', 'PDS cost INR', 'RTS cost INR', 'Net variable savings INR'];
  const rows = orders.map(o => {
    const f = financials(o);
    return [o.id, o.date, o.updated, o.product, o.category, o.price, o.payment, o.from, o.via, o.to, o.zone, o.pds, o.status, o.stage ?? '', o.stage ? o.resaleTo : '', f.resale, o.pdsCost.toFixed(2), f.rtsCost.toFixed(2), f.net.toFixed(2)];
  });
  const csv = '﻿' + [headings, ...rows].map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url; a.download = 'valmo-dashboard-orders.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
