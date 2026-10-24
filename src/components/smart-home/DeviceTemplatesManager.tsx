import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit2, Save, X, MousePointerClick, Download, Upload, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { deviceTemplatesApi } from '@/db/api';
import { toast } from 'sonner';
import { generateDevicePriceTemplate, parseDevicePriceExcel } from '@/utils/devicePriceExcel';
import CustomDeviceRequestDialog from './CustomDeviceRequestDialog';
import { useCategoryLabels } from '@/hooks/useCategoryLabels';

import type { DeviceTemplate, Protocol } from '@/types/types';

const PROTOCOL_OPTIONS: { value: Protocol; label: string }[] = [
  { value: 'zigbee', label: 'Zigbee' },
  { value: 'matter', label: 'Matter' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'knx', label: 'KNX (Wired)' },
  { value: 'wired', label: 'Wired' },
  { value: 'lan', label: 'LAN' }
];

// CATEGORY_OPTIONS moved inside component for dynamic labels

interface DeviceTemplateForm {
  name: string;
  category: string;
  description: string;
  default_protocol: Protocol | null;
  brand: string;
  supports_gangs: boolean;
  supports_ports: boolean;
  supports_capacity: boolean;
  gang_options: string;
  port_options: string;
  capacity_options: string;
  default_unit_price: string;
  gang_prices: Record<string, string>;
  port_prices: Record<string, string>;
  capacity_prices: Record<string, string>;
}

const emptyForm: DeviceTemplateForm = {
  name: '',
  category: 'custom_device',
  description: '',
  default_protocol: null,
  brand: '',
  supports_gangs: false,
  supports_ports: false,
  supports_capacity: false,
  gang_options: '',
  port_options: '',
  capacity_options: '',
  default_unit_price: '0',
  gang_prices: {},
  port_prices: {},
  capacity_prices: {}
};

