import { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import type { Day, Step } from '../../data/types';
import { simZones } from '../../data/simZones';
import type { SimZonePreset } from '../../data/simZones';
import { T } from '../../data/orders/shared';
import { DeliverySimulation, STAGES, type IntentAction } from '../../utils/deliverySimulation';
import { buildTimelineRows } from '../../utils/buildTimelineRows';
import { Header } from '../Header';
import { useOrderSet } from '../../context/OrderSetContext';
import { EnginePanel, type LogEntry } from './EnginePanel';
import { PhoneMockup, products, type PhoneScreen, type ProductItem } from './PhoneMockup';
import appStyles from '../../App.module.css';
import styles from './SimulationConsole.module.css';
import { createRts, transitionRts, RTS_LABELS, type RtsCase, type RtsAction } from '../../utils/rts';
import { RtsDecision } from './RtsDecision';

let uid = 0;
const nextId = (prefix: string) => `${prefix}-${uid++}`;

function mkStep(id: string, title: string, detail: string, why: string, extra?: Partial<Step>): Step {
  return { kind: 'step', id, time: '—', modes: 'both', title, detail, why, ...extra };
}

const STAGE_CONTEXT: Record<number, Pick<Step, 'detail' | 'why' | 'tool'>> = {
  1: { detail: 'Order promise, COD risk and SKU context are captured.', why: 'Bad order context makes every later decision noisy; the engine needs a clean starting snapshot.', tool: T.cod },
  2: { detail: 'Address format, landmark and serviceability are checked first.', why: 'Unclear addresses create failed attempts, rider calls and manual corrections near delivery.', tool: T.rs },
  3: { detail: 'Region history and buyer history create the first risk band.', why: 'A weak lane or thin buyer history changes the intervention plan before the parcel moves.', tool: T.rs },
  4: { detail: 'Seller accepts the order with risk already visible.', why: 'The seller flow should not wait until last mile to discover a risky destination.', tool: T.pds },
  5: { detail: 'PDS decides whether the order needs a nudge or can continue quietly.', why: 'Low intent can be corrected early with cheap actions before logistics cost builds.', tool: T.nudge },
  6: { detail: 'Seller prepares the exact SKU, size and variant for packing.', why: 'Wrong item or variant mistakes become avoidable RTO only if caught before pickup.', tool: T.pds },
  7: { detail: 'Packing image is matched against the order and listing.', why: 'Image validation catches fake, wrong or mismatched parcels before they enter the network.', tool: T.pds },
  8: { detail: 'Pickup readiness is confirmed after verification clears.', why: 'Pickup should not start until the parcel is safe to inject into the delivery journey.', tool: T.pds },
  9: { detail: 'Parcel is picked up and linked to the live risk state.', why: 'Once cost starts accumulating, PDS has to travel with the parcel, not stay as a checkout score.', tool: T.pds },
  10: { detail: 'Source sort checks route lane and dispatch bucket.', why: 'Early sort mistakes compound across hubs and can create delay-driven buyer refusal.', tool: T.colour },
  11: { detail: 'Line-haul starts with current PDS and open intent signals.', why: 'Transit time is where buyers change intent; nudges must stay tied to the journey state.', tool: T.nudge },
  12: { detail: 'In-transit behavior is watched for return, cancellation or tracking signals.', why: 'A yellow score can keep moving, but a red score needs stronger recovery before last mile.', tool: T.nudge },
  13: { detail: 'Destination arrival rechecks whether the parcel should flow or be held.', why: 'This is the last cheap point to stop a red parcel before rider assignment cost begins.', tool: T.hold },
  14: { detail: 'Destination sort aligns parcel lane with the latest risk zone.', why: 'Risk-aware sorting prevents high-risk parcels from being treated like clean green orders.', tool: T.colour },
  15: { detail: 'Parcel color coding prints the current routing decision.', why: 'The color code gives the hub a simple physical signal for green, yellow or red handling.', tool: T.colour },
  16: { detail: 'Last-mile hub checks whether the parcel can enter rider flow.', why: 'A red parcel without confirmation can waste rider time and trigger avoidable RTO cost.', tool: T.hold },
  17: { detail: 'Release gate decides deliver, hold, or recover.', why: 'This protects the last-mile team from sending out parcels that still need buyer confirmation.', tool: T.hold },
  18: { detail: 'Rider assignment uses the cleared delivery state.', why: 'Rider assignment should happen after risk is resolved, not while escalation is still pending.', tool: T.bridge },
  19: { detail: 'Out-for-delivery keeps bridge and geofence support ready.', why: 'Missed calls, location confusion and slot mismatch are handled before they become failed attempts.', tool: T.geo },
  20: { detail: 'Delivery outcome closes the loop for future PDS learning.', why: 'Delivered, held or failed outcomes improve the next region, buyer and intent decision.', tool: T.pds },
};

export function SimulationConsole() {
  const { openGuide, view } = useOrderSet();
  // The engine stays mounted while another page is shown; its clock only runs while it is on screen.
  const visibleRef = useRef(view === 'workspace');
  visibleRef.current = view === 'workspace';
  const [screen, setScreen] = useState<PhoneScreen>('catalog');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(products[0]);
  const [selectedZoneKey, setSelectedZoneKey] = useState<string | null>(null);
  const [journey, setJourney] = useState<Day[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const simulationRef = useRef<DeliverySimulation | null>(null);
  const [, render] = useState(0);
  const [currentStepId, setCurrentStepId] = useState<string | null>(null);
  const [rts, setRts] = useState<RtsCase | null>(null);
  const rtsRef = useRef<RtsCase | null>(null);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const simulation = simulationRef.current;
  const outcome = simulation?.deliveryOutcome ?? (simulation?.held ? 'held' : null);
  const status = rts ? rts.status : !simulation ? 'Place an order to begin' : simulation.deliveryOutcome === 'delivered' ? 'Delivered' : simulation.awaitingOutcome ? 'Awaiting delivery outcome' : simulation.paused ? 'On hold - waiting for your response' : STAGES[simulation.stage - 1];
  const progress = simulation ? `Stage ${simulation.stage}/20 · ${(simulation.elapsed / 1000).toFixed(1)} / 30.0s active · ${status}` : status;

  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the active stage in view as the simulation advances — the center
  // panel is the only scrollable region, so this is the only auto-scroll needed.
  useEffect(() => {
    if (!currentStepId) return;
    const container = scrollRef.current;
    const active = container?.querySelector('[data-current="true"]');
    if (!container || !active) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    active.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  }, [currentStepId]);

  // Apple-style scroll storytelling: one continuous line fills top-to-bottom
  // in sync with scroll position inside the timeline panel, and each step
  // activates (grey → accent) once that fill reaches its measured position —
  // reversible both ways as the user scrolls. See StepRow's `scrollProgress`/
  // `activationThreshold` and the .scrollLineTrack/.scrollLineFill overlay below.
  const toggleStep = (id: string) => {
    if (id === currentStepId && (simulation?.awaitingOutcome || (rts && rts.stage !== 'closed'))) {
      setDecisionOpen(true);
      return;
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const syncSimulation = useCallback(() => {
    const sim = simulationRef.current;
    if (!sim) return;
    const records = sim.records.splice(0);
    for (const record of records) {
      if (record.type === 'stage') {
        const id = `live-stage-${record.stage}`;
        const dayNo = record.stage <= 5 ? 0 : record.stage <= 10 ? 1 : record.stage <= 15 ? 2 : 3;
        const stageContext = STAGE_CONTEXT[record.stage];
        const step = mkStep(id, `${String(record.stage).padStart(2, '0')} - ${record.label}`, stageContext.detail, stageContext.why,
          { tool: stageContext.tool, pds: record.stage >= 4 ? sim.pds : undefined });
        setJourney(prev => {
          if (prev.some(day => day.dayNo === dayNo)) return prev.map(day => day.dayNo === dayNo ? { ...day, items: [...day.items, step] } : day);
          return [...prev, { date: '', label: ['PLACED', 'PROCESSING', 'IN TRANSIT', 'LAST MILE'][dayNo], dayNo, phase: dayNo < 3 ? 'prevent' : 'deliver', modes: 'both', items: [step] }];
        });
        setCurrentStepId(id);
        if (record.stage === 20) setDecisionOpen(true);
      } else {
        setLogs(prev => [...prev, { id: nextId('log'), icon: record.ignored ? 'MISS' : 'OK', label: record.label, detail: record.detail, group: record.group!, role: record.role }]);
      }
    }
    render(value => value + 1);
  }, []);

  useEffect(() => {
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      if (!visibleRef.current) { last = now; return; }
      // Cap delayed callbacks so background tabs cannot skip verification stages.
      simulationRef.current?.advance(Math.min(now - last, 250));
      last = now;
      if (simulationRef.current && !simulationRef.current.completed) syncSimulation();
      else if (simulationRef.current?.records.length) syncSimulation();
    }, 100);
    return () => window.clearInterval(timer);
  }, [syncSimulation]);

  function runSimulation(zone: SimZonePreset) {
    if (simulationRef.current) return;
    setJourney([]);
    setLogs([]);
    simulationRef.current = new DeliverySimulation(zone);
    setScreen('tracking');
    syncSimulation();
  }

  const handleNudgeAction = (action: 'respond' | 'ignore') => {
    simulationRef.current?.respond(action);
    syncSimulation();
  };
  const handleIntentAction = (action: IntentAction) => {
    simulationRef.current?.act(action);
    syncSimulation();
  };

  function appendRecovery(next: RtsCase, from: number) {
    const steps = next.events.slice(from).map((event, i) => mkStep(`rts-${from + i}`, event.title, event.detail,
      'Every recovery decision is linked to the original parcel and resale done.', {
        time: event.at, tool: { code: 'RTS', name: 'Return recovery' },
        outcome: next.stage === 'closed' && from + i === next.events.length - 1 ? (next.status === 'RTS recovered - delivered' ? 'delivered' : 'returned') : undefined,
      }));
    setJourney(prev => {
      const day = prev.find(d => d.dayNo === 4);
      return day ? prev.map(d => d.dayNo === 4 ? { ...d, items: [...d.items, ...steps] } : d)
        : [...prev, { date: '', label: 'RTS RECOVERY', dayNo: 4, phase: 'recover', modes: 'both', items: steps }];
    });
    setCurrentStepId(next.stage === 'closed' ? null : steps.at(-1)?.id ?? null);
  }
  function handleDelivery(delivered: boolean, reason: string) {
    const sim = simulationRef.current;
    if (!sim?.awaitingOutcome) return;
    sim.recordDelivery(delivered ? 'delivered' : 'undelivered');
    setJourney(prev => prev.map(day => ({ ...day, items: day.items.map(item => item.kind === 'step' && item.id === 'live-stage-20'
      ? { ...item, title: delivered ? '20 - Delivered' : '20 - Not delivered', detail: delivered ? 'Original order delivered to the customer.' : reason, outcome: delivered ? 'delivered' as const : undefined } : item) })));
    if (delivered) { setCurrentStepId(null); setDecisionOpen(false); }
    else {
      const next = createRts(selectedProduct.id, selectedProduct.price, reason);
      rtsRef.current = next; setRts(next); appendRecovery(next, 0); setDecisionOpen(true);
    }
    render(v => v + 1);
  }
  function handleRtsAction(action: RtsAction) {
    const previous = rtsRef.current;
    if (!previous) return;
    const next = transitionRts(previous, action);
    if (next === previous) return;
    rtsRef.current = next; setRts(next); appendRecovery(next, previous.events.length);
    setDecisionOpen(false);
  }
  const decisionPending = !!simulation?.awaitingOutcome || !!(rts && rts.stage !== 'closed');

  const activeDayNo = journey.length ? journey[journey.length - 1].dayNo : null;
  const rows = useMemo(
    () =>
      buildTimelineRows({
        journey,
        recovery: [],
        mode: 'etdb',
        expanded,
        toggleStep,
        activeDayNo,
        showRecovery: false,
        progressMode: true,
        currentStepId,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [journey, expanded, activeDayNo, currentStepId],
  );

  return (
    <div className={styles.shell}>
      <div className={styles.topBar}>
        <Header title={<>End-to-end RTO prevention engine<span className={styles.titleDot}>.</span></>}
          action={<button type="button" className={styles.guideButton} onClick={openGuide}>Guide</button>} />
      </div>

      <main className={styles.grid} aria-label="Custom order workspace">
        <EnginePanel
          rts={rts}
          rs={simulation && simulation.stage >= 4 ? simulation.rs : null}
          us={simulation && simulation.stage >= 4 ? simulation.us : null}
          is={simulation && simulation.stage >= 4 ? simulation.is : null}
          n={simulation && simulation.stage >= 4 ? simulation.preset.history.n : null}
          pds={simulation && simulation.stage >= 4 ? simulation.pds : null}
          zone={simulation && simulation.stage >= 4 ? simulation.zone : null}
          activity={null}
          logs={logs}
          verification={simulation?.verification}
          intent={simulation?.intent}
          impacts={simulation?.impacts ?? []}
          adjustment={simulation?.adjustment ?? 0}
        />

        <section className={styles.center} aria-label="Delivery timeline">
          <div className={styles.timelineHeader}>
          <h2 className={styles.centerHeading}>{rts ? 'Delivery & RTS Journey' : '20-Stage Delivery Journey'}</h2>
          <p className={styles.journeyProgress} data-testid="journey-progress">{progress}</p>
          <progress max={30} value={(simulation?.elapsed ?? 0) / 1000} aria-label="Journey active time" />
          <p className={styles.centerSub}>From order to doorstep — live tracking &amp; intervention</p>
          </div>
          <div className={styles.timelineScroll} ref={scrollRef} tabIndex={0} aria-label="Scrollable delivery journey">
          {journey.length === 0 ? (
            <div className={styles.centerEmpty}><span className={styles.emptyEyebrow}>YOUR NEXT DELIVERY STARTS HERE</span><h3>One order. A complete picture.</h3><p>Choose a product in the Meesho app, add your delivery address and place the order to bring this journey to life.</p><div className={styles.emptySteps}><span>01 &nbsp; Select product</span><span>02 &nbsp; Place order</span><span>03 &nbsp; Follow the journey</span></div>
              <div className={styles.emptyOr} aria-hidden="true"><span>OR</span></div>
              <p className={styles.emptyGuideText}>Follow the guide for a step-by-step walkthrough of the end-to-end engine.</p>
              <button type="button" className={styles.emptyGuideButton} onClick={openGuide}>Open the guide</button>
            </div>
          ) : (
            <div className={`${appStyles.timeline} ${styles.journeyTimeline}`}>
              {rows}
            </div>
          )}
          {decisionPending && <div className={styles.decisionBar}>
            <p>{rts ? `${RTS_LABELS[rts.stage]} - action required` : 'Record delivered or not delivered to continue.'}</p>
            <button type="button" onClick={() => setDecisionOpen(true)}>{rts ? `Record ${RTS_LABELS[rts.stage]}` : 'Record delivery outcome'}</button>
          </div>}
          </div>
        </section>

        <div className={styles.right}>
          <h2 className={styles.centerHeading}>Meesho App</h2>
          <p className={styles.centerSub}>Real-time nudge &amp; user response</p>
          <div className={styles.phoneStage}>
            <PhoneMockup
              screen={screen}
              selectedProduct={selectedProduct}
              onSelectProduct={(product) => {
                setSelectedProduct(product);
                setScreen('product');
              }}
              onAddToCart={() => setScreen('cart')}
              onGoToAddress={() => setScreen('address')}
              zones={simZones}
              selectedZoneKey={selectedZoneKey}
              onSelectZone={setSelectedZoneKey}
              onPlaceOrder={() => {
                const zone = simZones.find((z) => z.key === selectedZoneKey);
                if (zone) void runSimulation(zone);
              }}
              pendingNudge={simulation?.pending ?? null}
              onNudgeAction={handleNudgeAction}
              outcome={outcome}
              statusLines={[]}
              journeyStatus={status}
              intent={simulation?.intent}
              onIntentAction={handleIntentAction}
            />
          </div>
        </div>
      </main>
      <RtsDecision value={rts} open={decisionOpen} onClose={() => setDecisionOpen(false)} onDelivery={handleDelivery} onAction={handleRtsAction} />
    </div>
  );
}
