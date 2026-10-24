import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { devicesApi, devicePricesApi } from '@/db/api';
import type { Room, Device, Protocol, DeviceCategory } from '@/types/types';

interface ValvesSectionProps {
  defaultProtocol?: Protocol;
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  refreshKey?: number;
}

export default function ValvesSection({ rooms, devices, onDevicesChange, defaultProtocol = 'zigbee', isEditMode = false, refreshKey = 0 }: ValvesSectionProps) {
  const [valveType, setValveType] = useState<'gas' | 'water'>('gas');
  const [protocol, setProtocol] = useState<Protocol>(defaultProtocol);
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const { toast } = useToast();

  const valveDevices = devices.filter(d => 
    d.category === 'gas_valve' || d.category === 'water_valve'
  );

  useEffect(() => {
    setProtocol(defaultProtocol || 'zigbee');
  }, [defaultProtocol]);

  useEffect(() => {
    loadPrice();
  }, [valveType, protocol, refreshKey]);

  const loadPrice = async () => {
    const category: DeviceCategory = valveType === 'gas' ? 'gas_valve' : 'water_valve';
    const price = await devicePricesApi.getPrice(category, protocol, undefined, undefined);
    setUnitPrice(price);
  };

  const handleAddValve = async () => {
    if (quantity < 1) {
      toast({
        title: 'Validation Error',
        description: 'Quantity must be at least 1.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const category: DeviceCategory = valveType === 'gas' ? 'gas_valve' : 'water_valve';
      
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
        vat_rate: 0
      });
        onDevicesChange([...devices, device]);
      }
      
      setQuantity(1);
      setUnitPrice(60);
      setRoomId('unassigned');
      
      toast({
        title: 'Success',
        description: `${valveType === 'gas' ? 'Gas' : 'Water'} valve added successfully.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add valve. Please try again.',
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
      // Get default price for gas valve with current protocol
      const defaultPrice = await devicePricesApi.getPrice('gas_valve', protocol);

      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          
        room_id: null,
        category: 'gas_valve',
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
        category: 'gas_valve',
        protocol: protocol,
        quantity: 1,
        unit_price: defaultPrice,
        vat_rate: 0
      });
        onDevicesChange([...devices, device]);
      }
      
      toast({
        title: 'Success',
        description: 'Gas valve added successfully. You can now edit its details.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getValveLabel = (device: Device) => {
    return device.category === 'gas_valve' ? 'Gas Valve' : 'Water Valve';
  };

  return (
    <div className="space-y-6">
      {/* Add Valve Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Smart Valve</CardTitle>
          <CardDescription>Configure and add a new smart valve</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Valve Type</Label>
              <Select value={valveType} onValueChange={(v: 'gas' | 'water') => setValveType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gas">Gas Valve</SelectItem>
                  <SelectItem value="water">Water Valve</SelectItem>
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
          </div>

          <Button onClick={handleAddValve} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Valve
          </Button>
        </CardContent>
      </Card>

      {/* Valves List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Smart Valves</CardTitle>
              <CardDescription>{valveDevices.length} valve configurations</CardDescription>
            </div>
            <Button onClick={handleQuickAddDevice} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {valveDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No valves added yet. Add your first valve above!
            </div>
          ) : (
            <div className="space-y-3">
              {valveDevices.map(device => (
                <div key={device.id} className="p-4 border border-border rounded-lg bg-card space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-center">
                    <div className="xl:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-chart-3/10 flex items-center justify-center">
                          <span className="text-chart-3 font-semibold">{device.quantity}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{getValveLabel(device)}</h4>
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
