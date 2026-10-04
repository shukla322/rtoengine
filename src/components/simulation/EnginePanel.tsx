import type { IntentProfile } from '../../data/simZones';
import type { ScoreImpact, Verification } from '../../utils/deliverySimulation';
import { useState } from 'react';
import { motion } from 'motion/react';
import type { Zone } from '../../data/types';
import { simRiskLabel } from '../../utils/simEngine';
import { useSpringNumber } from '../../hooks/useSpringNumber';
import { PdsGauge } from '../PdsGauge';
import styles from './EnginePanel.module.css';
import { RtsPanel } from './RtsPanel';
import type { RtsCase } from '../../utils/rts';

/** notification/whatsapp/call/support bucket the nudge log; address/region/image/colour bucket the verification checklist. */
export type LogGroup = 'notification' | 'whatsapp' | 'call' | 'support' | 'address' | 'region' | 'image' | 'colour';

export interface LogEntry {
  id: string;
  icon: string;
  label: string;
  detail: string;
  group: LogGroup;
  role?: 'sent' | 'response';
}

export interface ActivityEntry {
  icon: string;
  label: string;
  detail: string;
  group: LogGroup;
  role?: 'sent' | 'response';
}

const NUDGE_CATEGORIES: { key: 'notification' | 'whatsapp' | 'call' | 'support'; icon: string; label: string }[] = [
  { key: 'notification', icon: 'BELL', label: 'Notification Nudge' },
  { key: 'whatsapp', icon: 'WA', label: 'WhatsApp Nudge' },
  { key: 'call', icon: 'CALL', label: 'AI Call Nudge' },
  { key: 'support', icon: 'SOS', label: 'Support Executive Trigger' },
];

const CHECKLIST_ITEMS: { key: 'address' | 'region' | 'image' | 'colour'; icon: string; label: string }[] = [
  { key: 'address', icon: 'ADDR', label: 'Address Validation' },
  { key: 'region', icon: 'RISK', label: 'Region Risk Scoring' },
  { key: 'image', icon: 'IMG', label: 'Image Verification' },
  { key: 'colour', icon: 'DSC', label: 'Color Coding Parcel' },
];

