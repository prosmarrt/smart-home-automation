import { useState, useEffect } from 'react';
import { devicePricesApi } from '@/db/api';
import type { DeviceCategory, Protocol, SwitchGang } from '@/types/types';

export interface PriceOption {
  category: DeviceCategory;
  protocol?: Protocol | null;
  gang?: SwitchGang | null;
}

/**
 * Preloads prices for a set of options so device-section dropdowns
 * can show a live price hint next to each option label.
 *
 * Returns a map: `key → price`, where key = `${category}|${protocol}|${gang}`
 */
export function useOptionPrices(options: PriceOption[], deps: unknown[] = []) {
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        options.map(async (opt) => {
          const price = await devicePricesApi.getPrice(opt.category, opt.protocol, opt.gang);
          const key = `${opt.category}|${opt.protocol ?? ''}|${opt.gang ?? ''}`;
          return [key, price] as const;
        })
      );
      if (!cancelled) setPrices(Object.fromEntries(entries));
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const getPrice = (category: DeviceCategory, protocol?: Protocol | null, gang?: SwitchGang | null) =>
    prices[`${category}|${protocol ?? ''}|${gang ?? ''}`] ?? null;

  const fmt = (price: number | null) =>
    price == null || price === 0 ? null : `EGP ${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  /** Combined lookup + format helper — use this in SelectItem labels */
  const fmtFor = (category: DeviceCategory, protocol?: Protocol | null, gang?: SwitchGang | null) =>
    fmt(getPrice(category, protocol, gang));

  return { prices, getPrice, fmt, fmtFor };
}