export default function DeviceTemplatesManager() {
  const { getLabel } = useCategoryLabels();
  
  const CATEGORY_OPTIONS = [
    { value: 'mini_switch', label: getLabel('mini_switch') },
    { value: 'mini_shutter_switch', label: getLabel('mini_shutter_switch') },
    { value: 'touch_switch', label: getLabel('touch_switch') },
    { value: 'touch_shutter_switch', label: getLabel('touch_shutter_switch') },
    { value: 'shutter_switch', label: getLabel('shutter_switch') },
    { value: 'smart_shutter_switch', label: getLabel('smart_shutter_switch') },
    { value: 'curtain_switch', label: getLabel('curtain_switch') },
    { value: 'curtain_motor', label: getLabel('curtain_motor') },
    { value: 'curtain_rail', label: getLabel('curtain_rail') },
    { value: 'roller_blind_motor', label: getLabel('roller_blind_motor') },
    { value: 'smart_plug', label: getLabel('smart_plug') },
    { value: 'ir_remote', label: getLabel('ir_remote') },
    { value: 'gas_sensor', label: getLabel('gas_sensor') },
    { value: 'water_leak_sensor', label: getLabel('water_leak_sensor') },
    { value: 'motion_sensor', label: getLabel('motion_sensor') },
    { value: 'presence_sensor', label: getLabel('presence_sensor') },
    { value: 'smoke_sensor', label: getLabel('smoke_sensor') },
    { value: 'gas_valve', label: getLabel('gas_valve') },
    { value: 'water_valve', label: getLabel('water_valve') },
    { value: 'intercom', label: getLabel('intercom') },
    { value: 'camera', label: getLabel('camera') },
    { value: 'wifi_camera', label: getLabel('wifi_camera') },
    { value: 'smart_lock', label: getLabel('smart_lock') },
    { value: 'zigbee_hub', label: getLabel('zigbee_hub') },
    { value: 'matter_hub', label: getLabel('matter_hub') },
    { value: 'access_point', label: getLabel('access_point') },
    { value: 'repeater', label: getLabel('repeater') },
    { value: 'mesh_wifi', label: getLabel('mesh_wifi') },
    { value: 'network_switch', label: getLabel('network_switch') },
    { value: 'cat6_cable', label: getLabel('cat6_cable') },
    { value: 'bracket', label: getLabel('bracket') },
    { value: 'nvr', label: getLabel('nvr') },
    { value: 'hdd', label: getLabel('hdd') },
    { value: 'memory_card', label: getLabel('memory_card') },
    { value: 'central_control', label: getLabel('central_control') },
    { value: 'custom_device', label: getLabel('custom_device') }
  ];

  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [templates, setTemplates] = useState<DeviceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DeviceTemplateForm>(emptyForm);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | 'all'>('all');
  const [uploading, setUploading] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await deviceTemplatesApi.getAll();
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to load device templates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTemplates = () => {
    if (selectedProtocol === 'all') {
      return templates;
    }
    return templates.filter(t => t.default_protocol === selectedProtocol);
  };

  const getProtocolCounts = () => {
    const counts: Record<Protocol | 'all', number> = {
      all: templates.length,
      zigbee: 0,
      matter: 0,
      wifi: 0,
      knx: 0,
      wired: 0,
      lan: 0
    };

    templates.forEach(template => {
      if (template.default_protocol) {
        counts[template.default_protocol]++;
      }
    });

    return counts;
  };

  const filteredTemplates = getFilteredTemplates();
  const protocolCounts = getProtocolCounts();

  const handleCreate = () => {
    setIsCreating(true);
    setFormData(emptyForm);
  };

  const handleEdit = (template: DeviceTemplate) => {
    setEditingId(template.id);
    
    const gangPricesObj: Record<string, string> = {};
    if (template.gang_prices) {
      Object.entries(template.gang_prices).forEach(([key, value]) => {
        gangPricesObj[key] = value.toString();
      });
    }
    
    const portPricesObj: Record<string, string> = {};
    if (template.port_prices) {
      Object.entries(template.port_prices).forEach(([key, value]) => {
        portPricesObj[key] = value.toString();
      });
    }
    
    const capacityPricesObj: Record<string, string> = {};
    if (template.capacity_prices) {
      Object.entries(template.capacity_prices).forEach(([key, value]) => {
        capacityPricesObj[key] = value.toString();
      });
    }
    
    setFormData({
      name: template.name,
      category: template.category,
      description: template.description || '',
      default_protocol: template.default_protocol,
      brand: template.brand || '',
      supports_gangs: template.supports_gangs,
      supports_ports: template.supports_ports,
      supports_capacity: template.supports_capacity,
      gang_options: template.gang_options?.join(', ') || '',
      port_options: template.port_options?.join(', ') || '',
      capacity_options: template.capacity_options?.join(', ') || '',
      default_unit_price: template.default_unit_price.toString(),
      gang_prices: gangPricesObj,
      port_prices: portPricesObj,
      capacity_prices: capacityPricesObj
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Device name is required');
      return;
    }

    try {
      const gangOptionsArray = formData.gang_options ? formData.gang_options.split(',').map(s => s.trim()).filter(Boolean) : null;
      const portOptionsArray = formData.port_options ? formData.port_options.split(',').map(s => s.trim()).filter(Boolean) : null;
      const capacityOptionsArray = formData.capacity_options ? formData.capacity_options.split(',').map(s => s.trim()).filter(Boolean) : null;
      
      const gangPricesObj: Record<string, number> | null = formData.supports_gangs && Object.keys(formData.gang_prices).length > 0
        ? Object.entries(formData.gang_prices).reduce((acc, [key, value]) => {
            const numValue = Number.parseFloat(value);
            if (!Number.isNaN(numValue) && numValue >= 0) {
              acc[key] = numValue;
            }
            return acc;
          }, {} as Record<string, number>)
        : null;
      
      const portPricesObj: Record<string, number> | null = formData.supports_ports && Object.keys(formData.port_prices).length > 0
        ? Object.entries(formData.port_prices).reduce((acc, [key, value]) => {
            const numValue = Number.parseFloat(value);
            if (!Number.isNaN(numValue) && numValue >= 0) {
              acc[key] = numValue;
            }
            return acc;
          }, {} as Record<string, number>)
        : null;
      
      const capacityPricesObj: Record<string, number> | null = formData.supports_capacity && Object.keys(formData.capacity_prices).length > 0
        ? Object.entries(formData.capacity_prices).reduce((acc, [key, value]) => {
            const numValue = Number.parseFloat(value);
            if (!Number.isNaN(numValue) && numValue >= 0) {
              acc[key] = numValue;
            }
            return acc;
          }, {} as Record<string, number>)
        : null;
      
      const templateData = {
        name: formData.name.trim(),
        category: formData.category,
        description: formData.description.trim() || null,
        default_protocol: formData.default_protocol,
        brand: formData.brand.trim() || null,
        supports_gangs: formData.supports_gangs,
        supports_ports: formData.supports_ports,
        supports_capacity: formData.supports_capacity,
        gang_options: gangOptionsArray,
        port_options: portOptionsArray,
        capacity_options: capacityOptionsArray,
        default_unit_price: Number.parseFloat(formData.default_unit_price) || 0,
        gang_prices: gangPricesObj,
        port_prices: portPricesObj,
        capacity_prices: capacityPricesObj,
        is_system: false
      };

      if (editingId) {
        await deviceTemplatesApi.update(editingId, templateData);
        toast.success('Device template updated successfully');
      } else {
        await deviceTemplatesApi.create(templateData);
        toast.success('Device template created successfully');
      }

      await loadTemplates();
      handleCancel();
    } catch (error) {
      toast.error(editingId ? 'Failed to update device template' : 'Failed to create device template');
      console.error(error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await deviceTemplatesApi.delete(deleteId);
      toast.success('Device template deleted successfully');
      await loadTemplates();
      setDeleteId(null);
    } catch (error) {
      toast.error('Failed to delete device template');
      console.error(error);
    }
  };

  const parseOptions = (optionsString: string): string[] => {
    return optionsString.split(',').map(s => s.trim()).filter(Boolean);
  };

  const handleGangOptionsChange = (value: string) => {
    setFormData({ ...formData, gang_options: value });
    
    const options = parseOptions(value);
    const newGangPrices: Record<string, string> = {};
    options.forEach(option => {
      newGangPrices[option] = formData.gang_prices[option] || '0';
    });
    setFormData(prev => ({ ...prev, gang_options: value, gang_prices: newGangPrices }));
  };

  const handlePortOptionsChange = (value: string) => {
    setFormData({ ...formData, port_options: value });
    
    const options = parseOptions(value);
    const newPortPrices: Record<string, string> = {};
    options.forEach(option => {
      newPortPrices[option] = formData.port_prices[option] || '0';
    });
    setFormData(prev => ({ ...prev, port_options: value, port_prices: newPortPrices }));
  };

  const handleCapacityOptionsChange = (value: string) => {
    setFormData({ ...formData, capacity_options: value });
    
    const options = parseOptions(value);
    const newCapacityPrices: Record<string, string> = {};
    options.forEach(option => {
      newCapacityPrices[option] = formData.capacity_prices[option] || '0';
    });
    setFormData(prev => ({ ...prev, capacity_options: value, capacity_prices: newCapacityPrices }));
  };

  const handleGangPriceChange = (option: string, price: string) => {
    setFormData(prev => ({
      ...prev,
      gang_prices: { ...prev.gang_prices, [option]: price }
    }));
  };

  const handlePortPriceChange = (option: string, price: string) => {
    setFormData(prev => ({
      ...prev,
      port_prices: { ...prev.port_prices, [option]: price }
    }));
  };

  const handleCapacityPriceChange = (option: string, price: string) => {
    setFormData(prev => ({
      ...prev,
      capacity_prices: { ...prev.capacity_prices, [option]: price }
    }));
  };

  const handleCustomDeviceRequest = (requestData: any) => {
    // Pre-fill the form with the request data
    const newFormData: DeviceTemplateForm = {
      name: `${requestData.manufacturer} ${requestData.modelNumber}`,
      category: 'custom_device',
      description: `${requestData.deviceType}\n\nTechnical Parameters: ${requestData.technicalParameters || 'N/A'}\n\nAdditional Notes: ${requestData.additionalNotes || 'N/A'}`,
      default_protocol: requestData.protocol || null,
      brand: requestData.manufacturer,
      supports_gangs: !!requestData.numberOfGangs,
      supports_ports: !!requestData.numberOfPorts,
      supports_capacity: false,
      gang_options: requestData.numberOfGangs ? `${requestData.numberOfGangs} Gang` : '',
      port_options: requestData.numberOfPorts ? `${requestData.numberOfPorts} Ports` : '',
      capacity_options: '',
      default_unit_price: requestData.standardPrice || '0',
      gang_prices: requestData.numberOfGangs ? { [`${requestData.numberOfGangs} Gang`]: requestData.standardPrice || '0' } : {},
      port_prices: requestData.numberOfPorts ? { [`${requestData.numberOfPorts} Ports`]: requestData.standardPrice || '0' } : {},
      capacity_prices: {}
    };

    setFormData(newFormData);
    setIsCreating(true);
    toast.success('Custom device request loaded. Please review and save.');
  };

  const handleDownloadTemplate = () => {
    try {
      if (templates.length === 0) {
        toast.error('No device templates available to export');
        return;
      }
      generateDevicePriceTemplate(templates);
      toast.success(`Excel template downloaded with ${templates.length} devices`);
    } catch (error) {
      toast.error('Failed to generate Excel template');
      console.error(error);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please upload an Excel file (.xlsx or .xls)');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Processing Excel file...');

    try {
      const result = await parseDevicePriceExcel(file);

      if (result.errors.length > 0) {
        const errorMsg = result.errors.slice(0, 3).map(e => `Row ${e.row}: ${e.message}`).join('\n');
        toast.error(`Found ${result.errors.length} errors:\n${errorMsg}`, { id: toastId, duration: 8000 });
        return;
      }

      if (result.updates.length === 0) {
        toast.info('No price updates found in the Excel file', { id: toastId });
        return;
      }

      toast.loading(`Updating ${result.updates.length} device prices...`, { id: toastId });

      await deviceTemplatesApi.bulkUpdatePrices(result.updates);

      await loadTemplates();

      toast.success(
        `Successfully updated ${result.updates.length} device prices${result.skipped > 0 ? ` (${result.skipped} skipped)` : ''}`,
        { id: toastId, duration: 5000 }
      );

    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to process Excel file',
        { id: toastId }
      );
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderForm = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{editingId ? 'Edit Device Template' : 'Create New Device Template'}</CardTitle>
        <CardDescription>
          {editingId ? 'Update the device template details' : 'Add a new custom device template to use in quotations'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Device Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., KNX Dimmer 4-Gang"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand</Label>
            <Input
              id="brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g., Philips, Aqara, Sonoff"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="protocol">Default Protocol</Label>
            <Select 
              value={formData.default_protocol || 'none'} 
              onValueChange={(value) => setFormData({ ...formData, default_protocol: value === 'none' ? null : value as Protocol })}
            >
              <SelectTrigger id="protocol">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Default</SelectItem>
                {PROTOCOL_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Default Unit Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.default_unit_price}
              onChange={(e) => setFormData({ ...formData, default_unit_price: e.target.value })}
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description of the device"
            rows={2}
          />
        </div>

        <div className="space-y-3">
          <Label>Configuration Options</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="supports_gangs"
                checked={formData.supports_gangs}
                onCheckedChange={(checked) => setFormData({ ...formData, supports_gangs: checked as boolean })}
              />
              <Label htmlFor="supports_gangs" className="font-normal cursor-pointer">
                Supports Gangs (e.g., 1, 2, 4, 8)
              </Label>
            </div>
            {formData.supports_gangs && (
              <div className="ml-6 space-y-3">
                <Input
                  value={formData.gang_options}
                  onChange={(e) => handleGangOptionsChange(e.target.value)}
                  placeholder="Enter gang options separated by commas (e.g., 1, 2, 3, 4)"
                />
                {parseOptions(formData.gang_options).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Prices for each gang option (EGP):</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {parseOptions(formData.gang_options).map(option => (
                        <div key={option} className="space-y-1">
                          <Label htmlFor={`gang-price-${option}`} className="text-xs">{option}-Gang</Label>
                          <Input
                            id={`gang-price-${option}`}
                            type="number"
                            step="0.01"
                            value={formData.gang_prices[option] || '0'}
                            onChange={(e) => handleGangPriceChange(option, e.target.value)}
                            placeholder="0.00"
                            className="h-9"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="supports_ports"
                checked={formData.supports_ports}
                onCheckedChange={(checked) => setFormData({ ...formData, supports_ports: checked as boolean })}
              />
              <Label htmlFor="supports_ports" className="font-normal cursor-pointer">
                Supports Ports (e.g., 4, 8, 16, 24)
              </Label>
            </div>
            {formData.supports_ports && (
              <div className="ml-6 space-y-3">
                <Input
                  value={formData.port_options}
                  onChange={(e) => handlePortOptionsChange(e.target.value)}
                  placeholder="Enter port options separated by commas (e.g., 4, 8, 16, 24)"
                />
                {parseOptions(formData.port_options).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Prices for each port option (EGP):</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {parseOptions(formData.port_options).map(option => (
                        <div key={option} className="space-y-1">
                          <Label htmlFor={`port-price-${option}`} className="text-xs">{option}-Port</Label>
                          <Input
                            id={`port-price-${option}`}
                            type="number"
                            step="0.01"
                            value={formData.port_prices[option] || '0'}
                            onChange={(e) => handlePortPriceChange(option, e.target.value)}
                            placeholder="0.00"
                            className="h-9"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="supports_capacity"
                checked={formData.supports_capacity}
                onCheckedChange={(checked) => setFormData({ ...formData, supports_capacity: checked as boolean })}
              />
              <Label htmlFor="supports_capacity" className="font-normal cursor-pointer">
                Supports Capacity (e.g., 1TB, 2TB, 4TB)
              </Label>
            </div>
            {formData.supports_capacity && (
              <div className="ml-6 space-y-3">
                <Input
                  value={formData.capacity_options}
                  onChange={(e) => handleCapacityOptionsChange(e.target.value)}
                  placeholder="Enter capacity options separated by commas (e.g., 1TB, 2TB, 4TB)"
                />
                {parseOptions(formData.capacity_options).length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Prices for each capacity option (EGP):</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {parseOptions(formData.capacity_options).map(option => (
                        <div key={option} className="space-y-1">
                          <Label htmlFor={`capacity-price-${option}`} className="text-xs">{option}</Label>
                          <Input
                            id={`capacity-price-${option}`}
                            type="number"
                            step="0.01"
                            value={formData.capacity_prices[option] || '0'}
                            onChange={(e) => handleCapacityPriceChange(option, e.target.value)}
                            placeholder="0.00"
                            className="h-9"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save Template
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading device templates...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold">Device Templates</h2>
          <p className="text-muted-foreground">Manage custom device templates for quotations</p>
        </div>
        {!isCreating && !editingId && (
          <div className="flex gap-2 flex-wrap">
            <Button variant="secondary" onClick={() => setShowRequestDialog(true)}>
              <FileText className="w-4 h-4 mr-2" />
              Request Custom Device
            </Button>
            <Button variant="outline" onClick={handleDownloadTemplate} disabled={templates.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Download Price Template
            </Button>
            <Button variant="outline" onClick={handleUploadClick} disabled={uploading}>
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload Prices'}
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Device
            </Button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />

      {(isCreating || editingId) && renderForm()}

      {!isCreating && !editingId && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <FileSpreadsheet className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Bulk Price Management via Excel</h3>
                <p className="text-sm text-muted-foreground">
                  Download the Excel template with all {templates.length} devices (including custom-added devices) pre-populated. 
                  Fill in the "New Price (EGP)" column for devices you want to update, then upload the file back to apply changes instantly.
                  Perfect for bulk price updates and easy price management.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isCreating && !editingId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Filter by Protocol</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedProtocol === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedProtocol('all')}
              >
                All Devices
                <Badge variant="secondary" className="ml-2">
                  {protocolCounts.all}
                </Badge>
              </Button>
              
              <Button
                variant={selectedProtocol === 'zigbee' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedProtocol('zigbee')}
                disabled={protocolCounts.zigbee === 0}
              >
                Zigbee
                <Badge variant="secondary" className="ml-2">
                  {protocolCounts.zigbee}
                </Badge>
              </Button>
              
              <Button
                variant={selectedProtocol === 'matter' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedProtocol('matter')}
                disabled={protocolCounts.matter === 0}
              >
                Matter
                <Badge variant="secondary" className="ml-2">
                  {protocolCounts.matter}
                </Badge>
              </Button>
              
              <Button
                variant={selectedProtocol === 'wifi' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedProtocol('wifi')}
                disabled={protocolCounts.wifi === 0}
              >
                Wi-Fi
                <Badge variant="secondary" className="ml-2">
                  {protocolCounts.wifi}
                </Badge>
              </Button>
              
              <Button
                variant={selectedProtocol === 'knx' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedProtocol('knx')}
                disabled={protocolCounts.knx === 0}
              >
                KNX (Wired)
                <Badge variant="secondary" className="ml-2">
                  {protocolCounts.knx}
                </Badge>
              </Button>
              
              <Button
                variant={selectedProtocol === 'wired' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedProtocol('wired')}
                disabled={protocolCounts.wired === 0}
              >
                Wired
                <Badge variant="secondary" className="ml-2">
                  {protocolCounts.wired}
                </Badge>
              </Button>
              
              <Button
                variant={selectedProtocol === 'lan' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedProtocol('lan')}
                disabled={protocolCounts.lan === 0}
              >
                LAN
                <Badge variant="secondary" className="ml-2">
                  {protocolCounts.lan}
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card 
            key={template.id} 
            className={`${template.is_system ? 'border-primary/20 bg-primary/5' : ''} transition-all hover:shadow-md`}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <CardDescription className="mt-1">
                    {CATEGORY_OPTIONS.find(c => c.value === template.category)?.label || template.category}
                    {template.brand && <span className="ml-2">• {template.brand}</span>}
                  </CardDescription>
                </div>
                {template.is_system && (
                  <Badge variant="secondary" className="ml-2">System</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {template.description && (
                <p className="text-sm text-muted-foreground">{template.description}</p>
              )}
              
              <div className="space-y-1 text-sm">
                {template.default_protocol && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Protocol:</span>
                    <Badge variant="outline">
                      {PROTOCOL_OPTIONS.find(p => p.value === template.default_protocol)?.label || template.default_protocol}
                    </Badge>
                  </div>
                )}
                
                {template.supports_gangs && template.gang_options && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Gangs:</span>
                    <span>{template.gang_options.join(', ')}</span>
                  </div>
                )}
                
                {template.supports_ports && template.port_options && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Ports:</span>
                    <span>{template.port_options.join(', ')}</span>
                  </div>
                )}
                
                {template.supports_capacity && template.capacity_options && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span>{template.capacity_options.join(', ')}</span>
                  </div>
                )}
                
                {template.gang_prices && Object.keys(template.gang_prices).length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-sm">Gang Prices:</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(template.gang_prices).map(([gang, price]) => (
                        <Badge key={gang} variant="secondary" className="text-xs">
                          {gang}-Gang: {Number(price).toFixed(2)} EGP
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : template.port_prices && Object.keys(template.port_prices).length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-sm">Port Prices:</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(template.port_prices).map(([port, price]) => (
                        <Badge key={port} variant="secondary" className="text-xs">
                          {port}-Port: {Number(price).toFixed(2)} EGP
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : template.capacity_prices && Object.keys(template.capacity_prices).length > 0 ? (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-sm">Capacity Prices:</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(template.capacity_prices).map(([capacity, price]) => (
                        <Badge key={capacity} variant="secondary" className="text-xs">
                          {capacity}: {Number(price).toFixed(2)} EGP
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : template.default_unit_price > 0 ? (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Price:</span>
                    <span className="font-medium">{template.default_unit_price.toFixed(2)} EGP</span>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => navigate(`/device/${template.id}`)}
                  className="flex-1"
                >
                  <MousePointerClick className="w-3 h-3 mr-1" />
                  Add to Quotation
                </Button>
                
                {!template.is_system && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(template)}
                      disabled={isCreating || editingId !== null}
                    >
                      <Edit2 className="w-3 h-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteId(template.id)}
                      disabled={isCreating || editingId !== null}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && templates.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No devices found for {selectedProtocol === 'all' ? 'this filter' : PROTOCOL_OPTIONS.find(p => p.value === selectedProtocol)?.label}
            </p>
            <Button variant="outline" onClick={() => setSelectedProtocol('all')}>
              Show All Devices
            </Button>
          </CardContent>
        </Card>
      )}

      {templates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No device templates found</p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Device Template
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this device template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomDeviceRequestDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        onSubmit={handleCustomDeviceRequest}
      />
    </div>
  );
}
