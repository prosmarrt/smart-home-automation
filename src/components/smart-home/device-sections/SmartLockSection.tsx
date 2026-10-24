import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { devicesApi, devicePricesApi } from '@/db/api';
import { Device, Room, SmartLockBrand, Protocol } from '@/types/types';
import { toast } from 'sonner';

interface SmartLockSectionProps {
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  defaultProtocol?: Protocol;
  isEditMode?: boolean;
}

const SMART_LOCK_MODELS: Record<SmartLockBrand, string[]> = {
  lezn: ['Smart Lock Pro', 'Smart Lock Basic', 'Smart Lock Premium', 'Smart Lock Elite'],
  philips: ['EasyKey', 'DDL702', 'DDL303', '7300 Series', '8000 Series'],
  emaks_prime: ['Prime Lock 1', 'Prime Lock 2', 'Prime Lock 3', 'Prime Lock Pro'],
  other: ['Generic Model 1', 'Generic Model 2', 'Generic Model 3', 'Custom Model'],
  custom: [], // Custom brand allows free-text model input
};

export default function SmartLockSection({ 
  rooms, 
  devices, 
  onDevicesChange,
  defaultProtocol = 'wifi',
  isEditMode = false
}: SmartLockSectionProps) {
  const [brand, setBrand] = useState<SmartLockBrand>('lezn');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [protocol, setProtocol] = useState<Protocol>(defaultProtocol);
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [roomId, setRoomId] = useState<string>('unassigned');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const smartLockDevices = devices.filter(d => d.category === 'smart_lock');

  useEffect(() => {
    setProtocol(defaultProtocol || 'wifi');
  }, [defaultProtocol]);

  useEffect(() => {
    const models = SMART_LOCK_MODELS[brand];
    if (models && models.length > 0) {
      setModel(models[0]);
    } else {
      setModel('');
    }
    // Reset custom fields when brand changes
    if (brand !== 'custom') {
      setCustomBrand('');
    }
    setCustomModel('');
  }, [brand]);

  const handleAdd = async () => {
    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    // Determine the actual brand and model to save
    const brandToSave = brand === 'custom' ? customBrand : brand;
    // If customModel has value, use it; otherwise use preset model
    const modelToSave = customModel || model;

    if (!brandToSave) {
      toast.error('Please enter a brand name');
      return;
    }

    if (!modelToSave) {
      toast.error('Please enter a model name');
      return;
    }

    try {
      if (isEditMode) {
        const newDevice: Device = {
          id: `temp-${Date.now()}-${Math.random()}`,
          user_id: "temp",
          room_id: roomId === 'unassigned' ? null : roomId,
          category: 'smart_lock',
          protocol,
          quantity,
          unit_price: unitPrice,
          vat_rate: 0,
          brand: brandToSave,
          model: modelToSave,
          device_name: undefined,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onDevicesChange([...devices, newDevice]);
      } else {
        const device = await devicesApi.create({
          room_id: roomId === 'unassigned' ? null : roomId,
          category: 'smart_lock',
          protocol,
          quantity,
          unit_price: unitPrice,
          vat_rate: 0,
          brand: brandToSave,
          model: modelToSave,
        });
        onDevicesChange([...devices, device]);
      }
      
      toast.success('Smart lock added successfully');
      setQuantity(1);
      setRoomId('unassigned');
      setCustomBrand('');
      setCustomModel('');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to add smart lock';
      toast.error(`Failed to add smart lock: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      if (isEditMode) {
        onDevicesChange(devices.filter(d => d.id !== id));
        toast.success('Smart lock deleted');
      } else {
        await devicesApi.delete(id);
        onDevicesChange(devices.filter(d => d.id !== id));
        toast.success('Smart lock deleted');
      }
    } catch (error) {
      toast.error('Failed to delete smart lock');
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
        const updatedDevices = devices.map(d => 
          d.id === deviceId ? { ...d, device_name: editingName || undefined } : d
        );
        onDevicesChange(updatedDevices);
        toast.success('Device name updated');
      } else {
        const updated = await devicesApi.update(deviceId, { device_name: editingName || undefined });
        onDevicesChange(devices.map(d => d.id === deviceId ? updated : d));
        toast.success('Device name updated');
      }
      setEditingId(null);
      setEditingName('');
    } catch (error) {
      toast.error('Failed to update device name');
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
      toast.error('Failed to update quantity');
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
      toast.error('Failed to update price');
    }
  };

  const handleUpdateRoom = async (id: string, newRoomId: string) => {
    try {
      if (isEditMode) {
        const updatedDevices = devices.map(d => 
          d.id === id ? { ...d, room_id: newRoomId === 'unassigned' ? null : newRoomId } : d
        );
        onDevicesChange(updatedDevices);
        toast.success('Room updated successfully');
      } else {
        const updated = await devicesApi.update(id, { room_id: newRoomId === 'unassigned' ? null : newRoomId });
        onDevicesChange(devices.map(d => d.id === id ? updated : d));
        toast.success('Room updated successfully');
      }
    } catch (error) {
      toast.error('Failed to update room');
    }
  };

  const getBrandLabel = (brandValue: string) => {
    const labels: Record<string, string> = {
      lezn: 'LEZN',
      philips: 'PHILIPS',
      emaks_prime: 'EMAKS PRIME',
      other: 'OTHER',
    };
    return labels[brandValue] || brandValue;
  };

  const getProtocolLabel = (protocolValue: string) => {
    const labels: Record<string, string> = {
      zigbee: 'Zigbee',
      matter: 'Matter',
      wifi: 'Wi-Fi',
    };
    return labels[protocolValue] || protocolValue;
  };

  return (
    <div className="space-y-6">
      {/* Add Smart Lock Form */}
      <Card>
        <CardHeader>
          <CardTitle>Add Smart Lock</CardTitle>
          <CardDescription>Add smart locks to secure your property</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="smart-lock-brand">Brand</Label>
              <Select value={brand} onValueChange={(value) => setBrand(value as SmartLockBrand)}>
                <SelectTrigger id="smart-lock-brand">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lezn">LEZN</SelectItem>
                  <SelectItem value="philips">PHILIPS</SelectItem>
                  <SelectItem value="emaks_prime">EMAKS PRIME</SelectItem>
                  <SelectItem value="other">OTHER</SelectItem>
                  <SelectItem value="custom">CUSTOM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {brand === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="custom-brand">Custom Brand</Label>
                <Input
                  id="custom-brand"
                  type="text"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  placeholder="Enter brand name"
                />
              </div>
            )}

            {brand !== 'custom' && SMART_LOCK_MODELS[brand].length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="smart-lock-model">Model (Preset)</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="smart-lock-model">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {SMART_LOCK_MODELS[brand].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="custom-model">Custom Model</Label>
              <Input
                id="custom-model"
                type="text"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Enter custom model"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smart-lock-protocol">Protocol</Label>
              <Select value={protocol} onValueChange={(value) => setProtocol(value as Protocol)}>
                <SelectTrigger id="smart-lock-protocol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zigbee">Zigbee</SelectItem>
                  <SelectItem value="matter">Matter</SelectItem>
                  <SelectItem value="wifi">Wi-Fi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="smart-lock-quantity">Quantity</Label>
              <Input
                id="smart-lock-quantity"
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smart-lock-room">Room (Optional)</Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger id="smart-lock-room">
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
              <Label htmlFor="smart-lock-price">Price (per unit)</Label>
              <Input
                id="smart-lock-price"
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Number.parseFloat(e.target.value) || 0)}
                placeholder="Enter price"
              />
            </div>
          </div>

          <Button onClick={handleAdd} className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Smart Lock
          </Button>
        </CardContent>
      </Card>

      {/* Smart Locks List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Smart Locks</CardTitle>
          <CardDescription>{smartLockDevices.length} smart lock{smartLockDevices.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent>
          {smartLockDevices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No smart locks added yet. Add your first smart lock above!
            </div>
          ) : (
            <div className="space-y-3">
              {smartLockDevices.map((device) => (
                <div key={device.id} className="p-4 border border-border rounded-lg bg-card">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-center">
                    <div className="xl:col-span-2">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-chart-5/10 flex items-center justify-center">
                          <span className="text-chart-5 font-semibold">{device.quantity}</span>
                        </div>
                        <div>
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
                                {device.device_name || `${getBrandLabel(device.brand || '')} ${device.model || 'Smart Lock'}`}
                              </h4>
                              <Button size="sm" variant="ghost" onClick={() => startEditing(device)}>
                                <Edit2 className="w-3 h-3" />
                              </Button>
                            </div>
                          )}
                          <p className="text-sm text-muted-foreground">
                            {getBrandLabel(device.brand || '')} {device.model} • {getProtocolLabel(device.protocol || '')} • {rooms.find(r => r.id === device.room_id)?.name || 'Unassigned'}
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
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(device.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Room Assignment */}
                  <div className="pt-3 border-t border-border mt-3">
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
                            <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
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
