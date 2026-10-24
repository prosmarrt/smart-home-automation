import { useState, useEffect } from 'react';
import { Plus, Camera, Video, HardDrive, Network, Trash2, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { devicesApi, devicePricesApi } from '@/db/api';
import type { Device, Room, Protocol, CameraResolution, CameraType, HDDCapacity, MemoryCardCapacity, NVRChannels, WiFiCameraBrand } from '@/types/types';
import { useOptionPrices } from '@/hooks/useOptionPrices';

interface CCTVSecuritySectionProps {
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  refreshKey?: number;
}

const CAMERA_RESOLUTIONS: { value: CameraResolution; label: string }[] = [
  { value: '2mp', label: '2 MP' },
  { value: '3mp', label: '3 MP' },
  { value: '4mp', label: '4 MP' },
  { value: '6mp', label: '6 MP' }
];

const CAMERA_TYPES: { value: CameraType; label: string }[] = [
  { value: 'indoor', label: 'Indoor' },
  { value: 'outdoor', label: 'Outdoor' }
];

const NVR_CHANNELS: { value: NVRChannels; label: string }[] = [
  { value: '4ch', label: '4 Channel' },
  { value: '8ch', label: '8 Channel' },
  { value: '16ch', label: '16 Channel' }
];

const HDD_CAPACITIES: { value: HDDCapacity; label: string; price: number }[] = [
  { value: '1tb', label: '1 TB', price: 120 },
  { value: '2tb', label: '2 TB', price: 200 },
  { value: '4tb', label: '4 TB', price: 350 }
];

const MEMORY_CARD_CAPACITIES: { value: MemoryCardCapacity; label: string; price: number }[] = [
  { value: '64gb', label: '64 GB', price: 15 },
  { value: '128gb', label: '128 GB', price: 25 },
  { value: '256gb', label: '256 GB', price: 45 },
  { value: '512gb', label: '512 GB', price: 80 },
  { value: '1tb', label: '1 TB', price: 150 }
];

const SWITCH_PORTS = [
  { value: '4', label: '4 Port' },
  { value: '8', label: '8 Port' },
  { value: '16', label: '16 Port' },
  { value: '24', label: '24 Port' }
];

export default function CCTVSecuritySection({ rooms, devices, onDevicesChange, isEditMode = false, refreshKey = 0 }: CCTVSecuritySectionProps) {
  const [roomId, setRoomId] = useState<string>('');
  const [deviceType, setDeviceType] = useState<'camera' | 'wifi_camera' | 'nvr' | 'hdd' | 'memory_card' | 'network_switch' | 'cctv_security'>('camera');
  
  // Camera fields
  const [cameraResolution, setCameraResolution] = useState<CameraResolution>('2mp');
  const [cameraType, setCameraType] = useState<CameraType>('indoor');
  
  // WiFi Camera fields
  const [wifiCameraBrand, setWifiCameraBrand] = useState<WiFiCameraBrand>('ezvis');
  const [customBrand, setCustomBrand] = useState('');
  const [wifiCameraModel, setWifiCameraModel] = useState('');
  
  // NVR fields
  const [nvrChannels, setNvrChannels] = useState<NVRChannels>('4ch');
  
  // HDD fields
  const [hddCapacity, setHddCapacity] = useState<HDDCapacity>('1tb');
  
  // Memory Card fields
  const [memoryCardCapacity, setMemoryCardCapacity] = useState<MemoryCardCapacity>('64gb');
  
  // Network Switch fields
  const [switchPorts, setSwitchPorts] = useState('8');
  
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const { toast } = useToast();

  // Preload prices for device-type dropdown hints
  const { fmtFor: fmtDevice } = useOptionPrices([
    { category: 'camera', protocol: 'wired' },
    { category: 'wifi_camera', protocol: 'wifi' },
    { category: 'nvr', protocol: 'wired' },
    { category: 'network_switch', protocol: 'lan' },
  ], [refreshKey]);

  const cctvDevices = devices.filter(d => 
    d.category === 'camera' || 
    d.category === 'wifi_camera' ||
    d.category === 'nvr' || 
    d.category === 'hdd' || 
    d.category === 'memory_card' ||
    d.category === 'network_switch' ||
    d.category === 'cctv_security'
  );

  useEffect(() => {
    loadPrice();
  }, [deviceType, cameraResolution, nvrChannels, hddCapacity, memoryCardCapacity, switchPorts, wifiCameraBrand, refreshKey]);

  const loadPrice = async () => {
    let price = 0;
    
    if (deviceType === 'camera') {
      price = await devicePricesApi.getPrice('camera', 'wired', undefined, undefined);
      const resMultiplier = cameraResolution === '2mp' ? 1 : cameraResolution === '3mp' ? 1.2 : cameraResolution === '4mp' ? 1.5 : 2;
      price = (price || 150) * resMultiplier;
    } else if (deviceType === 'wifi_camera') {
      price = await devicePricesApi.getPrice('wifi_camera', 'wifi', undefined, undefined);
      price = price || 100;
    } else if (deviceType === 'nvr') {
      price = await devicePricesApi.getPrice('nvr', 'wired', undefined, undefined);
      const channelMultiplier = nvrChannels === '4ch' ? 1 : nvrChannels === '8ch' ? 1.5 : 2;
      price = (price || 300) * channelMultiplier;
    } else if (deviceType === 'hdd') {
      const hddOption = HDD_CAPACITIES.find(opt => opt.value === hddCapacity);
      price = hddOption?.price || 120;
    } else if (deviceType === 'memory_card') {
      const memoryCardOption = MEMORY_CARD_CAPACITIES.find(opt => opt.value === memoryCardCapacity);
      price = memoryCardOption?.price || 15;
    } else if (deviceType === 'network_switch') {
      price = await devicePricesApi.getPrice('network_switch', 'lan', undefined, undefined);
      const portMultiplier = Number.parseInt(switchPorts) / 8;
      price = (price || 100) * portMultiplier;
    }
    
    setUnitPrice(price);
  };

  const handleAddDevice = async () => {
    if (!roomId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a room.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const baseDevice = {
        room_id: roomId,
        quantity,
        unit_price: unitPrice,
        vat_rate: 0
      };

      let newDevice;


      if (deviceType === 'camera') {
        const deviceData = {
          ...baseDevice,
          category: 'camera' as const,
          protocol: 'wired' as Protocol,
          camera_resolution: cameraResolution,
          camera_type: cameraType
        };
        if (isEditMode) {
          newDevice = {
            id: `temp-${Date.now()}-${Math.random()}`,
            user_id: "temp",
            ...deviceData,
            device_name: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          newDevice = await devicesApi.create(deviceData);
        }
      } else if (deviceType === 'wifi_camera') {
        const brandToSave = wifiCameraBrand === 'custom' ? customBrand : wifiCameraBrand;
        
        if (!brandToSave) {
          toast({
            title: 'Validation Error',
            description: 'Please enter a brand name for the WiFi camera.',
            variant: 'destructive'
          });
          return;
        }
        
        const deviceData = {
          ...baseDevice,
          category: 'wifi_camera' as const,
          protocol: 'wifi' as Protocol,
          brand: brandToSave,
          model: wifiCameraModel || undefined,
          memory_card_capacity: memoryCardCapacity
        };
        if (isEditMode) {
          newDevice = {
            id: `temp-${Date.now()}-${Math.random()}`,
            user_id: "temp",
            ...deviceData,
            device_name: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          newDevice = await devicesApi.create(deviceData);
        }
      } else if (deviceType === 'nvr') {
        const deviceData = {
          ...baseDevice,
          category: 'nvr' as const,
          protocol: 'wired' as Protocol,
          nvr_channels: nvrChannels
        };
        if (isEditMode) {
          newDevice = {
            id: `temp-${Date.now()}-${Math.random()}`,
            user_id: "temp",
            ...deviceData,
            device_name: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          newDevice = await devicesApi.create(deviceData);
        }
      } else if (deviceType === 'hdd') {
        const deviceData = {
          ...baseDevice,
          category: 'hdd' as const,
          protocol: null,
          hdd_capacity: hddCapacity
        };
        if (isEditMode) {
          newDevice = {
            id: `temp-${Date.now()}-${Math.random()}`,
            user_id: "temp",
            ...deviceData,
            device_name: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          newDevice = await devicesApi.create(deviceData);
        }
      } else if (deviceType === 'memory_card') {
        const deviceData = {
          ...baseDevice,
          category: 'memory_card' as const,
          protocol: null,
          memory_card_capacity: memoryCardCapacity
        };
        if (isEditMode) {
          newDevice = {
            id: `temp-${Date.now()}-${Math.random()}`,
            user_id: "temp",
            ...deviceData,
            device_name: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          newDevice = await devicesApi.create(deviceData);
        }
      } else if (deviceType === 'network_switch') {
        const deviceData = {
          ...baseDevice,
          category: 'network_switch' as const,
          protocol: 'lan' as Protocol,
          port_count: Number.parseInt(switchPorts)
        };
        if (isEditMode) {
          newDevice = {
            id: `temp-${Date.now()}-${Math.random()}`,
            user_id: "temp",
            ...deviceData,
            device_name: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          newDevice = await devicesApi.create(deviceData);
        }
      } else if (deviceType === 'cctv_security') {
        const deviceData = {
          ...baseDevice,
          category: 'cctv_security' as const,
          protocol: null
        };
        if (isEditMode) {
          newDevice = {
            id: `temp-${Date.now()}-${Math.random()}`,
            user_id: "temp",
            ...deviceData,
            device_name: undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
        } else {
          newDevice = await devicesApi.create(deviceData);
        }
      }

      if (newDevice) {
        onDevicesChange([...devices, newDevice]);
        setRoomId('');
        setQuantity(1);
        
        toast({
          title: 'Success',
          description: `${getDeviceLabel(deviceType)} added successfully.`
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to add device. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    try {
      if (isEditMode) {
        onDevicesChange(devices.filter(d => d.id !== deviceId));
        toast({
          title: 'Success',
          description: 'Device deleted successfully.'
        });
      } else {
        await devicesApi.delete(deviceId);
        onDevicesChange(devices.filter(d => d.id !== deviceId));
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

  const handleUpdateQuantity = async (deviceId: string, newQuantity: number) => {
    try {
      if (isEditMode) {
        const updatedDevices = devices.map(d => 
          d.id === deviceId ? { ...d, quantity: newQuantity } : d
        );
        onDevicesChange(updatedDevices);
      } else {
        const updated = await devicesApi.update(deviceId, { quantity: newQuantity });
        onDevicesChange(devices.map(d => d.id === deviceId ? updated : d));
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      toast({
        title: 'Error',
        description: 'Failed to update quantity.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdatePrice = async (deviceId: string, newPrice: number) => {
    try {
      if (isEditMode) {
        const updatedDevices = devices.map(d => 
          d.id === deviceId ? { ...d, unit_price: newPrice } : d
        );
        onDevicesChange(updatedDevices);
      } else {
        const updated = await devicesApi.update(deviceId, { unit_price: newPrice });
        onDevicesChange(devices.map(d => d.id === deviceId ? updated : d));
      }
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

  const getDeviceLabel = (type: string) => {
    switch (type) {
      case 'camera': return 'Camera';
      case 'wifi_camera': return 'WiFi Camera';
      case 'nvr': return 'NVR';
      case 'hdd': return 'HDD';
      case 'memory_card': return 'Memory Card';
      case 'network_switch': return 'Network Switch';
      case 'cctv_security': return 'CCTV & Security';
      default: return 'Device';
    }
  };

  const getDeviceIcon = (category: string) => {
    switch (category) {
      case 'camera': return <Camera className="h-4 w-4 text-primary" />;
      case 'wifi_camera': return <Camera className="h-4 w-4 text-accent" />;
      case 'nvr': return <Video className="h-4 w-4 text-primary" />;
      case 'hdd': return <HardDrive className="h-4 w-4 text-accent" />;
      case 'memory_card': return <CreditCard className="h-4 w-4 text-secondary" />;
      case 'network_switch': return <Network className="h-4 w-4 text-info" />;
      case 'cctv_security': return <Camera className="h-4 w-4 text-primary" />;
      default: return null;
    }
  };

  const getDeviceDetails = (device: Device) => {
    if (device.category === 'camera') {
      return `${CAMERA_RESOLUTIONS.find(r => r.value === device.camera_resolution)?.label || device.camera_resolution} - ${device.camera_type}`;
    } else if (device.category === 'wifi_camera') {
      const brandLabel = device.brand || 'Unknown';
      const modelLabel = device.model ? ` - ${device.model}` : '';
      return `${brandLabel}${modelLabel}`;
    } else if (device.category === 'nvr') {
      return `${NVR_CHANNELS.find(c => c.value === device.nvr_channels)?.label || device.nvr_channels}`;
    } else if (device.category === 'hdd') {
      return `${HDD_CAPACITIES.find(h => h.value === device.hdd_capacity)?.label || device.hdd_capacity}`;
    } else if (device.category === 'memory_card') {
      return `${MEMORY_CARD_CAPACITIES.find(m => m.value === device.memory_card_capacity)?.label || device.memory_card_capacity}`;
    } else if (device.category === 'network_switch') {
      return `${device.port_count} Port`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <CardTitle>CCTV & Security</CardTitle>
          </div>
          <CardDescription>Manage cameras, NVR systems, HDD storage, and network switches</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Device Type</Label>
              <Select value={deviceType} onValueChange={(v) => setDeviceType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="camera">{`Camera${fmtDevice('camera', 'wired') ? ` — ${fmtDevice('camera', 'wired')}` : ''}`}</SelectItem>
                  <SelectItem value="wifi_camera">{`WiFi Camera${fmtDevice('wifi_camera', 'wifi') ? ` — ${fmtDevice('wifi_camera', 'wifi')}` : ''}`}</SelectItem>
                  <SelectItem value="nvr">{`NVR${fmtDevice('nvr', 'wired') ? ` — ${fmtDevice('nvr', 'wired')}` : ''}`}</SelectItem>
                  <SelectItem value="hdd">HDD</SelectItem>
                  <SelectItem value="memory_card">Memory Card</SelectItem>
                  <SelectItem value="network_switch">{`Network Switch${fmtDevice('network_switch', 'lan') ? ` — ${fmtDevice('network_switch', 'lan')}` : ''}`}</SelectItem>
                  <SelectItem value="cctv_security">CCTV & Security (General)</SelectItem>
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
                  {rooms.map(room => (
                    <SelectItem key={room.id} value={room.id}>
                      {room.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {deviceType === 'camera' && (
              <>
                <div className="space-y-2">
                  <Label>Resolution</Label>
                  <Select value={cameraResolution} onValueChange={(v) => setCameraResolution(v as CameraResolution)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_RESOLUTIONS.map(res => (
                        <SelectItem key={res.value} value={res.value}>
                          {res.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={cameraType} onValueChange={(v) => setCameraType(v as CameraType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMERA_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {deviceType === 'wifi_camera' && (
              <>
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select value={wifiCameraBrand} onValueChange={(v) => setWifiCameraBrand(v as WiFiCameraBrand)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ezvis">Ezvis</SelectItem>
                      <SelectItem value="tapo">Tapo</SelectItem>
                      <SelectItem value="tenda">Tenda</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {wifiCameraBrand === 'custom' && (
                  <div className="space-y-2">
                    <Label>Custom Brand</Label>
                    <Input
                      type="text"
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      placeholder="Enter brand name"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Model (Optional)</Label>
                  <Input
                    type="text"
                    value={wifiCameraModel}
                    onChange={(e) => setWifiCameraModel(e.target.value)}
                    placeholder="Enter model"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Memory Card Capacity</Label>
                  <Select value={memoryCardCapacity} onValueChange={(v) => setMemoryCardCapacity(v as MemoryCardCapacity)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEMORY_CARD_CAPACITIES.map(capacity => (
                        <SelectItem key={capacity.value} value={capacity.value}>
                          {capacity.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {deviceType === 'nvr' && (
              <div className="space-y-2">
                <Label>NVR Ports</Label>
                <Select value={nvrChannels} onValueChange={(v) => setNvrChannels(v as NVRChannels)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NVR_CHANNELS.map(channel => (
                      <SelectItem key={channel.value} value={channel.value}>
                        {channel.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {deviceType === 'hdd' && (
              <div className="space-y-2">
                <Label>HDD Capacity</Label>
                <Select value={hddCapacity} onValueChange={(v) => setHddCapacity(v as HDDCapacity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HDD_CAPACITIES.map(capacity => (
                      <SelectItem key={capacity.value} value={capacity.value}>
                        {capacity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {deviceType === 'memory_card' && (
              <div className="space-y-2">
                <Label>Memory Card Capacity</Label>
                <Select value={memoryCardCapacity} onValueChange={(v) => setMemoryCardCapacity(v as MemoryCardCapacity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_CARD_CAPACITIES.map(capacity => (
                      <SelectItem key={capacity.value} value={capacity.value}>
                        {capacity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {deviceType === 'network_switch' && (
              <div className="space-y-2">
                <Label>Switch Ports</Label>
                <Select value={switchPorts} onValueChange={setSwitchPorts}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SWITCH_PORTS.map(port => (
                      <SelectItem key={port.value} value={port.value}>
                        {port.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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

            <div className="space-y-2 flex items-end">
              <Button onClick={handleAddDevice} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your CCTV & Security Devices</CardTitle>
              <CardDescription>{cctvDevices.length} devices configured</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {cctvDevices.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No CCTV & Security devices added yet.</p>
          ) : (
            <div className="space-y-4">
              {cctvDevices.map(device => (
                <Card key={device.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4 items-center">
                      <div>
                        <Label className="text-xs text-muted-foreground">Device Type</Label>
                        <div className="flex items-center gap-2">
                          {getDeviceIcon(device.category)}
                          <p className="font-medium capitalize">{getDeviceLabel(device.category)}</p>
                        </div>
                      </div>

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
                        <Label className="text-xs text-muted-foreground">Details</Label>
                        <p className="font-medium">{getDeviceDetails(device)}</p>
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={device.quantity}
                          onChange={(e) => handleUpdateQuantity(device.id, Number.parseInt(e.target.value) || 1)}
                          className="w-20"
                        />
                      </div>

                      <div>
                        <Label className="text-xs text-muted-foreground">Unit Price (EGP)</Label>
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
                            EGP {(device.quantity * device.unit_price).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          onClick={() => handleDeleteDevice(device.id)}
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
