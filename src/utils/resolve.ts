import type { Mode, Step } from '../data/types';

export function includesMode(itemModes: 'both' | Mode, mode: Mode): boolean {
  return itemModes === 'both' || itemModes === mode;
}

export function resolveStep(step: Step, mode: Mode): Step {
  if (mode === 'base' && step.base) {
    return { ...step, ...step.base };
  }
  return step;
}
