import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Header } from '../Header';
import { byDay, cities, fmt, summarize, type DashboardOrder } from '../../utils/dashboardData';
import { LEAD_DAYS } from './kpis';
import { useOrderStore } from './useOrderStore';
import { OrderDialog, shortDate } from './OrderTable';
import { Overview } from './tabs/Overview';
import { PdsTab } from './tabs/PdsTab';
import { RtsTab } from './tabs/RtsTab';
import { OrdersTab } from './tabs/OrdersTab';
import { ModelTab } from './tabs/ModelTab';
import s from './Dashboard.module.css';

const TABS = ['Overview', 'PDS performance', 'RTS recovery', 'Order history', 'Financial outlook'] as const;
type Tab = typeof TABS[number];
const RANGES = [7, 30, 90];

function rangeStart(days: number) {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - days + 1);
  return d;
}

export function Dashboard() {
  const { orders, events, live, setLive, reset, tickMs } = useOrderStore();
  const [tab, setTab] = useState<Tab>('Overview');
  const [days, setDays] = useState(30);
  const [city, setCity] = useState('All cities');
  const [selected, setSelected] = useState<DashboardOrder | null>(null);

  const cityOrders = useMemo(() => (city === 'All cities' ? orders : orders.filter(o => o.to === city)), [orders, city]);
  const filtered = useMemo(() => {
    const start = rangeStart(days).toISOString();
    return cityOrders.filter(o => o.date >= start);
  }, [cityOrders, days]);
  const m = useMemo(() => summarize(filtered), [filtered]);
  const daily = useMemo(() => byDay(cityOrders, days + LEAD_DAYS), [cityOrders, days]);
  const cohortTab = tab !== 'Financial outlook';

  return (
    <div className={s.shell}>
      <Header />
      <main className={s.main}>
        <div className={s.pageHeading}>
          <div>
            <div className={s.eyebrow}>Valmo <span>/</span> Last-mile analytics</div>
            <h1>Every delivery. Every rupee.</h1>
            <p>Delivery performance, RTO prevention and returns recovery across the Valmo network.</p>
          </div>
          <div className={s.headingActions}>
            <span className={s.liveChip}><i className={live ? s.liveDot : s.pausedDot} />{live ? 'Live updates' : 'Updates paused'}</span>
          </div>
        </div>

        <div className={s.toolbar}>
          <nav aria-label="Dashboard sections" className={s.tabs}>
            {TABS.map(t => (
              <button key={t} aria-current={tab === t ? 'page' : undefined} onClick={() => setTab(t)}>
                {t}
                {tab === t && <motion.span layoutId="tab-underline" className={s.tabUnderline} />}
              </button>
            ))}
          </nav>
          {cohortTab && (
            <div className={s.filters}>
              <select aria-label="Destination city" value={city} onChange={e => setCity(e.target.value)}>
                {['All cities', ...cities].map(c => <option key={c}>{c}</option>)}
              </select>
              <select aria-label="Date range" value={days} onChange={e => setDays(+e.target.value)}>
                {RANGES.map(r => <option key={r} value={r}>Last {r} days</option>)}
              </select>
            </div>
          )}
        </div>

        {cohortTab && (
          <div className={s.period}>
            <span>{shortDate(rangeStart(days))} – {shortDate(new Date())} · {city} · {fmt(m.total)} orders · {fmt(m.closed)} completed · {fmt(m.active)} in progress</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            {tab === 'Overview' && <Overview orders={filtered} allOrders={orders} m={m} daily={daily} events={events} live={live} setLive={setLive}
              tickMs={tickMs} onSelect={setSelected} openOrders={() => setTab('Order history')} />}
            {tab === 'PDS performance' && <PdsTab m={m} daily={daily} />}
            {tab === 'RTS recovery' && <RtsTab orders={filtered} m={m} daily={daily} onSelect={setSelected} />}
            {tab === 'Order history' && <OrdersTab orders={filtered} onSelect={setSelected} onReset={reset} />}
            {tab === 'Financial outlook' && <ModelTab />}
          </motion.div>
        </AnimatePresence>

        <footer className={s.footer}>
          <span>meesho <b>×</b> VALMO</span>
          <span>{fmt(m.active)} orders in progress</span>
        </footer>
      </main>
      {selected && <OrderDialog order={selected} close={() => setSelected(null)} />}
    </div>
  );
}
