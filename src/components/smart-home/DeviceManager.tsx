import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Zap, Radio, Droplets, Wifi, Plug, Server, Cable, Package, Shield, Monitor, Plus, Blinds } from 'lucide-react';
import type { Room, Device, Protocol } from '@/types/types';
import SwitchesSection from './device-sections/SwitchesSection';
import SmartPlugsSection from './device-sections/SmartPlugsSection';
import IRRemotesSection from './device-sections/IRRemotesSection';
import SensorsSection from './device-sections/SensorsSection';
import ValvesSection from './device-sections/ValvesSection';
import AccessControlSection from './device-sections/AccessControlSection';
import CCTVSecuritySection from './device-sections/CCTVSecuritySection';
import HubsSection from './device-sections/HubsSection';
import NetworkingSection from './device-sections/NetworkingSection';
import CablesSection from './device-sections/CablesSection';
import CustomDevicesSection from './device-sections/CustomDevicesSection';
import CentralControlSection from './device-sections/CentralControlSection';
import ShadingSection from './device-sections/ShadingSection';
import AddNewDeviceTab from './AddNewDeviceTab';

interface DeviceManagerProps {
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
}

export default function DeviceManager({ rooms, devices, onDevicesChange, isEditMode = false }: DeviceManagerProps) {
  const [activeTab, setActiveTab] = useState('switches');
  const [globalProtocol, setGlobalProtocol] = useState<Protocol>('zigbee');
  const [refreshKey, setRefreshKey] = useState(0);

  // Callback to refresh device prices when a new device is added
  const handleDeviceAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Calculate device counts per category
  const getDeviceCount = (categories: string[]) => {
    return devices.filter(d => categories.includes(d.category)).length;
  };

  const tabs = [
    { value: 'add-new', label: 'Add New Device', icon: Plus, count: null },
    { value: 'switches', label: 'Switches', icon: Zap, count: getDeviceCount(['mini_switch', 'touch_switch', 'smart_switch']) },
    { value: 'shading', label: 'Shading', icon: Blinds, count: getDeviceCount(['shutter_switch', 'mini_shutter_switch', 'smart_shutter_switch', 'touch_shutter_switch', 'curtain_switch', 'curtain_motor', 'curtain_rail', 'roller_blind_motor']) },
    { value: 'smart-plugs', label: 'Smart Plugs', icon: Plug, count: getDeviceCount(['smart_plug']) },
    { value: 'ir-remotes', label: 'IR Remotes', icon: Radio, count: getDeviceCount(['ir_remote']) },
    { value: 'sensors', label: 'Sensors', icon: Radio, count: getDeviceCount(['motion_sensor', 'door_sensor', 'water_leak_sensor', 'temperature_sensor', 'smoke_detector']) },
    { value: 'valves', label: 'Valves', icon: Droplets, count: getDeviceCount(['water_valve', 'gas_valve']) },
    { value: 'access-control', label: 'Access Control', icon: Shield, count: getDeviceCount(['smart_lock', 'fingerprint_lock', 'face_recognition', 'card_reader', 'intercom']) },
    { value: 'cctv-security', label: 'CCTV & Security', icon: Shield, count: getDeviceCount(['ip_camera', 'nvr', 'dvr', 'ptz_camera', 'doorbell_camera']) },
    { value: 'central-control', label: 'Central Control', icon: Monitor, count: getDeviceCount(['central_control_panel', 'scene_panel']) },
    { value: 'hubs', label: 'Hubs', icon: Server, count: getDeviceCount(['zigbee_hub', 'matter_hub', 'gateway']) },
    { value: 'networking', label: 'Networking', icon: Wifi, count: getDeviceCount(['router', 'switch', 'access_point', 'poe_switch', 'mesh_wifi']) },
    { value: 'cables', label: 'Cables', icon: Cable, count: getDeviceCount(['cat6_cable', 'cat6a_cable', 'fiber_cable', 'hdmi_cable', 'power_cable']) },
    { value: 'custom', label: 'Custom', icon: Package, count: getDeviceCount(['custom']) }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Device Management</CardTitle>
        <CardDescription>Add and configure your smart home devices</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1 max-w-xs">
              <Label className="text-sm font-semibold">Default Protocol for All Devices</Label>
              <Select value={globalProtocol} onValueChange={(v: Protocol) => setGlobalProtocol(v)}>
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
            <p className="text-sm text-muted-foreground flex-1">
              This protocol will be applied to all devices. You can override it for individual devices if needed.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap w-full gap-1 h-auto bg-muted p-2">
            {tabs.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value} 
                className="flex items-center gap-1.5 px-3 py-2 text-xs whitespace-nowrap"
              >
                <tab.icon className="h-3.5 w-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.count !== null && tab.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground">
                    {tab.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="add-new">
            <AddNewDeviceTab
              rooms={rooms}
              devices={devices}
              onDevicesChange={onDevicesChange}
              onDeviceAdded={handleDeviceAdded}
            />
          </TabsContent>

          <TabsContent value="switches">
            <SwitchesSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="shading">
            <ShadingSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="smart-plugs">
            <SmartPlugsSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="ir-remotes">
            <IRRemotesSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="sensors">
            <SensorsSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="valves">
            <ValvesSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="access-control">
            <AccessControlSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="cctv-security">
            <CCTVSecuritySection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="central-control">
            <CentralControlSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="hubs">
            <HubsSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="networking">
            <NetworkingSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="cables">
            <CablesSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>

          <TabsContent value="custom">
            <CustomDevicesSection 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={onDevicesChange}
              defaultProtocol={globalProtocol}
              isEditMode={isEditMode}
              refreshKey={refreshKey}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
