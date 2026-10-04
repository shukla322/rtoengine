import type { Order, OrderSet } from '../types';

const order: Order = {
  id: 'Custom · Build your own',
  eyebrow: 'CUSTOM ORDER · YOU CHOOSE THE REGION AND THE BUYER',
  route: 'YOUR REGION, YOUR NUMBERS',
  titles: {
    etdb: { text: 'PDS ', highlight: 'LIVE', zone: 'green' },
    base: { text: 'PDS ', highlight: 'LIVE', zone: 'green' },
  },
  kpis: {
    etdb: ['Pick a region', 'Move the sliders', 'Watch PDS move'],
    base: ['Pick a region', 'Move the sliders', 'Watch PDS move'],
  },
};

export const customOrderSet: OrderSet = {
  key: 'custom',
  label: 'Custom · Build your own',
  region: 'Mid',
  order,
  journey: [],
  recovery: [],
};
