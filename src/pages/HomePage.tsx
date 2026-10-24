import { useState, useEffect, useRef } from 'react';
import { Plus, Home, Trash2, Edit2, Check, X, FilePlus, FileText, Shield, Printer, Cloud, CloudOff, Loader2, AlertCircle, ListPlus } from 'lucide-react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/sonner';
import { useAuth } from '@/components/auth/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/db/supabase';
import { roomsApi, devicesApi, clearAllQuotationData } from '@/db/api';
import { quotationsApi, clientInfoApi, commissioningInstallationApi } from '@/db/api';
import { calculateQuotationTotals } from '@/utils/quotationCalculations';
import { fetchAndComputeICUTotal } from '@/hooks/useICUCalculator';
import type { Room, Device, Quotation } from '@/types/types';
import DeviceManager from '@/components/smart-home/DeviceManager';
import SummaryDashboard from '@/components/smart-home/SummaryDashboard';
import QuotationSummary from '@/components/smart-home/QuotationSummary';
import ClientInfoSection, { type ClientInfoSectionRef } from '@/components/smart-home/ClientInfoSection';
import CommissioningInstallation from '@/components/smart-home/CommissioningInstallation';
import ICUDatabaseManager from '@/components/smart-home/ICUDatabaseManager';
import PricingManagement from '@/components/smart-home/PricingManagement';
import DeviceTemplatesManager from '@/components/smart-home/DeviceTemplatesManager';
import PricingBreakdown from '@/components/smart-home/PricingBreakdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import logoImage from '/prosmart-logo.png';
import BackendStatusBadge from '@/components/common/BackendStatusBadge';

