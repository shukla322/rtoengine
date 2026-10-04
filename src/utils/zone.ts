import type { Zone } from '../data/types';

export function zoneForPds(pds: number): Zone {
  if (pds >= 70) return 'green';
  if (pds >= 40) return 'yellow';
  return 'red';
}

export function zoneLabel(zone: Zone): string {
  switch (zone) {
    case 'green': return 'Low';
    case 'yellow': return 'Watch';
    case 'red': return 'Hold';
  }
}

export function zoneVar(zone: Zone): string {
  return `var(--zone-${zone})`;
}
