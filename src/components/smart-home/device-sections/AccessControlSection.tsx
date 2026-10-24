import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Lock } from 'lucide-react';
import type { Room, Device, Protocol } from '@/types/types';
import IntercomSection from './IntercomSection';
import SmartLockSection from './SmartLockSection';

interface AccessControlSectionProps {
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  isEditMode?: boolean;
  defaultProtocol?: Protocol;
  refreshKey?: number;
}

export default function AccessControlSection({ 
  rooms, 
  devices, 
  onDevicesChange,
  defaultProtocol = 'wired',
  isEditMode = false,
  refreshKey = 0
}: AccessControlSectionProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Control
          </CardTitle>
          <CardDescription>
            Manage intercom systems and smart locks for your property
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="intercom" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="intercom" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Intercom System
              </TabsTrigger>
              <TabsTrigger value="smart-locks" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Smart Locks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="intercom">
              <IntercomSection
                rooms={rooms}
                devices={devices}
                onDevicesChange={onDevicesChange}
                defaultProtocol={defaultProtocol}
                isEditMode={isEditMode}
              />
            </TabsContent>

            <TabsContent value="smart-locks">
              <SmartLockSection
                rooms={rooms}
                devices={devices}
                onDevicesChange={onDevicesChange}
                defaultProtocol={defaultProtocol}
                isEditMode={isEditMode}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
