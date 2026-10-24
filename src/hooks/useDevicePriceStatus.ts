import { useState, useEffect } from 'react';
import { devicePricesApi } from '@/db/api';
import type { Device } from '@/types/types';

export type PriceStatus = 'current' | 'outdated' | 'not_in_db' | 'loading';

export interface DevicePriceInfo {
  status: PriceStatus;
  currentDbPrice: number;
  diff: number; // device.unit_price - currentDbPrice
}

/**
 * Fetches the current DB price for every device in the list and
 * compares it against the stored unit_price on the quotation.
 * Returns a map of device.id → DevicePriceInfo.
 */
export function useDevicePriceStatus(devices: Device[]) {
  const [statusMap, setStatusMap] = useState<Record<string, DevicePriceInfo>>({});

  useEffect(() => {
    if (!devices.length) return;
    let cancelled = false;

    const load = async () => {
      const entries = await Promise.all(
        devices.map(async (d) => {
          const dbPrice = await devicePricesApi.getPrice(
            d.category,
            d.protocol ?? null,
            d.gang ?? null
          );
          const stored = d.unit_price ?? 0;
          let status: PriceStatus;
          if (dbPrice === 0) {
            status = 'not_in_db';
          } else if (Math.abs(stored - dbPrice) < 0.01) {
            status = 'current';
          } else {
            status = 'outdated';
          }
          return [d.id, { status, currentDbPrice: dbPrice, diff: stored - dbPrice }] as const;
        })
      );
      if (!cancelled) setStatusMap(Object.fromEntries(entries));
    };

    load();
    return () => { cancelled = true; };
  }, [devices]);

  return statusMap;
}
