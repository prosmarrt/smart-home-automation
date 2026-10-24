/**
 * useICUCalculator
 *
 * Pure calculation hook — reads ICU items + settings from Supabase,
 * matches each Device in a quotation to its ICU rule, and returns:
 *   - per-device breakdown rows
 *   - calculated total (auto)
 *   - final total (max of calculated vs minimum, or manual override)
 *
 * Completely isolated from existing commissioning_price / installation_price
 * / visit_price fields.
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import { icuItemsApi, icuSettingsApi } from '@/db/api';
import type { ICUItem, ICUSettings } from '@/db/api';
import type { Device } from '@/types/types';

export interface ICULineItem {
  deviceId: string;
  label: string;
  category: string;
  quantity: number;
  icuValue: number;
  pricingMode: 'formula' | 'fixed';
  unitIcCost: number;   // per-unit I&C cost
  lineTotal: number;    // qty × unitIcCost
  matchedRule: string;  // human label of the ICU rule used
  isMatched: boolean;
}

export type ICUMode = 'auto' | 'manual';

export interface ICUCalculationResult {
  lines: ICULineItem[];
  calculatedTotal: number;   // sum of all line totals
  finalTotal: number;        // max(calculated, minimum) or manual
  icuRate: number;
  icMinimum: number;
  mode: ICUMode;
  manualAmount: number;
  isLoading: boolean;
  settings: ICUSettings | null;
  icuItems: ICUItem[];
  setMode: (m: ICUMode) => void;
  setManualAmount: (n: number) => void;
  reload: () => Promise<void>;
}

/** Build a lookup key identical to the match logic */
export function matchKey(category: string, gang?: string | null, switchType?: string | null) {
  return `${category}|${gang ?? ''}|${switchType ?? ''}`;
}

/** Build all candidate keys for a device (most-specific → least-specific) */
export function candidateKeys(d: Device): string[] {
  return [
    matchKey(d.category, d.gang, d.config?.switch_type as string ?? null),
    matchKey(d.category, d.gang, null),
    matchKey(d.category, null, null),
  ];
}

/** Pure helper to compute ICU amounts from devices and ICU rules */
export function computeICUFromDevices(
  devices: Device[],
  icuItems: ICUItem[],
  settings: ICUSettings | null,
  mode: ICUMode = 'auto',
  manualAmount: number = 0
): {
  lines: ICULineItem[];
  calculatedTotal: number;
  finalTotal: number;
  icuRate: number;
  icMinimum: number;
} {
  const ruleMap = new Map<string, ICUItem>();
  icuItems.forEach(item => {
    const k = matchKey(item.device_category, item.gang, item.switch_type);
    mapSetIfActive(ruleMap, k, item);
  });

  const icuRate = settings?.icu_rate ?? 250;
  const icMinimum = settings?.ic_minimum ?? 1500;

  const lines: ICULineItem[] = devices.map(d => {
    const qty = d.quantity ?? 1;
    let rule: ICUItem | undefined;
    for (const k of candidateKeys(d)) {
      rule = ruleMap.get(k);
      if (rule) break;
    }

    if (!rule) {
      return {
        deviceId: d.id,
        label: d.custom_name ?? d.device_name ?? d.category,
        category: d.category,
        quantity: qty,
        icuValue: 0,
        pricingMode: 'formula',
        unitIcCost: 0,
        lineTotal: 0,
        matchedRule: 'No ICU rule',
        isMatched: false,
      };
    }

    const unitIcCost =
      rule.pricing_mode === 'fixed'
        ? (rule.fixed_price ?? 0)
        : rule.icu_value * icuRate;

    return {
      deviceId: d.id,
      label: d.custom_name ?? d.device_name ?? rule.label,
      category: d.category,
      quantity: qty,
      icuValue: rule.icu_value,
      pricingMode: rule.pricing_mode,
      unitIcCost,
      lineTotal: qty * unitIcCost,
      matchedRule: rule.label,
      isMatched: true,
    };
  });

  const calculatedTotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const finalTotal = mode === 'manual' ? manualAmount : Math.max(calculatedTotal, icMinimum);

  return {
    lines,
    calculatedTotal,
    finalTotal,
    icuRate,
    icMinimum,
  };
}

