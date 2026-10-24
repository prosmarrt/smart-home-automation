import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ModelAutocomplete } from '@/components/ui/model-autocomplete';
import { useToast } from '@/hooks/use-toast';
import { devicesApi, devicePricesApi } from '@/db/api';
import type { Room, Device, Protocol, DeviceCategory } from '@/types/types';
import { useOptionPrices } from '@/hooks/useOptionPrices';

interface SensorsSectionProps {
  defaultProtocol?: Protocol;
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  refreshKey?: number;
}

const SENSOR_CATEGORIES: { value: 'gas' | 'water_leak' | 'motion' | 'presence' | 'smoke'; category: DeviceCategory }[] = [
  { value: 'gas', category: 'gas_sensor' },
  { value: 'water_leak', category: 'water_leak_sensor' },
  { value: 'motion', category: 'motion_sensor' },
  { value: 'presence', category: 'presence_sensor' },
  { value: 'smoke', category: 'smoke_sensor' },
];

export default function SensorsSection({ rooms, devices, onDevicesChange, defaultProtocol = 'zigbee', isEditMode = false, refreshKey = 0 }: SensorsSectionProps) {
  const [sensorType, setSensorType] = useState<'gas' | 'water_leak' | 'motion' | 'presence' | 'smoke'>('gas');
  const [protocol, setProtocol] = useState<Protocol>(defaultProtocol);
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [brand, setBrand] = useState('none');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  const { fmtFor } = useOptionPrices(
    SENSOR_CATEGORIES.map(s => ({ category: s.category, protocol })),
    [protocol, refreshKey]
  );

  // Common sensor brands
  const sensorBrands = [
    'Aqara',
    'Sonoff',
    'Tuya',
    'Xiaomi',
    'Shelly',
    'Fibaro',
    'Neo Coolcam',
    'Other'
  ];

  const sensorDevices = devices.filter(d => 
    d.category === 'gas_sensor' || 
    d.category === 'water_leak_sensor' ||
    d.category === 'motion_sensor' ||
    d.category === 'presence_sensor' ||
    d.category === 'smoke_sensor'
  );

  useEffect(() => {
    setProtocol(defaultProtocol || 'zigbee');
  }, [defaultProtocol]);

  useEffect(() => {
    loadPrice();
  }, [sensorType, protocol, brand, refreshKey]);

  const loadPrice = async () => {
    let category: DeviceCategory;
    switch (sensorType) {
      case 'gas':
        category = 'gas_sensor';
        break;
      case 'water_leak':
        category = 'water_leak_sensor';
        break;
      case 'motion':
        category = 'motion_sensor';
        break;
      case 'presence':
        category = 'presence_sensor';
        break;
      case 'smoke':
        category = 'smoke_sensor';
        break;
      default:
        category = 'gas_sensor';
    }
    const price = await devicePricesApi.getPrice(category, protocol, undefined, undefined);
    setUnitPrice(price);
  };

  const handleAddSensor = async () => {
    if (quantity < 1) {
      toast({
        title: 'Validation Error',
        description: 'Quantity must be at least 1.',
        variant: 'destructive'
      });
      return;
    }

    try {
      let category: DeviceCategory;
      let sensorLabel: string;
      
      switch (sensorType) {
        case 'gas':
          category = 'gas_sensor';
          sensorLabel = 'Gas';
          break;
        case 'water_leak':
          category = 'water_leak_sensor';
          sensorLabel = 'Water Leak';
          break;
        case 'motion':
          category = 'motion_sensor';
          sensorLabel = 'Motion';
          break;
        case 'presence':
          category = 'presence_sensor';
          sensorLabel = 'Presence';
          break;
        case 'smoke':
          category = 'smoke_sensor';
          sensorLabel = 'Smoke';
          break;
        default:
          category = 'gas_sensor';
          sensorLabel = 'Gas';
      }
      
      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          
        room_id: roomId === 'unassigned' ? null : roomId,
        category,
        protocol,
        quantity,
        unit_price: unitPrice,
        vat_rate: 0
      ,
          device_name: undefined,
          
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onDevicesChange([...devices, newDevice]);
      } else {
        const device = await devicesApi.create({
        room_id: roomId === 'unassigned' ? null : roomId,
        category,
        protocol,
        quantity,
        unit_price: unitPrice,
        vat_rate: 0,
        brand: (brand && brand !== 'none') ? brand : undefined,
        model: model || undefined,
        custom_description: description || undefined
      });
        onDevicesChange([...devices, device]);
      }
      
      setQuantity(1);
      setUnitPrice(35);
      setRoomId('unassigned');
      setBrand('none');
      setModel('');
      setDescription('');
      
      toast({
        title: 'Success',
        description: `${sensorLabel} sensor added successfully.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add sensor. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      if (isEditMode) {
        onDevicesChange(devices.filter(d => d.id !== id));
      } else {
        await devicesApi.delete(id);
        onDevicesChange(devices.filter(d => d.id !== id));
      }
      toast({
        title: 'Success',
        description: 'Device deleted successfully.'
      });
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
        const updatedDevices = devices.map(d => 
          d.id === id ? { ...d, quantity: newQuantity } : d
        );
        onDevicesChange(updatedDevices);
      } else {
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

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    if (newPrice < 0) return;

    try {
      const updated = await devicesApi.update(id, { unit_price: newPrice });
      onDevicesChange(devices.map(d => d.id === id ? updated : d));
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update price.',
        variant: 'destructive'
      });
    }
  };

  const handleQuickAddDevice = async () => {
    try {
      // Get default price for gas sensor with current protocol
      const defaultPrice = await devicePricesApi.getPrice('gas_sensor', protocol);

      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          
        room_id: null,
        category: 'gas_sensor',
        protocol: protocol,
        quantity: 1,
        unit_price: defaultPrice,
        vat_rate: 0
      ,
          device_name: undefined,
          
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onDevicesChange([...devices, newDevice]);
      } else {
        const device = await devicesApi.create({
        room_id: null,
        category: 'gas_sensor',
        protocol: protocol,
        quantity: 1,
        unit_price: defaultPrice,
        vat_rate: 0
      });
        onDevicesChange([...devices, device]);
      }
      
      toast({
        title: 'Success',
        description: 'Gas sensor added successfully. You can now edit its details.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getSensorLabel = (device: Device) => {
    switch (device.category) {
      case 'gas_sensor':
        return 'Gas Sensor';
      case 'water_leak_sensor':
        return 'Water Leak Sensor';
      case 'motion_sensor':
        return 'Motion Sensor';
      case 'presence_sensor':
        return 'Presence Sensor';
      case 'smoke_sensor':
        return 'Smoke Sensor';
      default:
        return 'Sensor';
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Sensor Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Sensor</CardTitle>
          <CardDescription>Configure and add a new sensor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Sensor Type</Label>
              <Select value={sensorType} onValueChange={(v: 'gas' | 'water_leak' | 'motion' | 'presence' | 'smoke') => setSensorType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gas">{`Gas Sensor${fmtFor('gas_sensor', protocol) ? ` — ${fmtFor('gas_sensor', protocol)}` : ''}`}</SelectItem>
                  <SelectItem value="water_leak">{`Water Leak Sensor${fmtFor('water_leak_sensor', protocol) ? ` — ${fmtFor('water_leak_sensor', protocol)}` : ''}`}</SelectItem>
                  <SelectItem value="motion">{`Motion Sensor${fmtFor('motion_sensor', protocol) ? ` — ${fmtFor('motion_sensor', protocol)}` : ''}`}</SelectItem>
                  <SelectItem value="presence">{`Presence Sensor${fmtFor('presence_sensor', protocol) ? ` — ${fmtFor('presence_sensor', protocol)}` : ''}`}</SelectItem>
                  <SelectItem value="smoke">{`Smoke Sensor${fmtFor('smoke_sensor', protocol) ? ` — ${fmtFor('smoke_sensor', protocol)}` : ''}`}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={protocol} onValueChange={(v: Protocol) => setProtocol(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zigbee">Zigbee</SelectItem>
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
                  {sensorBrands.map(b => (
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
                category={sensorType === 'gas' ? 'gas_sensor' :
                         sensorType === 'water_leak' ? 'water_leak_sensor' :
                         sensorType === 'motion' ? 'motion_sensor' :
                         sensorType === 'presence' ? 'presence_sensor' :
                         'smoke_sensor'}
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

          <Button onClick={handleAddSensor} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Sensor
          </Button>
        </CardContent>
      </Card>

      {/* Sensors List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Sensors</CardTitle>
              <CardDescription>{sensorDevices.length} sensor configurations</CardDescription>
            </div>
            <Button onClick={handleQuickAddDevice} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sensorDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sensors added yet. Add your first sensor above!
            </div>
) : (
            <div className="space-y-3">
              {sensorDevices.map(device => (
                <div key={device.id} className="p-4 border border-border rounded-lg bg-card space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-center">
                    <div className="xl:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-chart-2/10 flex items-center justify-center">
                          <span className="text-chart-2 font-semibold">{device.quantity}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{getSensorLabel(device)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {device.protocol?.toUpperCase()} • EGP {device.unit_price.toFixed(2)} each
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Quantity</Label>
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
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Unit Price (EGP)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={device.unit_price}
                        onChange={(e) => handleUpdatePrice(device.id, Number.parseFloat(e.target.value) || 0)}
                        className="w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Total</Label>
                        <div className="text-lg font-semibold text-primary">
                          EGP {(device.quantity * device.unit_price).toFixed(2)}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleDeleteDevice(device.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
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
