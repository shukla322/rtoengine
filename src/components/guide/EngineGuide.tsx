import { Fragment, useEffect, useState, type ReactNode } from 'react';
import { Header } from '../Header';
import { useOrderSet } from '../../context/OrderSetContext';
import { INTENT_ACTIONS, ACTION_POINTS } from '../../utils/deliverySimulation';
import s from './EngineGuide.module.css';

type ZoneKey = 'green' | 'yellow' | 'red';

const SECTIONS = [
  ['layout', 'The screen'], ['order', 'Placing an order'], ['zones', 'Address zones'], ['ladder', 'Nudge ladder'],
  ['intent', 'Buyer actions'], ['journey', 'The 20 stages'], ['outcome', 'Delivery outcome'],
  ['rts', 'RTS recovery'], ['panel', 'Reading the left panel'], ['scenarios', 'Scenarios to try'], ['tips', 'Tips'],
] as const;

const Zone = ({ zone, children }: { zone: ZoneKey; children: ReactNode }) => (
  <span className={s.zone}><i className={s[zone]} aria-hidden="true" />{children}</span>
);

function Section({ id, index, title, children }: { id: string; index: number; title: string; children: ReactNode }) {
  return (
    <section id={id} className={s.section} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}><span>{index}.</span>{title}</h2>
      {children}
    </section>
  );
}

/** Outlined steps joined by a connector line; stacks vertically on narrow screens. */
function Steps({ items }: { items: { title: string; text: string }[] }) {
  return (
    <ol className={s.steps}>
      {items.map((it, i) => (
        <Fragment key={it.title}>
          {i > 0 && <li className={s.connector} aria-hidden="true" />}
          <li className={s.step}>
            <span className={s.stepNo}>{i + 1}</span>
            <strong>{it.title}</strong>
            <p>{it.text}</p>
          </li>
        </Fragment>
      ))}
    </ol>
  );
}

const STAGES: { phase: string; stages: [number, string, boolean?][] }[] = [
  { phase: 'Placed', stages: [[1, 'Order placed'], [2, 'Address validation', true], [3, 'Region & buyer scoring', true], [4, 'Seller receives order'], [5, 'Intent & confirmation gate', true]] },
  { phase: 'Processing', stages: [[6, 'Seller prepares parcel'], [7, 'Packing image verification', true], [8, 'Ready for pickup'], [9, 'Picked up'], [10, 'Source sort centre']] },
  { phase: 'In transit', stages: [[11, 'Line-haul departs'], [12, 'In transit'], [13, 'Destination arrival'], [14, 'Destination sort centre'], [15, 'Parcel color coding', true]] },
  { phase: 'Last mile', stages: [[16, 'Last-mile hub'], [17, 'Delivery release gate', true], [18, 'Rider assigned'], [19, 'Out for delivery'], [20, 'Delivery outcome', true]] },
];

const SCENARIOS = [
  { title: 'Clean delivery', goal: 'A low-risk order with no intervention.',
    steps: ['Choose any product and the Green Zone Address, then place the order.', 'Let all 20 stages run (about 30 seconds).', 'At stage 20, choose Delivered.'] },
  { title: 'Rescued order', goal: 'A doubtful buyer confirms and the order turns Green.',
    steps: ['Place an order to the Yellow Zone Address.', 'When the app notification appears, tap Confirm delivery.', 'PDS rises to 72 or more and the order continues as Green.'] },
  { title: 'Held order', goal: 'The full escalation ending in a hold.',
    steps: ['Place an order to the Red Zone Address.', 'Ignore the WhatsApp message, the AI call and the support executive.', 'The order is held. Tap Confirm I will receive this order to release it.'] },
  { title: 'Full recovery', goal: 'A refused parcel resold instead of returned.',
    steps: ['Run any order to stage 20 and choose Not delivered.', 'Record the seal as intact and pass all three hub checks.', 'At P1, wait for matches, select an order, mark it Sold, confirm routing, then record Delivered.'] },
  { title: 'Return to seller', goal: 'A parcel that cannot be resold.',
    steps: ['Run any order to stage 20 and choose Not delivered.', 'Fail any hub check, or mark Unsold at P1, P2 and P3.', 'Confirm seller receipt to close the case.'] },
];

