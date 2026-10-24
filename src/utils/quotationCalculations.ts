import { Device } from '@/types/types';

export interface QuotationCalculation {
  devicesSubtotal: number;
  devicesTotal: number;
  devicesWithDistribution: Device[];
  subtotalBeforeDiscount: number;
  discountAmount: number;
  totalAmount: number;
}

/**
 * Calculate quotation totals with commissioning, installation, and discount
 */
export function calculateQuotationTotals(
  devices: Device[],
  commissioningFee: number,
  visitFee: number,
  installationFee: number,
  discountType: 'percentage' | 'fixed' | null,
  discountValue: number
): QuotationCalculation {
  // Calculate devices subtotal (without VAT)
  const devicesSubtotal = devices.reduce((sum, device) => {
    const price = device.unit_price || 0;
    const quantity = device.quantity || 1;
    return sum + (price * quantity);
  }, 0);

  // Distribute commissioning and installation pro-rata across devices
  const devicesWithDistribution = devices.map(device => {
    const deviceSubtotal = (device.unit_price || 0) * (device.quantity || 1);
    const deviceRatio = devicesSubtotal > 0 ? deviceSubtotal / devicesSubtotal : 0;
    
    return {
      ...device,
      commissioning_distributed: deviceRatio * commissioningFee,
      visit_distributed: deviceRatio * visitFee,
      installation_distributed: deviceRatio * installationFee
    };
  });

  // Calculate total with VAT
  const devicesTotal = devicesWithDistribution.reduce((sum, device) => {
    const price = device.unit_price || 0;
    const quantity = device.quantity || 1;
    const subtotal = price * quantity;
    const vat = subtotal * ((device.vat_rate || 0) / 100);
    return sum + subtotal + vat;
  }, 0);

  const subtotalBeforeDiscount = devicesTotal + commissioningFee + visitFee + installationFee;
  
  // Apply discount
  let discountAmount = 0;
  if (discountType && discountValue > 0) {
    discountAmount = discountType === 'percentage' 
      ? subtotalBeforeDiscount * (discountValue / 100)
      : discountValue;
  }
  
  const totalAmount = subtotalBeforeDiscount - discountAmount;

  return {
    devicesSubtotal,
    devicesTotal,
    devicesWithDistribution,
    subtotalBeforeDiscount,
    discountAmount,
    totalAmount
  };
}
