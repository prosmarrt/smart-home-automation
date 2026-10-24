import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModelAutocomplete } from '@/components/ui/model-autocomplete';
import { useToast } from '@/hooks/use-toast';
import { devicesApi, devicePricesApi } from '@/db/api';
import type { Room, Device, Protocol, SwitchGang, DeviceCategory } from '@/types/types';
import { useCategoryLabels } from '@/hooks/useCategoryLabels';
import { useOptionPrices } from '@/hooks/useOptionPrices';


interface SwitchesSectionProps {
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  defaultProtocol?: Protocol;
  isEditMode?: boolean;
  refreshKey?: number;
}

export default function SwitchesSection({ rooms, devices, onDevicesChange, defaultProtocol = 'zigbee', isEditMode = false, refreshKey = 0 }: SwitchesSectionProps) {
  const [switchType, setSwitchType] = useState<'mini' | 'touch'>('mini');
  const { getLabel } = useCategoryLabels();
  const [gang, setGang] = useState<SwitchGang>('1');
  const [protocol, setProtocol] = useState<Protocol>(defaultProtocol);
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [brand, setBrand] = useState('none');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { toast } = useToast();

  const GANGS: SwitchGang[] = ['1','2','3','4','5','6','7','8'];
  const category: DeviceCategory = switchType === 'mini' ? 'mini_switch' : 'touch_switch';
  const { fmtFor } = useOptionPrices(
    GANGS.map(g => ({ category, protocol, gang: g })),
    [switchType, protocol, refreshKey]
  );

  // Common switch brands
  const switchBrands = [
    'Aqara',
    'Sonoff',
    'Tuya',
    'Shelly',
    'Xiaomi',
    'TP-Link',
    'Philips Hue',
    'Legrand',
    'Schneider Electric',
    'Other'
  ];

  const switchDevices = devices.filter(d => 
    d.category === 'mini_switch' || 
    d.category === 'touch_switch'
  );

  useEffect(() => {
    setProtocol(defaultProtocol || 'zigbee');
  }, [defaultProtocol]);

  useEffect(() => {
    loadPrice();
  }, [switchType, gang, protocol, brand, refreshKey]);

  const loadPrice = async () => {
    const category: DeviceCategory = switchType === 'mini' ? 'mini_switch' : 'touch_switch';
    
    const price = await devicePricesApi.getPrice(category, protocol, gang, undefined);
    setUnitPrice(price);
  };

  const handleAddSwitch = async () => {
    if (quantity < 1) {
      toast({
        title: 'Validation Error',
        description: 'Quantity must be at least 1.',
        variant: 'destructive'
      });
      return;
    }

    if (unitPrice < 0) {
      toast({
        title: 'Validation Error',
        description: 'Unit price cannot be negative.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const category: DeviceCategory = switchType === 'mini' ? 'mini_switch' : 'touch_switch';
      
      if (isEditMode) {
        // In edit mode, create device object without API call
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          room_id: roomId === 'unassigned' ? null : roomId,
          category,
          protocol,
          quantity,
          unit_price: unitPrice,
          vat_rate: 0,
          gang,
          device_name: undefined,
          brand: (brand && brand !== 'none') ? brand : undefined,
          model: model || undefined,
          custom_description: description || undefined,
          
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onDevicesChange([...devices, newDevice]);
      } else {
        // Normal mode: create in database
        const device = await devicesApi.create({
          room_id: roomId === 'unassigned' ? null : roomId,
          category,
          protocol,
          quantity,
          unit_price: unitPrice,
          vat_rate: 0,
          gang,
          brand: (brand && brand !== 'none') ? brand : undefined,
          model: model || undefined,
          custom_description: description || undefined
        });
        onDevicesChange([...devices, device]);
      }
      
      setQuantity(1);
      setRoomId('unassigned');
      setUnitPrice(0);
      setBrand('none');
      setModel('');
      setDescription('');
      
      const deviceName = getLabel(category);
      
      toast({
        title: 'Success',
        description: `${deviceName} added successfully.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      if (isEditMode) {
        // In edit mode, remove from array directly without API call
        onDevicesChange(devices.filter(d => d.id !== id));
        toast({
          title: 'Success',
          description: 'Device deleted successfully.'
        });
      } else {
        // Normal mode: delete from database
        await devicesApi.delete(id);
        onDevicesChange(devices.filter(d => d.id !== id));
        toast({
          title: 'Success',
          description: 'Device deleted successfully.'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      if (isEditMode) {
        // In edit mode, update the array directly without API call
        const updatedDevices = devices.map(d => 
          d.id === id ? { ...d, quantity: newQuantity } : d
        );
        onDevicesChange(updatedDevices);
      } else {
        // Normal mode: update in database
        const updated = await devicesApi.update(id, { quantity: newQuantity });
        onDevicesChange(devices.map(d => d.id === id ? updated : d));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update quantity.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateRoom = async (id: string, newRoomId: string) => {
    try {
      if (isEditMode) {
        // In edit mode, update the array directly without API call
        const updatedDevices = devices.map(d => 
          d.id === id ? { ...d, room_id: newRoomId === 'unassigned' ? null : newRoomId } : d
        );
        onDevicesChange(updatedDevices);
        toast({
          title: 'Success',
          description: 'Room updated successfully.',
        });
      } else {
        // Normal mode: update in database
        const updated = await devicesApi.update(id, { room_id: newRoomId === 'unassigned' ? null : newRoomId });
        onDevicesChange(devices.map(d => d.id === id ? updated : d));
        toast({
          title: 'Success',
          description: 'Room updated successfully.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update room.',
        variant: 'destructive'
      });
    }
  };

  const startEditing = (device: Device) => {
    setEditingId(device.id);
    setEditingName(device.device_name || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveDeviceName = async (deviceId: string) => {
    try {
      if (isEditMode) {
        // In edit mode, update the array directly without API call
        const updatedDevices = devices.map(d => 
          d.id === deviceId ? { ...d, device_name: editingName || undefined } : d
        );
        onDevicesChange(updatedDevices);
        toast({
          title: 'Success',
          description: 'Device name updated successfully.',
        });
      } else {
        // Normal mode: update in database
        const updated = await devicesApi.update(deviceId, { device_name: editingName || undefined });
        onDevicesChange(devices.map(d => d.id === deviceId ? updated : d));
        toast({
          title: 'Success',
          description: 'Device name updated successfully.',
        });
      }
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update device name.',
        variant: 'destructive'
      });
    }
  };

  const handleQuickAddDevice = async () => {
    try {
      // Get default price for mini switch 1 gang with current protocol
      const defaultPrice = await devicePricesApi.getPrice('mini_switch', protocol, '1');

      if (isEditMode) {
        // In edit mode, create device object without API call
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          room_id: null,
          category: 'mini_switch',
          protocol: protocol,
          quantity: 1,
          unit_price: defaultPrice,
          vat_rate: 0,
          gang: '1',
          device_name: undefined,
          
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onDevicesChange([...devices, newDevice]);
      } else {
        // Normal mode: create in database
        const device = await devicesApi.create({
          room_id: null,
          category: 'mini_switch',
          protocol: protocol,
          quantity: 1,
          unit_price: defaultPrice,
          vat_rate: 0,
          gang: '1'
        });
        onDevicesChange([...devices, device]);
      }
      
      toast({
        title: 'Success',
        description: 'Mini Light Switch added successfully. You can now edit its details.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getSwitchLabel = (device: Device) => {
    const isMini = device.category === 'mini_switch' || device.category === 'mini_shutter_switch';
    const type = isMini ? 'Mini Light' : 'Touch Light';
    const gangInfo = device.gang ? ` ${device.gang} Gang` : '';
    return `${type} Switch${gangInfo}`;
  };

  return (
    <div className="space-y-6">
      {/* Add Switch Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Switch</CardTitle>
          <CardDescription>Configure and add a new smart switch</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Switch Type</Label>
              <Select value={switchType} onValueChange={(v: any) => setSwitchType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mini">{getLabel('mini_switch')}</SelectItem>
                  <SelectItem value="touch">{getLabel('touch_switch')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gang Configuration</Label>
              <Select value={gang} onValueChange={(v: SwitchGang) => setGang(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="1">{`1 Gang${fmtFor(category, protocol, '1') ? ` — ${fmtFor(category, protocol, '1')}` : ''}`}</SelectItem>
                   <SelectItem value="2">{`2 Gang${fmtFor(category, protocol, '2') ? ` — ${fmtFor(category, protocol, '2')}` : ''}`}</SelectItem>
                   <SelectItem value="3">{`3 Gang${fmtFor(category, protocol, '3') ? ` — ${fmtFor(category, protocol, '3')}` : ''}`}</SelectItem>
                   <SelectItem value="4">{`4 Gang${fmtFor(category, protocol, '4') ? ` — ${fmtFor(category, protocol, '4')}` : ''}`}</SelectItem>
                   <SelectItem value="5">{`5 Gang${fmtFor(category, protocol, '5') ? ` — ${fmtFor(category, protocol, '5')}` : ''}`}</SelectItem>
                   <SelectItem value="6">{`6 Gang${fmtFor(category, protocol, '6') ? ` — ${fmtFor(category, protocol, '6')}` : ''}`}</SelectItem>
                   <SelectItem value="7">{`7 Gang${fmtFor(category, protocol, '7') ? ` — ${fmtFor(category, protocol, '7')}` : ''}`}</SelectItem>
                   <SelectItem value="8">{`8 Gang${fmtFor(category, protocol, '8') ? ` — ${fmtFor(category, protocol, '8')}` : ''}`}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Protocol <span className="text-xs text-muted-foreground">(Override if needed)</span></Label>
              <Select value={protocol} onValueChange={(v: Protocol) => setProtocol(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zigbee">Zigbee</SelectItem>
                  <SelectItem value="matter">Matter</SelectItem>
                  <SelectItem value="wifi">Wi-Fi</SelectItem>
                  <SelectItem value="knx">KNX (Wired)</SelectItem>
                  <SelectItem value="wired">Wired</SelectItem>
                  <SelectItem value="lan">LAN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room (Optional)</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                  ))}
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

            <div className="space-y-2">
              <Label>Brand (Optional)</Label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {switchBrands.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Model # (Optional)</Label>
              <ModelAutocomplete
                value={model}
                onChange={setModel}
                category={switchType === 'mini' ? 'mini_switch' : 'touch_switch'}
                brand={brand}
                placeholder="Enter or select model number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description / Notes (Optional)</Label>
            <Textarea
              placeholder="Add any additional details or specifications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <Button onClick={handleAddSwitch} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Switch
          </Button>
        </CardContent>
      </Card>

      {/* Switches List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Switches</CardTitle>
              <CardDescription>{switchDevices.length} switch configurations</CardDescription>
            </div>
            <Button onClick={handleQuickAddDevice} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {switchDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No switches added yet. Add your first switch above!
            </div>
          ) : (
            <div className="space-y-3">
              {switchDevices.map(device => (
                <div key={device.id} className="p-4 border border-border rounded-lg bg-card space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold">{device.quantity}</span>
                      </div>
                      <div className="flex-1">
                        {editingId === device.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              placeholder="Enter device name"
                              className="h-8"
                            />
                            <Button size="sm" variant="ghost" onClick={() => saveDeviceName(device.id)}>
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditing}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">
                              {device.device_name || getSwitchLabel(device)}
                            </h4>
                            <Button size="sm" variant="ghost" onClick={() => startEditing(device)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">
                          {device.protocol?.toUpperCase()} • EGP {device.unit_price.toFixed(2)} each
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-bold text-primary">EGP {(device.quantity * device.unit_price).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleUpdateQuantity(device.id, device.quantity - 1)}
                          disabled={device.quantity <= 1}
                        >
                          -
                        </Button>
                        <span className="w-12 text-center font-medium">{device.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleUpdateQuantity(device.id, device.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteDevice(device.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground min-w-[80px]">Assigned Room:</Label>
                    <Select 
                      value={device.room_id || 'unassigned'} 
                      onValueChange={(value) => handleUpdateRoom(device.id, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {rooms.map(room => (
                          <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

