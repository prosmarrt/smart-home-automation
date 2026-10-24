import { useState, useEffect } from 'react';
import { Plus, Package, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { devicesApi, devicePricesApi } from '@/db/api';
import type { Device, Room, Protocol, DevicePrice, SwitchGang } from '@/types/types';

interface CustomDevicesSectionProps {
  defaultProtocol?: Protocol;
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  refreshKey?: number;
}

export default function CustomDevicesSection({ rooms, devices, onDevicesChange, defaultProtocol, isEditMode = false, refreshKey = 0 }: CustomDevicesSectionProps) {
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [protocol, setProtocol] = useState<Protocol | ''>('');
  const [gang, setGang] = useState<SwitchGang | ''>('');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [savedTemplates, setSavedTemplates] = useState<DevicePrice[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const { toast } = useToast();

  const customDevices = devices.filter(d => d.category === 'custom_device');

  useEffect(() => {
    loadCustomDeviceTemplates();
  }, [refreshKey]);

  const loadCustomDeviceTemplates = async () => {
    try {
      const allPrices = await devicePricesApi.getAll();
      const customTemplates = allPrices.filter(p => p.category === 'custom_device' && p.device_name);
      setSavedTemplates(customTemplates);
    } catch (error) {
      console.error('Error loading custom device templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = savedTemplates.find(t => t.id === templateId);
    if (template) {
      setCustomName(template.device_name || '');
      setCustomDescription(template.description || '');
      setProtocol(template.protocol || '');
      setGang(template.gang || '');
      setUnitPrice(template.unit_price || 0);
    }
  };

  const handleAddCustomDevice = async () => {
    if (!customName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a device name.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const devicePayload = {
        room_id: roomId === 'unassigned' ? null : roomId,
        category: 'custom_device' as const,
        protocol: protocol || null,
        gang: gang || undefined,
        quantity: Number(quantity),
        unit_price: Number(unitPrice),
        vat_rate: 0,
        custom_name: customName.trim(),
        ...(customDescription.trim() ? { custom_description: customDescription.trim() } : {})
      };

      let newDevice: Device;

      if (isEditMode) {
        newDevice = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: 'temp',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...devicePayload
        } as Device;
      } else {
        newDevice = await devicesApi.create(devicePayload);
      }

      onDevicesChange([...devices, newDevice]);
      setRoomId('unassigned');
      setCustomName('');
      setCustomDescription('');
      setProtocol('');
      setGang('');
      setQuantity(1);
      setUnitPrice(0);
      setSelectedTemplate('');

      toast({
        title: 'Success',
        description: 'Custom device added successfully.'
      });
    } catch (error) {
      console.error('Error adding custom device:', error);
      toast({
        title: 'Error',
        description: `Failed to add custom device. ${error instanceof Error ? error.message : 'Please try again.'}`,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      if (!isEditMode && !deviceId.startsWith('temp-')) {
        await devicesApi.delete(deviceId);
      }
      onDevicesChange(devices.filter(d => d.id !== deviceId));
      toast({
        title: 'Success',
        description: 'Custom device deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting custom device:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete custom device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateQuantity = async (deviceId: string, newQuantity: number) => {
    try {
      if (isEditMode || deviceId.startsWith('temp-')) {
        onDevicesChange(devices.map(d => d.id === deviceId ? { ...d, quantity: newQuantity } : d));
      } else {
        const updated = await devicesApi.update(deviceId, { quantity: newQuantity });
        onDevicesChange(devices.map(d => d.id === deviceId ? updated : d));
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quantity.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdatePrice = async (deviceId: string, newPrice: number) => {
    try {
      if (isEditMode || deviceId.startsWith('temp-')) {
        onDevicesChange(devices.map(d => d.id === deviceId ? { ...d, unit_price: newPrice } : d));
      } else {
        const updated = await devicesApi.update(deviceId, { unit_price: newPrice });
        onDevicesChange(devices.map(d => d.id === deviceId ? updated : d));
      }
    } catch (error) {
      console.error('Error updating price:', error);
      toast({
        title: 'Error',
        description: 'Failed to update price.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateRoom = async (id: string, newRoomId: string) => {
    try {
      if (isEditMode) {
        const updatedDevices = devices.map(d => 
          d.id === id ? { ...d, room_id: newRoomId === 'unassigned' ? null : newRoomId } : d
        );
        onDevicesChange(updatedDevices);
      } else {
        const updated = await devicesApi.update(id, { room_id: newRoomId === 'unassigned' ? null : newRoomId });
        onDevicesChange(devices.map(d => d.id === id ? updated : d));
      }
      toast({
        title: 'Success',
        description: 'Room updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update room.',
        variant: 'destructive'
      });
    }
  };

  const handleQuickAddDevice = async () => {
    try {
      // Get default price for custom device
      const defaultPrice = await devicePricesApi.getPrice('custom_device', defaultProtocol, undefined, undefined);

      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          
        room_id: null,
        category: 'custom_device',
        protocol: defaultProtocol || null,
        quantity: 1,
        unit_price: defaultPrice,
        vat_rate: 0,
        custom_name: 'Custom Device'
      ,
          device_name: undefined,
          
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onDevicesChange([...devices, newDevice]);
      } else {
        const device = await devicesApi.create({
        room_id: null,
        category: 'custom_device',
        protocol: defaultProtocol || null,
        quantity: 1,
        unit_price: defaultPrice,
        vat_rate: 0,
        custom_name: 'Custom Device'
      });
        onDevicesChange([...devices, device]);
      }
      
      toast({
        title: 'Success',
        description: 'Custom device added successfully. You can now edit its details.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return 'Unassigned';
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Unknown Room';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle>Custom Devices</CardTitle>
          </div>
          <CardDescription>Add other customized devices not listed in standard categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Template Selector */}
          {savedTemplates.length > 0 && (
            <div className="p-4 bg-muted/50 rounded-lg border border-border">
              <Label className="text-sm font-medium mb-2 block">Load from Saved Templates</Label>
              <div className="flex gap-2">
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a saved device template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedTemplates.map(template => {
                      let displayName = template.device_name || 'Unnamed Device';
                      if (template.gang) displayName += ` ${template.gang}G`;
                      if (template.protocol) displayName += ` [${template.protocol.toUpperCase()}]`;
                      return (
                        <SelectItem key={template.id} value={template.id}>
                          {displayName} - {template.unit_price} EGP
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedTemplate('');
                    setCustomName('');
                    setCustomDescription('');
                    setProtocol('');
                    setGang('');
                    setUnitPrice(0);
                  }}
                >
                  Clear
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Select a template to auto-fill device details, or enter manually below
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Device Name</Label>
              <Input
                placeholder="Enter device name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomDevice();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Protocol (Optional)</Label>
              <Select value={protocol || 'none'} onValueChange={(v) => setProtocol(v === 'none' ? '' : v as Protocol)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select protocol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="zigbee">Zigbee</SelectItem>
                  <SelectItem value="matter">Matter</SelectItem>
                  <SelectItem value="wifi">Wi-Fi</SelectItem>
                  <SelectItem value="wired">Wired</SelectItem>
                  <SelectItem value="lan">LAN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gang (Optional)</Label>
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

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label>Unit Price (EGP)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2 flex items-end">
              <Button 
                onClick={handleAddCustomDevice} 
                className="w-full"
                type="button"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description (Optional)</Label>
            <Textarea
              placeholder="Enter device description or specifications"
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Custom Devices</CardTitle>
              <CardDescription>{customDevices.length} custom device configurations</CardDescription>
            </div>
            <Button onClick={handleQuickAddDevice} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {customDevices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No custom devices added yet.</p>
          ) : (
            <div className="space-y-4">
              {customDevices.map(device => (
                <Card key={device.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-center">
                        <div>
                          <Label className="text-xs text-muted-foreground">Room</Label>
                          <Select
                            value={device.room_id || 'unassigned'}
                            onValueChange={(value) => handleUpdateRoom(device.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {rooms.map(room => (
                                <SelectItem key={room.id} value={room.id}>
                                  {room.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Device Name</Label>
                          <p className="font-medium">{device.custom_name}</p>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={device.quantity}
                            onChange={(e) => handleUpdateQuantity(device.id, Number.parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Unit Price (EGP)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={device.unit_price}
                            onChange={(e) => handleUpdatePrice(device.id, Number.parseFloat(e.target.value) || 0)}
                            className="w-28"
                          />
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <Label className="text-xs text-muted-foreground">Total</Label>
                            <p className="font-bold text-primary text-lg">
                              EGP {(device.quantity * device.unit_price).toFixed(2)}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteDevice(device.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {device.custom_description && (
                        <div className="pt-2 border-t border-border">
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <p className="text-sm mt-1">{device.custom_description}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
