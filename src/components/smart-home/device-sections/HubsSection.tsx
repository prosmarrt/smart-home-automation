import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { devicesApi, devicePricesApi } from '@/db/api';
import type { Device, Room, DeviceCategory, Protocol } from '@/types/types';

interface HubsSectionProps {
  defaultProtocol?: Protocol;
  devices: Device[];
  rooms: Room[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  refreshKey?: number;
}

export default function HubsSection({
  devices,
  rooms,
  onDevicesChange,
  refreshKey = 0
}: HubsSectionProps, isEditMode = false) {
  const [hubType, setHubType] = useState<'zigbee' | 'matter'>('zigbee');
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const { toast } = useToast();

  const hubs = devices.filter(d => d.category === 'zigbee_hub' || d.category === 'matter_hub');
  const zigbeeHubs = devices.filter(d => d.category === 'zigbee_hub');
  const matterHubs = devices.filter(d => d.category === 'matter_hub');

  useEffect(() => {
    loadPrice();
  }, [hubType, refreshKey]);

  const loadPrice = async () => {
    const category: DeviceCategory = hubType === 'zigbee' ? 'zigbee_hub' : 'matter_hub';
    const protocol = hubType === 'zigbee' ? 'zigbee' : 'matter';
    const price = await devicePricesApi.getPrice(category, protocol, undefined, undefined);
    setUnitPrice(price);
  };

  const handleAdd = async () => {
    try {
      const category: DeviceCategory = hubType === 'zigbee' ? 'zigbee_hub' : 'matter_hub';
      const newDevice = await devicesApi.create({
        category,
        room_id: roomId === 'unassigned' ? null : roomId,
        protocol: hubType === 'zigbee' ? 'zigbee' : 'matter',
        quantity,
        unit_price: unitPrice,
        vat_rate: 0
      });
      onDevicesChange([...devices, newDevice]);
      setQuantity(1);
      toast({
        title: 'Success',
        description: `${hubType === 'zigbee' ? 'Zigbee' : 'Matter'} hub added successfully`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add hub',
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
        description: 'Hub updated successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update hub',
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
        description: 'Hub deleted successfully'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete hub',
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

  const handleQuickAddDevice = async (type: 'zigbee' | 'matter') => {
    try {
      const category: DeviceCategory = type === 'zigbee' ? 'zigbee_hub' : 'matter_hub';
      const protocol = type === 'zigbee' ? 'zigbee' : 'matter';
      const defaultPrice = await devicePricesApi.getPrice(category, protocol);

      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          
        room_id: null,
        category,
        protocol,
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
        category,
        protocol,
        quantity: 1,
        unit_price: defaultPrice,
        vat_rate: 0
      });
        onDevicesChange([...devices, device]);
      }
      
      toast({
        title: 'Success',
        description: `${type === 'zigbee' ? 'Zigbee' : 'Matter'} hub added successfully. You can now edit its details.`
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const renderHubList = (hubList: Device[], title: string, hubType: 'zigbee' | 'matter') => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{hubList.length} hub(s) configured</CardDescription>
          </div>
          <Button onClick={() => handleQuickAddDevice(hubType)} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {hubList.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No {title.toLowerCase()} added yet
          </div>
        ) : (
          <div className="space-y-3">
            {hubList.map(device => {
              const room = rooms.find(r => r.id === device.room_id);
              return (
                <Card key={device.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
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
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Add Hub</CardTitle>
          <CardDescription>Add Zigbee or Matter hubs for your smart home</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Hub Type</Label>
              <Select value={hubType} onValueChange={(v: 'zigbee' | 'matter') => {
                setHubType(v);
                setUnitPrice(v === 'zigbee' ? 80 : 90);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zigbee">Zigbee Hub</SelectItem>
                  <SelectItem value="matter">Matter Hub</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room (Optional)</Label>
              <Select value={roomId} onValueChange={setRoomId}>
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

          <Button onClick={handleAdd} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add {hubType === 'zigbee' ? 'Zigbee' : 'Matter'} Hub
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="zigbee" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="zigbee">Zigbee Hubs ({zigbeeHubs.length})</TabsTrigger>
          <TabsTrigger value="matter">Matter Hubs ({matterHubs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="zigbee" className="mt-4">
          {renderHubList(zigbeeHubs, 'Zigbee Hubs', 'zigbee')}
        </TabsContent>
        <TabsContent value="matter" className="mt-4">
          {renderHubList(matterHubs, 'Matter Hubs', 'matter')}
        </TabsContent>
      </Tabs>
    </div>
  );
}
