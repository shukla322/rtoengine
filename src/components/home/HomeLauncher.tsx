import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { Header } from '../Header';
import { useOrderSet } from '../../context/OrderSetContext';
import { TOOL_LINKS } from '../../data/tools';
import { combinedModel } from '../../utils/financialModel';
import s from './HomeLauncher.module.css';

const base = combinedModel('Base');
const pctText = (v: number) => `${(v * 100).toFixed(v < 0.15 ? 2 : 0)}%`;

const appear = (i: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: 0.08 + i * 0.07, ease: 'easeOut' },
  whileHover: { y: -4, transition: { type: 'spring', stiffness: 400, damping: 28 } },
} as const);

// Simple line icons, drawn in the current text colour.
const icons: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  engine: <><circle cx="6" cy="18" r="2.5" /><circle cx="18" cy="6" r="2.5" /><path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" /></>,
  pds: <><path d="M4 16a8 8 0 0 1 16 0" /><path d="M12 16l4-5" /><circle cx="12" cy="16" r="1.4" /></>,
  rts: <><path d="M4 12a8 8 0 0 1 13.7-5.7L20 8.5" /><path d="M20 4v4.5h-4.5" /><path d="M20 12a8 8 0 0 1-13.7 5.7L4 15.5" /><path d="M4 20v-4.5h4.5" /></>,
  verify: <><path d="M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
};
const Icon = ({ name }: { name: string }) => (
  <span className={s.icon} aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{icons[name]}</svg>
  </span>
);

const tools = [
  { key: 'pds', title: 'PDS Tool', tag: 'Pre-Delivery Score', href: TOOL_LINKS.pds,
    text: 'Score each COD order Green, Yellow or Red at placement and see which nudge it gets: app, WhatsApp, AI call or support executive.' },
  { key: 'rts', title: 'RTS Tool', tag: 'RTO value recovery', href: TOOL_LINKS.rts,
    text: 'Find a new buyer for a refused parcel: reuse it locally, reroute it to a nearby city or intercept it on the way back.' },
  { key: 'verify', title: 'Product Verification Tool', tag: 'Image verification', href: TOOL_LINKS.verify,
    text: 'Check a parcel’s product and condition from images before it is resold or returned to the seller.' },
];

export function HomeLauncher() {
  const { openDashboard, openEngine } = useOrderSet();
  return (
    <div className={s.page}>
      <Header minimal />
      <main className={s.main}>
        <motion.div className={s.intro} {...appear(0)}>
          <span className={s.eyebrow}>Meesho × Valmo · RTO toolkit</span>
          <h1>Prevent RTOs. <span>Recover the rest.</span></h1>
          <p>RTO prevention, returns recovery and product verification for the Valmo network.</p>
        </motion.div>

        <div className={s.featured}>
          <motion.button className={`${s.card} ${s.dark}`} onClick={openDashboard} {...appear(1)}>
            <div className={s.cardTop}><Icon name="dashboard" /><span className={s.tag}>Live dashboard</span></div>
            <h2>Dashboard</h2>
            <p>Network KPIs, savings, live order activity and the PDS and RTS business case.</p>
            <div className={s.figures}>
              <span><b>₹{base.combinedAnnual.toFixed(0)} Cr</b>annual net saving</span>
              <span><b>{pctText(base.stepdown.today)} → {pctText(base.stepdown.afterRts)}</b>RTO rate</span>
            </div>
            <span className={s.cta}>Open dashboard <i>→</i></span>
          </motion.button>

          <motion.button className={`${s.card} ${s.light}`} onClick={openEngine} {...appear(2)}>
            <div className={s.cardTop}><Icon name="engine" /><span className={s.tag}>Order lifecycle</span></div>
            <h2>End-to-End RTO Prevention Engine</h2>
            <p>Place an order in the Meesho app and follow it day by day, through the PDS score, nudges, delivery and RTS recovery.</p>
            <ol className={s.steps}>
              <li>Select product</li><li>Place order</li><li>Follow the journey</li>
            </ol>
            <span className={s.cta}>Start an order <i>→</i></span>
          </motion.button>
        </div>

        <div className={s.toolGrid}>
          {tools.map((t, i) => (
            <motion.a key={t.key} className={`${s.card} ${s.tool}`} href={t.href} target="_blank" rel="noopener noreferrer" {...appear(3 + i)}>
              <div className={s.cardTop}><Icon name={t.key} /><span className={s.tag}>{t.tag}</span></div>
              <h2>{t.title}</h2>
              <p>{t.text}</p>
              <span className={s.cta}>Open tool <i>↗</i><small>New tab</small></span>
            </motion.a>
          ))}
        </div>
      </main>
    </div>
  );
}
