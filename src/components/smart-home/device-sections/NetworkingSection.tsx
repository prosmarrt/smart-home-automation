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
import { useOptionPrices } from '@/hooks/useOptionPrices';

interface NetworkingSectionProps {
  defaultProtocol?: Protocol;
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  refreshKey?: number;
}

export default function NetworkingSection({ rooms, devices, onDevicesChange, defaultProtocol = 'lan', isEditMode = false, refreshKey = 0 }: NetworkingSectionProps) {
  const [deviceType, setDeviceType] = useState<'access_point' | 'mesh_wifi' | 'cat6_cable' | 'bracket' | 'networking'>('access_point');
  const protocol: Protocol = 'lan'; // Network devices are wired by default
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [meshModel, setMeshModel] = useState('');
  const [accessPointBrand, setAccessPointBrand] = useState('');
  const [accessPointModel, setAccessPointModel] = useState('');
  const { toast } = useToast();

  const { fmtFor } = useOptionPrices([
    { category: 'access_point', protocol: 'lan' },
    { category: 'mesh_wifi', protocol: 'lan' },
    { category: 'cat6_cable' },
    { category: 'bracket' },
    { category: 'networking', protocol: 'lan' },
  ], [refreshKey]);

  const networkingDevices = devices.filter(d => 
    d.category === 'access_point' || d.category === 'mesh_wifi' || 
    d.category === 'cat6_cable' || d.category === 'bracket' ||
    d.category === 'networking'
  );

  useEffect(() => {
    loadPrice();
  }, [deviceType, refreshKey]);

  const loadPrice = async () => {
    const category: DeviceCategory = deviceType;
    const needsProtocol = !['cat6_cable', 'bracket'].includes(deviceType);
    const price = await devicePricesApi.getPrice(category, needsProtocol ? protocol : undefined, undefined, undefined);
    setUnitPrice(price);
  };

  const handleAddDevice = async () => {
    if (quantity < 1) {
      toast({
        title: 'Validation Error',
        description: 'Quantity must be at least 1.',
        variant: 'destructive'
      });
      return;
    }

    if (deviceType === 'mesh_wifi' && !meshModel.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a mesh Wi-Fi model.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const category: DeviceCategory = deviceType;
      
      // Prepare brand and model based on device type
      const brand = deviceType === 'access_point' ? accessPointBrand : undefined;
      const model = deviceType === 'access_point' ? accessPointModel : undefined;
      
      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          
        room_id: roomId === 'unassigned' ? null : roomId,
        category,
        protocol,
        quantity,
        unit_price: unitPrice,
        vat_rate: 0,
        mesh_model: deviceType === 'mesh_wifi' ? meshModel.trim() : undefined,
        brand: brand || undefined,
        model: model || undefined,
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
        mesh_model: deviceType === 'mesh_wifi' ? meshModel.trim() : undefined,
        brand: brand || undefined,
        model: model || undefined,
      });
        onDevicesChange([...devices, device]);
      }
      
      setQuantity(1);
      setUnitPrice(50);
      setRoomId('unassigned');
      setMeshModel('');
      setAccessPointBrand('');
      setAccessPointModel('');
      
      toast({
        title: 'Success',
        description: 'Networking device added successfully.'
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
      // Get default price for access point with current protocol
      const defaultPrice = await devicePricesApi.getPrice('access_point', protocol);

      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          
        room_id: null,
        category: 'access_point',
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
        category: 'access_point',
        protocol: protocol,
        quantity: 1,
        unit_price: defaultPrice,
        vat_rate: 0
      });
        onDevicesChange([...devices, device]);
      }
      
      toast({
        title: 'Success',
        description: 'Access point added successfully. You can now edit its details.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getDeviceLabel = (device: Device) => {
    if (device.category === 'access_point') {
      const brandModel = device.brand && device.model ? ` - ${device.brand} ${device.model}` : '';
      return `Access Point${brandModel}`;
    }
    if (device.category === 'mesh_wifi') return `Mesh Wi-Fi (${device.mesh_model})`;
    if (device.category === 'cat6_cable') return 'CAT 6 Cable (per meter)';
    if (device.category === 'bracket') return 'Bracket';
    return 'Network Device';
  };

  return (
    <div className="space-y-6">
      {/* Add Networking Device Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Networking Equipment</CardTitle>
          <CardDescription>Configure and add networking devices</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Device Type</Label>
              <Select value={deviceType} onValueChange={(v: 'access_point' | 'mesh_wifi' | 'cat6_cable' | 'bracket' | 'networking') => {
                setDeviceType(v);
                // Set default prices based on device type
                if (v === 'access_point') setUnitPrice(50);
                else if (v === 'mesh_wifi') setUnitPrice(150);
                else if (v === 'cat6_cable') setUnitPrice(2);
                else if (v === 'bracket') setUnitPrice(5);
                else if (v === 'networking') setUnitPrice(0);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="access_point">{`Access Point${fmtFor('access_point', 'lan') ? ` — ${fmtFor('access_point', 'lan')}` : ''}`}</SelectItem>
                  <SelectItem value="mesh_wifi">{`Mesh Wi-Fi System${fmtFor('mesh_wifi', 'lan') ? ` — ${fmtFor('mesh_wifi', 'lan')}` : ''}`}</SelectItem>
                  <SelectItem value="cat6_cable">{`CAT 6 Cable (per meter)${fmtFor('cat6_cable') ? ` — ${fmtFor('cat6_cable')}` : ''}`}</SelectItem>
                  <SelectItem value="bracket">{`Bracket${fmtFor('bracket') ? ` — ${fmtFor('bracket')}` : ''}`}</SelectItem>
                  <SelectItem value="networking">{`Networking (General)${fmtFor('networking', 'lan') ? ` — ${fmtFor('networking', 'lan')}` : ''}`}</SelectItem>
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
              <Label>Quantity {deviceType === 'cat6_cable' && '(meters)'}</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {deviceType === 'access_point' && (
              <>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select value={accessPointBrand} onValueChange={setAccessPointBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenda">Tenda</SelectItem>
                      <SelectItem value="tp-link">TP-Link</SelectItem>
                      <SelectItem value="mercusys">Mercusys</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    placeholder="e.g., AC10"
                    value={accessPointModel}
                    onChange={(e) => setAccessPointModel(e.target.value)}
                  />
                </div>
              </>
            )}

            {deviceType === 'mesh_wifi' && (
              <div className="space-y-2">
                <Label>Mesh Model</Label>
                <Input
                  placeholder="e.g., Google Nest WiFi"
                  value={meshModel}
                  onChange={(e) => setMeshModel(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Unit Price (EGP) {deviceType === 'cat6_cable' && '(per meter)'}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number.parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <Button onClick={handleAddDevice} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Device
          </Button>
        </CardContent>
      </Card>

      {/* Networking Devices List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Networking Equipment</CardTitle>
              <CardDescription>{networkingDevices.length} networking device configurations</CardDescription>
            </div>
            <Button onClick={handleQuickAddDevice} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Device
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {networkingDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No networking devices added yet. Add your first device above!
            </div>
          ) : (
            <div className="space-y-3">
              {networkingDevices.map(device => (
                <div key={device.id} className="p-4 border border-border rounded-lg bg-card">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-center">
                    <div className="xl:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                          <span className="text-info font-semibold">{device.quantity}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground">{getDeviceLabel(device)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {device.protocol?.toUpperCase()} • {rooms.find(r => r.id === device.room_id)?.name || 'Unassigned'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Quantity {device.category === 'cat6_cable' && '(meters)'}</Label>
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
                      <Label className="text-xs text-muted-foreground">Unit Price (EGP) {device.category === 'cat6_cable' && '(per meter)'}</Label>
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
