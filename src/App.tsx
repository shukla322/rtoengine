import { useMemo, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { ModeProvider, useMode } from './context/ModeContext';
import { OrderSetProvider, useOrderSet } from './context/OrderSetContext';
import { includesMode } from './utils/resolve';
import { buildTimelineRows } from './utils/buildTimelineRows';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { useActiveDay } from './hooks/useActiveDay';
import { SimulationConsole } from './components/simulation/SimulationConsole';
import styles from './App.module.css';
import { Dashboard } from './components/dashboard/Dashboard';
import { HomeLauncher } from './components/home/HomeLauncher';
import { EngineGuide } from './components/guide/EngineGuide';

function AppInner() {
  const { mode } = useMode();
  const { active } = useOrderSet();
  const { journey, recovery } = active;
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const dayPds = useMemo(() => {
    const map = new Map<number, number>();
    let last: number | undefined;
    for (const day of journey) {
      for (const item of day.items) {
        if (!includesMode(item.modes, 'etdb')) continue;
        if (typeof item.pds === 'number') last = item.pds;
      }
      if (last !== undefined) map.set(day.dayNo, last);
    }
    return map;
  }, [journey]);

  const visibleDays = useMemo(
    () => journey.filter((day) => includesMode(day.modes, mode)),
    [journey, mode],
  );
  const dayIds = useMemo(() => visibleDays.map((day) => `day-${day.dayNo}`), [visibleDays]);
  const { activeId, registerPill } = useActiveDay(dayIds);
  const activeDayNo = activeId ? Number(activeId.replace('day-', '')) : null;

  const pds = mode === 'etdb' && activeDayNo !== null ? dayPds.get(activeDayNo) ?? null : null;

  const toggleStep = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows = buildTimelineRows({
    journey,
    recovery,
    mode,
    expanded,
    toggleStep,
    activeDayNo,
    registerPill,
  });

  return (
    <div className={styles.page}>
      <div className={styles.bgDecor} aria-hidden="true">
        <span className={styles.blobOne} />
        <span className={styles.blobTwo} />
      </div>
      <Header />
      <Hero pds={pds} />
      <div className={styles.timelineScope}>
        <div className={styles.timeline}>{rows}</div>
      </div>
    </div>
  );
}

function AppShell() {
  const { active, homeVersion, view } = useOrderSet();
  return <>
    {view === 'home' && <HomeLauncher />}
    {/* The workspace stays mounted while hidden so an order in progress survives a visit to the dashboard. */}
    <div hidden={view !== 'workspace'}>{active.key === 'custom'
      ? <SimulationConsole key={`${active.key}-${homeVersion}`} />
      : <AppInner key={active.key} />}</div>
    {view === 'dashboard' && <Dashboard />}
    {view === 'guide' && <EngineGuide />}
  </>;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <OrderSetProvider>
      <ModeProvider>
        <AppShell />
      </ModeProvider>
    </OrderSetProvider>
    </MotionConfig>
  );
}
