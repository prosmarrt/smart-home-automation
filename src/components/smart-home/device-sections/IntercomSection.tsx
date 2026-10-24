import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { devicesApi, devicePricesApi } from '@/db/api';
import type { Room, Device, Protocol, IntercomType } from '@/types/types';

interface IntercomSectionProps {
  defaultProtocol?: Protocol;
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
}

export default function IntercomSection({ rooms, devices, onDevicesChange, defaultProtocol = 'wired', isEditMode = false }: IntercomSectionProps) {
  const [intercomType, setIntercomType] = useState<IntercomType>('doorbell');
  const [quantity, setQuantity] = useState<number>(1);
  const [protocol, setProtocol] = useState<Protocol>(defaultProtocol);
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [unitPrice, setUnitPrice] = useState(0);
  const { toast } = useToast();

  const intercomDevices = devices.filter(d => d.category === 'intercom');

  useEffect(() => {
    setProtocol(defaultProtocol || 'wired');
  }, [defaultProtocol]);

  useEffect(() => {
    loadPrice();
  }, [intercomType, protocol]);

  const loadPrice = async () => {
    const price = await devicePricesApi.getPrice('intercom', protocol, undefined, intercomType);
    setUnitPrice(price);
  };

  const handleAddIntercom = async () => {
    try {
      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          room_id: roomId === 'unassigned' ? null : roomId,
          category: 'intercom',
          protocol,
          intercom_type: intercomType,
          quantity,
          unit_price: unitPrice,
          vat_rate: 0,
          device_name: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onDevicesChange([...devices, newDevice]);
      } else {
        const device = await devicesApi.create({
          room_id: roomId === 'unassigned' ? null : roomId,
          category: 'intercom',
          protocol,
          intercom_type: intercomType,
          quantity,
          unit_price: unitPrice,
          vat_rate: 0
        });
        onDevicesChange([...devices, device]);
      }
      
      setQuantity(1);
      setRoomId('unassigned');
      
      toast({
        title: 'Success',
        description: `${intercomType === 'doorbell' ? 'Doorbell' : 'Indoor Station'} added successfully.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add intercom device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDevice = async (id: string) => {
    try {
      if (isEditMode) {
        onDevicesChange(devices.filter(d => d.id !== id));
        toast({
          title: 'Success',
          description: 'Device deleted successfully.'
        });
      } else {
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
      if (isEditMode) {
        const updatedDevices = devices.map(d => 
          d.id === id ? { ...d, unit_price: newPrice } : d
        );
        onDevicesChange(updatedDevices);
      } else {
        const updated = await devicesApi.update(id, { unit_price: newPrice });
        onDevicesChange(devices.map(d => d.id === id ? updated : d));
      }
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
        toast({
          title: 'Success',
          description: 'Room updated successfully.',
        });
      } else {
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

  const handleQuickAddDevice = async () => {
    try {
      // Get default price for doorbell intercom with current protocol
      const defaultPrice = await devicePricesApi.getPrice('intercom', protocol, undefined, 'doorbell');

      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          room_id: null,
          category: 'intercom',
          protocol: protocol,
          quantity: 1,
          unit_price: defaultPrice,
          vat_rate: 0,
          intercom_type: 'doorbell',
          device_name: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onDevicesChange([...devices, newDevice]);
      } else {
        const device = await devicesApi.create({
          room_id: null,
          category: 'intercom',
          protocol: protocol,
          quantity: 1,
          unit_price: defaultPrice,
          vat_rate: 0,
          intercom_type: 'doorbell'
        });
        onDevicesChange([...devices, device]);
      }
      
      toast({
        title: 'Success',
        description: 'Doorbell intercom added successfully. You can now edit its details.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getIntercomTypeLabel = (type?: IntercomType) => {
    if (!type) return 'Intercom';
    return type === 'doorbell' ? 'Doorbell' : 'Indoor Station';
  };

  return (
    <div className="space-y-6">
      {/* Add Intercom Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Intercom Device</CardTitle>
          <CardDescription>Add doorbell or indoor station to your intercom system</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Intercom Type</Label>
              <Select value={intercomType} onValueChange={(v: IntercomType) => setIntercomType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="doorbell">Doorbell</SelectItem>
                  <SelectItem value="indoor_station">Indoor Station</SelectItem>
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
              <Label>Protocol</Label>
              <Select value={protocol} onValueChange={(v: Protocol) => setProtocol(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wired">Wired</SelectItem>
                  <SelectItem value="lan">LAN</SelectItem>
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

          <Button onClick={handleAddIntercom} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add {getIntercomTypeLabel(intercomType)}
          </Button>
        </CardContent>
      </Card>

      {/* Intercom Devices List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Intercom Devices</CardTitle>
              <CardDescription>{intercomDevices.length} intercom device{intercomDevices.length !== 1 ? 's' : ''}</CardDescription>
            </div>
            <Button onClick={handleQuickAddDevice} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {intercomDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No intercom devices added yet. Add your first device above!
            </div>
          ) : (
            <div className="space-y-3">
              {intercomDevices.map(device => (
                <div key={device.id} className="p-4 border border-border rounded-lg bg-card">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-center">
                    <div className="xl:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                          <span className="text-chart-4 font-semibold">{device.quantity}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{getIntercomTypeLabel(device.intercom_type)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {device.protocol?.toUpperCase()} • {rooms.find(r => r.id === device.room_id)?.name || 'Unassigned'}
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

                  {/* Room Assignment */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground min-w-[60px]">Room:</Label>
                      <Select
                        value={device.room_id || 'unassigned'}
                        onValueChange={(value) => handleUpdateRoom(device.id, value)}
                      >
                        <SelectTrigger className="h-8 w-[200px]">
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
