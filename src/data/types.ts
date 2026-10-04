export type Mode = 'etdb' | 'base';
export type Zone = 'green' | 'yellow' | 'red';
export type Phase = 'prevent' | 'deliver' | 'recover';

export interface Leak {
  code: string;
  label: string;
  stat: string;
}

export interface Tool {
  code: string;
  name: string;
}

export interface Step {
  kind: 'step';
  id: string;
  time: string;
  title: string;
  detail: string;
  leak?: Leak;
  tool?: Tool;
  why: string;
  formula?: string;
  pds?: number;
  modes: 'both' | 'etdb' | 'base';
  failsHere?: boolean;
  outcome?: 'delivered' | 'rto' | 'returned';
  base?: Partial<Omit<Step, 'kind' | 'id' | 'base'>>;
}

export interface EngineEvent {
  kind: 'event';
  time: string;
  text: string;
  pds?: number;
  pdsFrom?: number;
  modes: 'etdb';
}

export type JourneyItem = Step | EngineEvent;

export interface Day {
  date: string;
  label: string;
  dayNo: number;
  phase: Phase;
  items: JourneyItem[];
  modes: 'both' | 'etdb' | 'base';
}

export interface Order {
  id: string;
  eyebrow: string;
  route: string;
  titles: Record<Mode, { text: string; highlight: string; zone: 'green' | 'red' }>;
  kpis: Record<Mode, string[]>;
}

export interface OrderSet {
  key: string;
  label: string;
  region: 'High' | 'Mid' | 'Low';
  order: Order;
  journey: Day[];
  recovery: Step[];
}
