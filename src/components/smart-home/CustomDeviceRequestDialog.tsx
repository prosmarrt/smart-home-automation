import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, FileText } from 'lucide-react';
import type { Protocol } from '@/types/types';

interface CustomDeviceRequestForm {
  // Core Device Identification
  deviceType: string;
  manufacturer: string;
  modelNumber: string;
  
  // Communication Protocol
  protocol: Protocol | '';
  
  // Database Integration
  addToDatabase: boolean;
  standardPrice: string;
  installationPrice: string;
  
  // Device-Specific Configuration
  numberOfGangs: string;
  numberOfPorts: string;
  technicalParameters: string;
  
  // Additional Information
  additionalNotes: string;
}

const emptyForm: CustomDeviceRequestForm = {
  deviceType: '',
  manufacturer: '',
  modelNumber: '',
  protocol: '',
  addToDatabase: true,
  standardPrice: '',
  installationPrice: '',
  numberOfGangs: '',
  numberOfPorts: '',
  technicalParameters: '',
  additionalNotes: '',
};

const PROTOCOL_OPTIONS: { value: Protocol; label: string }[] = [
  { value: 'zigbee', label: 'Zigbee' },
  { value: 'matter', label: 'Matter' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'knx', label: 'KNX (Wired)' },
  { value: 'wired', label: 'Wired' },
  { value: 'lan', label: 'LAN' },
];

interface CustomDeviceRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (formData: CustomDeviceRequestForm) => void;
}

export default function CustomDeviceRequestDialog({
  open,
  onOpenChange,
  onSubmit,
}: CustomDeviceRequestDialogProps) {
  const [formData, setFormData] = useState<CustomDeviceRequestForm>(emptyForm);

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.deviceType || !formData.manufacturer || !formData.modelNumber || !formData.protocol) {
      alert('Please fill in all required fields marked with *');
      return;
    }

    onSubmit(formData);
    setFormData(emptyForm);
    onOpenChange(false);
  };

  const handleCancel = () => {
    setFormData(emptyForm);
    onOpenChange(false);
  };

  const generateRequestSummary = () => {
    return `
CUSTOM DEVICE CONFIGURATION REQUEST

1. CORE DEVICE IDENTIFICATION:
   - Device Type/Common Name: ${formData.deviceType || '[Not specified]'}
   - Manufacturer: ${formData.manufacturer || '[Not specified]'}
   - Model Number: ${formData.modelNumber || '[Not specified]'}

2. COMMUNICATION PROTOCOL:
   - Primary Protocol: ${formData.protocol ? PROTOCOL_OPTIONS.find(p => p.value === formData.protocol)?.label : '[Not specified]'}

3. DATABASE INTEGRATION REQUEST:
   - Add to Master Database: ${formData.addToDatabase ? 'Yes' : 'No'}
   ${formData.addToDatabase ? `- Standard Price: ${formData.standardPrice || '[Not specified]'}
   - Installation Price: ${formData.installationPrice || '[Not specified]'}` : ''}

4. DEVICE-SPECIFIC CONFIGURATION:
   - Number of Gangs/Points: ${formData.numberOfGangs || '[Not applicable]'}
   - Number of Ports: ${formData.numberOfPorts || '[Not applicable]'}
   - Technical Parameters: ${formData.technicalParameters || '[Not specified]'}

5. ADDITIONAL NOTES:
   ${formData.additionalNotes || '[None]'}

---
Request generated on: ${new Date().toLocaleString()}
    `.trim();
  };

  const copyToClipboard = () => {
    const summary = generateRequestSummary();
    navigator.clipboard.writeText(summary);
    alert('Request summary copied to clipboard!');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Custom Device Configuration Request</DialogTitle>
          <DialogDescription>
            Provide comprehensive information for adding a custom device to the system
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please fill in all required fields marked with * to ensure proper device setup and integration.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Section 1: Core Device Identification */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Core Device Identification</CardTitle>
              <CardDescription>Basic information about the device</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deviceType">Device Type/Common Name *</Label>
                <Input
                  id="deviceType"
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  placeholder="e.g., 2-Gang Smart Dimmer Switch, 8-Port POE NVR"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="manufacturer">Manufacturer *</Label>
                  <Input
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    placeholder="e.g., Manufacturer XYZ"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelNumber">Model Number *</Label>
                  <Input
                    id="modelNumber"
                    value={formData.modelNumber}
                    onChange={(e) => setFormData({ ...formData, modelNumber: e.target.value })}
                    placeholder="e.g., ABC-123"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Communication Protocol */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Communication Protocol</CardTitle>
              <CardDescription>Select the primary communication protocol</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="protocol">Primary Protocol *</Label>
                <Select
                  value={formData.protocol}
                  onValueChange={(value) => setFormData({ ...formData, protocol: value as Protocol })}
                >
                  <SelectTrigger id="protocol">
                    <SelectValue placeholder="Select protocol" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROTOCOL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Database Integration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">3. Database Integration Request</CardTitle>
              <CardDescription>Pricing information for dropdown menus</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="addToDatabase"
                  checked={formData.addToDatabase}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, addToDatabase: checked as boolean })
                  }
                />
                <Label htmlFor="addToDatabase" className="font-normal">
                  Add this device to the master database for future use
                </Label>
              </div>

              {formData.addToDatabase && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label htmlFor="standardPrice">Standard Price</Label>
                    <Input
                      id="standardPrice"
                      type="number"
                      step="0.01"
                      value={formData.standardPrice}
                      onChange={(e) => setFormData({ ...formData, standardPrice: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="installationPrice">Installation Price</Label>
                    <Input
                      id="installationPrice"
                      type="number"
                      step="0.01"
                      value={formData.installationPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, installationPrice: e.target.value })
                      }
                      placeholder="0.00"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 4: Device-Specific Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">4. Device-Specific Configuration</CardTitle>
              <CardDescription>Technical specifications and parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numberOfGangs">Number of Gangs/Points</Label>
                  <Input
                    id="numberOfGangs"
                    type="number"
                    min="1"
                    value={formData.numberOfGangs}
                    onChange={(e) => setFormData({ ...formData, numberOfGangs: e.target.value })}
                    placeholder="e.g., 1, 2, 3, 4, 5, 6, 7, 8"
                  />
                  <p className="text-xs text-muted-foreground">
                    For switches, relays, etc. Leave empty if not applicable.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numberOfPorts">Number of Ports</Label>
                  <Input
                    id="numberOfPorts"
                    type="number"
                    min="1"
                    value={formData.numberOfPorts}
                    onChange={(e) => setFormData({ ...formData, numberOfPorts: e.target.value })}
                    placeholder="e.g., 4, 8, 16, 24, 32"
                  />
                  <p className="text-xs text-muted-foreground">
                    For switches, NVRs, etc. Leave empty if not applicable.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="technicalParameters">Additional Technical Parameters</Label>
                <Textarea
                  id="technicalParameters"
                  value={formData.technicalParameters}
                  onChange={(e) =>
                    setFormData({ ...formData, technicalParameters: e.target.value })
                  }
                  placeholder="e.g., Voltage: 220V, Supported commands: On/Off/Dim, Encryption: AES-128"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">5. Additional Information</CardTitle>
              <CardDescription>Any other relevant details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Additional Notes</Label>
                <Textarea
                  id="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                  placeholder="Any special requirements, compatibility notes, or other information..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={copyToClipboard} className="mr-auto">
            <FileText className="h-4 w-4 mr-2" />
            Copy Summary
          </Button>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Submit Request</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
