import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { deviceTemplatesApi, roomsApi, devicesApi } from '@/db/api';
import { toast } from 'sonner';
import { useCategoryLabels } from '@/hooks/useCategoryLabels';

import type { DeviceTemplate, Room, Protocol } from '@/types/types';

const PROTOCOL_OPTIONS: { value: Protocol; label: string }[] = [
  { value: 'zigbee', label: 'Zigbee' },
  { value: 'matter', label: 'Matter' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'knx', label: 'KNX (Wired)' },
  { value: 'wired', label: 'Wired' },
  { value: 'lan', label: 'LAN' }
];

export default function DeviceDetailsPage() {
  const { getLabel } = useCategoryLabels();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [template, setTemplate] = useState<DeviceTemplate | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [selectedGang, setSelectedGang] = useState<string>('');
  const [selectedPort, setSelectedPort] = useState<string>('');
  const [selectedCapacity, setSelectedCapacity] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) {
      toast.error('Device template ID is missing');
      navigate('/');
      return;
    }

    try {
      setLoading(true);
      const [templateData, roomsData] = await Promise.all([
        deviceTemplatesApi.getById(id),
        roomsApi.getAll()
      ]);

      if (!templateData) {
        toast.error('Device template not found');
        navigate('/');
        return;
      }

      setTemplate(templateData);
      setRooms(roomsData);
      
      // Set default values
      if (templateData.default_protocol) {
        setSelectedProtocol(templateData.default_protocol);
      }
      
      if (templateData.gang_options && templateData.gang_options.length > 0) {
        setSelectedGang(templateData.gang_options[0]);
      }
      
      if (templateData.port_options && templateData.port_options.length > 0) {
        setSelectedPort(templateData.port_options[0]);
      }
      
      if (templateData.capacity_options && templateData.capacity_options.length > 0) {
        setSelectedCapacity(templateData.capacity_options[0]);
      }
    } catch (error) {
      console.error('Error loading device details:', error);
      toast.error('Failed to load device details');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToQuotation = async () => {
    if (!template) return;

    if (!selectedRoomId) {
      toast.error('Please select a room');
      return;
    }

    if (!selectedProtocol) {
      toast.error('Please select a protocol');
      return;
    }

    if (quantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    try {
      setSaving(true);

      // Create device data based on template
      const deviceData: any = {
        room_id: selectedRoomId,
        category: template.category,
        protocol: selectedProtocol,
        quantity: quantity,
        unit_price: template.default_unit_price,
        vat_rate: 15, // Default VAT rate
        custom_name: template.name,
        custom_description: template.description || undefined
      };

      // Add optional fields based on template configuration
      if (template.supports_gangs && selectedGang) {
        deviceData.gang = selectedGang;
      }

      if (template.supports_ports && selectedPort) {
        deviceData.port_count = Number.parseInt(selectedPort);
      }

      if (template.supports_capacity && selectedCapacity) {
        deviceData.hdd_capacity = selectedCapacity;
      }

      await devicesApi.create(deviceData);

      toast.success(`${template.name} added to quotation successfully!`);
      navigate('/');
    } catch (error) {
      console.error('Error adding device to quotation:', error);
      toast.error('Failed to add device to quotation');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotal = () => {
    if (!template) return 0;
    return template.default_unit_price * quantity;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading device details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Button
        variant="ghost"
        onClick={() => navigate('/')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Home
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{template.name}</CardTitle>
              <CardDescription className="mt-2">
                {getLabel(template.category)}
                {template.brand && <span className="ml-2">• {template.brand}</span>}
              </CardDescription>
            </div>
            {template.is_system && (
              <Badge variant="secondary">System Device</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {template.description && (
            <div>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configure Device</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Room Selection */}
              <div className="space-y-2">
                <Label htmlFor="room">Room *</Label>
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger id="room">
                    <SelectValue placeholder="Select a room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.length === 0 ? (
                      <SelectItem value="no-rooms" disabled>
                        No rooms available - create one first
                      </SelectItem>
                    ) : (
                      rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Protocol Selection */}
              <div className="space-y-2">
                <Label htmlFor="protocol">Protocol *</Label>
                <Select 
                  value={selectedProtocol || ''} 
                  onValueChange={(value) => setSelectedProtocol(value as Protocol)}
                >
                  <SelectTrigger id="protocol">
                    <SelectValue placeholder="Select protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROTOCOL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                        {template.default_protocol === opt.value && ' (Default)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Gang Selection */}
              {template.supports_gangs && template.gang_options && template.gang_options.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="gang">Gang Configuration</Label>
                  <Select value={selectedGang} onValueChange={setSelectedGang}>
                    <SelectTrigger id="gang">
                      <SelectValue placeholder="Select gang" />
                    </SelectTrigger>
                    <SelectContent>
                      {template.gang_options.map((gang) => (
                        <SelectItem key={gang} value={gang}>
                          {gang} Gang
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Port Selection */}
              {template.supports_ports && template.port_options && template.port_options.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="port">Port Configuration</Label>
                  <Select value={selectedPort} onValueChange={setSelectedPort}>
                    <SelectTrigger id="port">
                      <SelectValue placeholder="Select ports" />
                    </SelectTrigger>
                    <SelectContent>
                      {template.port_options.map((port) => (
                        <SelectItem key={port} value={port}>
                          {port} Ports
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Capacity Selection */}
              {template.supports_capacity && template.capacity_options && template.capacity_options.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Select value={selectedCapacity} onValueChange={setSelectedCapacity}>
                    <SelectTrigger id="capacity">
                      <SelectValue placeholder="Select capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      {template.capacity_options.map((capacity) => (
                        <SelectItem key={capacity} value={capacity}>
                          {capacity.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quantity */}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Pricing Summary */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Pricing</h3>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Unit Price:</span>
                <span className="font-medium">${template.default_unit_price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-medium">{quantity}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-lg text-primary">
                  ${calculateTotal().toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddToQuotation}
              disabled={saving || !selectedRoomId || !selectedProtocol || rooms.length === 0}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-2" />
              {saving ? 'Adding...' : 'Add to Quotation'}
            </Button>
          </div>

          {rooms.length === 0 && (
            <p className="text-sm text-center text-muted-foreground">
              Please create at least one room before adding devices
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
