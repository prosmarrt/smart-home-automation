import { Device, DevicePrice } from '@/types/types';
import { supabase } from '@/db/supabase';

export interface PriceChange {
  hasChanges: boolean;
  percentageIncrease: number;
  priceSnapshotDate: string | null;
  affectedDevices: {
    name: string;
    oldPrice: number;
    newPrice: number;
    increase: number;
  }[];
}

/**
 * Compare current device prices with quotation prices
 */
export async function comparePrices(
  quotationDevices: Device[],
  priceSnapshotDate: string | null
): Promise<PriceChange> {
  if (!priceSnapshotDate) {
    return {
      hasChanges: false,
      percentageIncrease: 0,
      priceSnapshotDate: null,
      affectedDevices: []
    };
  }

  try {
    // Get current prices from device_prices table
    const { data: currentPrices, error } = await supabase
      .from('device_prices')
      .select('*')
      .gt('updated_at', priceSnapshotDate);

    if (!currentPrices || currentPrices.length === 0) {
      return {
        hasChanges: false,
        percentageIncrease: 0,
        priceSnapshotDate,
        affectedDevices: []
      };
    }

    const affectedDevices: PriceChange['affectedDevices'] = [];
    let totalOldPrice = 0;
    let totalNewPrice = 0;

    for (const device of quotationDevices) {
      const matchingPrice = currentPrices.find(
        (p: DevicePrice) =>
          p.category === device.category &&
          p.protocol === device.protocol &&
          p.gang === device.gang
      );

      if (matchingPrice && matchingPrice.unit_price !== device.unit_price) {
        const oldPrice = device.unit_price || 0;
        const newPrice = matchingPrice.unit_price;
        const quantity = device.quantity || 1;

        affectedDevices.push({
          name: device.category || 'Unknown Device',
          oldPrice,
          newPrice,
          increase: ((newPrice - oldPrice) / oldPrice) * 100
        });

        totalOldPrice += oldPrice * quantity;
        totalNewPrice += newPrice * quantity;
      }
    }

    const percentageIncrease =
      totalOldPrice > 0 ? ((totalNewPrice - totalOldPrice) / totalOldPrice) * 100 : 0;

    return {
      hasChanges: affectedDevices.length > 0,
      percentageIncrease: Math.round(percentageIncrease * 100) / 100,
      priceSnapshotDate,
      affectedDevices
    };
  } catch (error) {
    console.error('Error comparing prices:', error);
    return {
      hasChanges: false,
      percentageIncrease: 0,
      priceSnapshotDate,
      affectedDevices: []
    };
  }
}

/**
 * Get the latest price update date from device_prices table
 */
export async function getLatestPriceUpdateDate(): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('device_prices')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.updated_at || null;
  } catch (error) {
    console.error('Error getting latest price update:', error);
    return null;
  }
}
