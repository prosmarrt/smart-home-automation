import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToPDF, exportBriefToPDF } from '@/utils/pdfExportLazy';
import { exportDevicesToExcel } from '@/utils/excelExport';
import { supabase } from '@/db/supabase';
import { getUserId } from '@/db/api';
import type { Room, Device, ClientInfo, Quotation } from '@/types/types';
import type { ClientInfoSectionRef } from './ClientInfoSection';
import { useCategoryLabels } from '@/hooks/useCategoryLabels';
import ICUCalculatorPanel from '@/components/smart-home/ICUCalculatorPanel';


interface QuotationSummaryProps {
  rooms: Room[];
  devices: Device[];
  clientInfoRef: React.RefObject<ClientInfoSectionRef | null>;
  editingQuotation?: Quotation | null;
}

interface DeviceTypeSummary {
  category: string;
  label: string;
  count: number;
  total: number;
}

interface CategoryGroup {
  name: string;
  devices: DeviceTypeSummary[];
  subtotal: number;
}

export default function QuotationSummary({ rooms, devices, clientInfoRef, editingQuotation }: QuotationSummaryProps) {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const { labels: categoryLabels, getLabel } = useCategoryLabels();
  const [isExporting, setIsExporting] = useState(false);
  const [isBriefExporting, setIsBriefExporting] = useState(false);
  const [commissioningFee, setCommissioningFee] = useState(0);
  const [visitFee, setVisitFee] = useState(0);
  const [vatPercentage, setVatPercentage] = useState(0);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed' | null>(null);
  const [discountValue, setDiscountValue] = useState(0);
  // ICU auto-computed total (feeds directly into Installation & Commissioning Fee)
  const [icuTotal, setIcuTotal] = useState(0);
  const handleIcuTotalChange = useCallback((total: number) => setIcuTotal(total), []);
  // Installation fee is driven by the ICU calculation (auto formula / minimum or manual override)
  const installationFee = icuTotal;
  const { toast } = useToast();

  useEffect(() => {
    loadCommissioningData();
  }, []);

  // Get client info from editing quotation or form ref
  useEffect(() => {
    if (editingQuotation && editingQuotation.client_name && editingQuotation.project_code) {
      // In edit mode, use client info from the quotation
      setClientInfo({
        id: 'temp',
        client_name: editingQuotation.client_name,
        address: editingQuotation.client_address,
        phone_number: editingQuotation.client_phone,
        project_code: editingQuotation.project_code,
        last_amendment_date: editingQuotation.last_amendment_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } else if (clientInfoRef.current) {
      // In normal mode, get from form
      const info = clientInfoRef.current.getClientInfo();
      if (info.client_name && info.project_code) {
        setClientInfo({
          id: 'temp',
          client_name: info.client_name,
          address: info.address || null,
          phone_number: info.phone_number || null,
          project_code: info.project_code,
          last_amendment_date: info.last_amendment_date || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
    }
  }, [editingQuotation, clientInfoRef, devices.length]); // Re-run when quotation or devices change

  const loadCommissioningData = async () => {
    try {
      const userId = await getUserId();
      const { data } = await supabase
        .from('commissioning_installation')
        .select('*')
        .eq('user_id', userId)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (data) {
        setCommissioningFee(data.commissioning_fee || 0);
        setVisitFee(data.visit_fee || 0);
        setVatPercentage(data.vat_percentage || 0);
        setDiscountType(data.discount_type || null);
        setDiscountValue(data.discount_value || 0);
      }
    } catch (error) {
      console.error('Error loading commissioning data:', error);
    }
  };

  const getDeviceLabel = (device: Device) => {
    if (device.device_name) return device.device_name;
    
    let label = getLabel(device.category);
    
    // Append additional info if needed
    if (device.gang && ['mini_switch', 'mini_shutter_switch', 'touch_switch', 'touch_shutter_switch'].includes(device.category)) {
      label += ` ${device.gang} Gang`;
    }
    
    if (device.intercom_type && device.category === 'intercom') {
      label = device.intercom_type === 'doorbell' ? 'Doorbell' : 'Indoor Station';
    }
    else if (device.category === 'smart_lock') {
      // Smart Lock: Show brand and model
      const brandName = device.brand ? device.brand.charAt(0).toUpperCase() + device.brand.slice(1) : getLabel('smart_lock');
      const modelName = device.model || '';
      label = modelName ? `${brandName} ${modelName}` : brandName;
    }
    else if (device.category === 'central_control') {
      // Central Control: Use device_name field which contains the full name
      label = device.device_name || getLabel('central_control');
    }
    else if (device.category === 'camera' || device.category === 'wifi_camera') label = `${getLabel(device.category)} ${device.camera_resolution?.toUpperCase()} ${device.camera_type}`;
    else if (device.category === 'mesh_wifi') label = `${getLabel('mesh_wifi')} (${device.mesh_model})`;
    else if (device.category === 'network_switch') label = `${getLabel('network_switch')} (${device.port_count} ports)`;
    else if (device.category === 'nvr') label = `${getLabel('nvr')} (${device.hdd_capacity?.toUpperCase()})`;
    else if (device.category === 'hdd') label = `${getLabel('hdd')} (${device.hdd_capacity?.toUpperCase()})`;
    else if (device.category === 'memory_card') label = `${getLabel('memory_card')} (${device.memory_card_capacity?.toUpperCase()})`;
    else if (device.category === 'cat6_cable') label = `${getLabel('cat6_cable')} (${device.cable_length}m)`;
    else if (device.category === 'custom_device') label = device.custom_name || getLabel('custom_device');
    
    return label;
  };

  // Helper function to get effective quantity (handles cables specially)
  const getEffectiveQuantity = (device: Device): number => {
    return device.category === 'cat6_cable' && device.cable_length 
      ? device.cable_length 
      : device.quantity;
  };

  // Helper function to calculate device total
  const getDeviceTotal = (device: Device): number => {
    return device.unit_price * getEffectiveQuantity(device);
  };

  const calculateDevicesSubtotal = () => {
    return devices.reduce((sum, device) => {
      return sum + getDeviceTotal(device);
    }, 0);
  };

  const getRoomDevicesTotal = (roomId: string) => {
    return devices
      .filter(d => d.room_id === roomId)
      .reduce((sum, device) => sum + getDeviceTotal(device), 0);
  };

  const getProRataFees = (roomId: string) => {
    const devicesSubtotal = calculateDevicesSubtotal();
    if (devicesSubtotal === 0) return 0;
    
    const roomTotal = getRoomDevicesTotal(roomId);
    const ratio = roomTotal / devicesSubtotal;
    const totalServiceFee = commissioningFee + visitFee + installationFee;
    
    return totalServiceFee * ratio;
  };

  const calculateGrandTotal = () => {
    const devicesSubtotal = calculateDevicesSubtotal();
    const vatAmount = devicesSubtotal * (vatPercentage / 100);
    const devicesTotalWithVAT = devicesSubtotal + vatAmount;
    const servicesTotal = commissioningFee + visitFee + installationFee;
    const subtotalBeforeDiscount = devicesTotalWithVAT + servicesTotal;
    
    // Apply discount
    let discountAmount = 0;
    if (discountType && discountValue > 0) {
      if (discountType === 'percentage') {
        discountAmount = subtotalBeforeDiscount * (discountValue / 100);
      } else {
        discountAmount = discountValue;
      }
    }
    
    return subtotalBeforeDiscount - discountAmount;
  };

  const getDeviceTypeSummary = (): DeviceTypeSummary[] => {
    const summaryMap = new Map<string, DeviceTypeSummary>();

    devices.forEach(device => {
      const label = getDeviceLabel(device);
      const key = `${device.category}_${label}`;
      const effectiveQty = getEffectiveQuantity(device);
      const deviceTotal = getDeviceTotal(device);
      
      if (summaryMap.has(key)) {
        const existing = summaryMap.get(key)!;
        existing.count += effectiveQty;
        existing.total += deviceTotal;
      } else {
        summaryMap.set(key, {
          category: device.category,
          label,
          count: effectiveQty,
          total: deviceTotal
        });
      }
    });

    return Array.from(summaryMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  };

  const getCategorizedSummary = (): CategoryGroup[] => {
    const deviceSummary = getDeviceTypeSummary();
    
    // Define category mappings - COMPREHENSIVE: All device types included
    const lightingCategories = [
      'mini_switch', 'touch_switch', 'motion_sensor', 'presence_sensor'
    ];

    const shadingCategories = [
      'shutter_switch', 'smart_shutter_switch', 'curtain_switch', 
      'curtain_motor', 'curtain_rail', 'roller_blind_motor'
    ];

    const securityAccessCategories = [
      'camera', 'wifi_camera', 'nvr', 'hdd', 'memory_card', 'bracket', 
      'intercom', 'smart_lock',
      'gas_sensor', 'water_leak_sensor', 'smoke_sensor', 
      'gas_valve', 'water_valve'
    ];

    const networkingCategories = [
      'access_point', 'mesh_wifi', 'network_switch', 'repeater', 'cat6_cable'
    ];

    const controlCategories = [
      'ir_remote', 'central_control', 'smart_plug', 
      'zigbee_hub', 'matter_hub', 'custom_device'
    ];

    // Filter devices - ensure all devices are categorized
    const lightingDevices = deviceSummary.filter(d => lightingCategories.includes(d.category));
    const shadingDevices = deviceSummary.filter(d => shadingCategories.includes(d.category));
    const securityAccessDevices = deviceSummary.filter(d => securityAccessCategories.includes(d.category));
    const networkingDevices = deviceSummary.filter(d => networkingCategories.includes(d.category));
    const controlDevices = deviceSummary.filter(d => controlCategories.includes(d.category));

    const groups: CategoryGroup[] = [];

    if (lightingDevices.length > 0) {
      groups.push({
        name: getLabel('group_light'),
        devices: lightingDevices,
        subtotal: lightingDevices.reduce((sum, d) => sum + d.total, 0)
      });
    }

    if (shadingDevices.length > 0) {
      groups.push({
        name: getLabel('group_shading'),
        devices: shadingDevices,
        subtotal: shadingDevices.reduce((sum, d) => sum + d.total, 0)
      });
    }

    if (securityAccessDevices.length > 0) {
      groups.push({
        name: getLabel('group_cctv_security'),
        devices: securityAccessDevices,
        subtotal: securityAccessDevices.reduce((sum, d) => sum + d.total, 0)
      });
    }

    if (networkingDevices.length > 0) {
      groups.push({
        name: getLabel('group_networking'),
        devices: networkingDevices,
        subtotal: networkingDevices.reduce((sum, d) => sum + d.total, 0)
      });
    }

    if (controlDevices.length > 0) {
      groups.push({
        name: getLabel('group_central_control'),
        devices: controlDevices,
        subtotal: controlDevices.reduce((sum, d) => sum + d.total, 0)
      });
    }

    return groups;
  };

  const handleExportPDF = async () => {
    if (devices.length === 0) {
      toast({
        title: 'No devices',
        description: 'Please add devices before exporting',
        variant: 'destructive'
      });
      return;
    }

    setIsExporting(true);
    try {
      await exportToPDF({
        devices,
        rooms,
        clientInfo: clientInfo || undefined,
        commissioningFee,
        visitFee,
        installationFee: icuTotal,
        vatPercentage,
        discountType,
        discountValue,
        totalPaid: editingQuotation?.total_paid || 0,
        remainingBalance: editingQuotation?.remaining_balance || 0,
        approvalDate: editingQuotation?.approval_date,
        warrantyStartDate: editingQuotation?.warranty_start_date,
        warrantyEndDate: editingQuotation?.warranty_end_date,
        payments: [],
        isInvoice: editingQuotation?.is_invoice || false,
        categoryLabels
      });
      toast({
        title: 'Success',
        description: 'PDF exported successfully'
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export PDF',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBriefPDF = async () => {
    if (devices.length === 0) {
      toast({ title: 'No devices', description: 'Please add devices before exporting', variant: 'destructive' });
      return;
    }
    setIsBriefExporting(true);
    try {
      await exportBriefToPDF({
        devices,
        rooms,
        clientInfo: clientInfo || undefined,
        commissioningFee,
        installationFee: icuTotal,
        categoryLabels,
        currentVersion: editingQuotation?.current_version ?? 1,
      });
      toast({ title: 'Success', description: 'Brief quotation PDF exported successfully' });
    } catch (error) {
      console.error('Error exporting brief PDF:', error);
      toast({ title: 'Export failed', description: 'Failed to export brief PDF', variant: 'destructive' });
    } finally {
      setIsBriefExporting(false);
    }
  };

  const handleExportExcel = async () => {
    if (devices.length === 0) {
      toast({
        title: 'No devices',
        description: 'Please add devices before exporting',
        variant: 'destructive'
      });
      return;
    }

    try {
      await exportDevicesToExcel({
        devices,
        rooms,
        clientInfo: clientInfo || undefined,
        commissioningFee,
        visitFee,
        installationFee,
        vatPercentage,
        discountType,
        discountValue,
        categoryLabels
      });
      toast({
        title: 'Success',
        description: 'Excel file exported successfully'
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export Excel file',
        variant: 'destructive'
      });
    }
  };

  const devicesSubtotal = calculateDevicesSubtotal();
  const vatAmount = devicesSubtotal * (vatPercentage / 100);
  const devicesTotalWithVAT = devicesSubtotal + vatAmount;
  const servicesTotal = commissioningFee + visitFee + installationFee;
  const subtotalBeforeDiscount = devicesTotalWithVAT + servicesTotal;
  
  // Calculate discount amount
  let discountAmount = 0;
  if (discountType && discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = subtotalBeforeDiscount * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
  }
  
  const grandTotal = subtotalBeforeDiscount - discountAmount;
  const categorizedSummary = getCategorizedSummary();

  if (devices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quotation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No devices added yet. Add devices to see the quotation summary.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quotation Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client Information Section */}
        {clientInfo && (
          <div className="rounded-md border p-4 bg-muted/50">
            <h3 className="font-semibold mb-3">Client Information</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Client Name:</span>
                <p className="font-medium">{clientInfo.client_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Project Code:</span>
                <p className="font-medium">{clientInfo.project_code}</p>
              </div>
              {clientInfo.address && (
                <div>
                  <span className="text-muted-foreground">Address:</span>
                  <p className="font-medium">{clientInfo.address}</p>
                </div>
              )}
              {clientInfo.phone_number && (
                <div>
                  <span className="text-muted-foreground">Phone:</span>
                  <p className="font-medium">{clientInfo.phone_number}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Room / Device</TableHead>
                <TableHead className="text-center w-[80px]">Qty</TableHead>
                <TableHead className="text-right w-[120px]">Unit Price</TableHead>
                <TableHead className="text-right w-[120px]">Subtotal</TableHead>
                <TableHead className="text-center w-[80px]">VAT</TableHead>
                <TableHead className="text-right w-[120px]">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.map(room => {
                const roomDevices = devices.filter(d => d.room_id === room.id);
                if (roomDevices.length === 0) return null;

                const roomDevicesSubtotal = roomDevices.reduce((sum, d) => {
                  return sum + getDeviceTotal(d);
                }, 0);

                const roomDevicesVAT = roomDevices.reduce((sum, d) => {
                  const subtotal = getDeviceTotal(d);
                  return sum + (subtotal * (vatPercentage / 100));
                }, 0);

                const roomDevicesTotal = roomDevicesSubtotal + roomDevicesVAT;
                const roomServiceFee = getProRataFees(room.id);
                const roomGrandTotal = roomDevicesTotal + roomServiceFee;

                return (
                  <>
                    <TableRow key={`${room.id}-header`} className="bg-muted/50">
                      <TableCell colSpan={6} className="font-semibold text-primary">
                        {room.name.toUpperCase()}
                      </TableCell>
                    </TableRow>
                    {roomDevices.map(device => {
                      const subtotal = getDeviceTotal(device);
                      const deviceVAT = subtotal * (vatPercentage / 100);
                      const deviceTotal = subtotal + deviceVAT;
                      const displayQty = device.category === 'cat6_cable' && device.cable_length 
                        ? `${device.cable_length}m` 
                        : device.quantity.toString();

                      return (
                        <TableRow key={device.id}>
                          <TableCell>{getDeviceLabel(device)}</TableCell>
                          <TableCell className="text-center">{displayQty}</TableCell>
                          <TableCell className="text-right">EGP {device.unit_price.toFixed(2)}</TableCell>
                          <TableCell className="text-right">EGP {subtotal.toFixed(2)}</TableCell>
                          <TableCell className="text-center">{vatPercentage}%</TableCell>
                          <TableCell className="text-right font-medium">EGP {deviceTotal.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={5} className="text-right text-sm text-muted-foreground">
                        Subtotal
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        EGP {roomDevicesTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                    {roomServiceFee > 0 && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={5} className="text-right text-sm italic text-muted-foreground">
                          Service Fee (Pro-rata)
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          EGP {roomServiceFee.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell colSpan={5} className="text-right">
                        {room.name.toUpperCase()} Total
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        EGP {roomGrandTotal.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  </>
                );
              })}
              {/* Summary rows */}
              <TableRow className="border-t-2 bg-muted/20">
                <TableCell colSpan={5} className="text-right font-medium text-muted-foreground">
                  Equipment Subtotal
                </TableCell>
                <TableCell className="text-right font-medium">
                  EGP {devicesSubtotal.toFixed(2)}
                </TableCell>
              </TableRow>

              {vatPercentage > 0 && (
                <TableRow className="bg-muted/20">
                  <TableCell colSpan={5} className="text-right font-medium text-muted-foreground">
                    VAT ({vatPercentage}%)
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    EGP {vatAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              )}

              {/* ── Installation & Commissioning Fee (ICU) row ── */}
              <TableRow className="bg-primary/5 font-medium">
                <TableCell colSpan={5} className="text-right text-primary font-semibold">
                  Installation and Commissioning Fee (ICU)
                </TableCell>
                <TableCell className="text-right font-bold text-primary">
                  EGP {installationFee.toFixed(2)}
                </TableCell>
              </TableRow>

              {commissioningFee > 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-medium text-muted-foreground">
                    Additional Commissioning Fee
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    EGP {commissioningFee.toFixed(2)}
                  </TableCell>
                </TableRow>
              )}

              {visitFee > 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-right font-medium text-muted-foreground">
                    Visit Fee
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    EGP {visitFee.toFixed(2)}
                  </TableCell>
                </TableRow>
              )}

              {discountType && discountValue > 0 && (
                <TableRow className="bg-accent/20">
                  <TableCell colSpan={5} className="text-right font-semibold text-lg">
                    Subtotal Before Discount
                  </TableCell>
                  <TableCell className="text-right font-semibold text-lg">
                    EGP {subtotalBeforeDiscount.toFixed(2)}
                  </TableCell>
                </TableRow>
              )}
              {discountType && discountValue > 0 && (
                <TableRow className="bg-accent/30">
                  <TableCell colSpan={5} className="text-right font-semibold text-lg text-destructive">
                    Discount ({discountType === 'percentage' ? `${discountValue}%` : `EGP ${discountValue.toFixed(2)}`})
                  </TableCell>
                  <TableCell className="text-right font-semibold text-lg text-destructive">
                    - EGP {discountAmount.toFixed(2)}
                  </TableCell>
                </TableRow>
              )}
              <TableRow className="bg-primary/10">
                <TableCell colSpan={5} className="text-right font-bold text-lg">
                  GRAND TOTAL
                </TableCell>
                <TableCell className="text-right font-bold text-lg text-primary">
                  EGP {grandTotal.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Separator className="my-6" />

        {/* ── ICU Installation & Commissioning Calculator ────────────── */}
        <ICUCalculatorPanel devices={devices} onTotalChange={handleIcuTotalChange} />

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Device Type Summary (Reference)</h3>
          {categorizedSummary.map((group, groupIndex) => (
            <div key={groupIndex} className="space-y-2">
              <h4 className="font-semibold text-md text-primary bg-muted px-3 py-2 rounded">
                {group.name}
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device Type</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {group.devices.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.label}</TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right">EGP {item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold bg-muted">
                    <TableCell>{group.name} Subtotal</TableCell>
                    <TableCell className="text-right">{group.devices.reduce((sum, d) => sum + d.count, 0)}</TableCell>
                    <TableCell className="text-right">EGP {group.subtotal.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ))}
        </div>

        <Separator className="my-6" />

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={handleExportPDF} disabled={isExporting} className="flex-1">
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
          <Button onClick={handleExportBriefPDF} disabled={isBriefExporting} variant="outline" className="flex-1">
            <FileDown className="mr-2 h-4 w-4" />
            {isBriefExporting ? 'Exporting…' : 'Export Brief Quotation'}
          </Button>
          <Button onClick={handleExportExcel} variant="outline" className="flex-1">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
