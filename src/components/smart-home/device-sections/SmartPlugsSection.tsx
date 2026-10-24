import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';
import { ModelAutocomplete } from '@/components/ui/model-autocomplete';
import { useToast } from '@/hooks/use-toast';
import { devicesApi, devicePricesApi } from '@/db/api';
import type { Device, Protocol, Room } from '@/types/types';

interface SmartPlugsSectionProps {
  devices: Device[];
  rooms: Room[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  defaultProtocol?: Protocol;
  refreshKey?: number;
}

export default function SmartPlugsSection({
  devices,
  rooms,
  onDevicesChange,
  defaultProtocol = 'zigbee',
  refreshKey = 0
}: SmartPlugsSectionProps, isEditMode = false) {
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [protocol, setProtocol] = useState<Protocol>(defaultProtocol);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [brand, setBrand] = useState('none');
  const [model, setModel] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();

  // Common smart plug brands
  const plugBrands = [
    'Aqara',
    'Sonoff',
    'Tuya',
    'TP-Link Kasa',
    'Xiaomi',
    'Shelly',
    'Meross',
    'Gosund',
    'Other'
  ];

  const smartPlugs = devices.filter(d => d.category === 'smart_plug');

  useEffect(() => {
    setProtocol(defaultProtocol || 'zigbee');
  }, [defaultProtocol]);

  useEffect(() => {
    loadPrice();
  }, [protocol, refreshKey]);

  const loadPrice = async () => {
    const price = await devicePricesApi.getPrice('smart_plug', protocol, undefined, undefined);
    setUnitPrice(price);
  };

  const handleAdd = async () => {
    try {
      const newDevice = await devicesApi.create({
        category: 'smart_plug',
        room_id: roomId === 'unassigned' ? null : roomId,
        protocol,
        quantity,
        unit_price: unitPrice,
        vat_rate: 0,
        brand: (brand && brand !== 'none') ? brand : undefined,
        model: model || undefined,
        custom_description: description || undefined
      });
      onDevicesChange([...devices, newDevice]);
      setQuantity(1);
      setBrand('none');
      setModel('');
      setDescription('');
      toast({
        title: 'Success',
        description: 'Smart plug added successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add smart plug',
        variant: 'destructive'
      });
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Device>) => {
    try {
      const updated = await devicesApi.update(id, updates);
      onDevicesChange(devices.map(d => d.id === id ? updated : d));
      toast({
        title: 'Success',
        description: 'Smart plug updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update smart plug',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (isEditMode) {
        onDevicesChange(devices.filter(d => d.id !== id));
      } else {
        await devicesApi.delete(id);
        onDevicesChange(devices.filter(d => d.id !== id));
      }
      toast({
        title: 'Success',
        description: 'Smart plug deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete smart plug',
        variant: 'destructive'
      });
    }
  };

  const handleQuickAddDevice = async () => {
    try {
      // Get default price for smart plug with current protocol
      const defaultPrice = await devicePricesApi.getPrice('smart_plug', protocol);

      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          
        room_id: null,
        category: 'smart_plug',
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
        category: 'smart_plug',
        protocol: protocol,
        quantity: 1,
        unit_price: defaultPrice,
        vat_rate: 0
      });
        onDevicesChange([...devices, device]);
      }
      
      toast({
        title: 'Success',
        description: 'Smart plug added successfully. You can now edit its details.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plug-room">Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger id="plug-room">
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

            <div className="space-y-2">
              <Label htmlFor="plug-protocol">Protocol <span className="text-xs text-muted-foreground">(Override if needed)</span></Label>
              <Select value={protocol} onValueChange={(v: Protocol) => setProtocol(v)}>
                <SelectTrigger id="plug-protocol">
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
              <Label htmlFor="plug-quantity">Quantity</Label>
              <Input
                id="plug-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plug-price">Unit Price (EGP)</Label>
              <Input
                id="plug-price"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plug-brand">Brand (Optional)</Label>
              <Select value={brand} onValueChange={setBrand}>
                <SelectTrigger id="plug-brand">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {plugBrands.map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plug-model">Model # (Optional)</Label>
              <ModelAutocomplete
                id="plug-model"
                value={model}
                onChange={setModel}
                category="smart_plug"
                brand={brand}
                placeholder="Enter or select model number"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plug-description">Description / Notes (Optional)</Label>
            <Textarea
              id="plug-description"
              placeholder="Add any additional details or specifications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-end">
              <Button onClick={handleAdd} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Smart Plug
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {smartPlugs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm text-muted-foreground">Added Smart Plugs</h4>
            <Button onClick={handleQuickAddDevice} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
          {smartPlugs.map(device => {
            const room = rooms.find(r => r.id === device.room_id);
            return (
              <Card key={device.id}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 items-end">
                    <div className="space-y-2">
                      <Label>Room</Label>
                      <Select
                        value={device.room_id || 'unassigned'}
                        onValueChange={(v) => handleUpdate(device.id, { room_id: v === 'unassigned' ? null : v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {rooms.map(r => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Protocol</Label>
                      <Select
                        value={device.protocol || 'zigbee'}
                        onValueChange={(v: Protocol) => handleUpdate(device.id, { protocol: v })}
                      >
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
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={device.quantity}
                        onChange={(e) => handleUpdate(device.id, { quantity: Number.parseInt(e.target.value) || 1 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit Price (EGP)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={device.unit_price}
                        onChange={(e) => handleUpdate(device.id, { unit_price: Number.parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Total</Label>
                      <div className="text-lg font-semibold text-primary">
                        EGP {(device.quantity * device.unit_price).toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-end">
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDelete(device.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
