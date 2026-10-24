import { useState, useEffect } from 'react';
import { Plus, Trash2, Blinds } from 'lucide-react';
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

interface ShadingSectionProps {
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  defaultProtocol?: Protocol;
  isEditMode?: boolean;
  refreshKey?: number;
}

export default function ShadingSection({ rooms, devices, onDevicesChange, defaultProtocol = 'zigbee', isEditMode = false, refreshKey = 0 }: ShadingSectionProps) {
  const [deviceType, setDeviceType] = useState<'shutter_switch' | 'smart_shutter_switch' | 'curtain_motor' | 'curtain_rail' | 'roller_blind_motor'>('curtain_motor');
  const [gang, setGang] = useState<SwitchGang>('1');
  const [protocol, setProtocol] = useState<Protocol>(defaultProtocol);
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [brand, setBrand] = useState('none');
  const [model, setModel] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [description, setDescription] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const { toast } = useToast();

  // Shading device brands
  const shadingBrands = [
    'Aqara',
    'Tuya',
    'Sonoff',
    'Xiaomi',
    'Zemismart',
    'Dooya',
    'Shelly',
    'Other'
  ];

  const shadingDevices = devices.filter(d => 
    d.category === 'shutter_switch' ||
    d.category === 'mini_shutter_switch' ||
    d.category === 'smart_shutter_switch' ||
    d.category === 'touch_shutter_switch' ||
    d.category === 'curtain_switch' ||
    d.category === 'curtain_motor' ||
    d.category === 'curtain_rail' ||
    d.category === 'roller_blind_motor'
  );

  useEffect(() => {
    setProtocol(defaultProtocol || 'zigbee');
  }, [defaultProtocol]);

  useEffect(() => {
    loadPrice();
  }, [deviceType, gang, protocol, brand, refreshKey]);

  const loadPrice = async () => {
    const category: DeviceCategory = deviceType;
    const needsGang = deviceType === 'shutter_switch' || deviceType === 'smart_shutter_switch';
    const needsProtocol = deviceType !== 'curtain_rail';
    
    const price = await devicePricesApi.getPrice(
      category,
      needsProtocol ? protocol : undefined,
      needsGang ? gang : undefined,
      undefined
    );
    setUnitPrice(price);
  };

  const handleAdd = async () => {
    try {
      const category: DeviceCategory = deviceType;
      const needsGang = deviceType === 'shutter_switch' || deviceType === 'smart_shutter_switch';
      const needsProtocol = deviceType !== 'curtain_rail';

      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          room_id: roomId === 'unassigned' ? null : roomId,
          category,
          protocol: needsProtocol ? protocol : null,
          quantity,
          unit_price: unitPrice,
          vat_rate: 0,
          gang: needsGang ? gang : undefined,
          device_name: deviceName || undefined,
          brand: (brand && brand !== 'none') ? brand : undefined,
          model: model || undefined,
          custom_description: description || undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onDevicesChange([...devices, newDevice]);
      } else {
        const device = await devicesApi.create({
          room_id: roomId === 'unassigned' ? null : roomId,
          category,
          protocol: needsProtocol ? protocol : null,
          quantity,
          unit_price: unitPrice,
          vat_rate: 0,
          gang: needsGang ? gang : undefined,
          device_name: deviceName || undefined,
          brand: (brand && brand !== 'none') ? brand : undefined,
          model: model || undefined,
          custom_description: description || undefined
        });
        onDevicesChange([...devices, device]);
      }
      
      setQuantity(1);
      setRoomId('unassigned');
      setUnitPrice(0);
      setDeviceName('');
      setBrand('none');
      setModel('');
      setDescription('');
      
      toast({
        title: 'Success',
        description: 'Shading device added successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add shading device',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (!isEditMode) {
        await devicesApi.delete(id);
      }
      onDevicesChange(devices.filter(d => d.id !== id));
      toast({
        title: 'Success',
        description: 'Device deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete device',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateQuantity = async (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    try {
      if (isEditMode) {
        onDevicesChange(devices.map(d => d.id === id ? { ...d, quantity: newQuantity } : d));
      } else {
        const updated = await devicesApi.update(id, { quantity: newQuantity });
        onDevicesChange(devices.map(d => d.id === id ? updated : d));
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update quantity', variant: 'destructive' });
    }
  };

  const handleUpdateRoom = async (id: string, newRoomId: string) => {
    try {
      if (isEditMode) {
        onDevicesChange(devices.map(d => d.id === id ? { ...d, room_id: newRoomId === 'unassigned' ? null : newRoomId } : d));
        toast({ title: 'Success', description: 'Room updated' });
      } else {
        const updated = await devicesApi.update(id, { room_id: newRoomId === 'unassigned' ? null : newRoomId });
        onDevicesChange(devices.map(d => d.id === id ? updated : d));
        toast({ title: 'Success', description: 'Room updated' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update room', variant: 'destructive' });
    }
  };

  const startEditing = (device: Device) => {
    setEditingId(device.id);
    setEditingName(device.device_name || getDeviceLabel(device));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const saveDeviceName = async (deviceId: string) => {
    try {
      if (isEditMode) {
        onDevicesChange(devices.map(d => d.id === deviceId ? { ...d, device_name: editingName || undefined } : d));
      } else {
        const updated = await devicesApi.update(deviceId, { device_name: editingName || undefined });
        onDevicesChange(devices.map(d => d.id === deviceId ? updated : d));
      }
      setEditingId(null);
      setEditingName('');
      toast({ title: 'Success', description: 'Device name updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update device name', variant: 'destructive' });
    }
  };

  const getDeviceLabel = (device: Device) => {
    if (device.device_name) return device.device_name;
    if (device.category === 'shutter_switch') return 'Mini Shutter Switch';
    if (device.category === 'smart_shutter_switch') return 'Touch Shutter Switch';
    if (device.category === 'curtain_motor') return 'Curtain Motor';
    if (device.category === 'curtain_rail') return 'Curtain Rail';
    if (device.category === 'roller_blind_motor') return 'Roller Blind Motor';
    return 'Shading Device';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Blinds className="h-5 w-5" />
            Shading Devices
          </CardTitle>
          <CardDescription>
            Manage curtain motors, roller blinds, and shutter controls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={deviceType} onValueChange={(v) => setDeviceType(v as typeof deviceType)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="curtain_motor">Curtain Motor</TabsTrigger>
              <TabsTrigger value="roller_blind_motor">Roller Blind</TabsTrigger>
              <TabsTrigger value="curtain_rail">Curtain Rail</TabsTrigger>
              <TabsTrigger value="shutter_switch">Mini Shutter Switch</TabsTrigger>
              <TabsTrigger value="smart_shutter_switch">Touch Shutter Switch</TabsTrigger>
            </TabsList>

            <TabsContent value="curtain_motor" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={protocol} onValueChange={(v: Protocol) => setProtocol(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zigbee">Zigbee</SelectItem>
                      <SelectItem value="wifi">WiFi</SelectItem>
                      <SelectItem value="matter">Matter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Device Name (Optional)</Label>
                  <Input
                    placeholder="e.g. Master Bedroom Curtain"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Room</Label>
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
                  <Label>Brand (Optional)</Label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shadingBrands.map(b => (
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
                    category="curtain_motor"
                    brand={brand}
                    placeholder="Enter or select model number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description/Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional details about this device"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Price (EGP)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={handleAdd} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Curtain Motor
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="roller_blind_motor" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={protocol} onValueChange={(v: Protocol) => setProtocol(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zigbee">Zigbee</SelectItem>
                      <SelectItem value="wifi">WiFi</SelectItem>
                      <SelectItem value="matter">Matter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Device Name (Optional)</Label>
                  <Input
                    placeholder="e.g. Living Room Roller"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Room</Label>
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
                  <Label>Brand (Optional)</Label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shadingBrands.map(b => (
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
                    category="roller_blind_motor"
                    brand={brand}
                    placeholder="Enter or select model number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description/Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional details about this device"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Price (EGP)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={handleAdd} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Roller Blind
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="curtain_rail" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Device Name (Optional)</Label>
                  <Input
                    placeholder="e.g. Master Rail"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Room</Label>
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
                  <Label>Brand (Optional)</Label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shadingBrands.map(b => (
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
                    category="curtain_rail"
                    brand={brand}
                    placeholder="Enter or select model number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description/Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional details about this curtain rail"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Price (EGP)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={handleAdd} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Curtain Rail
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="shutter_switch" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={protocol} onValueChange={(v: Protocol) => setProtocol(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zigbee">Zigbee</SelectItem>
                      <SelectItem value="wifi">WiFi</SelectItem>
                      <SelectItem value="matter">Matter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Device Name (Optional)</Label>
                  <Input
                    placeholder="e.g. Balcony Shutter"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gang</Label>
                  <Select value={gang} onValueChange={(v: SwitchGang) => setGang(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4', '5'].map(g => (
                        <SelectItem key={g} value={g}>{g} Gang</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Room</Label>
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
                  <Label>Brand (Optional)</Label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shadingBrands.map(b => (
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
                    category="shutter_switch"
                    brand={brand}
                    placeholder="Enter or select model number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description/Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional details about this switch"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Price (EGP)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={handleAdd} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Mini Shutter Switch
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="smart_shutter_switch" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Protocol</Label>
                  <Select value={protocol} onValueChange={(v: Protocol) => setProtocol(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zigbee">Zigbee</SelectItem>
                      <SelectItem value="wifi">WiFi</SelectItem>
                      <SelectItem value="matter">Matter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Device Name (Optional)</Label>
                  <Input
                    placeholder="e.g. Master Shutter"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Gang</Label>
                  <Select value={gang} onValueChange={(v: SwitchGang) => setGang(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['1', '2', '3', '4', '5'].map(g => (
                        <SelectItem key={g} value={g}>{g} Gang</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Room</Label>
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
                  <Label>Brand (Optional)</Label>
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shadingBrands.map(b => (
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
                    category="smart_shutter_switch"
                    brand={brand}
                    placeholder="Enter or select model number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description/Notes (Optional)</Label>
                <Textarea
                  placeholder="Add any additional details about this switch"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Price (EGP)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex items-end">
                  <Button onClick={handleAdd} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Touch Shutter Switch
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Device List */}
      {shadingDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Added Shading Devices ({shadingDevices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {shadingDevices.map(device => (
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
                              <Plus className="w-4 h-4 text-primary" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={cancelEditing}>
                              <Trash2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">
                              {getDeviceLabel(device)}
                            </h4>
                            <Button size="sm" variant="ghost" onClick={() => startEditing(device)}>
                              <Blinds className="w-3 h-3" />
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
                          className="h-8 w-8"
                        >
                          -
                        </Button>
                        <span className="w-8 text-center font-medium">{device.quantity}</span>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleUpdateQuantity(device.id, device.quantity + 1)}
                          className="h-8 w-8"
                        >
                          +
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive h-8 w-8"
                          onClick={() => handleDelete(device.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Label className="text-sm text-muted-foreground min-w-[100px]">Assigned Room:</Label>
                    <Select 
                      value={device.room_id || 'unassigned'} 
                      onValueChange={(v) => handleUpdateRoom(device.id, v)}
                    >
                      <SelectTrigger className="flex-1 h-8 text-sm">
                        <SelectValue placeholder="Select Room" />
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
