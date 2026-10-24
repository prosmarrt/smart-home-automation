import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Wifi, Zap, Radio, Home } from 'lucide-react';
import type { Device, Room, DeviceSummary } from '@/types/types';

interface SummaryDashboardProps {
  devices: Device[];
  rooms: Room[];
}

export default function SummaryDashboard({ devices, rooms }: SummaryDashboardProps) {
  const summary: DeviceSummary = useMemo(() => {
    const totalDevices = devices.reduce((sum, d) => sum + d.quantity, 0);
    
    const switchCategories = ['mini_switch', 'touch_switch', 'shutter_switch', 'smart_shutter_switch'];
    const totalSwitches = devices
      .filter(d => switchCategories.includes(d.category))
      .reduce((sum, d) => sum + d.quantity, 0);
    
    const sensorCategories = ['gas_sensor', 'water_leak_sensor', 'motion_sensor', 'presence_sensor', 'smoke_sensor'];
    const totalSensors = devices
      .filter(d => sensorCategories.includes(d.category))
      .reduce((sum, d) => sum + d.quantity, 0);
    
    const protocolBreakdown = {
      zigbee: devices.filter(d => d.protocol === 'zigbee').reduce((sum, d) => sum + d.quantity, 0),
      matter: devices.filter(d => d.protocol === 'matter').reduce((sum, d) => sum + d.quantity, 0),
      wifi: devices.filter(d => d.protocol === 'wifi').reduce((sum, d) => sum + d.quantity, 0)
    };
    
    const categoryTotals = devices.reduce((acc, d) => {
      acc[d.category] = (acc[d.category] || 0) + d.quantity;
      return acc;
    }, {} as { [key: string]: number });
    
    const roomDeviceCounts = devices.reduce((acc, d) => {
      if (d.room_id) {
        acc[d.room_id] = (acc[d.room_id] || 0) + d.quantity;
      }
      return acc;
    }, {} as { [key: string]: number });
    
    return {
      totalDevices,
      totalSwitches,
      totalSensors,
      protocolBreakdown,
      categoryTotals,
      roomDeviceCounts
    };
  }, [devices]);

  const stats = [
    {
      title: 'Total Devices',
      value: summary.totalDevices,
      icon: Activity,
      color: 'text-primary'
    },
    {
      title: 'Total Switches',
      value: summary.totalSwitches,
      icon: Zap,
      color: 'text-accent'
    },
    {
      title: 'Total Sensors',
      value: summary.totalSensors,
      icon: Radio,
      color: 'text-chart-2'
    },
    {
      title: 'Total Rooms',
      value: rooms.length,
      icon: Home,
      color: 'text-chart-3'
    }
  ];

  return (
    <div className="mb-4 sm:mb-8">
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 sm:mb-4">Dashboard Overview</h2>
      
      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="w-full">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl sm:text-3xl font-bold text-foreground mt-1 sm:mt-2">{stat.value}</p>
                </div>
                <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary flex items-center justify-center ${stat.color} flex-shrink-0`}>
                  <stat.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Protocol Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Protocol Distribution</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Devices grouped by communication protocol</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-secondary">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Wifi className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Zigbee</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{summary.protocolBreakdown.zigbee}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-secondary">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Radio className="h-5 w-5 sm:h-6 sm:w-6 text-accent" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Matter</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{summary.protocolBreakdown.matter}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg bg-secondary">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-chart-2/10 flex items-center justify-center flex-shrink-0">
                <Wifi className="h-5 w-5 sm:h-6 sm:w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Wi-Fi</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground">{summary.protocolBreakdown.wifi}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
