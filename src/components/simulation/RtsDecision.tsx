import { useEffect, useRef, useState } from 'react';
import { RTS_LABELS, type RtsAction, type RtsCase } from '../../utils/rts';
import { rtsMatches, returnRouteSale } from '../../utils/rtsMatches';
import styles from './SimulationConsole.module.css';

export function RtsDecision({ value, open, onClose, onDelivery, onAction }: {
  value: RtsCase | null; open: boolean; onClose: () => void;
  onDelivery: (delivered: boolean, reason: string) => void; onAction: (action: RtsAction) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const stage = value?.stage;
  const [readyKey, setReadyKey] = useState('');
  const [selectedOrder, setSelectedOrder] = useState('');
  const searchKey = `${value?.id}-${stage}`;
  const needsSearch = stage === 'p1' || stage === 'p2';
  const ready = readyKey === searchKey;
  const matches = value && needsSearch ? rtsMatches(value) : [];
  const selected = matches.find(order => order.order === selectedOrder && order.eligible) ?? matches.find(order => order.eligible);
  useEffect(() => {
    if (!open || !needsSearch || ready) return;
    const timer = window.setTimeout(() => setReadyKey(searchKey), 3000);
    return () => window.clearTimeout(timer);
  }, [open, needsSearch, ready, searchKey]);
  useEffect(() => { if (open && !ref.current?.open) ref.current?.showModal(); else if (!open) ref.current?.close(); }, [open]);
  const searching = stage === 'p1' || stage === 'p2' || stage === 'p3';
  return <dialog ref={ref} className={styles.decisionDialog} onCancel={onClose} onClose={onClose} aria-labelledby="decision-title">
    <div className={styles.decisionHead}><h2 id="decision-title">{stage ? RTS_LABELS[stage] : 'Delivery outcome'}</h2><button type="button" onClick={onClose} aria-label="Close decision popup">Close</button></div>
    <form key={`${stage}-${value?.stop}`} onSubmit={e => {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const choice = (e.nativeEvent as SubmitEvent).submitter?.getAttribute('value');
      if (!stage) { onDelivery(choice === 'delivered', String(data.get('reason'))); return; }
      if (stage === 'rider') onAction({ type: 'rider', intact: data.get('seal') === 'yes' });
      else if (stage === 'hub') onAction({ type: 'hub', weight: data.get('weight') === 'yes', scan: data.get('scan') === 'yes', condition: data.get('condition') === 'yes' });
      else if (searching) {
        if (needsSearch && !ready) return;
        if (choice === 'unsold') onAction({ type: 'unsold' });
        else if (stage === 'p3' && value) onAction({ type: 'sold', sale: returnRouteSale(value) });
        else if (selected) onAction({ type: 'sold', sale: selected });
      } else if (stage === 'dispatch') onAction({ type: 'dispatch' });
      else if (stage === 'delivery') onAction({ type: 'delivery', delivered: choice === 'delivered' });
      else if (stage === 'return') onAction({ type: 'returned' });
    }}>
      {!stage && <><p>Record the actual outcome of this delivery attempt.</p>
        <label>Undelivered reason<select name="reason"><option>Customer refused order</option><option>Customer unavailable</option><option>Address / access issue</option><option>Parcel damaged</option></select></label>
        <div className={styles.decisionActions}><button value="delivered">Delivered</button><button value="undelivered">Not delivered</button></div></>}
      {stage === 'rider' && <><p>{value?.reason}. Record the rider's seal inspection before sending the parcel to the hub.</p><Check name="seal" label="Seal intact?" /><button>Save rider check</button></>}
      {stage === 'hub' && <><p>All checks and an intact rider seal are required for resale. A failed check sends the parcel through normal RTO.</p>
        <Check name="weight" label="Weight matches expected parcel?" /><Check name="scan" label="Scan matches exact SKU / variant?" /><Check name="condition" label="Condition resellable?" /><button>Save hub verification</button></>}
      {needsSearch && !ready && <div className={styles.matchSearch} role="status">
        <p>{stage === 'p1' ? 'Finding nearby buyers...' : 'Tracking nationwide orders...'}</p>
        <progress aria-label="Searching for matching orders" />
      </div>}
      {needsSearch && ready && <>
        <p>{stage === 'p1' ? 'Nearby orders' : 'Best routes first - SLA met, then highest net proceeds'}. Simulated matches.</p>
        <fieldset className={styles.matchList}><legend>Select an order</legend>
          {matches.map((order, i) => <label key={order.order} className={styles.matchOption} data-selected={selected?.order === order.order}>
            <input type="radio" name="match" value={order.order} checked={selected?.order === order.order} disabled={!order.eligible} onChange={() => setSelectedOrder(order.order)} />
            <span><strong>Order {order.order.split('-').slice(-2).join('-')}{i === 0 && order.eligible ? ' - Best option' : ''}</strong>
              <small>{order.dc} - {order.distance} km - SKU: {order.sku}</small>
              <small>Sold Rs {order.price} - Route Rs {order.cost} - Net Rs {order.net}</small>
              <small>ETA {order.transitHours}h / SLA {order.slaHours}h - {order.transitHours <= order.slaHours ? 'SLA met' : 'SLA missed'}{order.net <= 0 ? ' - Not economical' : ''}</small>
            </span>
          </label>)}
        </fieldset>
        <div className={styles.decisionActions}><button value="sold" disabled={!selected}>Sold</button><button value="unsold">Unsold</button></div>
      </>}
      {stage === 'p3' && <>
        <p>Return started &rarr; DC 1 &rarr; DC 2 &rarr; Seller-side DC &rarr; Seller</p>
        <p><strong>Sold during the return journey?</strong></p>
        <div className={styles.decisionActions}><button value="sold">Sold</button><button value="unsold">Unsold - return to seller</button></div>
      </>}
      {stage === 'dispatch' && <><p>{value?.soldAt === 'P3' ? 'Confirm the parcel was intercepted before return departure.' : 'Confirm the parcel scan and local / national routing assignment.'} Destination: {value?.sale?.dc}.</p><button>Confirm routing / scan</button></>}
      {stage === 'delivery' && <><p>Record the resale outcome. Sold value is counted as recovered only after delivery.</p><div className={styles.decisionActions}><button value="delivered">Delivered</button><button value="undelivered">Not delivered</button></div></>}
      {stage === 'return' && <><p>{value?.status}. Close the case only once the seller receives the parcel.</p><button>Confirm seller receipt</button></>}
    </form>
  </dialog>;
}
function Check({ name, label }: { name: string; label: string }) {
  return <label>{label}<select name={name} required defaultValue=""><option value="" disabled>Select result</option><option value="yes">Yes - passed</option><option value="no">No - failed / uncertain</option></select></label>;
}
