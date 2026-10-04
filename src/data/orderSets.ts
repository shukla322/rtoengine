import type { OrderSet } from './types';
import { order as baselineOrder, journey as baselineJourney, recovery as baselineRecovery } from './journey';
import { s1 } from './orders/s1';
import { s2 } from './orders/s2';
import { s3 } from './orders/s3';
import { s4 } from './orders/s4';
import { s5 } from './orders/s5';
import { s6 } from './orders/s6';
import { customOrderSet } from './orders/custom';

const baseline: OrderSet = {
  key: 'baseline',
  label: 'The Baseline · MSH-48213',
  region: 'Mid',
  order: baselineOrder,
  journey: baselineJourney,
  recovery: baselineRecovery,
};

export const orderSets: OrderSet[] = [baseline, s1, s2, s3, s4, s5, s6, customOrderSet];
