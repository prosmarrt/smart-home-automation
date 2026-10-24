import type { Protocol } from '@/types/types';

export const PROTOCOL_OPTIONS: { value: Protocol; label: string }[] = [
  { value: 'zigbee', label: 'Zigbee' },
  { value: 'matter', label: 'Matter' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'knx', label: 'KNX (Wired)' },
  { value: 'wired', label: 'Wired' },
  { value: 'lan', label: 'LAN' }
];

export const getProtocolLabel = (protocol: Protocol | null): string => {
  if (!protocol) return 'Not Set';
  const option = PROTOCOL_OPTIONS.find(opt => opt.value === protocol);
  return option?.label || protocol;
};