function mapSetIfActive(map: Map<string, ICUItem>, key: string, item: ICUItem) {
  if (item.is_active !== false) {
    map.set(key, item);
  }
}

/** Async helper to fetch active ICU settings & items, then compute ICU total */
export async function fetchAndComputeICUTotal(
  devices: Device[],
  mode: ICUMode = 'auto',
  manualAmount: number = 0
): Promise<{
  lines: ICULineItem[];
  calculatedTotal: number;
  finalTotal: number;
  icuRate: number;
  icMinimum: number;
}> {
  try {
    const [settings, items] = await Promise.all([icuSettingsApi.get(), icuItemsApi.listActive()]);
    return computeICUFromDevices(devices, items, settings, mode, manualAmount);
  } catch (error) {
    console.error('Error in fetchAndComputeICUTotal:', error);
    return {
      lines: [],
      calculatedTotal: 0,
      finalTotal: mode === 'manual' ? manualAmount : 1500,
      icuRate: 250,
      icMinimum: 1500,
    };
  }
}

export function useICUCalculator(devices: Device[]): ICUCalculationResult {
  const [settings, setSettings] = useState<ICUSettings | null>(null);
  const [icuItems, setIcuItems] = useState<ICUItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mode, setMode] = useState<ICUMode>('auto');
  const [manualAmount, setManualAmount] = useState(0);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [s, items] = await Promise.all([icuSettingsApi.get(), icuItemsApi.listActive()]);
      setSettings(s);
      setIcuItems(items);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build rule lookup map: key → ICUItem
  const ruleMap = useMemo(() => {
    const map = new Map<string, ICUItem>();
    icuItems.forEach(item => {
      const k = matchKey(item.device_category, item.gang, item.switch_type);
      map.set(k, item);
    });
    return map;
  }, [icuItems]);

  const icuRate = settings?.icu_rate ?? 250;
  const icMinimum = settings?.ic_minimum ?? 1500;

  const lines = useMemo<ICULineItem[]>(() => {
    return devices.map(d => {
      const qty = d.quantity ?? 1;
      // Try keys from most specific to least
      let rule: ICUItem | undefined;
      for (const k of candidateKeys(d)) {
        rule = ruleMap.get(k);
        if (rule) break;
      }

      if (!rule) {
        return {
          deviceId: d.id,
          label: d.custom_name ?? d.device_name ?? d.category,
          category: d.category,
          quantity: qty,
          icuValue: 0,
          pricingMode: 'formula',
          unitIcCost: 0,
          lineTotal: 0,
          matchedRule: 'No ICU rule',
          isMatched: false,
        };
      }

      const unitIcCost =
        rule.pricing_mode === 'fixed'
          ? (rule.fixed_price ?? 0)
          : rule.icu_value * icuRate;

      return {
        deviceId: d.id,
        label: d.custom_name ?? d.device_name ?? rule.label,
        category: d.category,
        quantity: qty,
        icuValue: rule.icu_value,
        pricingMode: rule.pricing_mode,
        unitIcCost,
        lineTotal: qty * unitIcCost,
        matchedRule: rule.label,
        isMatched: true,
      };
    });
  }, [devices, ruleMap, icuRate]);

  const calculatedTotal = useMemo(
    () => lines.reduce((s, l) => s + l.lineTotal, 0),
    [lines],
  );

  const finalTotal = useMemo(() => {
    if (mode === 'manual') return manualAmount;
    return Math.max(calculatedTotal, icMinimum);
  }, [mode, manualAmount, calculatedTotal, icMinimum]);

  return {
    lines,
    calculatedTotal,
    finalTotal,
    icuRate,
    icMinimum,
    mode,
    manualAmount,
    isLoading,
    settings,
    icuItems,
    setMode,
    setManualAmount,
    reload: load,
  };
}
