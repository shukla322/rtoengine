import type { Zone } from '../data/types';

export function simRiskLabel(zone: Zone): string {
  switch (zone) {
    case 'green':
      return 'Low risk';
    case 'yellow':
      return 'Medium risk';
    default:
      return 'High risk';
  }
}

export function clip(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type NudgeChannel = 'notification' | 'whatsapp' | 'call' | 'support';

export interface PendingNudge {
  channel: NudgeChannel;
  ladderStep: 1 | 2 | 3 | 4;
  zone: Zone;
  title: string;
  message: string;
}

export function nudgeCopy(channel: NudgeChannel, zone: Zone): { title: string; message: string } {
  if (channel === 'notification') {
    return { title: 'Notification', message: 'Your order needs a quick confirmation - tap to keep it moving.' };
  }
  if (channel === 'whatsapp') {
    return {
      title: 'WhatsApp',
      message: zone === 'red' ? 'Confirm delivery or your order will move to a call check.' : 'Arriving soon - confirm you will be available.',
    };
  }
  if (channel === 'call') {
    return { title: 'Incoming call - AI Agent', message: 'Calling to confirm this delivery before it moves to support.' };
  }
  return { title: 'Support executive', message: 'A support executive is trying to confirm this order before the parcel is held.' };
}
