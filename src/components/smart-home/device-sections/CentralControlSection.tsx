import { useState, useEffect } from 'react';
import { Plus, Trash2, Speaker, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { devicesApi } from '@/db/api';
import type { Room, Device, Protocol } from '@/types/types';

interface CentralControlSectionProps {
  defaultProtocol?: Protocol;
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  refreshKey?: number;
}

// Alexa device types
const ALEXA_DEVICES = [
  { value: 'echo_pop', label: 'Echo Pop', description: 'Compact smart speaker' },
  { value: 'echo_dot_3', label: 'Echo Dot (3rd Gen)', description: 'Smart speaker' },
  { value: 'echo_dot_4', label: 'Echo Dot (4th Gen)', description: 'Smart speaker' },
  { value: 'echo_dot_5', label: 'Echo Dot (5th Gen)', description: 'Smart speaker with improved audio' },
  { value: 'echo_dot_clock', label: 'Echo Dot with Clock', description: 'Smart speaker with LED display' },
  { value: 'echo_show_5', label: 'Echo Show 5', description: '5.5" smart display' },
  { value: 'echo_show_8', label: 'Echo Show 8', description: '8" HD smart display' },
  { value: 'echo_show_10', label: 'Echo Show 10', description: '10.1" HD display with motion' },
  { value: 'echo_show_15', label: 'Echo Show 15', description: '15.6" Full HD wall display' },
  { value: 'echo_4', label: 'Echo (4th Gen)', description: 'Premium smart speaker' },
  { value: 'echo_studio', label: 'Echo Studio', description: 'High-fidelity speaker with 3D audio' }
];

// Control screen sizes and features
const SCREEN_SIZES = ['4"', '5"', '8"', '12"'];
const SCREEN_FEATURES = [
  { value: 'basic', label: 'Basic', description: 'WiFi only' },
  { value: 'with_amp', label: 'With Amp', description: 'Built-in amplifier' },
  { value: 'with_alexa', label: 'With Alexa', description: 'Alexa voice control' },
  { value: 'with_zigbee', label: 'With Zigbee', description: 'Built-in Zigbee hub' },
  { value: 'full_featured', label: 'Full Featured', description: 'Amp, Alexa, Zigbee, WiFi, LAN' }
];

export default function CentralControlSection({ 
  rooms, 
  devices, 
  onDevicesChange, 
  defaultProtocol = 'wifi',
  refreshKey = 0
}: CentralControlSectionProps, isEditMode = false) {
  const [activeTab, setActiveTab] = useState('alexa');
  const { toast } = useToast();

  // Alexa device state
  const [alexaDevice, setAlexaDevice] = useState<string>('echo_dot_5');
  const [alexaQuantity, setAlexaQuantity] = useState<number>(1);
  const [alexaRoomId, setAlexaRoomId] = useState<string>('unassigned');
  const [alexaPrice, setAlexaPrice] = useState<number>(0);

  // Control screen state
  const [screenSize, setScreenSize] = useState<string>('5"');
  const [screenFeature, setScreenFeature] = useState<string>('basic');
  const [screenQuantity, setScreenQuantity] = useState<number>(1);
  const [screenRoomId, setScreenRoomId] = useState<string>('unassigned');
  const [screenPrice, setScreenPrice] = useState<number>(0);
  const [screenProtocol, setScreenProtocol] = useState<Protocol>(defaultProtocol);

  const centralControlDevices = devices.filter(d => 
    d.category === 'central_control' || d.category === 'voice_assistant'
  );

  useEffect(() => {
    setScreenProtocol(defaultProtocol);
  }, [defaultProtocol]);

  const handleAddAlexaDevice = async () => {
    try {
      const selectedDevice = ALEXA_DEVICES.find(d => d.value === alexaDevice);
      const device = await devicesApi.create({
        room_id: alexaRoomId === 'unassigned' ? null : alexaRoomId,
        category: 'central_control',
        protocol: 'wifi',
        device_name: selectedDevice?.label || alexaDevice,
        config: {
          type: 'alexa',
          model: alexaDevice,
          description: selectedDevice?.description
        },
        quantity: alexaQuantity,
        unit_price: alexaPrice,
        vat_rate: 0
      });

      onDevicesChange([...devices, device]);
      
      setAlexaQuantity(1);
      setAlexaRoomId('unassigned');
      
      toast({
        title: 'Success',
        description: `${selectedDevice?.label} added successfully.`
      });
    } catch (error) {
      console.error('Error adding Alexa device:', error);
      toast({
        title: 'Error',
        description: 'Failed to add Alexa device. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleAddControlScreen = async () => {
    try {
      const selectedFeature = SCREEN_FEATURES.find(f => f.value === screenFeature);
      const deviceName = `Control Screen ${screenSize} - ${selectedFeature?.label}`;
      
      const device = await devicesApi.create({
        room_id: screenRoomId === 'unassigned' ? null : screenRoomId,
        category: 'central_control',
        protocol: screenFeature === 'full_featured' ? 'lan' : screenProtocol,
        device_name: deviceName,
        config: {
          type: 'control_screen',
          size: screenSize,
          feature: screenFeature,
          description: selectedFeature?.description
        },
        quantity: screenQuantity,
        unit_price: screenPrice,
        vat_rate: 0
      });

      onDevicesChange([...devices, device]);
      
      setScreenQuantity(1);
      setScreenRoomId('unassigned');
      
      toast({
        title: 'Success',
        description: `${deviceName} added successfully.`
      });
    } catch (error) {
      console.error('Error adding control screen:', error);
      toast({
        title: 'Error',
        description: 'Failed to add control screen. Please try again.',
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
      toast({
        title: 'Success',
        description: 'Price updated successfully.'
      });
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
      const updated = await devicesApi.update(id, { 
        room_id: newRoomId === 'unassigned' ? null : newRoomId 
      });
      onDevicesChange(devices.map(d => d.id === id ? updated : d));
      toast({
        title: 'Success',
        description: 'Room assignment updated successfully.'
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update room assignment.',
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="alexa" className="flex items-center gap-2">
            <Speaker className="h-4 w-4" />
            Alexa Devices
          </TabsTrigger>
          <TabsTrigger value="screens" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Control Screens
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alexa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Alexa Device</CardTitle>
              <CardDescription>
                Add Amazon Alexa smart speakers and displays to your smart home
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="alexa-device">Device Type</Label>
                  <Select value={alexaDevice} onValueChange={setAlexaDevice}>
                    <SelectTrigger id="alexa-device">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALEXA_DEVICES.map(device => (
                        <SelectItem key={device.value} value={device.value}>
                          {device.label} - {device.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alexa-room">Room Assignment</Label>
                  <Select value={alexaRoomId} onValueChange={setAlexaRoomId}>
                    <SelectTrigger id="alexa-room">
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
                  <Label htmlFor="alexa-quantity">Quantity</Label>
                  <Input
                    id="alexa-quantity"
                    type="number"
                    min="1"
                    value={alexaQuantity}
                    onChange={(e) => setAlexaQuantity(Number.parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alexa-price">Unit Price</Label>
                  <Input
                    id="alexa-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={alexaPrice}
                    onChange={(e) => setAlexaPrice(Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Button onClick={handleAddAlexaDevice} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Alexa Device
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screens" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Control Screen</CardTitle>
              <CardDescription>
                Add central control screens with various sizes and features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="screen-size">Screen Size</Label>
                  <Select value={screenSize} onValueChange={setScreenSize}>
                    <SelectTrigger id="screen-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCREEN_SIZES.map(size => (
                        <SelectItem key={size} value={size}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screen-feature">Features</Label>
                  <Select value={screenFeature} onValueChange={setScreenFeature}>
                    <SelectTrigger id="screen-feature">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCREEN_FEATURES.map(feature => (
                        <SelectItem key={feature.value} value={feature.value}>
                          {feature.label} - {feature.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screen-protocol">Protocol</Label>
                  <Select value={screenProtocol} onValueChange={(v) => setScreenProtocol(v as Protocol)}>
                    <SelectTrigger id="screen-protocol">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wifi">WiFi</SelectItem>
                      <SelectItem value="lan">LAN</SelectItem>
                      <SelectItem value="zigbee">Zigbee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screen-room">Room Assignment</Label>
                  <Select value={screenRoomId} onValueChange={setScreenRoomId}>
                    <SelectTrigger id="screen-room">
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
                  <Label htmlFor="screen-quantity">Quantity</Label>
                  <Input
                    id="screen-quantity"
                    type="number"
                    min="1"
                    value={screenQuantity}
                    onChange={(e) => setScreenQuantity(Number.parseInt(e.target.value) || 1)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="screen-price">Unit Price</Label>
                  <Input
                    id="screen-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={screenPrice}
                    onChange={(e) => setScreenPrice(Number.parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <Button onClick={handleAddControlScreen} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Control Screen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Display existing central control devices */}
      {centralControlDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Central Control Devices</CardTitle>
            <CardDescription>
              Manage your Alexa devices and control screens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {centralControlDevices.map(device => (
                <div
                  key={device.id}
                  className="flex flex-col gap-4 rounded-lg border border-border p-4 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      {(device.config?.type === 'alexa') ? (
                        <Speaker className="h-5 w-5 text-primary" />
                      ) : (
                        <Monitor className="h-5 w-5 text-primary" />
                      )}
                      <h4 className="font-semibold">{device.device_name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {String(device.config?.description || '')}
                    </p>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <span className="rounded-md bg-secondary px-2 py-1">
                        Protocol: {device.protocol?.toUpperCase()}
                      </span>
                      <span className="rounded-md bg-secondary px-2 py-1">
                        Room: {getRoomName(device.room_id)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 xl:flex-row xl:items-center">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Room:</Label>
                      <Select
                        value={device.room_id || 'unassigned'}
                        onValueChange={(v) => handleUpdateRoom(device.id, v)}
                      >
                        <SelectTrigger className="w-40">
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

                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Qty:</Label>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(device.id, device.quantity - 1)}
                        >
                          -
                        </Button>
                        <Input
                          type="number"
                          value={device.quantity}
                          onChange={(e) => handleUpdateQuantity(device.id, Number.parseInt(e.target.value) || 1)}
                          className="w-16 text-center"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateQuantity(device.id, device.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Price:</Label>
                      <Input
                        type="number"
                        value={device.unit_price}
                        onChange={(e) => handleUpdatePrice(device.id, Number.parseFloat(e.target.value) || 0)}
                        className="w-24"
                        step="0.01"
                      />
                    </div>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteDevice(device.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