export function EngineGuide() {
  const { openEngine } = useOrderSet();
  const [active, setActive] = useState<string>(SECTIONS[0][0]);

  // Highlight the section currently in view in the contents list.
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (visible) setActive(visible.target.id);
    }, { rootMargin: '-15% 0px -70% 0px' });
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className={s.page}>
      <Header title={<>Engine guide<span className={s.titleDot}>.</span></>}
        action={<button type="button" className={s.backButton} onClick={openEngine}>Back to engine</button>} />

      <div className={s.layout}>
        <nav className={s.toc} aria-label="Guide contents">
          <span className={s.tocTitle}>Contents</span>
          {SECTIONS.map(([id, label], i) => (
            <button key={id} type="button" aria-current={active === id ? 'true' : undefined} onClick={() => jump(id)}>
              <span className={s.tocNo}>{i + 1}</span><span>{label}</span>
            </button>
          ))}
        </nav>

        <article className={s.article}>
          <header className={s.intro}>
            <span className={s.kicker}>Guide</span>
            <h1>Using the End-to-End RTO Prevention Engine</h1>
            <p>The engine runs one Meesho order through 20 delivery stages. You play the buyer on the phone, the engine scores delivery risk (PDS) as the order moves, and you record what happens at the door.</p>
            <p className={s.meta}><span>About 3 minutes per order</span> · <span>3 address zones</span> · <span>20 stages</span></p>
            <button type="button" className={s.primary} onClick={openEngine}>Open the engine</button>
          </header>

          <Section id="layout" index={1} title="The screen">
            <p>The engine page has three panels. You interact with the phone on the right; the left and centre panels respond.</p>
            <div className={s.wireframe} aria-hidden="true">
              <div><b>A</b><span>PDS &amp; Decision Engine</span></div>
              <div><b>B</b><span>20-Stage Delivery Journey</span></div>
              <div className={s.wireActive}><b>C</b><span>Meesho App</span></div>
            </div>
            <dl className={s.defs}>
              <dt>A · PDS &amp; Decision Engine</dt><dd>Live PDS score and zone, the score breakdown, the nudge log, the verification checklist and every score change.</dd>
              <dt>B · 20-Stage Delivery Journey</dt><dd>The parcel’s timeline with progress and active time. Select any stage to read what it does and why it matters.</dd>
              <dt>C · Meesho App</dt><dd>Where you act as the buyer: choose a product, place the order, answer nudges and take actions that change the score.</dd>
            </dl>
          </Section>

          <Section id="order" index={2} title="Placing an order">
            <p>Every run starts on the phone.</p>
            <Steps items={[
              { title: 'Select product', text: 'Choose one of the seven catalogue items.' },
              { title: 'Add to Cart', text: 'Review the product page.' },
              { title: 'Proceed to Delivery', text: 'Confirm the cart.' },
              { title: 'Choose an address', text: 'Green, Yellow or Red zone.' },
              { title: 'Place Order', text: 'The journey starts in the centre panel.' },
            ]} />
            <p className={s.muted}>The address sets the risk. Each one carries its own region RTO history, buyer order history and starting intent.</p>
          </Section>

          <Section id="zones" index={3} title="Address zones">
            <p>PDS is calculated from stage 4. Green is 70 and above, Yellow is 40 to 69, Red is below 40.</p>
            <div className={s.tableWrap}>
              <table className={s.stack}>
                <thead><tr><th>Address</th><th>What to expect</th></tr></thead>
                <tbody>
                  <tr><td className={s.addressCell}><Zone zone="green">Green Zone Address</Zone><small>123, MG Road, Bengaluru</small></td><td>Strong region and buyer history. No nudges; the order moves straight through all 20 stages.</td></tr>
                  <tr><td className={s.addressCell}><Zone zone="yellow">Yellow Zone Address</Zone><small>45, JP Nagar, Bengaluru</small></td><td>Average region, thin buyer history. Receives an app notification, then a WhatsApp message. Ignoring both moves it to Red.</td></tr>
                  <tr><td className={s.addressCell}><Zone zone="red">Red Zone Address</Zone><small>Next to Railway Station, Bengaluru</small></td><td>High-RTO region, new buyer who viewed the return policy. The journey pauses at each nudge until you answer.</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section id="ladder" index={4} title="Nudge ladder">
            <p>When the score is below Green, the engine sends a nudge to the phone. Confirming moves the order to Green (PDS 72 or more) and ends the ladder. Ignoring sends the next nudge after a short pause.</p>
            <div className={s.tableWrap}>
              <table>
                <thead><tr><th className={s.stepCol}>Step</th><th>Channel</th><th>If ignored</th></tr></thead>
                <tbody>
                  <tr className={s.group}><td colSpan={3}><Zone zone="yellow">Yellow orders</Zone> · from stage 7 the parcel keeps moving while the nudge is open</td></tr>
                  <tr><td className={s.stepCol}>1</td><td>App notification</td><td>−10 PDS</td></tr>
                  <tr><td className={s.stepCol}>2</td><td>WhatsApp</td><td>Drops to Red; continues from the AI call</td></tr>
                  <tr className={s.group}><td colSpan={3}><Zone zone="red">Red orders</Zone> · the journey pauses until you answer</td></tr>
                  <tr><td className={s.stepCol}>1</td><td>WhatsApp</td><td>−10 PDS</td></tr>
                  <tr><td className={s.stepCol}>2</td><td>AI voice call</td><td>−15 PDS</td></tr>
                  <tr><td className={s.stepCol}>3</td><td>Support executive</td><td>Order held</td></tr>
                </tbody>
              </table>
            </div>
            <div className={s.note}>
              <strong>Releasing a held order</strong>
              <p>A held order stops where it is. On the phone, tap <em>Confirm I will receive this order</em>, or take positive actions until the score reaches Green.</p>
              <p>A confirmed order loses a little score while the buyer is inactive, so a short reminder may appear later in transit. Confirm it to keep the order Green.</p>
            </div>
          </Section>

          <Section id="intent" index={5} title="Buyer actions">
            <p>While the order is in progress, the phone shows <em>Manage your delivery</em>. Each action is an intent signal and changes the PDS immediately.</p>
            <div className={s.tableWrap}>
              <table>
                <thead><tr><th>Action</th><th className={s.num}>PDS change</th></tr></thead>
                <tbody>
                  {INTENT_ACTIONS.map(a => {
                    const pts = ACTION_POINTS[a.key];
                    return <tr key={a.key}><td>{a.label}</td><td className={`${s.num} ${pts < 0 ? s.negative : ''}`}>{pts > 0 ? '+' : '−'}{Math.abs(pts)}</td></tr>;
                  })}
                  <tr><td>Confirm I will receive this order <small>Shown only when the order is held</small></td><td className={s.num}>to 72+</td></tr>
                </tbody>
              </table>
            </div>
            <p className={s.muted}>Actions are unavailable while a nudge is open. Negative actions can move a Green order into Yellow, which starts the nudge ladder.</p>
          </Section>

          <Section id="journey" index={6} title="The 20 stages">
            <p>Each stage takes about 1.5 seconds of active time, 30 seconds in total. The clock stops while the engine waits for your answer.</p>
            <div className={s.phases}>
              {STAGES.map(p => (
                <div key={p.phase}>
                  <h3>{p.phase}</h3>
                  <ol>
                    {p.stages.map(([n, label, checkpoint]) => (
                      <li key={n}><span>{n}</span><div>{label}{checkpoint && <em>Checkpoint</em>}</div></li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </Section>

          <Section id="outcome" index={7} title="Delivery outcome">
            <p>At stage 20 a dialog asks what happened at the door. If you close it, the bar at the bottom of the journey reopens it.</p>
            <dl className={s.defs}>
              <dt>Delivered</dt><dd>The order is complete and the journey closes.</dd>
              <dt>Not delivered</dt><dd>Select a reason (refused, unavailable, address issue or damaged). The parcel moves into RTS recovery.</dd>
            </dl>
          </Section>

          <Section id="rts" index={8} title="RTS recovery">
            <p>A refused parcel is offered for resale before it is returned. Each step opens as a dialog.</p>
            <Steps items={[
              { title: 'Rider seal check', text: 'Record whether the seal is intact.' },
              { title: 'Hub verification', text: 'Weight, SKU scan and condition must all pass.' },
              { title: 'P1 · Fulfil locally', text: 'Select a nearby order, or mark Unsold.' },
              { title: 'P2 · Reroute nationally', text: 'Select an order on a national route, or mark Unsold.' },
              { title: 'P3 · Sell on reroute', text: 'Sell during the return journey, or return it.' },
            ]} />
            <div className={s.tableWrap}>
              <table className={s.stack}>
                <thead><tr><th>Result</th><th>Next steps</th></tr></thead>
                <tbody>
                  <tr><td>Sold at P1, P2 or P3</td><td>Confirm routing → record the resale delivery → case closed as recovered</td></tr>
                  <tr><td>Seal broken, a hub check fails, unsold at P3, or resale not delivered</td><td>Return to seller → confirm seller receipt → case closed</td></tr>
                </tbody>
              </table>
            </div>
            <p className={s.muted}>Match lists show sale price, routing cost, net value and delivery SLA. The best option is preselected; orders that miss the SLA or do not cover the routing cost cannot be selected.</p>
          </Section>

          <Section id="panel" index={9} title="Reading the left panel">
            <dl className={s.defs}>
              <dt>PDS gauge</dt><dd>The current score and zone. The most recent change, such as “−15 PDS · call ignored”, appears beside it.</dd>
              <dt>Score breakdown</dt><dd>US is the buyer’s order history, IS is intent from app activity, and RS is region risk from RTO rate, call answer rate and distance.</dd>
              <dt>Nudge log &amp; activity</dt><dd>Each channel, what was sent, and whether the buyer responded or ignored it.</dd>
              <dt>Verification checklist</dt><dd>Address, region scoring, packing image and colour coding, each marked pending, checking, on hold or passed.</dd>
              <dt>Intent signals &amp; score impact</dt><dd>Every action and nudge response with the score before and after.</dd>
              <dt>RTS panel</dt><dd>Shown after a failed delivery: current stage, location, next stop and status.</dd>
            </dl>
          </Section>

          <Section id="scenarios" index={10} title="Scenarios to try">
            <div className={s.scenarios}>
              {SCENARIOS.map(sc => (
                <div key={sc.title} className={s.scenario}>
                  <h3>{sc.title}</h3>
                  <p>{sc.goal}</p>
                  <ol>{sc.steps.map(st => <li key={st}>{st}</li>)}</ol>
                </div>
              ))}
            </div>
          </Section>

          <Section id="tips" index={11} title="Tips">
            <ul className={s.tips}>
              <li><strong>Start a new order.</strong> Select the meesho logo to return home, then open the engine again.</li>
              <li><strong>Case studies.</strong> The Previous order analysis menu in the top bar opens six pre-built order stories.</li>
              <li><strong>Stage details.</strong> Select any stage in the journey to see its detail and rationale.</li>
              <li><strong>Missed a dialog.</strong> Use the bar at the bottom of the journey to reopen the pending decision.</li>
              <li><strong>Your order is kept.</strong> The order pauses while this guide or the dashboard is open and resumes when you return.</li>
            </ul>
            <button type="button" className={s.primary} onClick={openEngine}>Open the engine</button>
          </Section>
        </article>
      </div>
    </div>
  );
}
