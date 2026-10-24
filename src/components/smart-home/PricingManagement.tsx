import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { devicePricesApi, isAdmin, quotationsApi } from '@/db/api';
import { Save, Trash2, Edit, X, FileSpreadsheet, History, CheckCircle, Printer, RefreshCw, TestTube, Database, TrendingUp, AlertTriangle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import ExcelImport from './ExcelImport';
import CategoryLabelCustomizer from './CategoryLabelCustomizer';
import { useCategoryLabels } from '@/hooks/useCategoryLabels';

import { printPriceList } from '@/utils/printPriceList';
import type { DevicePrice, DeviceCategory, Protocol, SwitchGang, IntercomType, CameraResolution, CameraType, NVRChannels, HDDCapacity, NetworkSwitchType, SwitchPortCount } from '@/types/types';

const requiresProtocol = (cat: DeviceCategory) => {
  return !['curtain_rail', 'cat6_cable', 'bracket', 'hdd'].includes(cat);
};

const requiresGang = (cat: DeviceCategory) => {
  return ['mini_switch', 'touch_switch'].includes(cat);
};

const allowsOptionalGang = (cat: DeviceCategory) => {
  return cat === 'custom_device';
};

const requiresIntercomType = (cat: DeviceCategory) => {
  return cat === 'intercom';
};

const requiresCameraFields = (cat: DeviceCategory) => {
  return cat === 'camera';
};

const requiresNVRChannels = (cat: DeviceCategory) => {
  return cat === 'nvr';
};

const requiresHDDCapacity = (cat: DeviceCategory) => {
  return cat === 'hdd';
};

const requiresNetworkSwitchFields = (cat: DeviceCategory) => {
  return cat === 'network_switch';
};

export default function PricingManagement() {
  const navigate = useNavigate();
  const [prices, setPrices] = useState<DevicePrice[]>([]);
  const [category, setCategory] = useState<DeviceCategory>('mini_switch');
  const [protocol, setProtocol] = useState<Protocol | ''>('zigbee');
  const [gang, setGang] = useState<SwitchGang | ''>('1');
  const [intercomType, setIntercomType] = useState<IntercomType | ''>('doorbell');
  const [cameraResolution, setCameraResolution] = useState<CameraResolution | ''>('2mp');
  const [cameraType, setCameraType] = useState<CameraType | ''>('indoor');
  const [nvrChannels, setNvrChannels] = useState<NVRChannels | ''>('4ch');
  const [hddCapacity, setHddCapacity] = useState<HDDCapacity | ''>('1tb');
  const [switchType, setSwitchType] = useState<NetworkSwitchType | ''>('standard');
  const [switchPorts, setSwitchPorts] = useState<SwitchPortCount | ''>('8');
  const [unitPrice, setUnitPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState(0);
  const [editCostPrice, setEditCostPrice] = useState(0);
  const [markupPercentage, setMarkupPercentage] = useState<string>('0');
  const [autoApplyToDrafts, setAutoApplyToDrafts] = useState(true);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const [showCategoryCustomizer, setShowCategoryCustomizer] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPrices();
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const adminStatus = await isAdmin();
    setIsAdminUser(adminStatus);
  };

  useEffect(() => {
    if (!requiresGang(category)) {
      setGang('');
    } else {
      setGang('1');
    }
    
    if (!requiresIntercomType(category)) {
      setIntercomType('');
    } else {
      setIntercomType('doorbell');
    }

    if (!requiresCameraFields(category)) {
      setCameraResolution('');
      setCameraType('');
    } else {
      setCameraResolution('2mp');
      setCameraType('indoor');
    }

    if (!requiresNVRChannels(category)) {
      setNvrChannels('');
    } else {
      setNvrChannels('4ch');
    }

    if (!requiresHDDCapacity(category)) {
      setHddCapacity('');
    } else {
      setHddCapacity('1tb');
    }

    if (!requiresNetworkSwitchFields(category)) {
      setSwitchType('');
      setSwitchPorts('');
    } else {
      setSwitchType('standard');
      setSwitchPorts('8');
    }
  }, [category]);

  const loadPrices = async () => {
    try {
      const data = await devicePricesApi.getAll();
      setPrices(data);
    } catch (error) {
      // Silent fail - prices will be empty
    }
  };

  const handleSavePrice = async () => {
    if (!isAdminUser) {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can modify device prices.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await devicePricesApi.submitForApproval({
        category,
        protocol: requiresProtocol(category) ? (protocol || undefined) : undefined,
        gang: (requiresGang(category) || allowsOptionalGang(category)) ? (gang || undefined) : undefined,
        intercom_type: requiresIntercomType(category) ? (intercomType || undefined) : undefined,
        camera_resolution: requiresCameraFields(category) ? (cameraResolution || undefined) : undefined,
        camera_type: requiresCameraFields(category) ? (cameraType || undefined) : undefined,
        nvr_channels: requiresNVRChannels(category) ? (nvrChannels || undefined) : undefined,
        hdd_capacity: requiresHDDCapacity(category) ? (hddCapacity || undefined) : undefined,
        switch_type: requiresNetworkSwitchFields(category) ? (switchType || undefined) : undefined,
        switch_ports: requiresNetworkSwitchFields(category) ? (switchPorts || undefined) : undefined,
        brand: brand || undefined,
        model: model || undefined,
        device_name: deviceName || undefined,
        description: description || undefined,
        notes: notes || undefined,
        unit_price: unitPrice,
        cost_price: costPrice,
        pending_price: undefined,
        pending_approval: false
      }, 'Price update request');

      toast({
        title: 'Success',
        description: 'Price change submitted for approval.'
      });

      if (autoApplyToDrafts) {
        // If it was auto-approved or doesn't need approval, apply it
        // Actually submitForApproval handles logic. If it upserts directly, we should auto-apply.
        // For simplicity, let's just trigger it. It will only update if there are changes.
        await quotationsApi.autoApplyPriceUpdatesToDrafts();
      }

      loadPrices();
      setUnitPrice(0);
      setCostPrice(0);
      setBrand('');
      setModel('');
      setDeviceName('');
      setDescription('');
      setNotes('');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to submit price change. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleDeletePrice = async (id: string) => {
    if (!isAdminUser) {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can delete device prices.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await devicePricesApi.delete(id);
      toast({
        title: 'Success',
        description: 'Price deleted successfully.'
      });
      loadPrices();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete price.',
        variant: 'destructive'
      });
    }
  };

  const handleStartEdit = (price: DevicePrice) => {
    setEditingId(price.id);
    setEditPrice(price.unit_price);
    setEditCostPrice(price.cost_price ?? 0);
    setDeviceName(price.device_name || '');
    setBrand(price.brand || '');
    setModel(price.model || '');
    setDescription(price.description || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrice(0);
    setEditCostPrice(0);
    setDeviceName('');
    setBrand('');
    setModel('');
    setDescription('');
  };

  const handleMarkQuotationsForUpdate = async () => {
    if (!isAdminUser) {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can mark quotations for price updates.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const markedQuotations = await quotationsApi.markQuotationsForPriceUpdate();
      
      toast({
        title: 'Success',
        description: `${markedQuotations.length} quotation(s) marked for price update.`,
      });
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to mark quotations for price update.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleUpdatePrice = async (price: DevicePrice) => {
    if (!isAdminUser) {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can modify device prices.',
        variant: 'destructive'
      });
      return;
    }

    try {
      await devicePricesApi.upsert({
        id: price.id,
        category: price.category,
        protocol: price.protocol,
        gang: price.gang,
        intercom_type: price.intercom_type,
        camera_resolution: price.camera_resolution,
        camera_type: price.camera_type,
        nvr_channels: price.nvr_channels,
        hdd_capacity: price.hdd_capacity,
        switch_type: price.switch_type,
        switch_ports: price.switch_ports,
        brand: brand || undefined,
        model: model || undefined,
        device_name: deviceName || undefined,
        description: description || undefined,
        notes: price.notes,
        unit_price: editPrice,
        cost_price: editCostPrice,
        pending_price: undefined,
        pending_approval: false
      });

      toast({
        title: 'Success',
        description: 'Price updated successfully.'
      });

      if (autoApplyToDrafts) {
        await quotationsApi.autoApplyPriceUpdatesToDrafts();
      }

      loadPrices();
      setEditingId(null);
      setEditPrice(0);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update price.',
        variant: 'destructive'
      });
    }
  };

  const handleApplyGlobalMarkup = async () => {
    if (!isAdminUser) {
      toast({
        title: 'Permission Denied',
        description: 'Only administrators can apply global markups.',
        variant: 'destructive'
      });
      return;
    }

    const percentage = parseFloat(markupPercentage);
    if (isNaN(percentage) || percentage === 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a valid non-zero percentage.',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm(`Are you sure you want to apply a ${percentage}% markup to ALL device prices? ${autoApplyToDrafts ? 'This will also automatically update all Draft quotations.' : ''} This action cannot be easily undone.`)) {
      return;
    }

    try {
      await devicePricesApi.applyGlobalMarkup(percentage, autoApplyToDrafts);
      toast({
        title: 'Success',
        description: `Successfully applied ${percentage}% markup to all prices${autoApplyToDrafts ? ' and updated Draft quotations' : ''}.`,
      });
      loadPrices();
      setMarkupPercentage('0');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to apply global markup.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const { labels: categoryLabels } = useCategoryLabels();

  const getPriceLabel = (price: DevicePrice) => {
    // If a custom device name is provided, use it
    if (price.device_name) {
      let label = price.device_name;
      const specs: string[] = [];
      if (price.protocol) specs.push(price.protocol.toUpperCase());
      if (price.gang) specs.push(`${price.gang}G`);
      if (price.brand) specs.push(price.brand);
      
      if (specs.length > 0) {
        label += ` [${specs.join(', ')}]`;
      }
      return label;
    }
    
    let label = categoryLabels[price.category] || price.category;
    if (price.gang) label += ` ${price.gang} Gang`;
    if (price.intercom_type) {
      label += ` - ${price.intercom_type === 'doorbell' ? 'Doorbell' : 'Indoor Station'}`;
    }
    if (price.camera_resolution) {
      label += ` ${price.camera_resolution.toUpperCase()}`;
    }
    if (price.camera_type) {
      label += ` (${price.camera_type.charAt(0).toUpperCase() + price.camera_type.slice(1)})`;
    }
    if (price.nvr_channels) {
      label += ` ${price.nvr_channels.toUpperCase()}`;
    }
    if (price.hdd_capacity) {
      label += ` ${price.hdd_capacity.toUpperCase()}`;
    }
    if (price.switch_type) {
      label += ` ${price.switch_type.toUpperCase()}`;
    }
    if (price.switch_ports) {
      label += ` ${price.switch_ports}-Port`;
    }
    if (price.protocol) label += ` [${price.protocol.toUpperCase()}]`;
    return label;
  };

  return (
    <div className="space-y-6">
      {/* Excel Import Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bulk Import from Excel</CardTitle>
              <CardDescription>Import multiple device prices at once from an Excel file</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCategoryCustomizer(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Customize Labels
              </Button>
              <Button
                variant={showExcelImport ? "secondary" : "default"}
                onClick={() => setShowExcelImport(!showExcelImport)}
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {showExcelImport ? 'Hide Import' : 'Show Import'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showExcelImport && (
          <CardContent>
            <ExcelImport onImportComplete={loadPrices} />
          </CardContent>
        )}
      </Card>

      {/* Global Markup Section */}
      {isAdminUser && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Global Price Markup
            </CardTitle>
            <CardDescription>
              Apply a percentage-based markup to all device prices. Use a negative value to decrease prices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-end gap-4 max-w-xl">
              <div className="space-y-2 flex-1">
                <Label htmlFor="markup-percentage">Markup Percentage (%)</Label>
                <div className="relative">
                  <Input
                    id="markup-percentage"
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={markupPercentage}
                    onChange={(e) => setMarkupPercentage(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                </div>
              </div>
              <Button 
                onClick={handleApplyGlobalMarkup}
                className="w-full md:w-auto"
                disabled={!markupPercentage || parseFloat(markupPercentage) === 0}
              >
                Apply Markup to All Prices
              </Button>
            </div>
            
            <div className="mt-4 flex items-center space-x-2">
              <Checkbox 
                id="auto-apply" 
                checked={autoApplyToDrafts} 
                onCheckedChange={(checked) => setAutoApplyToDrafts(!!checked)}
              />
              <label 
                htmlFor="auto-apply"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Automatically apply updates to Draft quotations (not yet shared with clients)
              </label>
            </div>

            <p className="mt-4 text-sm text-muted-foreground bg-muted p-3 rounded-md">
              <strong>Note:</strong> Applying a global markup will log a "markup" entry in the price history for every device and mark all unpaid quotations for price updates.
            </p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Device Pricing Management</CardTitle>
              <CardDescription>
                Configure default prices for device categories. Price changes require admin approval before being applied.
              </CardDescription>
            </div>
            {isAdminUser && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => printPriceList(prices, 'Device Price List')}
                  disabled={prices.length === 0}
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Print Price List
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMarkQuotationsForUpdate}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Mark Quotations for Update
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/price-approvals')}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Review Approvals
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/database-health')}
                >
                  <Database className="w-4 h-4 mr-2" />
                  Database Health
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Price Update Workflow Info */}
          {isAdminUser && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-900 mb-2">Price Update Workflow</h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Price changes are submitted for approval and won't take effect immediately</li>
                    <li>After approval, click "Mark Quotations for Update" to flag unpaid quotations (no down payments)</li>
                    <li>Users will see "Apply" or "Ignore" buttons on their quotations to accept/reject price changes</li>
                    <li>Only quotations with zero payments (Draft/Approved status) will be affected</li>
                  </ul>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/price-update-test')}
                  className="ml-4 shrink-0"
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  Test Workflow
                </Button>
              </div>
            </div>
          )}
          
          {/* Add/Update Price Form */}
          <div className="space-y-4 border border-border rounded-lg p-4 bg-muted/30">
            <h3 className="font-semibold text-lg">Add/Update Price</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Device Category</Label>
                <Select value={category} onValueChange={(v: DeviceCategory) => setCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Device Template Name (Optional)</Label>
                <Input
                  type="text"
                  placeholder={category === 'custom_device' ? "e.g., Smart Thermostat" : "Override display name (optional)"}
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  required={category === 'custom_device'}
                />
                <p className="text-xs text-muted-foreground">
                  {category === 'custom_device' 
                    ? "This name will appear in the dropdown menu when creating quotations" 
                    : "If provided, this name will replace the default category name in quotations"}
                </p>
              </div>

              {requiresProtocol(category) && (
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={protocol} onValueChange={(v: Protocol | '') => setProtocol(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zigbee">Zigbee</SelectItem>
                      <SelectItem value="matter">Matter</SelectItem>
                      <SelectItem value="wifi">Wi-Fi</SelectItem>
                      <SelectItem value="wired">Wired</SelectItem>
                      <SelectItem value="lan">LAN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {requiresGang(category) && (
                <div className="space-y-2">
                  <Label>Gang Configuration</Label>
                  <Select value={gang} onValueChange={(v: SwitchGang | '') => setGang(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Gang</SelectItem>
                      <SelectItem value="2">2 Gang</SelectItem>
                      <SelectItem value="3">3 Gang</SelectItem>
                      <SelectItem value="4">4 Gang</SelectItem>
                      <SelectItem value="5">5 Gang</SelectItem>
                      <SelectItem value="6">6 Gang</SelectItem>
                      <SelectItem value="7">7 Gang</SelectItem>
                      <SelectItem value="8">8 Gang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {allowsOptionalGang(category) && (
                <div className="space-y-2">
                  <Label>Gang Configuration (Optional)</Label>
                  <Select value={gang || 'none'} onValueChange={(v) => setGang(v === 'none' ? '' : v as SwitchGang)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="1">1 Gang</SelectItem>
                      <SelectItem value="2">2 Gang</SelectItem>
                      <SelectItem value="3">3 Gang</SelectItem>
                      <SelectItem value="4">4 Gang</SelectItem>
                      <SelectItem value="5">5 Gang</SelectItem>
                      <SelectItem value="6">6 Gang</SelectItem>
                      <SelectItem value="7">7 Gang</SelectItem>
                      <SelectItem value="8">8 Gang</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {requiresIntercomType(category) && (
                <div className="space-y-2">
                  <Label>Intercom Type</Label>
                  <Select value={intercomType} onValueChange={(v: IntercomType | '') => setIntercomType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doorbell">Doorbell</SelectItem>
                      <SelectItem value="indoor_station">Indoor Station</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {requiresCameraFields(category) && (
                <>
                  <div className="space-y-2">
                    <Label>Camera Resolution</Label>
                    <Select value={cameraResolution} onValueChange={(v: CameraResolution | '') => setCameraResolution(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2mp">2 MP</SelectItem>
                        <SelectItem value="3mp">3 MP</SelectItem>
                        <SelectItem value="4mp">4 MP</SelectItem>
                        <SelectItem value="6mp">6 MP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Camera Type</Label>
                    <Select value={cameraType} onValueChange={(v: CameraType | '') => setCameraType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indoor">Indoor</SelectItem>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {requiresNVRChannels(category) && (
                <div className="space-y-2">
                  <Label>NVR Channels</Label>
                  <Select value={nvrChannels} onValueChange={(v: NVRChannels | '') => setNvrChannels(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="4ch">4 Channels</SelectItem>
                      <SelectItem value="8ch">8 Channels</SelectItem>
                      <SelectItem value="16ch">16 Channels</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {requiresHDDCapacity(category) && (
                <div className="space-y-2">
                  <Label>HDD Capacity</Label>
                  <Select value={hddCapacity} onValueChange={(v: HDDCapacity | '') => setHddCapacity(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1tb">1 TB</SelectItem>
                      <SelectItem value="2tb">2 TB</SelectItem>
                      <SelectItem value="4tb">4 TB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {requiresNetworkSwitchFields(category) && (
                <>
                  <div className="space-y-2">
                    <Label>Switch Type</Label>
                    <Select value={switchType} onValueChange={(v: NetworkSwitchType | '') => setSwitchType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="poe">POE</SelectItem>
                        <SelectItem value="standard">Standard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Port Count</Label>
                    <Select value={switchPorts} onValueChange={(v: SwitchPortCount | '') => setSwitchPorts(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 Ports</SelectItem>
                        <SelectItem value="8">8 Ports</SelectItem>
                        <SelectItem value="16">16 Ports</SelectItem>
                        <SelectItem value="24">24 Ports</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label>Brand (Optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g., Aqara, Sonoff, TP-Link"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Model (Optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g., WXKG11LM, SNZB-01"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Description/Specs (Optional)</Label>
                <Input
                  type="text"
                  placeholder="e.g., Wireless button with 1000 clicks battery life"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Notes (Optional)</Label>
                <Input
                  type="text"
                  placeholder="Additional notes or installation requirements"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Selling Price (EGP)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Number.parseFloat(e.target.value) || 0)}
                />
              </div>

              {isAdminUser && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Cost / Purchase Price (EGP)
                    <span className="text-xs text-muted-foreground font-normal ml-1">(admin only)</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number.parseFloat(e.target.value) || 0)}
                  />
                  {costPrice > 0 && unitPrice > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Margin: EGP {(unitPrice - costPrice).toFixed(2)} &nbsp;|&nbsp;
                      {((unitPrice - costPrice) / unitPrice * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              )}
            </div>

            <Button 
              onClick={handleSavePrice} 
              className="w-full md:w-auto"
              disabled={!isAdminUser}
              title={!isAdminUser ? 'Only administrators can modify prices' : ''}
            >
              <Save className="w-4 h-4 mr-2" />
              Submit for Approval
            </Button>
          </div>

          {/* Existing Prices List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">Configured Prices</h3>
            {prices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No prices configured yet. Add prices above to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {prices.map(price => (
                  <div key={price.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{getPriceLabel(price)}</p>
                      <p className="text-sm text-muted-foreground">
                        Category: {categoryLabels[price.category]}
                      </p>
                      {price.brand && (
                        <p className="text-sm text-muted-foreground">
                          Brand: {price.brand}
                        </p>
                      )}
                      {price.model && (
                        <p className="text-sm text-muted-foreground">
                          Model: {price.model}
                        </p>
                      )}
                      {price.description && (
                        <p className="text-sm text-muted-foreground">
                          Description: {price.description}
                        </p>
                      )}
                      {price.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          Notes: {price.notes}
                        </p>
                      )}
                    </div>
                      <div className="flex items-center gap-3">
                        {editingId === price.id ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <Label className="w-20 text-xs">Name:</Label>
                              <Input
                                type="text"
                                value={deviceName}
                                onChange={(e) => setDeviceName(e.target.value)}
                                className="h-8 w-64"
                                placeholder="Override name"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="w-20 text-xs">Brand:</Label>
                              <Input
                                type="text"
                                value={brand}
                                onChange={(e) => setBrand(e.target.value)}
                                className="h-8 w-64"
                                placeholder="Brand"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="w-20 text-xs">Price:</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editPrice}
                                onChange={(e) => setEditPrice(Number.parseFloat(e.target.value) || 0)}
                                className="h-8 w-32"
                              />
                            </div>
                            {isAdminUser && (
                              <div className="flex items-center gap-2">
                                <Label className="w-20 text-xs">Cost:</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editCostPrice}
                                  onChange={(e) => setEditCostPrice(Number.parseFloat(e.target.value) || 0)}
                                  className="h-8 w-32"
                                  placeholder="Cost price"
                                />
                              </div>
                            )}
                            <div className="flex justify-end gap-2 mt-1">
                              <Button
                                size="sm"
                                onClick={() => handleUpdatePrice(price)}
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                        <>
                          <div className="flex flex-col items-end gap-0.5 min-w-[160px]">
                            <span className="font-semibold text-primary text-base">
                              EGP {price.unit_price.toFixed(2)}
                            </span>
                            {isAdminUser && price.cost_price > 0 && (
                              <>
                                <span className="text-xs text-muted-foreground">
                                  Cost: EGP {price.cost_price.toFixed(2)}
                                </span>
                                <span className="text-xs font-medium text-emerald-600">
                                  Margin: {((price.unit_price - price.cost_price) / price.unit_price * 100).toFixed(1)}%
                                  &nbsp;(EGP {(price.unit_price - price.cost_price).toFixed(2)})
                                </span>
                              </>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/price-history/${price.id}`)}
                            title="View Price History"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                          {isAdminUser && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit(price)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeletePrice(price.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CategoryLabelCustomizer 
        open={showCategoryCustomizer} 
        onOpenChange={setShowCategoryCustomizer} 
      />
    </div>
  );
}