export function EnginePanel({
  rs,
  us,
  is,
  n,
  pds,
  zone,
  activity,
  logs,
  verification,
  intent,
  impacts,
  adjustment,
  rts = null,
}: {
  rs: number | null;
  us: number | null;
  is: number | null;
  n: number | null;
  pds: number | null;
  zone: Zone | null;
  activity: ActivityEntry | null;
  logs: LogEntry[];
  verification?: Verification;
  intent?: IntentProfile;
  impacts: ScoreImpact[];
  adjustment: number;
  rts?: RtsCase | null;
}) {
  const [openNudge, setOpenNudge] = useState<string | null>(null);
  const [openCheck, setOpenCheck] = useState<string | null>(null);

  const latest = impacts.at(-1);
  const usText = useSpringNumber(us);
  const isText = useSpringNumber(is);
  const rsText = useSpringNumber(rs);

  return (
    <aside className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.brain} aria-hidden="true">PDS</span>
        <div>
          <h2>PDS &amp; Decision Engine</h2>
          <p>Real-time calculation · Multi-factor analysis</p>
        </div>
      </div>

      <div className={styles.topHalf}>
        <div className={styles.gaugeRow}>
          <div className={styles.scoreFocus}>
          <PdsGauge pds={pds ?? 0} zone={zone ?? 'yellow'} riskLabel={zone ? simRiskLabel(zone) : '—'} />
          {latest && <div key={latest.id} className={styles.scoreImpact} data-direction={latest.delta < 0 ? 'loss' : 'gain'} role="status">
            <strong>{latest.delta > 0 ? '+' : ''}{latest.delta.toFixed(1)} PDS</strong>
            <span>{latest.label}</span>
          </div>}
          </div>
          <div className={styles.breakdown}>
            <h3>Score Breakdown</h3>
            <div className={styles.breakdownRow}>
              <span className={styles.dotLight} />
              <div className={styles.breakdownMain}>
                <span className={styles.breakdownLabel}>US</span>
                <span className={styles.breakdownNote}>{n !== null ? `N = ${n} orders` : 'Pending'}</span>
              </div>
              <span className={styles.breakdownValue}>{usText ? <motion.span>{usText}</motion.span> : '—'}</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.dotPurple} />
              <div className={styles.breakdownMain}>
                <span className={styles.breakdownLabel}>IS</span>
                <span className={styles.breakdownNote}>{is !== null ? (is >= 70 ? 'Engaged' : is >= 40 ? 'Moderate' : 'Disengaged') : 'Pending'}</span>
              </div>
              <span className={styles.breakdownValue}>{isText ? <motion.span>{isText}</motion.span> : '—'}</span>
            </div>
            <div className={styles.breakdownRow}>
              <span className={styles.dotOrange} />
              <div className={styles.breakdownMain}>
                <span className={styles.breakdownLabel}>RS</span>
                <span className={styles.breakdownNote}>{rs !== null ? (rs >= 70 ? 'Low risk' : rs >= 40 ? 'Moderate' : 'High risk') : 'Pending'}</span>
              </div>
              <span className={styles.breakdownValue} data-risk={rs !== null && rs < 40}>
                {rsText ? <motion.span>{rsText}</motion.span> : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.bottomHalf}>
        <RtsPanel value={rts} />
        <span className={styles.logEyebrow}>
          <span className={styles.liveDot} aria-hidden="true" />
          Live
        </span>

        <h3 className={styles.bottomHeading}>Nudge Log &amp; Activity</h3>
        <div className={styles.nudgeList}>
          {NUDGE_CATEGORIES.map((cat) => {
            const entries = logs.filter((l) => l.group === cat.key);
            const last = entries[entries.length - 1];
            const isLive = activity?.group === cat.key;
            const status = isLive
              ? 'sending'
              : last
                ? last.role === 'response'
                  ? last.icon === 'MISS'
                    ? 'ignored'
                    : 'responded'
                  : 'sent'
                : 'idle';
            const statusLabel =
              status === 'idle' ? 'Idle' : status === 'sending' ? 'Sending…' : status === 'responded' ? 'Responded' : status === 'ignored' ? 'Ignored' : 'Sent';
            const isOpen = openNudge === cat.key;
            return (
              <div key={cat.key} className={styles.nudgeCard} data-status={status}>
                <button
                  type="button"
                  className={styles.nudgeHead}
                  onClick={() => setOpenNudge(isOpen ? null : cat.key)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.pillIcon} aria-hidden="true">{cat.icon}</span>
                  <span className={styles.nudgeLabel}>{cat.label}</span>
                  <span className={styles.nudgeStatus} data-status={status}>{statusLabel}</span>
                  <span className={styles.chevron} data-open={isOpen} aria-hidden="true">⌄</span>
                </button>
                {isOpen && (
                  <div className={styles.logBody}>
                    {entries.length === 0 ? (
                      <p className={styles.logEmpty}>No activity yet.</p>
                    ) : (
                      entries.map((entry) => (
                        <div key={entry.id} className={styles.logEntry}>
                          <span className={styles.logEntryRole}>{entry.role === 'response' ? 'Response' : 'Sent'}</span>
                          <span className={styles.logEntryDetail}>{entry.detail}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <h3 className={styles.bottomHeading}>Verification Checklist</h3>
        <div className={styles.checklist}>
          {CHECKLIST_ITEMS.map((item) => {
            const entries = logs.filter((l) => l.group === item.key);
            const check = verification?.[item.key];
            const state = check?.status ?? 'Pending';
            const passed = state === 'Passed';
            const mark = passed ? '✓' : state === 'Checking' ? '…' : state === 'On hold' ? '‖' : '·';
            const isOpen = openCheck === item.key;
            return (
              <div key={item.key} className={styles.checkCard} data-state={state}>
                <button
                  type="button"
                  className={styles.checkHead}
                  onClick={() => setOpenCheck(isOpen ? null : item.key)}
                  aria-expanded={isOpen}
                >
                  <span className={styles.checkMark} data-state={state} aria-hidden="true">{mark}</span>
                  <span className={styles.nudgeLabel}>{item.label}</span>
                  <span className={styles.checkStatus} data-state={state}>{state}</span>
                  <span className={styles.chevron} data-open={isOpen} aria-hidden="true">⌄</span>
                </button>
                {isOpen && (
                  <div className={styles.logBody}>
                    {entries.length === 0 ? (
                      <p className={styles.logEmpty}>{check?.detail ?? 'Pending - not yet reached.'}</p>
                    ) : (
                      entries.map((entry) => (
                        <div key={entry.id} className={styles.logEntry}>
                          <span className={styles.logEntryDetail}>{item.key === 'colour' ? check?.detail : entry.detail}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <section className={styles.intentSection} aria-label="Intent signals and score history">
          <h3 className={styles.bottomHeading}>Intent signals &amp; score impact</h3>
          <p className={styles.policy}>Simulation rules: confirmation sets at least 72 PDS. Ignore push / WhatsApp: -10; AI call: -15. Range: 0-100.</p>
          {intent ? <>
            <dl className={styles.signalGrid}>
              <div><dt>Tracking visits</dt><dd>{intent.trackingVisits}/3</dd></div>
              <div><dt>Updates opened</dt><dd>{intent.notificationsOpened}/{intent.notificationsReceived}</dd></div>
              <div><dt>App engagement</dt><dd>{Math.round(100 * intent.recentUsage / intent.normalUsage)}%</dd></div>
              <div><dt>Readiness</dt><dd>{intent.readiness}/4</dd></div>
              <div><dt>Accessories</dt><dd>{intent.complementary}</dd></div>
              <div><dt>Similar products</dt><dd>{intent.sameCategory}</dd></div>
              <div><dt>Exit intent</dt><dd>{intent.exitIntent}</dd></div>
              <div><dt>Behaviour adjustment</dt><dd>{adjustment >= 0 ? '+' : ''}{adjustment.toFixed(1)}</dd></div>
            </dl>
            <p className={styles.policy}>PDS = journey-weighted base + behaviour adjustment. Repeated actions stop earning points when their signal is full.</p>
            <ol className={styles.impactHistory}>{impacts.slice(-8).reverse().map(item => <li key={item.id}>
              <span>{item.label}<small>{item.before.toFixed(1)} &rarr; {item.after.toFixed(1)}</small></span>
              <b data-negative={item.delta < 0}>{item.delta > 0 ? '+' : ''}{item.delta.toFixed(1)}</b>
            </li>)}</ol>
          </> : <p className={styles.policy}>Signals appear after order placement.</p>}
        </section>
      </div>
    </aside>
  );
}
