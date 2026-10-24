import { useState, useEffect, useImperativeHandle, forwardRef, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Save, User, RefreshCw, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { clientInfoApi } from '@/db/api';
import type { ClientInfo } from '@/types/types';

export interface ClientInfoSectionRef {
  clearClientInfo: () => void;
  loadClientInfo: () => Promise<void>;
  getClientInfo: () => {
    client_name: string;
    address: string;
    phone_number: string;
    project_code: string;
    last_amendment_date: string | null;
  };
  setClientInfoFromQuotation: (data: { client_name: string; client_address: string | null; client_phone: string | null; project_code: string; last_amendment_date?: string | null }) => void;
}

interface ClientInfoSectionProps {
  isEditMode?: boolean;
}

const ClientInfoSection = forwardRef<ClientInfoSectionRef, ClientInfoSectionProps>(({ isEditMode = false }, ref) => {
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const { toast } = useToast();
  
  // Refs for autosave
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<string>('');
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Only auto-load client info when NOT in edit mode
    if (!isEditMode) {
      loadClientInfo();
    } else {
      setIsLoading(false);
    }
  }, [isEditMode]);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    clearClientInfo: () => {
      setClientInfo(null);
      setClientName('');
      setAddress('');
      setPhoneNumber('');
      setProjectCode('');
      lastSavedDataRef.current = '';
      setAutoSaveStatus('idle');
    },
    loadClientInfo,
    getClientInfo: () => ({
      client_name: clientName,
      address: address,
      phone_number: phoneNumber,
      project_code: projectCode,
      last_amendment_date: clientInfo?.last_amendment_date || null
    }),
    setClientInfoFromQuotation: (data: { client_name: string; client_address: string | null; client_phone: string | null; project_code: string; last_amendment_date?: string | null }) => {
      // Set client info from quotation data without saving to database
      setClientName(data.client_name);
      setAddress(data.client_address || '');
      setPhoneNumber(data.client_phone || '');
      setProjectCode(data.project_code);
      // Mark as if we have existing client info (to show update button instead of save)
      setClientInfo({
        id: 'temp-id', // Temporary ID for edit mode
        client_name: data.client_name,
        address: data.client_address,
        phone_number: data.client_phone,
        project_code: data.project_code,
        last_amendment_date: data.last_amendment_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      // Update last saved data
      lastSavedDataRef.current = JSON.stringify({
        client_name: data.client_name,
        address: data.client_address || '',
        phone_number: data.client_phone || '',
        project_code: data.project_code
      });
    }
  }));

  const loadClientInfo = async () => {
    try {
      setIsLoading(true);
      const data = await clientInfoApi.get();
      if (data) {
        setClientInfo(data);
        setClientName(data.client_name);
        setAddress(data.address || '');
        setPhoneNumber(data.phone_number || '');
        setProjectCode(data.project_code);
        // Store initial data for comparison
        lastSavedDataRef.current = JSON.stringify({
          client_name: data.client_name,
          address: data.address || '',
          phone_number: data.phone_number || '',
          project_code: data.project_code
        });
      } else {
        // No client info found - clear all fields
        setClientInfo(null);
        setClientName('');
        setAddress('');
        setPhoneNumber('');
        setProjectCode('');
        lastSavedDataRef.current = '';
      }
    } catch (error) {
      console.error('Error loading client info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
    } finally {
      setIsLoading(false);
      isInitialLoadRef.current = false;
    }
  };

  // Autosave function
  const performAutoSave = useCallback(async () => {
    // Skip if initial load or no changes
    if (isInitialLoadRef.current) return;
    
    // Validate required fields
    if (!clientName.trim() || !projectCode.trim()) {
      return; // Don't autosave if required fields are empty
    }

    // Check if data has changed
    const currentData = JSON.stringify({
      client_name: clientName,
      address: address,
      phone_number: phoneNumber,
      project_code: projectCode
    });

    if (currentData === lastSavedDataRef.current) {
      return; // No changes, skip autosave
    }

    try {
      setIsAutoSaving(true);
      setAutoSaveStatus('saving');
      
      if (clientInfo) {
        const updated = await clientInfoApi.update(clientInfo.id, {
          client_name: clientName,
          address: address || null,
          phone_number: phoneNumber || null,
          project_code: projectCode
        });
        setClientInfo(updated);
      } else {
        const created = await clientInfoApi.create({
          client_name: clientName,
          address: address || undefined,
          phone_number: phoneNumber || undefined,
          project_code: projectCode
        });
        setClientInfo(created);
      }
      
      // Update last saved data
      lastSavedDataRef.current = currentData;
      setAutoSaveStatus('saved');
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error auto-saving client info:', error);
      setAutoSaveStatus('error');
      
      // Reset error status after 3 seconds
      setTimeout(() => {
        setAutoSaveStatus('idle');
      }, 3000);
    } finally {
      setIsAutoSaving(false);
    }
  }, [clientName, address, phoneNumber, projectCode, clientInfo]);

  // Trigger autosave when fields change
  useEffect(() => {
    // Skip during initial load
    if (isInitialLoadRef.current || isLoading) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer for autosave (2 seconds after user stops typing)
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000);

    // Cleanup
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [clientName, address, phoneNumber, projectCode, performAutoSave, isLoading]);

  const generateProjectCode = (name: string): string => {
    if (!name.trim()) return '';
    
    const words = name.trim().split(/\s+/);
    const initials = words
      .map(word => word.charAt(0).toUpperCase())
      .join('');
    
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${initials}-${year}${month}${day}`;
  };

  const handleClientNameChange = (value: string) => {
    setClientName(value);
    // Only auto-generate project code for new quotations
    if (!clientInfo) {
      const newProjectCode = generateProjectCode(value);
      setProjectCode(newProjectCode);
    }
  };

  const handleRegenerateProjectCode = () => {
    if (!clientName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a client name first.',
        variant: 'destructive'
      });
      return;
    }
    const newProjectCode = generateProjectCode(clientName);
    setProjectCode(newProjectCode);
    toast({
      title: 'Success',
      description: 'Project code regenerated successfully.'
    });
  };

  const handleSave = async () => {
    if (!clientName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Client name is required.',
        variant: 'destructive'
      });
      return;
    }

    if (!projectCode.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Project code is required.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsSaving(true);
      
      if (clientInfo) {
        const updated = await clientInfoApi.update(clientInfo.id, {
          client_name: clientName,
          address: address || null,
          phone_number: phoneNumber || null,
          project_code: projectCode
        });
        setClientInfo(updated);
        toast({
          title: 'Success',
          description: 'Client information updated successfully.'
        });
      } else {
        const created = await clientInfoApi.create({
          client_name: clientName,
          address: address || undefined,
          phone_number: phoneNumber || undefined,
          project_code: projectCode
        });
        setClientInfo(created);
        toast({
          title: 'Success',
          description: 'Client information saved successfully.'
        });
      }
    } catch (error) {
      console.error('Error saving client info:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save client information. Please try again.';
      console.error('Error details:', errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading client information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Client Information</CardTitle>
              <CardDescription>Project details and client contact information</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {autoSaveStatus === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden md:inline">Auto-saving...</span>
              </>
            )}
            {autoSaveStatus === 'saved' && (
              <>
                <Check className="h-4 w-4 text-green-600" />
                <span className="hidden md:inline text-green-600">Auto-saved</span>
              </>
            )}
            {autoSaveStatus === 'idle' && (
              <span className="hidden md:inline">Auto-save enabled</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          <div className="space-y-2">
            <Label htmlFor="clientName" className="text-base font-semibold">
              Client Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="clientName"
              placeholder="Enter client name"
              value={clientName}
              onChange={(e) => handleClientNameChange(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-base font-semibold">
              Phone Number
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="projectCode" className="text-base font-semibold">
              Project Code <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="projectCode"
                placeholder="Auto-generated"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="h-11 font-mono font-semibold"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleRegenerateProjectCode}
                className="h-11 w-11 shrink-0"
                title="Regenerate project code"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Format: Initials-YYYYMMDD (Click refresh to regenerate)</p>
          </div>

          <div className="space-y-2 flex flex-col justify-end">
            <div className="flex items-center gap-2">
              {autoSaveStatus === 'saving' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
              {autoSaveStatus === 'saved' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Check className="h-4 w-4" />
                  <span>Saved</span>
                </div>
              )}
              {autoSaveStatus === 'error' && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <span>Error saving</span>
                </div>
              )}
            </div>
            <Button 
              onClick={handleSave} 
              disabled={isSaving || isAutoSaving}
              className="w-full h-11"
              size="lg"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : clientInfo ? 'Save Now' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Label htmlFor="address" className="text-base font-semibold">
            Address
          </Label>
          <Textarea
            id="address"
            placeholder="Enter client address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {clientInfo && (
          <div className="mt-6 pt-6 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Project Code:</span>
                <p className="font-mono font-bold text-primary text-lg mt-1">{clientInfo.project_code}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created:</span>
                <p className="font-medium mt-1">{new Date(clientInfo.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Updated:</span>
                <p className="font-medium mt-1">{new Date(clientInfo.updated_at).toLocaleDateString()}</p>
              </div>
              {clientInfo.last_amendment_date && (
                <div>
                  <span className="text-muted-foreground text-amber-600 font-semibold">Last Amendment:</span>
                  <p className="font-medium mt-1 text-amber-600">{new Date(clientInfo.last_amendment_date).toLocaleDateString()}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

ClientInfoSection.displayName = 'ClientInfoSection';

export default ClientInfoSection;
