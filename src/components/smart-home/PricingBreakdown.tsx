import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Device } from '@/types/types';
import { useCategoryLabels } from '@/hooks/useCategoryLabels';
import { useICUCalculator } from '@/hooks/useICUCalculator';


interface PricingBreakdownProps {
  devices: Device[];
}

interface DeviceWithCosts {
  label: string;
  category: string;
  quantity: number;
  unitPrice: number;
  installationCost: number;
  totalPrice: number;
  notes: string;
}

interface CategoryBreakdown {
  name: string;
  devices: DeviceWithCosts[];
  subtotal: number;
  totalInstallation: number;
}

export default function PricingBreakdown({ devices }: PricingBreakdownProps) {
  const { getLabel } = useCategoryLabels();
  const icuCalc = useICUCalculator(devices);
  const installationFee = icuCalc.finalTotal;
  const loading = icuCalc.isLoading;

  const getDeviceLabel = (device: Device): string => {
    if (device.device_name) return device.device_name;
    
    let label = getLabel(device.category);
    if (device.gang && ['mini_switch', 'mini_shutter_switch', 'touch_switch', 'touch_shutter_switch'].includes(device.category)) {
      label += ` ${device.gang} Gang`;
    }
    return label;
  };

  const getDeviceNotes = (device: Device): string => {
    const notes: string[] = [];
    
    if (device.protocol) {
      notes.push(`Protocol: ${device.protocol.toUpperCase()}`);
    }
    
    if (device.gang) {
      notes.push(`${device.gang} Gang`);
    }
    
    if (device.camera_resolution) {
      notes.push(`${device.camera_resolution.toUpperCase()} Resolution`);
    }
    
    if (device.camera_type) {
      notes.push(`${device.camera_type === 'indoor' ? 'Indoor' : 'Outdoor'}`);
    }

    if (device.brand) {
      // Format brand labels properly - show custom brands as-is
      const getBrandLabel = (brand: string) => {
        const labels: Record<string, string> = {
          lezn: 'LEZN',
          philips: 'PHILIPS',
          emaks_prime: 'EMAKS PRIME',
          other: 'OTHER',
          ezvis: 'Ezvis',
          tapo: 'Tapo',
          tenda: 'Tenda',
        };
        // If brand is in the predefined list, use the label; otherwise use the brand as-is (custom brand)
        return labels[brand] || brand;
      };
      notes.push(`Brand: ${getBrandLabel(device.brand)}`);
    }

    if (device.model) {
      notes.push(`Model: ${device.model}`);
    }

    if (device.memory_card_capacity) {
      notes.push(`Memory: ${device.memory_card_capacity.toUpperCase()}`);
    }

    if (device.config?.type) {
      notes.push(`Type: ${String(device.config.type).replace('_', ' ')}`);
    }

    if (device.config?.size) {
      notes.push(`Size: ${device.config.size}`);
    }

    if (device.config?.feature) {
      notes.push(`Feature: ${String(device.config.feature).replace('_', ' ')}`);
    }
    
    if (device.custom_description) {
      notes.push(device.custom_description);
    }
    
    return notes.join(', ') || '-';
  };

  const getEffectiveQuantity = (device: Device): number => {
    return device.category === 'cat6_cable' && device.cable_length 
      ? device.cable_length 
      : device.quantity;
  };

  const calculateTotalDevicesValue = (): number => {
    return devices.reduce((sum, device) => {
      const qty = getEffectiveQuantity(device);
      return sum + (device.unit_price * qty);
    }, 0);
  };

  const calculateProRatedInstallation = (device: Device): number => {
    const totalValue = calculateTotalDevicesValue();
    if (totalValue === 0) return 0;
    
    const qty = getEffectiveQuantity(device);
    const deviceValue = device.unit_price * qty;
    const ratio = deviceValue / totalValue;
    
    return installationFee * ratio;
  };

  const getCategoryBreakdown = (): CategoryBreakdown[] => {
    // Define category mappings - FINAL: Per user requirements
    const lightingCategories = [
      'mini_switch', 'touch_switch', 'motion_sensor', 'presence_sensor'
    ];

    const shadingCategories = [
      'shutter_switch', 'mini_shutter_switch', 'smart_shutter_switch', 'touch_shutter_switch', 
      'curtain_switch', 'curtain_motor', 'curtain_rail', 'roller_blind_motor'
    ];

    const securityAccessCategories = [
      'camera', 'nvr', 'hdd', 'bracket', 'intercom', 'doorbell', 'smart_lock', 'wifi_camera',
      'gas_sensor', 'water_leak_sensor', 'smoke_sensor', 'gas_valve', 'water_valve'
    ];

    const networkingCategories = [
      'access_point', 'mesh_wifi', 'network_switch', 'repeater', 'cat6_cable'
    ];

    const controlCategories = [
      'ir_remote', 'central_control', 'control_screen', 'voice_assistant', 'alexa', 'google_nest', 
      'smart_speaker', 'smart_plug', 'zigbee_hub', 'matter_hub', 'custom_device'
    ];

    // Group devices by category
    const lightingDevices: DeviceWithCosts[] = [];
    const shadingDevices: DeviceWithCosts[] = [];
    const securityAccessDevices: DeviceWithCosts[] = [];
    const networkingDevices: DeviceWithCosts[] = [];
    const controlDevices: DeviceWithCosts[] = [];

    devices.forEach(device => {
      const qty = getEffectiveQuantity(device);
      const installationCost = calculateProRatedInstallation(device);
      const totalPrice = device.unit_price * qty;

      const deviceWithCosts: DeviceWithCosts = {
        label: getDeviceLabel(device),
        category: device.category,
        quantity: qty,
        unitPrice: device.unit_price,
        installationCost,
        totalPrice,
        notes: getDeviceNotes(device)
      };

      // Check if device name contains "camera" (case-insensitive)
      const deviceLabel = getDeviceLabel(device).toLowerCase();
      const hasCamera = deviceLabel.includes('camera');

      if (lightingCategories.includes(device.category)) {
        lightingDevices.push(deviceWithCosts);
      } else if (shadingCategories.includes(device.category)) {
        shadingDevices.push(deviceWithCosts);
      } else if (securityAccessCategories.includes(device.category) || hasCamera) {
        securityAccessDevices.push(deviceWithCosts);
      } else if (networkingCategories.includes(device.category)) {
        networkingDevices.push(deviceWithCosts);
      } else {
        controlDevices.push(deviceWithCosts);
      }
    });

    const categories: CategoryBreakdown[] = [];

    if (lightingDevices.length > 0) {
      categories.push({
        name: getLabel('group_light'),
        devices: lightingDevices,
        subtotal: lightingDevices.reduce((sum, d) => sum + d.totalPrice, 0),
        totalInstallation: lightingDevices.reduce((sum, d) => sum + d.installationCost, 0)
      });
    }

    if (shadingDevices.length > 0) {
      categories.push({
        name: getLabel('group_shading'),
        devices: shadingDevices,
        subtotal: shadingDevices.reduce((sum, d) => sum + d.totalPrice, 0),
        totalInstallation: shadingDevices.reduce((sum, d) => sum + d.installationCost, 0)
      });
    }

    if (securityAccessDevices.length > 0) {
      categories.push({
        name: getLabel('group_cctv_security'),
        devices: securityAccessDevices,
        subtotal: securityAccessDevices.reduce((sum, d) => sum + d.totalPrice, 0),
        totalInstallation: securityAccessDevices.reduce((sum, d) => sum + d.installationCost, 0)
      });
    }

    if (networkingDevices.length > 0) {
      categories.push({
        name: getLabel('group_networking'),
        devices: networkingDevices,
        subtotal: networkingDevices.reduce((sum, d) => sum + d.totalPrice, 0),
        totalInstallation: networkingDevices.reduce((sum, d) => sum + d.installationCost, 0)
      });
    }

    if (controlDevices.length > 0) {
      categories.push({
        name: getLabel('group_central_control'),
        devices: controlDevices,
        subtotal: controlDevices.reduce((sum, d) => sum + d.totalPrice, 0),
        totalInstallation: controlDevices.reduce((sum, d) => sum + d.installationCost, 0)
      });
    }

    return categories;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Pricing Breakdown</CardTitle>
          <CardDescription>Loading pricing information...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (devices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Device Pricing Breakdown</CardTitle>
          <CardDescription>No devices added yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Add devices to see the pricing breakdown by category
          </p>
        </CardContent>
      </Card>
    );
  }

  const categoryBreakdown = getCategoryBreakdown();
  const grandTotal = categoryBreakdown.reduce((sum, cat) => sum + cat.subtotal, 0);
  const totalInstallationCost = categoryBreakdown.reduce((sum, cat) => sum + cat.totalInstallation, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Device Pricing Breakdown</CardTitle>
          <CardDescription>
            Detailed cost breakdown by category with pro-rated installation costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {categoryBreakdown.map((category, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{category.name}</h3>
                <Badge variant="secondary">
                  {category.devices.length} {category.devices.length === 1 ? 'item' : 'items'}
                </Badge>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Device Type/Description</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Installation Cost (Pro-rata)</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.devices.map((device, deviceIdx) => (
                      <TableRow key={deviceIdx}>
                        <TableCell className="font-medium">{device.label}</TableCell>
                        <TableCell className="text-center">{device.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(device.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(device.installationCost)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(device.totalPrice)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{device.notes}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={3} className="font-semibold">
                        {category.name} Subtotal
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(category.totalInstallation)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(category.subtotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}

          <Separator className="my-6" />

          <div className="space-y-3">
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">Total Devices Cost:</span>
              <span className="font-bold">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-semibold">Total Installation Cost:</span>
              <span className="font-bold">{formatCurrency(totalInstallationCost)}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-xl">
              <span className="font-bold">Grand Total:</span>
              <span className="font-bold text-primary">
                {formatCurrency(grandTotal + totalInstallationCost)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">About Pro-Rated Installation Costs</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            Installation costs are distributed proportionally across all devices based on their total value.
          </p>
          <p>
            <strong>Formula:</strong> Device Installation Cost = (Device Total Value / All Devices Total Value) × Total Installation Fee
          </p>
          <p>
            This ensures that higher-value devices bear a proportionally larger share of the installation costs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