export default function HomePage() {
  const [searchParams] = useSearchParams();
  const editQuotationId = searchParams.get('edit');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null);
  const [showPricingTab, setShowPricingTab] = useState(false);
  const [showNewQuotationDialog, setShowNewQuotationDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(() => {
    // Restore active tab from localStorage on mount
    const savedTab = localStorage.getItem('homepage_active_tab');
    return savedTab || 'overview';
  });
  const [showBulkRoomDialog, setShowBulkRoomDialog] = useState(false);
  const clientInfoRef = useRef<ClientInfoSectionRef>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('homepage_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    // Only load data after auth is confirmed
    if (!authLoading && user) {
      loadData();
    }
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setShowPricingTab(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [authLoading, user, editQuotationId]); // Re-run when editQuotationId changes

  // Load pending users count for admin
  useEffect(() => {
    if (isAdmin) {
      const loadPendingCount = async () => {
        const { count } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('approved', false);
        setPendingCount(count || 0);
      };
      loadPendingCount();
      // Refresh count every 30 seconds when tab is active
      const interval = setInterval(() => {
        if (!document.hidden) {
          loadPendingCount();
        }
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  // Auto-save functionality
  useEffect(() => {
    // Mark as having unsaved changes when rooms or devices change
    if (!loading && (rooms.length > 0 || devices.length > 0)) {
      setHasUnsavedChanges(true);
    }
  }, [rooms, devices, loading]);

  // Auto-save every 2 minutes
  useEffect(() => {
    if (!editQuotationId || !hasUnsavedChanges || isAutoSaving) return;

    autoSaveTimerRef.current = setInterval(() => {
      handleAutoSave();
    }, 60000); // 1 minute

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [editQuotationId, hasUnsavedChanges, isAutoSaving]);

  // Save before leaving page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && editQuotationId) {
        handleAutoSave();
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, editQuotationId]);

  // Handle page visibility changes - save state when page becomes hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - save current state to localStorage as backup
        if (editQuotationId) {
          const stateBackup = {
            rooms,
            devices,
            editQuotationId,
            timestamp: new Date().toISOString()
          };
          localStorage.setItem('quotation_state_backup', JSON.stringify(stateBackup));
          
          // Trigger auto-save if there are unsaved changes
          if (hasUnsavedChanges) {
            handleAutoSave();
          }
        }
      } else {
        // Page is visible again - restore state if needed
        const backup = localStorage.getItem('quotation_state_backup');
        if (backup) {
          try {
            const stateBackup = JSON.parse(backup);
            // Only restore if it's the same quotation and within last 24 hours
            const backupTime = new Date(stateBackup.timestamp);
            const hoursSinceBackup = (Date.now() - backupTime.getTime()) / (1000 * 60 * 60);
            
            if (stateBackup.editQuotationId === editQuotationId && hoursSinceBackup < 24) {
              // State is still valid, keep current state
            }
          } catch (error) {
            console.error('Error parsing state backup:', error);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [rooms, devices, editQuotationId, hasUnsavedChanges]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // If editing an existing quotation, load its data
      if (editQuotationId) {
        const quotation = await quotationsApi.getById(editQuotationId);
        if (!quotation) {
          toast({
            title: 'Error',
            description: 'Quotation not found',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }
        
        // Check if quotation is editable
        if (!quotation.is_editable) {
          toast({
            title: 'Cannot Edit',
            description: 'This quotation is locked and cannot be edited.',
            variant: 'destructive'
          });
          navigate(`/quotations/${editQuotationId}`);
          return;
        }
        
        // Load rooms and devices from quotation
        const roomsData = quotation.rooms_data as Room[];
        const devicesData = quotation.devices_data as Device[];
        setRooms(roomsData);
        setDevices(devicesData);
        setEditingQuotation(quotation);
        
        // Load client info from quotation into the form
        // Use setTimeout to ensure the ref is available after component mount
        setTimeout(() => {
          if (clientInfoRef.current && quotation.client_name && quotation.project_code) {
            clientInfoRef.current.setClientInfoFromQuotation({
              client_name: quotation.client_name,
              client_address: quotation.client_address,
              client_phone: quotation.client_phone,
              project_code: quotation.project_code
            });
          }
        }, 100);
      } else {
        // Normal mode: load from database
        setEditingQuotation(null);
        const [roomsData, devicesData] = await Promise.all([
          roomsApi.getAll(),
          devicesApi.getAll()
        ]);
        setRooms(roomsData);
        setDevices(devicesData);
        
        // Load client info from database in normal mode
        setTimeout(() => {
          if (clientInfoRef.current) {
            clientInfoRef.current.loadClientInfo();
          }
        }, 100);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      
      // If user is not authenticated, redirect to login
      if (errorMessage.includes('not authenticated')) {
        toast({
          title: 'Authentication Required',
          description: 'Please log in to continue.',
          variant: 'destructive'
        });
        navigate('/login');
        return;
      }
      
      toast({
        title: 'Error',
        description: 'Failed to load data. Please refresh the page.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a room name.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // If in edit mode, create room locally only (will be saved with quotation)
      if (editQuotationId) {
        const newRoom: Room = {
          id: `temp-${Date.now()}`, // Temporary ID for local state
          name: newRoomName.trim(),
          user_id: user?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        setRooms([...rooms, newRoom]);
        setNewRoomName('');
        setHasUnsavedChanges(true); // Mark as having unsaved changes
        toast({
          title: 'Success',
          description: `Room "${newRoom.name}" added. Save the quotation to persist changes.`
        });
      } else {
        // Normal mode: create in database
        const room = await roomsApi.create(newRoomName.trim());
        setRooms([...rooms, room]);
        setNewRoomName('');
        toast({
          title: 'Success',
          description: `Room "${room.name}" created successfully.`
        });
      }
    } catch (error: any) {
      console.error('[ADD ROOM] Error creating room:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create room. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateRoom = async (id: string) => {
    if (!editingRoomName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Room name cannot be empty.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // If in edit mode, update local state only (rooms are stored in quotation JSON)
      if (editQuotationId) {
        const updatedRooms = rooms.map(r => 
          r.id === id ? { ...r, name: editingRoomName.trim() } : r
        );
        setRooms(updatedRooms);
        setEditingRoomId(null);
        setEditingRoomName('');
        setHasUnsavedChanges(true); // Mark as having unsaved changes
        toast({
          title: 'Success',
          description: 'Room updated successfully. Save the quotation to persist changes.'
        });
      } else {
        // Normal mode: update in database
        const updatedRoom = await roomsApi.update(id, editingRoomName.trim());
        setRooms(rooms.map(r => r.id === id ? updatedRoom : r));
        setEditingRoomId(null);
        setEditingRoomName('');
        toast({
          title: 'Success',
          description: 'Room updated successfully.'
        });
      }
    } catch (error: any) {
      console.error('[UPDATE ROOM] Error updating room:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update room. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteRoom = async () => {
    if (!deletingRoomId) return;

    try {
      // If in edit mode, delete from local state only
      if (editQuotationId) {
        setRooms(rooms.filter(r => r.id !== deletingRoomId));
        setDevices(devices.map(d => d.room_id === deletingRoomId ? { ...d, room_id: null } : d));
        setHasUnsavedChanges(true); // Mark as having unsaved changes
        toast({
          title: 'Success',
          description: 'Room deleted. Devices have been unassigned. Save the quotation to persist changes.'
        });
      } else {
        // Normal mode: delete from database
        await roomsApi.delete(deletingRoomId);
        setRooms(rooms.filter(r => r.id !== deletingRoomId));
        setDevices(devices.map(d => d.room_id === deletingRoomId ? { ...d, room_id: null } : d));
        toast({
          title: 'Success',
          description: 'Room deleted successfully. Devices have been unassigned.'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete room. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setDeletingRoomId(null);
    }
  };

  const handleAutoSave = async () => {
    if (!editQuotationId || !editingQuotation || isAutoSaving) return;
    
    try {
      setIsAutoSaving(true);
      
      const clientInfoFromForm = clientInfoRef.current?.getClientInfo();
      if (!clientInfoFromForm?.client_name || !clientInfoFromForm?.project_code) {
        return; // Skip auto-save if client info is incomplete
      }

      const [commissioning, icuCalc] = await Promise.all([
        commissioningInstallationApi.get(),
        fetchAndComputeICUTotal(devices)
      ]);
      const commissioningFee = commissioning?.commissioning_fee || 0;
      const visitFee = commissioning?.visit_fee || 0;
      const installationFee = devices.length > 0 ? icuCalc.finalTotal : (commissioning?.installation_fee || 0);
      const discountType = commissioning?.discount_type || null;
      const discountValue = commissioning?.discount_value || 0;

      const { totalAmount } = calculateQuotationTotals(
        devices,
        commissioningFee,
        visitFee,
        installationFee,
        discountType,
        discountValue
      );

      const newRemainingBalance = totalAmount - (editingQuotation.total_paid || 0);

      await quotationsApi.update(editQuotationId, {
        rooms_data: rooms,
        devices_data: devices,
        commissioning_price: commissioningFee,
        visit_price: visitFee,
        installation_price: installationFee,
        discount_type: discountType,
        discount_value: discountValue,
        total_amount: totalAmount,
        remaining_balance: newRemainingBalance
      });
      
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      
      // Clear localStorage backup after successful auto-save
      localStorage.removeItem('quotation_state_backup');
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleNewQuotation = async () => {
    try {
      setIsClearing(true);
      await clearAllQuotationData();
      setRooms([]);
      setDevices([]);
      
      // Clear client info in the UI
      clientInfoRef.current?.clearClientInfo();
      
      setShowNewQuotationDialog(false);
      
      // Navigate to home page without edit mode
      navigate('/');
      
      toast({
        title: 'Success',
        description: 'All data cleared. Ready to start a new quotation.'
      });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear data. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleSaveQuotation = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Authentication Error',
          description: 'You must be logged in to save a quotation.',
          variant: 'destructive'
        });
        return;
      }
      
      // Get client info from the form (works for both edit and normal mode)
      const clientInfoFromForm = clientInfoRef.current?.getClientInfo();
      
      if (!clientInfoFromForm || !clientInfoFromForm.client_name || !clientInfoFromForm.project_code) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in client information before saving.',
          variant: 'destructive'
        });
        return;
      }

      const [commissioning, icuCalc] = await Promise.all([
        commissioningInstallationApi.get(),
        fetchAndComputeICUTotal(devices)
      ]);
      const commissioningFee = commissioning?.commissioning_fee || 0;
      const visitFee = commissioning?.visit_fee || 0;
      const installationFee = devices.length > 0 ? icuCalc.finalTotal : (commissioning?.installation_fee || 0);
      const discountType = commissioning?.discount_type || null;
      const discountValue = commissioning?.discount_value || 0;

      const { devicesWithDistribution, totalAmount } = calculateQuotationTotals(
        devices,
        commissioningFee,
        visitFee,
        installationFee,
        discountType,
        discountValue
      );

      const quotationPayload = {
        project_code: clientInfoFromForm.project_code,
        client_name: clientInfoFromForm.client_name,
        client_address: clientInfoFromForm.address || null,
        client_phone: clientInfoFromForm.phone_number || null,
        global_protocol: null,
        vat_percentage: 0,
        rooms_data: rooms,
        devices_data: devicesWithDistribution,
        commissioning_price: commissioningFee,
        visit_price: visitFee,
        installation_price: installationFee,
        discount_type: discountType,
        discount_value: discountValue,
        total_amount: totalAmount,
        current_version: 1,
        client_approval: false,
        approval_date: null,
        installation_date: null,
        warranty_start_date: null,
        warranty_end_date: null,
        status: 'Draft' as const,
        is_invoice: false,
        invoice_number: null,
        total_paid: 0,
        remaining_balance: totalAmount,
        language: 'en' as const,
        is_editable: true,
        last_edited_by: null,
        last_edited_at: null,
        price_snapshot_date: new Date().toISOString(),
        pending_price_update: false,
        update_ignored_at: null,
        update_applied_at: null,
        update_ignored_by: null,
        update_applied_by: null,
        approved_by: null,
        approved_at: null,
        approval_notes: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
        last_amendment_date: null,
      };

      let savedQuotation;
      if (editQuotationId) {
        // Update existing quotation
        const newRemainingBalance = totalAmount - (editingQuotation?.total_paid || 0);
        await quotationsApi.update(editQuotationId, {
          rooms_data: rooms,
          devices_data: devicesWithDistribution,
          commissioning_price: commissioningFee,
          visit_price: visitFee,
          installation_price: installationFee,
          discount_type: discountType,
          discount_value: discountValue,
          total_amount: totalAmount,
          remaining_balance: newRemainingBalance
        });
        
        toast({
          title: 'Success',
          description: 'Quotation updated successfully!',
        });
        
        setHasUnsavedChanges(false);
        setLastSaved(new Date());
        
        // Clear localStorage backup after successful save
        localStorage.removeItem('quotation_state_backup');
        
        // Navigate to the updated quotation
        navigate(`/quotation/${editQuotationId}`);
      } else {
        savedQuotation = await quotationsApi.create(quotationPayload);

        toast({
          title: 'Success',
          description: 'Quotation saved successfully!',
        });
        
        setHasUnsavedChanges(false);
        
        // Clear localStorage backup after successful save
        localStorage.removeItem('quotation_state_backup');
        
        // Navigate to the new quotation
        navigate(`/quotation/${savedQuotation.id}`);
      }
    } catch (error) {
      console.error('Error saving quotation:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save quotation. Please try again.';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // Room templates with suggested devices
  const roomTemplates = [
    { name: 'Living Room', suggestedDevices: ['Smart TV Control', 'Ceiling Lights', 'Smart Plugs', 'Motion Sensor', 'Temperature Sensor'] },
    { name: 'Kitchen', suggestedDevices: ['Under-cabinet Lights', 'Smart Plugs', 'Water Leak Sensor', 'Smoke Detector'] },
    { name: 'Master Bedroom', suggestedDevices: ['Ceiling Lights', 'Bedside Lamps', 'Curtain Motor', 'Temperature Sensor', 'Door Sensor'] },
    { name: 'Bedroom 1', suggestedDevices: ['Ceiling Lights', 'Desk Lamp', 'Curtain Motor', 'Door Sensor'] },
    { name: 'Bedroom 2', suggestedDevices: ['Ceiling Lights', 'Desk Lamp', 'Curtain Motor', 'Door Sensor'] },
    { name: 'Bedroom 3', suggestedDevices: ['Ceiling Lights', 'Desk Lamp', 'Curtain Motor', 'Door Sensor'] },
    { name: 'Master Bathroom', suggestedDevices: ['Ceiling Lights', 'Mirror Lights', 'Water Leak Sensor', 'Exhaust Fan'] },
    { name: 'Bathroom 1', suggestedDevices: ['Ceiling Lights', 'Water Leak Sensor', 'Exhaust Fan'] },
    { name: 'Bathroom 2', suggestedDevices: ['Ceiling Lights', 'Water Leak Sensor', 'Exhaust Fan'] },
    { name: 'Dining Room', suggestedDevices: ['Chandelier', 'Wall Lights', 'Smart Plugs'] },
    { name: 'Study Room', suggestedDevices: ['Desk Lamp', 'Ceiling Lights', 'Smart Plugs', 'Door Sensor'] },
    { name: 'Guest Room', suggestedDevices: ['Ceiling Lights', 'Bedside Lamp', 'Curtain Motor', 'Door Sensor'] },
    { name: 'Laundry Room', suggestedDevices: ['Ceiling Lights', 'Water Leak Sensor', 'Smart Plugs'] },
    { name: 'Garage', suggestedDevices: ['Ceiling Lights', 'Motion Sensor', 'Door Sensor', 'Smart Plugs'] },
    { name: 'Hallway', suggestedDevices: ['Ceiling Lights', 'Motion Sensor'] },
    { name: 'Entrance', suggestedDevices: ['Ceiling Lights', 'Door Sensor', 'Smart Lock', 'Doorbell Camera'] },
    { name: 'Balcony', suggestedDevices: ['Outdoor Lights', 'Smart Plugs', 'Door Sensor'] },
    { name: 'Garden', suggestedDevices: ['Outdoor Lights', 'Motion Sensor', 'Smart Plugs', 'Water Valve'] },
  ];

  const [selectedRoomTemplates, setSelectedRoomTemplates] = useState<string[]>([]);

  const handleBulkAddRooms = async () => {
    if (selectedRoomTemplates.length === 0) {
      toast({
        title: 'No Rooms Selected',
        description: 'Please select at least one room to add.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const selectedTemplates = roomTemplates.filter(t => selectedRoomTemplates.includes(t.name));
      
      if (editQuotationId) {
        // Edit mode: create rooms locally
        const newRooms: Room[] = selectedTemplates.map(template => ({
          id: `temp-${Date.now()}-${Math.random()}`,
          name: template.name,
          user_id: user?.id || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }));
        
        setRooms([...rooms, ...newRooms]);
        setHasUnsavedChanges(true);
        toast({
          title: 'Success',
          description: `${selectedTemplates.length} room(s) added. Save the quotation to persist changes.`
        });
      } else {
        // Normal mode: create in database
        const newRooms: Room[] = [];
        for (const template of selectedTemplates) {
          const room = await roomsApi.create(template.name);
          newRooms.push(room);
        }
        
        setRooms([...rooms, ...newRooms]);
        toast({
          title: 'Success',
          description: `${selectedTemplates.length} room(s) created successfully.`
        });
      }
      
      setSelectedRoomTemplates([]);
      setShowBulkRoomDialog(false);
    } catch (error) {
      console.error('Error adding bulk rooms:', error);
      toast({
        title: 'Error',
        description: 'Failed to add rooms. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const startEditRoom = (room: Room) => {
    setEditingRoomId(room.id);
    setEditingRoomName(room.name);
  };

  const cancelEditRoom = () => {
    setEditingRoomId(null);
    setEditingRoomName('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading your smart home...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary">
      <Toaster />
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src={logoImage} 
                alt="Prosmart Logo" 
                className="h-10 sm:h-12 w-auto object-contain"
              />
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-foreground">Prosmart Home Automation</h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage your smart home devices and rooms</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <BackendStatusBadge showLatency={true} />

              {/* Auto-save Status Indicator */}
              {editQuotationId && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border border-border">
                  {isAutoSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-xs sm:text-sm font-medium text-foreground hidden sm:inline">Saving...</span>
                      <span className="text-xs font-medium text-foreground sm:hidden">Saving</span>
                    </>
                  ) : hasUnsavedChanges ? (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-xs sm:text-sm font-medium text-foreground hidden sm:inline">Unsaved changes</span>
                      <span className="text-xs font-medium text-foreground sm:hidden">Unsaved</span>
                    </>
                  ) : lastSaved ? (
                    <>
                      <Cloud className="h-4 w-4 text-green-500" />
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-foreground hidden sm:inline">
                          Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-xs font-medium text-foreground sm:hidden">
                          {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <CloudOff className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs sm:text-sm font-medium text-muted-foreground hidden sm:inline">Not saved</span>
                      <span className="text-xs font-medium text-muted-foreground sm:hidden">Not saved</span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Edit Mode Banner */}
        {editQuotationId && (
          <Alert className="mb-4 sm:mb-6">
            <Edit2 className="h-4 w-4" />
            <AlertTitle>Edit Mode</AlertTitle>
            <AlertDescription>
              You are editing an existing quotation. Make your changes and click "Save Quotation" to update it.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Action Buttons */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 print:hidden">
          <Button 
            onClick={() => window.print()}
            variant="outline"
            size="lg"
            className="gap-2 w-full sm:w-auto"
          >
            <Printer className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Print Current View</span>
          </Button>
          {isAdmin && (
            <Button 
              onClick={() => navigate('/admin')}
              variant="outline"
              size="lg"
              className="gap-2 w-full sm:w-auto relative border-solid border-[#128407] bg-[#248adb] bg-none border-[5px] border-[rgb(18,132,7)]"
            >
              <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm sm:text-base">Admin</span>
              {pendingCount > 0 && (
                <Badge className="ml-2 bg-red-600 text-white">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          )}
          <Button 
            onClick={() => navigate('/quotations')}
            variant="outline"
            size="lg"
            className="gap-2 w-full sm:w-auto bg-[#238adb] bg-none"
          >
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">View Saved Quotations</span>
          </Button>
          <Button 
            onClick={handleSaveQuotation}
            variant="default"
            size="lg"
            className="gap-2 shadow-lg w-full sm:w-auto bg-[#084a87e6] bg-none"
          >
            <Save className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">Save Quotation</span>
          </Button>
          <Button 
            onClick={() => setShowNewQuotationDialog(true)}
            variant="outline"
            size="lg"
            className="gap-2 w-full sm:w-auto border-solid border-[#dd0507fc] bg-[#248adb] bg-none border-[5px] border-[#ec0608fc]"
          >
            <FilePlus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="text-sm sm:text-base">New Quotation</span>
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="w-full overflow-x-auto mb-4 sm:mb-8">
            <TabsList className="inline-flex w-auto min-w-full justify-start gap-1 p-1">
              <TabsTrigger
                value="overview"
                className="border-solid border-[1px] border-[#4959ac00] text-[#0e6bc4ff] text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0">Overview</TabsTrigger>
              <TabsTrigger value="rooms" className="font-['BlinkMacSystemFont'] text-[#0e6bc4ff] text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0">Rooms</TabsTrigger>
              <TabsTrigger value="devices" className="text-[#0e6bc4ff] text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0">Devices</TabsTrigger>
              <TabsTrigger value="commissioning" className="text-[#0e6bc4ff] text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0 hidden md:inline-flex">Commissioning</TabsTrigger>
              <TabsTrigger value="commissioning" className="text-[#0e6bc4ff] text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0 md:hidden">Setup</TabsTrigger>
              <TabsTrigger
                value="quotation"
                className="border-none border-[1px] border-[rgba(0,0,0,0.9)] text-[#0e6bc4ff] text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0">Quotation</TabsTrigger>
              <TabsTrigger value="breakdown" className="text-[#0e6bc4ff] text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0">Breakdown</TabsTrigger>
              <TabsTrigger value="print" className="text-[#0e6bc4ff] text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0">
                <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Print
              </TabsTrigger>
              {(showPricingTab || isAdmin) && (
                <TabsTrigger value="pricing" className="text-xs sm:text-sm px-2 sm:px-4 flex-shrink-0">Pricing</TabsTrigger>
              )}
            </TabsList>
          </div>

          {/* Overview & Devices Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-8">
            <ClientInfoSection ref={clientInfoRef} isEditMode={!!editingQuotation} />
            <SummaryDashboard devices={devices} rooms={rooms} />
            <DeviceManager 
              rooms={rooms} 
              devices={devices} 
              onDevicesChange={setDevices}
              isEditMode={!!editQuotationId}
            />
          </TabsContent>

          {/* Rooms Tab */}
          <TabsContent value="rooms">
            <Card>
              <CardHeader>
                <CardTitle>Rooms</CardTitle>
                <CardDescription>Organize your smart home by rooms</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add Room */}
                <div className="flex flex-col sm:flex-row gap-2 mb-6">
                  <Input
                    placeholder="Enter room name (e.g., Living Room)"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddRoom()}
                    className="flex-1"
                  />
                  <Button onClick={handleAddRoom} className="font-['-apple-system']">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Room
                  </Button>
                  <Button onClick={() => setShowBulkRoomDialog(true)} variant="outline">
                    <ListPlus className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Bulk Add</span>
                    <span className="sm:hidden">Bulk</span>
                  </Button>
                </div>

            {/* Rooms List */}
            {rooms.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rooms yet. Add your first room to get started!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="border border-border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                    {editingRoomId === room.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={editingRoomName}
                          onChange={(e) => setEditingRoomName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleUpdateRoom(room.id)}
                          autoFocus
                          className="flex-1"
                        />
                        <Button size="icon" variant="default" onClick={() => handleUpdateRoom(room.id)}>
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={cancelEditRoom}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Home className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{room.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {devices.filter(d => d.room_id === room.id).length} devices
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => startEditRoom(room)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeletingRoomId(room.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Device Templates Tab */}
      <TabsContent value="devices">
        <DeviceTemplatesManager />
      </TabsContent>

      {/* Commissioning & Installation Tab */}
      <TabsContent value="commissioning" className="space-y-4">
        <CommissioningInstallation />
        <ICUDatabaseManager />
      </TabsContent>

      {/* Quotation Tab */}
      <TabsContent value="quotation">
        <QuotationSummary 
          rooms={rooms} 
          devices={devices} 
          clientInfoRef={clientInfoRef}
          editingQuotation={editingQuotation}
        />
      </TabsContent>

      {/* Pricing Breakdown Tab */}
      <TabsContent value="breakdown">
        <PricingBreakdown devices={devices} />
      </TabsContent>

      {/* Print Tab */}
      <TabsContent value="print">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Print Quotation
              </CardTitle>
              <CardDescription>
                Review and print your complete quotation with all details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 print:hidden">
                <Button 
                  onClick={() => window.print()} 
                  className="flex-1"
                  size="lg"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Current View
                </Button>
              </div>
              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg print:hidden">
                <p className="font-medium mb-2">💡 Printing Tips:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use "Print Current View" to print this page directly</li>
                  <li>Go to the "Quotation" tab for PDF/Excel export options</li>
                  <li>Ensure all client information is filled in the Overview tab</li>
                  <li>Review the Breakdown tab for detailed pricing before printing</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Print Preview - Shows the quotation summary */}
          <div className="print:block">
            <QuotationSummary 
              rooms={rooms} 
              devices={devices} 
              clientInfoRef={clientInfoRef}
              editingQuotation={editingQuotation}
            />
          </div>
        </div>
      </TabsContent>

      {/* Pricing Management Tab (Admin Only) */}
      {(showPricingTab || isAdmin) && (
        <TabsContent value="pricing">
          <PricingManagement />
        </TabsContent>
      )}
    </Tabs>
  </div>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingRoomId} onOpenChange={(open) => !open && setDeletingRoomId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this room? Devices in this room will be unassigned but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* New Quotation Confirmation Dialog */}
      <AlertDialog open={showNewQuotationDialog} onOpenChange={setShowNewQuotationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start New Quotation</AlertDialogTitle>
            <AlertDialogDescription>
              This will clear all current data including rooms, devices, and client information. This action cannot be undone. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleNewQuotation} 
              disabled={isClearing}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isClearing ? 'Clearing...' : 'Start New Quotation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Add Rooms Dialog */}
      <Dialog open={showBulkRoomDialog} onOpenChange={setShowBulkRoomDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Multiple Rooms</DialogTitle>
            <DialogDescription>
              Select rooms from the template list below. Each room comes with suggested devices for typical smart home setups.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
            {roomTemplates.map((template) => (
              <div key={template.name} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`room-${template.name}`}
                  checked={selectedRoomTemplates.includes(template.name)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedRoomTemplates([...selectedRoomTemplates, template.name]);
                    } else {
                      setSelectedRoomTemplates(selectedRoomTemplates.filter(n => n !== template.name));
                    }
                  }}
                />
                <div className="flex-1 space-y-1">
                  <Label
                    htmlFor={`room-${template.name}`}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {template.name}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Suggested: {template.suggestedDevices.slice(0, 3).join(', ')}
                    {template.suggestedDevices.length > 3 && ` +${template.suggestedDevices.length - 3} more`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowBulkRoomDialog(false);
              setSelectedRoomTemplates([]);
            }}>
              Cancel
            </Button>
            <Button onClick={handleBulkAddRooms} disabled={selectedRoomTemplates.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add {selectedRoomTemplates.length > 0 ? `${selectedRoomTemplates.length} ` : ''}Room{selectedRoomTemplates.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
