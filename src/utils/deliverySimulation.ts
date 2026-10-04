import type { IntentProfile, SimZonePreset } from '../data/simZones';
import type { Zone } from '../data/types';
import { aeScore, caScore, computeC, computeIS, computePDS, computeRS, computeT, computeUS, drScore, eiScore, neScore, scScore, teScore } from './pds';
import { zoneForPds } from './zone';
import { nudgeCopy, type PendingNudge } from './simEngine';

export const STAGE_MS = 1500;
export const STAGES = [
  'Order placed', 'Address validation', 'Region & buyer scoring', 'Seller receives order',
  'Intent & confirmation gate', 'Seller prepares parcel', 'Packing image verification',
  'Ready for pickup', 'Picked up', 'Source sort centre', 'Line-haul departs', 'In transit',
  'Destination arrival', 'Destination sort centre', 'Parcel color coding', 'Last-mile hub',
  'Delivery release gate', 'Rider assigned', 'Out for delivery', 'Delivery outcome',
] as const;
export type CheckKey = 'address' | 'region' | 'image' | 'colour';
export type Verification = Record<CheckKey, { status: 'Pending' | 'Checking' | 'On hold' | 'Passed'; detail: string }>;
export type IntentAction = 'tracking' | 'notification' | 'usage' | 'complementary' | 'readiness' | 'sameCategory' | 'exitIntent' | 'confirm';
export const INTENT_ACTIONS: { key: IntentAction; label: string }[] = [
  { key: 'tracking', label: 'Track package' }, { key: 'notification', label: 'Open order update' },
  { key: 'usage', label: 'Browse Meesho' }, { key: 'complementary', label: 'Shop matching accessories' },
  { key: 'readiness', label: 'Confirm delivery details' }, { key: 'sameCategory', label: 'Explore similar products' },
  { key: 'exitIntent', label: 'View return / cancellation options' },
];
export interface ScoreImpact { id: number; label: string; before: number; after: number; delta: number; }
export const ACTION_POINTS: Record<IntentAction, number> = { tracking: 3, notification: 4, usage: 2, complementary: 6, readiness: 8, sameCategory: -10, exitIntent: -15, confirm: 0 };
const FAILED_STEP_DELAY_MS = 2000;
export interface JourneyRecord { type: 'stage' | 'log'; stage: number; label: string; detail: string; group?: CheckKey | 'notification' | 'whatsapp' | 'call' | 'support'; role?: 'sent' | 'response'; ignored?: boolean; }
export class DeliverySimulation {
  adjustment = 0;
  impacts: ScoreImpact[] = [];
  elapsed = 0;
  stage = 1;
  completed = false;
  deliveryOutcome: 'delivered' | 'undelivered' | null = null;
  get awaitingOutcome() { return this.stage === 20 && !this.completed; }
  recordDelivery(outcome: 'delivered' | 'undelivered') {
    if (!this.awaitingOutcome) return;
    this.deliveryOutcome = outcome;
    this.completed = true;
    this.elapsed = STAGES.length * STAGE_MS;
    this.pending = null;
  }
  confirmed = false;
  held = false;
  attempts = 0;
  cooldownMs = 0;
  pending: PendingNudge | null = null;
  intent: IntentProfile;
  records: JourneyRecord[] = [];
  private idleDecayStep = 0.25;
  private idleTarget: number | null = null;
  private redCallSent = false;
  rs: number;
  us: number;
  c: number;
  constructor(public preset: SimZonePreset) {
    this.intent = { ...preset.intent };
    this.rs = computeRS(preset.region.rtoPercent, preset.region.callsAnswered, preset.region.callsAttempted, preset.region.distanceKm, preset.region.dailyOrders);
    this.us = computeUS(preset.history.ordersAccepted, preset.history.ordersPlaced);
    this.c = computeC(preset.history.n);
    this.enterStage();
  }
  get is() { const i = this.intent; return computeIS(teScore(i.trackingVisits), neScore(i.notificationsOpened, i.notificationsReceived), aeScore(i.recentUsage, i.normalUsage), caScore(i.complementary), drScore(i.readiness), scScore(i.sameCategory), eiScore(i.exitIntent)); }
  get tau() { return this.elapsed / (STAGES.length * STAGE_MS); }
  get basePds() { return computePDS(this.rs, this.us, this.is, this.c, computeT(this.tau)); }
  get pds() { return Math.round(Math.max(0, Math.min(100, this.basePds + this.adjustment)) * 10) / 10; }
  private impact(label: string, before: number, target: number) {
    this.adjustment = Math.max(0, Math.min(100, target)) - this.basePds;
    const after = this.pds;
    if (after === before) return;
    this.impacts.push({ id: this.impacts.length + 1, label, before, after, delta: Math.round((after - before) * 10) / 10 });
  }
  get zone(): Zone { return zoneForPds(this.pds); }
  get paused() {
    return this.held || this.cooldownMs > 0 || !!(this.pending && (this.pending.zone === 'red' || this.pending.channel === 'call' || this.pending.channel === 'support' || this.stage < 7));
  }
  get needsConfirmation() { return this.zone !== 'green'; }
  get verification(): Verification {
    const check = (at: number, detail: string): Verification[CheckKey] => ({
      status: this.stage > at || this.completed ? 'Passed' : this.stage === at ? (this.paused ? 'On hold' : 'Checking') : (this.paused && at === 7 ? 'On hold' : 'Pending'),
      detail: this.stage > at ? detail : this.paused && at === 7 ? 'Waiting for positive buyer confirmation and risk clearance.' : `Scheduled at stage ${at}: ${STAGES[at - 1]}.`,
    });
    return { address: check(2, `Preset address validated: ${this.preset.address}`), region: check(3, `Region score ${this.rs.toFixed(1)} / Buyer score ${this.us.toFixed(1)}`), image: check(7, 'Simulated packing image match: 0.92 — passed.'), colour: check(15, `Current routing decision: ${this.zone.toUpperCase()} · PDS ${this.pds} · stage ${this.stage}/20`) };
  }
  private log(group: JourneyRecord['group'], label: string, detail: string, role?: 'sent' | 'response', ignored = false) {
    this.records.push({ type: 'log', stage: this.stage, group, label, detail, role, ignored });
  }
  private enterStage() {
    this.records.push({ type: 'stage', stage: this.stage, label: STAGES[this.stage - 1], detail: `Active time ${(this.elapsed / 1000).toFixed(1)}s · ${this.stage >= 4 ? `PDS ${this.pds} (${this.zone})` : 'Verification in progress'}` });
  }
  private gate() {
    if (this.stage < 4 || !this.needsConfirmation || this.pending || this.held || this.cooldownMs > 0 || this.completed) return;
    const channel: PendingNudge['channel'] = this.zone === 'red'
      ? this.attempts === 0 ? 'whatsapp' : this.redCallSent ? 'support' : 'call'
      : this.attempts === 0 ? 'notification' : 'whatsapp';
    this.attempts++;
    if (channel === 'call') this.redCallSent = true;
    const beforeSend = this.pds;
    // Dispatch alone is not a buyer behaviour or a penalty.
    this.adjustment = beforeSend - this.basePds;
    const copy = nudgeCopy(channel, this.zone);
    this.pending = { channel, ladderStep: Math.min(this.attempts, 4) as PendingNudge['ladderStep'], zone: this.zone, ...copy };
    this.log(channel, 'Nudge dispatched', `Stage ${this.stage} paused · PDS ${this.pds}. ${copy.message}`, 'sent');
  }
  private ignoredTarget(before: number, pending: PendingNudge) {
    if (pending.channel === 'call') return before - 15;
    if (pending.channel === 'support') return before - 5;
    if (pending.channel === 'whatsapp' && pending.zone === 'yellow' && pending.ladderStep === 2) return Math.min(39, before - 10);
    return before - 10;
  }
  advance(ms: number) {
    if (this.completed || this.awaitingOutcome) return;
    if (this.cooldownMs > 0) {
      this.cooldownMs = Math.max(0, this.cooldownMs - Math.max(0, ms));
      if (this.cooldownMs === 0) this.gate();
      return;
    }
    this.gate();
    if (this.paused) return;
    // Stop exactly at each stage boundary: waiting time is never added to active time.
    const boundary = this.stage * STAGE_MS;
    const beforeAdvance = this.pds;
    const previousElapsed = this.elapsed;
    this.elapsed = Math.min(boundary, this.elapsed + Math.max(0, ms));
    this.gate();
    const activeDelta = this.elapsed - previousElapsed;
    if (!this.paused && this.confirmed && activeDelta > 0) {
      this.idleTarget = Math.max(0, (this.idleTarget ?? beforeAdvance) - this.idleDecayStep * (activeDelta / STAGE_MS));
      this.adjustment = this.idleTarget - this.basePds;
    }
    if (this.paused || this.elapsed < boundary) return;
    const checks: Partial<Record<number, CheckKey>> = { 2: 'address', 3: 'region', 7: 'image', 15: 'colour' };
    const key = checks[this.stage];
    if (key) this.log(key, STAGES[this.stage - 1], key === 'colour' ? `Routing ${this.zone.toUpperCase()} · PDS ${this.pds} · destination sort complete` : key === 'image' ? 'Simulated image match 0.92 · Verified' : key === 'address' ? `Valid preset: ${this.preset.address}` : `RS ${this.rs.toFixed(1)} · US ${this.us.toFixed(1)}`);
    this.stage++;
    this.enterStage();
    if (!this.awaitingOutcome) this.gate();
  }
  respond(action: 'respond' | 'ignore') {
    if (!this.pending) return;
    const before = this.pds;
    const pending = this.pending;
    const channel = pending.channel;
    this.pending = null;
    if (action === 'respond') {
      this.confirmed = true;
    } else {
      this.confirmed = false;
      this.intent.exitIntent = this.intent.exitIntent === 'none' ? 'returnPolicy' : 'cancellationPage';
    }
    this.impact(`${channel}: ${action === 'respond' ? 'confirmed' : 'ignored'}`, before, action === 'respond' ? Math.max(72, before) : this.ignoredTarget(before, pending));
    this.idleTarget = action === 'respond' ? this.pds : null;
    this.log(channel, 'Nudge response', `${action === 'respond' ? 'Buyer confirmed' : 'Buyer ignored'} · IS ${this.is.toFixed(1)} · PDS ${this.pds}`, 'response', action === 'ignore');
    if (!this.needsConfirmation) { this.attempts = 0; this.held = false; this.cooldownMs = 0; this.redCallSent = false; }
    else if (action === 'ignore' && channel === 'support') {
      this.held = true;
      this.log('support', 'Order held', 'Confirmation ladder exhausted. Waiting for buyer to confirm delivery and improve intent.', 'sent');
    } else {
      this.cooldownMs = FAILED_STEP_DELAY_MS;
    }
  }
  act(action: IntentAction) {
    if (this.completed || this.awaitingOutcome || this.pending) return;
    const before = this.pds;
    const snapshot = JSON.stringify(this.intent);
    const i = this.intent;
    if (action === 'tracking') i.trackingVisits = Math.min(3, i.trackingVisits + 1);
    if (action === 'notification') i.notificationsOpened = Math.min(i.notificationsReceived, i.notificationsOpened + 1);
    if (action === 'usage') i.recentUsage = Math.min(i.normalUsage, i.recentUsage + 0.2);
    if (action === 'complementary') i.complementary = i.complementary === 'none' ? 'viewed' : i.complementary === 'viewed' ? 'cart' : 'purchased';
    if (action === 'readiness') i.readiness = Math.min(4, i.readiness + 1) as IntentProfile['readiness'];
    if (action === 'sameCategory') { i.sameCategory = i.sameCategory === 'none' ? 'searched' : i.sameCategory === 'searched' ? 'cart' : 'orderedElsewhere'; this.confirmed = false; }
    if (action === 'exitIntent') { i.exitIntent = i.exitIntent === 'none' ? 'returnPolicy' : 'cancellationPage'; this.confirmed = false; }
    if (action === 'confirm') { i.readiness = 4; i.exitIntent = 'none'; i.trackingVisits = Math.min(3, i.trackingVisits + 1); this.confirmed = true; }
    const changed = snapshot !== JSON.stringify(i);
    if (changed || action === 'confirm') {
      this.impact(INTENT_ACTIONS.find(item => item.key === action)?.label ?? 'Delivery confirmed', before,
        action === 'confirm' ? Math.max(72, before) : before + ACTION_POINTS[action]);
      this.idleTarget = this.confirmed ? this.pds : null;
    }
    if (!this.confirmed) this.idleTarget = null;
    if (this.held && !this.needsConfirmation) { this.held = false; this.attempts = 0; this.redCallSent = false; this.log('support', 'Hold released', `Buyer activity cleared risk - PDS ${this.pds}`, 'response'); }
    this.gate();
  }
}
