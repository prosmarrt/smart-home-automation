import { useState, useEffect } from 'react';
import { Plus, Cable, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { devicesApi, devicePricesApi } from '@/db/api';
import type { Device, Room } from '@/types/types';

interface CablesSectionProps {
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  refreshKey?: number;
}

export default function CablesSection({ rooms, devices, onDevicesChange, isEditMode = false, refreshKey = 0 }: CablesSectionProps) {
  const [roomId, setRoomId] = useState<string>('');
  const [cableLength, setCableLength] = useState(10);
  const [pricePerMeter, setPricePerMeter] = useState(0);
  const { toast } = useToast();

  const cableDevices = devices.filter(d => d.category === 'cat6_cable');

  useEffect(() => {
    loadPrice();
  }, [refreshKey]);

  const loadPrice = async () => {
    const price = await devicePricesApi.getPrice('cat6_cable', undefined, undefined, undefined);
    setPricePerMeter(price);
  };

  const handleAddCable = async () => {
    if (!roomId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a room for the CAT6 cable.',
        variant: 'destructive'
      });
      return;
    }

    if (cableLength <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Cable length must be greater than 0.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const newDevice = await devicesApi.create({
        room_id: roomId,
        category: 'cat6_cable',
        protocol: null,
        quantity: 1,
        unit_price: pricePerMeter,
        vat_rate: 0,
        cable_length: cableLength
      });

      onDevicesChange([...devices, newDevice]);
      setRoomId('');
      setCableLength(10);
      setPricePerMeter(5);

      toast({
        title: 'Success',
        description: 'CAT6 cable added successfully.'
      });
    } catch (error) {
      console.error('Error adding cable:', error);
      toast({
        title: 'Error',
        description: 'Failed to add cable. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteCable = async (deviceId: string) => {
    try {
      if (!isEditMode) {
        await devicesApi.delete(deviceId);
      }
      onDevicesChange(devices.filter(d => d.id !== deviceId));
      toast({
        title: 'Success',
        description: 'Cable deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting cable:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete cable. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateLength = async (deviceId: string, newLength: number) => {
    try {
      const updated = await devicesApi.update(deviceId, { cable_length: newLength });
      onDevicesChange(devices.map(d => d.id === deviceId ? updated : d));
    } catch (error) {
      console.error('Error updating length:', error);
      toast({
        title: 'Error',
        description: 'Failed to update cable length.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdatePrice = async (deviceId: string, newPrice: number) => {
    try {
      const updated = await devicesApi.update(deviceId, { unit_price: newPrice });
      onDevicesChange(devices.map(d => d.id === deviceId ? updated : d));
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
      // Get default price for CAT6 cable
      const defaultPrice = await devicePricesApi.getPrice('cat6_cable', undefined, undefined, undefined);

      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          
        room_id: null,
        category: 'cat6_cable',
        protocol: null,
        quantity: 10, // Default 10 meters
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
        category: 'cat6_cable',
        protocol: null,
        quantity: 10, // Default 10 meters
        unit_price: defaultPrice,
        vat_rate: 0
      });
        onDevicesChange([...devices, device]);
      }
      
      toast({
        title: 'Success',
        description: 'CAT6 cable added successfully. You can now edit its details.'
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
            <Cable className="h-5 w-5 text-primary" />
            <CardTitle>CAT6 Network Cables</CardTitle>
          </div>
          <CardDescription>Add CAT6 cables with per-meter pricing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Room</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Length (meters)</Label>
              <Input
                type="number"
                min="1"
                step="0.1"
                value={cableLength}
                onChange={(e) => setCableLength(Number.parseFloat(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label>Price per Meter (EGP)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={pricePerMeter}
                onChange={(e) => setPricePerMeter(Number.parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2 flex items-end">
              <Button onClick={handleAddCable} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Cable
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Total Cost:</strong> EGP {(cableLength * pricePerMeter).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your CAT6 Cables</CardTitle>
              <CardDescription>{cableDevices.length} cable installations</CardDescription>
            </div>
            <Button onClick={handleQuickAddDevice} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {cableDevices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No cables added yet.</p>
          ) : (
            <div className="space-y-4">
              {cableDevices.map(device => (
                <Card key={device.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-center">
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
                        <Label className="text-xs text-muted-foreground">Length (meters)</Label>
                        <Input
                          type="number"
                          min="1"
                          step="0.1"
                          value={device.cable_length || 0}
                          onChange={(e) => handleUpdateLength(device.id, Number.parseFloat(e.target.value) || 1)}
                          className="w-24"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Price/Meter (EGP)</Label>
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
                            EGP {((device.cable_length || 0) * device.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteCable(device.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
