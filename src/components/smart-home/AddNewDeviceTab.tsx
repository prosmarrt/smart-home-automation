import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { devicePricesApi } from '@/db/api';
import { Plus, CheckCircle } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthContext';
import type { Room, Device, DeviceCategory, Protocol, SwitchGang } from '@/types/types';

interface AddNewDeviceTabProps {
  rooms: Room[];
  devices: Device[];
  onDevicesChange: (devices: Device[]) => void;
  onDeviceAdded?: () => void;
}

export default function AddNewDeviceTab({ rooms, devices, onDevicesChange, onDeviceAdded }: AddNewDeviceTabProps) {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [formData, setFormData] = useState({
    device_name: '',
    category: '' as DeviceCategory | '',
    protocol: 'wifi' as Protocol,
    gang: '' as SwitchGang | '',
    brand: '',
    model: '',
    unit_price: '',
    quantity: '1',
    room_name: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories: { value: DeviceCategory; label: string }[] = [
    { value: 'mini_switch', label: 'Mini Switch' },
    { value: 'touch_switch', label: 'Touch Switch' },
    { value: 'shutter_switch', label: 'Shutter Switch' },
    { value: 'smart_plug', label: 'Smart Plug' },
    { value: 'ir_remote', label: 'IR Remote' },
    { value: 'motion_sensor', label: 'Motion Sensor' },
    { value: 'gas_sensor', label: 'Gas Sensor' },
    { value: 'smart_lock', label: 'Smart Lock' },
    { value: 'intercom', label: 'Intercom' },
    { value: 'wifi_camera', label: 'Wi-Fi Camera' },
    { value: 'nvr', label: 'NVR' },
    { value: 'memory_card', label: 'Memory Card' },
    { value: 'access_point', label: 'Access Point' },
    { value: 'network_switch', label: 'Network Switch' },
    { value: 'cat6_cable', label: 'CAT6 Cable' },
    { value: 'central_control', label: 'Central Control' },
    { value: 'curtain_motor', label: 'Curtain Motor' },
    { value: 'curtain_rail', label: 'Curtain Rail' },
    { value: 'bracket', label: 'Bracket' },
    { value: 'hdd', label: 'HDD' },
    { value: 'cctv_security', label: 'CCTV & Security' },
    { value: 'networking', label: 'Networking' },
    { value: 'voice_assistant', label: 'Voice Assistant' },
    { value: 'custom_device', label: 'Custom Device' }
  ];

  const protocols: { value: Protocol; label: string }[] = [
    { value: 'zigbee', label: 'Zigbee' },
    { value: 'matter', label: 'Matter' },
    { value: 'wifi', label: 'Wi-Fi' },
    { value: 'knx', label: 'KNX (Wired)' },
    { value: 'wired', label: 'Wired' },
    { value: 'lan', label: 'LAN' }
  ];

  const gangOptions: { value: SwitchGang; label: string }[] = [
    { value: '1', label: '1 Gang' },
    { value: '2', label: '2 Gang' },
    { value: '3', label: '3 Gang' },
    { value: '4', label: '4 Gang' },
    { value: '5', label: '5 Gang' },
    { value: '6', label: '6 Gang' },
    { value: '7', label: '7 Gang' },
    { value: '8', label: '8 Gang' }
  ];

  const requiresGang = (category: DeviceCategory) => {
    return ['mini_switch', 'touch_switch'].includes(category);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.device_name || !formData.category || !formData.unit_price) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields (Name, Category, Unit Price)',
        variant: 'destructive'
      });
      return;
    }

    if (!formData.room_name) {
      toast({
        title: 'Validation Error',
        description: 'Please select a room for this device',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First, try to save the device to the device_prices table (only admins can do this)
      if (isAdmin) {
        try {
          const devicePriceData: any = {
            category: formData.category,
            protocol: formData.protocol,
            gang: formData.gang || null,
            unit_price: parseFloat(formData.unit_price),
            brand: formData.brand || null,
            model: formData.model || null,
            device_name: formData.device_name,
            description: formData.notes || null
          };

          await devicePricesApi.upsert(devicePriceData);
        } catch (priceError: any) {
          console.warn('[ADD DEVICE] Could not save device price (admin only):', priceError);
          // Continue anyway - we can still add the device to the quotation
        }
      }

      // Then, add the device to the current quotation (all users can do this)
      const roomId = rooms.find(r => r.name === formData.room_name)?.id || null;
      
      const newDevice: Device = {
        id: `temp-${Date.now()}-${Math.random()}`,
        user_id: 'temp',
        room_id: roomId,
        category: formData.category,
        protocol: formData.protocol,
        gang: formData.gang || undefined,
        device_name: formData.device_name,
        brand: formData.brand || undefined,
        model: formData.model || undefined,
        quantity: parseInt(formData.quantity) || 1,
        unit_price: parseFloat(formData.unit_price),
        vat_rate: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      onDevicesChange([...devices, newDevice]);

      toast({
        title: 'Success',
        description: `Device "${formData.device_name}" added successfully${isAdmin ? ' and saved to database' : ''}`,
        variant: 'default'
      });

      // Call the callback to refresh device lists
      if (onDeviceAdded) {
        onDeviceAdded();
      }

      // Reset form
      setFormData({
        device_name: '',
        category: '' as DeviceCategory | '',
        protocol: 'wifi',
        gang: '',
        brand: '',
        model: '',
        unit_price: '',
        quantity: '1',
        room_name: '',
        notes: ''
      });
    } catch (error: any) {
      console.error('[ADD DEVICE] Error adding device:', error);
      console.error('[ADD DEVICE] Error details:', {
        message: error.message,
        stack: error.stack,
        formData
      });
      toast({
        title: 'Error',
        description: error.message || 'Failed to add device',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add New Device
        </CardTitle>
        <CardDescription>
          Create a custom device with all specifications. {isAdmin ? 'The device will be saved to the database and immediately available in the dropdown menu for its category.' : 'The device will be added to your current quotation.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Device Name */}
            <div className="space-y-2">
              <Label htmlFor="device_name" className="text-sm font-semibold">
                Device Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="device_name"
                value={formData.device_name}
                onChange={(e) => setFormData({ ...formData, device_name: e.target.value })}
                placeholder="e.g., Smart Switch Pro"
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-semibold">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value: DeviceCategory) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Protocol */}
            <div className="space-y-2">
              <Label htmlFor="protocol" className="text-sm font-semibold">
                Protocol
              </Label>
              <Select
                value={formData.protocol}
                onValueChange={(value: Protocol) => setFormData({ ...formData, protocol: value })}
              >
                <SelectTrigger id="protocol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {protocols.map((proto) => (
                    <SelectItem key={proto.value} value={proto.value}>
                      {proto.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Gang Count (conditional) */}
            {formData.category && requiresGang(formData.category) && (
              <div className="space-y-2">
                <Label htmlFor="gang" className="text-sm font-semibold">
                  Gang Count
                </Label>
                <Select
                  value={formData.gang}
                  onValueChange={(value: SwitchGang) => setFormData({ ...formData, gang: value })}
                >
                  <SelectTrigger id="gang">
                    <SelectValue placeholder="Select gang count" />
                  </SelectTrigger>
                  <SelectContent>
                    {gangOptions.map((gang) => (
                      <SelectItem key={gang.value} value={gang.value}>
                        {gang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Brand */}
            <div className="space-y-2">
              <Label htmlFor="brand" className="text-sm font-semibold">
                Brand
              </Label>
              <Input
                id="brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g., Philips, Sonoff"
              />
            </div>

            {/* Model */}
            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm font-semibold">
                Model #
              </Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., SW-100"
              />
            </div>

            {/* Unit Price */}
            <div className="space-y-2">
              <Label htmlFor="unit_price" className="text-sm font-semibold">
                Unit Price (EGP) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity" className="text-sm font-semibold">
                Quantity
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="1"
              />
            </div>

            {/* Room Assignment */}
            <div className="space-y-2">
              <Label htmlFor="room_name" className="text-sm font-semibold">
                Room Assignment <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.room_name}
                onValueChange={(value) => setFormData({ ...formData, room_name: value })}
              >
                <SelectTrigger id="room_name">
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.length === 0 ? (
                    <SelectItem value="no-rooms" disabled>
                      No rooms available. Please add a room first.
                    </SelectItem>
                  ) : (
                    rooms.map((room) => (
                      <SelectItem key={room.id} value={room.name}>
                        {room.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-semibold">
              Notes / Description
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes or specifications..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-4 pt-4 border-t">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.device_name || !formData.category || !formData.unit_price || !formData.room_name}
              className="min-w-[200px]"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Adding Device...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Add Device to Quotation
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
