import { RETURN_STOPS, RTS_LABELS, type RtsCase } from '../../utils/rts';
import styles from './EnginePanel.module.css';

export function RtsPanel({ value }: { value: RtsCase | null }) {
  const money = (n: number) => `Rs ${n.toFixed(2)}`;
  return <section className={styles.intentSection} aria-label="RTS live data">
    <h3 className={styles.bottomHeading}>RTS live data</h3>
    <p className={styles.policy}>Live simulation state. Buyer orders, routes and costs are sample data.</p>
    {value ? <>
      <p className={styles.policy} role="status"><strong>{value.status}</strong></p>
      <dl className={styles.signalGrid}>
        {Object.entries({
          'Case': value.id, 'SKU': value.sku, 'Original order': 'Undelivered', 'Reason': value.reason,
          'Stage': RTS_LABELS[value.stage], 'Current DC': value.location,
          'Next stop': value.stage === 'p3' ? RETURN_STOPS[value.stop + 1] ?? 'Seller' : value.stage === 'return' ? 'Seller' : value.stage === 'dispatch' ? value.sale?.dc ?? 'Pending' : '-',
          'Seal': value.seal === null ? 'Pending' : value.seal ? 'Intact' : 'Failed',
          'Hub checks': value.checks ? Object.entries(value.checks).map(([key, passed]) => `${key}: ${passed ? 'pass' : 'fail'}`).join(', ') : 'Pending',
          'Sold in': value.soldAt ?? 'Unsold',
          'Demand boosts': String(value.boostedStops.length),
          'Resale done': value.sale?.order ?? 'No match', 'Destination': value.sale?.dc ?? 'Pending',
          'ETA': value.sale?.eta ?? 'Pending', 'Original price': money(value.originalPrice),
          'Sold price': value.sale ? money(value.sale.price) : '-',
          'Discount': value.sale ? money(Math.max(0, value.originalPrice - value.sale.price)) : '-',
          'Routing cost': value.sale ? money(value.sale.cost) : '-',
          'Est. net proceeds': value.sale ? money(value.sale.price - value.sale.cost) : '-',
          'Recovered sale value': money(value.status === 'RTS recovered - delivered' ? value.sale?.price ?? 0 : 0),
        }).map(([label, text]) => <div key={label}><dt>{label}</dt><dd style={{ overflowWrap: 'anywhere' }}>{text}</dd></div>)}
      </dl>
      <p className={styles.policy}>Estimated net proceeds = sold price minus entered routing cost; excludes product cost and other fees.</p>
      <details><summary>RTS activity ({value.events.length})</summary>
        <ol className={styles.impactHistory}>{value.events.map((e, i) => <li key={i}><span>{e.title}<small>{e.at} - {e.detail}</small></span></li>)}</ol>
      </details>
    </> : <p className={styles.policy}>A case opens after an undelivered outcome. Record decisions in the timeline.</p>}
  </section>;
}
