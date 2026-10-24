import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { quotationsApi, paymentsApi, isAdmin, quotationStatusAuditApi } from '@/db/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import type { Quotation, Room, Device, Payment, PaymentMethod, QuotationLanguage, QuotationVersion, ClientInfo, QuotationStatus, QuotationStatusAudit } from '@/types/types';
import { Loader2, ArrowLeft, FileText, Home, Package, Calendar, CheckCircle2, DollarSign, FileCheck, Edit2, Trash2, RotateCcw, Languages, History, Eye, Printer, Cloud, FileDown, AlertTriangle, XCircle, User, Save, Check, TrendingUp, Info, ChevronDown, ClipboardList } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useDevicePriceStatus } from '@/hooks/useDevicePriceStatus';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/smart-home/QuotationsAnalyticsTab';
import { PipelineWarningBanner, needsPipelineConfirmation } from '@/components/smart-home/PipelineWarningBanner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { translate, translateCategory, translateProtocol } from '@/i18n/translations';
import { useCategoryLabels } from '@/hooks/useCategoryLabels';

import GoogleSheetsBackup from '@/components/backup/GoogleSheetsBackup';
import { exportToPDF, exportBriefToPDF } from '@/utils/pdfExportLazy';
import { exportQuotationToExcel, exportQuotationToCSV, exportQuotationToJSON } from '@/utils/quotationExport';
import { comparePrices, type PriceChange } from '@/utils/priceComparison';
import QuotationPriceUpdatePanel from '@/components/smart-home/QuotationPriceUpdatePanel';
import CostAnalysisTab from '@/components/smart-home/CostAnalysisTab';
import prosmartLogoImage from '/prosmart-logo.png';

export default function QuotationViewPage() {
  const { id } = useParams<{ id: string }>();
  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const { labels: categoryLabels, getLabel } = useCategoryLabels();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [versionHistory, setVersionHistory] = useState<QuotationVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<QuotationVersion | null>(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [isLoadingVersion, setIsLoadingVersion] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState<QuotationLanguage>('en');
  const [priceChange, setPriceChange] = useState<PriceChange | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editDeviceForm, setEditDeviceForm] = useState<{
    device_name: string;
    brand: string;
    quantity: number;
    unit_price: number;
  }>({
    device_name: '',
    brand: '',
    quantity: 1,
    unit_price: 0
  });
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [clientSaved, setClientSaved] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    client_approval: false,
    approval_date: '',
    installation_date: '',
    project_code: '',
    client_name: '',
    client_address: '',
    client_phone: '',
    commissioning_price: 0,
    visit_price: 0,
    installation_price: 0,
    discount_type: null as 'percentage' | 'fixed' | null,
    discount_value: 0,
  });

  const [paymentForm, setPaymentForm] = useState<{
    amount: string;
    payment_date: string;
    payment_method: PaymentMethod;
    cash_received_by: string;
    notes: string;
  }>({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'InstaPay',
    cash_received_by: '',
    notes: '',
  });

  // Calculate new total amount based on edited commissioning/installation fees
  const calculatedTotal = useMemo(() => {
    if (!quotation) return 0;
    
    const devicesTotal = ((quotation.devices_data as Device[]) || []).reduce((sum, device) => {
      const price = device.unit_price || 0;
      const quantity = device.quantity || 1;
      const subtotal = price * quantity;
      const vat = subtotal * ((device.vat_rate || 0) / 100);
      return sum + subtotal + vat;
    }, 0);

    const subtotalBeforeDiscount = devicesTotal + formData.commissioning_price + formData.visit_price + formData.installation_price;
    
    let discountAmount = 0;
    if (formData.discount_type && formData.discount_value > 0) {
      if (formData.discount_type === 'percentage') {
        discountAmount = subtotalBeforeDiscount * (formData.discount_value / 100);
      } else {
        discountAmount = formData.discount_value;
      }
    }

    return subtotalBeforeDiscount - discountAmount;
  }, [quotation, formData.commissioning_price, formData.visit_price, formData.installation_price, formData.discount_type, formData.discount_value]);

  const hasChanges = useMemo(() => {
    if (!quotation) return false;
    return (
      formData.commissioning_price !== quotation.commissioning_price ||
      formData.visit_price !== quotation.visit_price ||
      formData.installation_price !== quotation.installation_price ||
      formData.discount_type !== quotation.discount_type ||
      formData.discount_value !== quotation.discount_value
    );
  }, [quotation, formData.commissioning_price, formData.visit_price, formData.installation_price, formData.discount_type, formData.discount_value]);

  // Price staleness tracking — compare each device's stored unit_price vs current DB price
  const allDevices = useMemo(() => (quotation?.devices_data as Device[]) || [], [quotation]);
  const devicePriceStatusMap = useDevicePriceStatus(allDevices);

  // Map individual categories to parent category groups
  const getCategoryGroup = (category: string): string => {
    const lightingCategories = ['mini_switch', 'touch_switch', 'motion_sensor', 'presence_sensor', 'mini_shutter_switch', 'touch_shutter_switch'];
    const shadingCategories = ['shutter_switch', 'smart_shutter_switch', 'curtain_switch', 'curtain_motor', 'curtain_rail', 'roller_blind_motor'];
    const cctvSecurityCategories = ['camera', 'wifi_camera', 'nvr', 'hdd', 'memory_card', 'bracket', 'intercom', 'smart_lock', 'gas_sensor', 'water_leak_sensor', 'smoke_sensor', 'gas_valve', 'water_valve'];
    const networkingCategories = ['access_point', 'mesh_wifi', 'network_switch', 'repeater', 'cat6_cable'];
    const voiceAssistantCategories = ['alexa', 'google_home'];
    const centralControlCategories = ['ir_remote', 'central_control', 'smart_plug', 'zigbee_hub', 'matter_hub'];
    const customCategories = ['custom_device'];

    if (lightingCategories.includes(category)) return getLabel('group_light');
    if (shadingCategories.includes(category)) return getLabel('group_shading');
    if (cctvSecurityCategories.includes(category)) return getLabel('group_cctv_security');
    if (networkingCategories.includes(category)) return getLabel('group_networking');
    if (voiceAssistantCategories.includes(category)) return getLabel('group_voice_assistant');
    if (centralControlCategories.includes(category)) return getLabel('group_central_control');
    if (customCategories.includes(category)) return getLabel('group_custom_devices');
    
    return 'Other';
  };

  // Group devices by parent category group for better organization (must be before early returns)
  const devicesByCategory = useMemo(() => {
    if (!quotation) return {};
    const devices = (quotation.devices_data as Device[]) || [];
    const grouped: { [key: string]: Device[] } = {};
    devices.forEach(device => {
      const categoryGroup = getCategoryGroup(device.category);
      if (!grouped[categoryGroup]) {
        grouped[categoryGroup] = [];
      }
      grouped[categoryGroup].push(device);
    });
    return grouped;
  }, [quotation, categoryLabels]);

  useEffect(() => {
    if (id) {
      loadQuotation(id);
      loadPayments(id);
      loadVersionHistory(id);
      loadAuditLog(id);
    }
  }, [id]);

  useEffect(() => {
    const checkAdmin = async () => {
      const admin = await isAdmin();
      setIsAdminUser(admin);
    };
    checkAdmin();
  }, []);

  useEffect(() => {
    if (quotation) {
      setFormData({
        client_approval: quotation.client_approval,
        approval_date: quotation.approval_date || '',
        installation_date: quotation.installation_date || '',
        project_code: quotation.project_code,
        client_name: quotation.client_name || '',
        client_address: quotation.client_address || '',
        client_phone: quotation.client_phone || '',
        commissioning_price: quotation.commissioning_price || 0,
        visit_price: quotation.visit_price || 0,
        installation_price: quotation.installation_price || 0,
        discount_type: quotation.discount_type as any || null,
        discount_value: quotation.discount_value || 0,
      });
      setCurrentLanguage(quotation.language || 'en');
    }
  }, [quotation]);

  const loadQuotation = async (quotationId: string) => {
    try {
      const data = await quotationsApi.getById(quotationId);
      if (!data) {
        throw new Error('Quotation not found');
      }
      setQuotation(data);
      
      // Check for price changes if quotation is unpaid
      if (data.remaining_balance > 0 && !data.is_invoice && data.price_snapshot_date) {
        const priceComparison = await comparePrices(data.devices_data, data.price_snapshot_date);
        setPriceChange(priceComparison);
        
        // Auto-mark as pending update if prices increased and quotation has no payments
        if (priceComparison.hasChanges && 
            priceComparison.percentageIncrease > 0 && 
            !data.pending_price_update && 
            !data.update_ignored_at && 
            !data.update_applied_at &&
            data.total_paid === 0 &&
            (data.status === 'Draft' || data.status === 'Approved')) {
          await quotationsApi.checkForPriceUpdates(quotationId);
          // Reload to get updated pending_price_update status
          const updatedData = await quotationsApi.getById(quotationId);
          if (updatedData) {
            setQuotation(updatedData);
          }
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load quotation',
        variant: 'destructive',
      });
      navigate('/quotations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadPayments = async (quotationId: string) => {
    try {
      const data = await paymentsApi.getByQuotationId(quotationId);
      setPayments(data);
    } catch (error) {
      console.error('Failed to load payments:', error);
    }
  };

  const loadVersionHistory = async (quotationId: string) => {
    try {
      const data = await quotationsApi.getVersionHistory(quotationId);
      setVersionHistory(data);
    } catch (error) {
      console.error('Failed to load version history:', error);
    }
  };

  const handleViewVersion = async (quotationId: string, versionNumber: number) => {
    setIsLoadingVersion(true);
    setShowVersionDialog(true);
    try {
      const version = await quotationsApi.getVersionById(quotationId, versionNumber);
      setSelectedVersion(version);
    } catch (error) {
      console.error('Failed to load version details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load version details',
        variant: 'destructive',
      });
      setShowVersionDialog(false);
    } finally {
      setIsLoadingVersion(false);
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isBriefExporting, setIsBriefExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!quotation) return;
    setIsExporting(true);
    try {
      await exportToPDF({
        devices: quotation.devices_data as Device[],
        rooms: quotation.rooms_data as Room[],
        clientInfo: {
          id: quotation.id,
          client_name: quotation.client_name || '',
          address: quotation.client_address,
          phone_number: quotation.client_phone,
          project_code: quotation.project_code,
          last_amendment_date: quotation.last_amendment_date,
          created_at: quotation.created_at,
          updated_at: quotation.updated_at
        },
        commissioningFee: quotation.commissioning_price,
        visitFee: quotation.visit_price,
        installationFee: quotation.installation_price,
        vatPercentage: quotation.vat_percentage,
        discountType: quotation.discount_type as any,
        discountValue: quotation.discount_value,
        totalPaid: quotation.total_paid,
        remainingBalance: quotation.remaining_balance,
        currentVersion: quotation.current_version,
        payments: payments,
        approvalDate: quotation.approval_date,
        warrantyStartDate: quotation.warranty_start_date,
        warrantyEndDate: quotation.warranty_end_date,
        isInvoice: quotation.is_invoice,
        categoryLabels
      });
      toast({
        title: 'Success',
        description: 'PDF exported successfully'
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export PDF',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportBriefPDF = async () => {
    if (!quotation) return;
    setIsBriefExporting(true);
    try {
      await exportBriefToPDF({
        devices: quotation.devices_data as Device[],
        rooms: quotation.rooms_data as Room[],
        clientInfo: {
          id: quotation.id,
          client_name: quotation.client_name || '',
          address: quotation.client_address,
          phone_number: quotation.client_phone,
          project_code: quotation.project_code,
          last_amendment_date: quotation.last_amendment_date,
          created_at: quotation.created_at,
          updated_at: quotation.updated_at
        },
        commissioningFee: quotation.commissioning_price,
        visitFee: quotation.visit_price,
        installationFee: quotation.installation_price,
        vatPercentage: quotation.vat_percentage,
        discountType: quotation.discount_type,
        discountValue: quotation.discount_value,
        currentVersion: quotation.current_version,
        totalPaid: quotation.total_paid,
        remainingBalance: quotation.remaining_balance,
        categoryLabels
      });
      toast({ title: 'Success', description: 'Brief quotation PDF exported' });
    } catch (error) {
      console.error('Error exporting brief PDF:', error);
      toast({ title: 'Export failed', description: 'Failed to export brief PDF', variant: 'destructive' });
    } finally {
      setIsBriefExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!quotation) return;
    try {
      exportQuotationToExcel(quotation, payments, categoryLabels);
      toast({
        title: 'Success',
        description: 'Excel file exported successfully'
      });
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export Excel file',
        variant: 'destructive'
      });
    }
  };

  const handleExportCSV = () => {
    if (!quotation) return;
    try {
      exportQuotationToCSV(quotation, payments);
      toast({
        title: 'Success',
        description: 'CSV file exported successfully'
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export CSV file',
        variant: 'destructive'
      });
    }
  };

  const handleExportJSON = () => {
    if (!quotation) return;
    try {
      exportQuotationToJSON(quotation, payments);
      toast({
        title: 'Success',
        description: 'JSON file exported successfully'
      });
    } catch (error) {
      console.error('Error exporting JSON:', error);
      toast({
        title: 'Export failed',
        description: 'Failed to export JSON file',
        variant: 'destructive'
      });
    }
  };

  const handleSaveQuotation = async () => {
    if (!quotation || !id) return;

    if (quotation.is_invoice) {
      toast({
        title: 'Cannot Edit',
        description: 'This quotation has been converted to an invoice and cannot be edited.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      // Calculate new total amount
      const devicesTotal = ((quotation.devices_data as Device[]) || []).reduce((sum, device) => {
        const price = device.unit_price || 0;
        const quantity = device.quantity || 1;
        const subtotal = price * quantity;
        const vat = subtotal * ((device.vat_rate || 0) / 100);
        return sum + subtotal + vat;
      }, 0);

      const subtotalBeforeDiscount = devicesTotal + formData.commissioning_price + formData.visit_price + formData.installation_price;
      
      let discountAmount = 0;
      if (formData.discount_type && formData.discount_value > 0) {
        if (formData.discount_type === 'percentage') {
          discountAmount = subtotalBeforeDiscount * (formData.discount_value / 100);
        } else {
          discountAmount = formData.discount_value;
        }
      }

      const newTotalAmount = subtotalBeforeDiscount - discountAmount;
      const newRemainingBalance = newTotalAmount - quotation.total_paid;

      await quotationsApi.update(id, {
        ...formData,
        approval_date: formData.approval_date || null,
        installation_date: formData.installation_date || null,
        total_amount: newTotalAmount,
        remaining_balance: newRemainingBalance,
      });
      
      toast({
        title: 'Success',
        description: 'Quotation saved successfully',
      });

      await loadQuotation(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save quotation',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveClientInfo = async () => {
    if (!quotation || !id || isReadOnly) return;
    if (!formData.client_name.trim()) {
      toast({ title: 'Validation Error', description: 'Client name is required.', variant: 'destructive' });
      return;
    }
    setIsSavingClient(true);
    try {
      await quotationsApi.update(id, {
        client_name: formData.client_name,
        client_address: formData.client_address || null,
        client_phone: formData.client_phone || null,
      });
      setQuotation(prev => prev ? {
        ...prev,
        client_name: formData.client_name,
        client_address: formData.client_address || null,
        client_phone: formData.client_phone || null,
      } : prev);
      setClientSaved(true);
      setTimeout(() => setClientSaved(false), 2500);
      toast({ title: 'Client Info Updated', description: 'Name, phone and address saved successfully.' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update client information.', variant: 'destructive' });
    } finally {
      setIsSavingClient(false);
    }
  };

  const handleSwitchLanguage = async (newLanguage: QuotationLanguage) => {
    if (!quotation || !id) return;

    if (!quotation.is_editable) {
      toast({
        title: 'Cannot Change Language',
        description: 'This quotation is locked and cannot be modified.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      await quotationsApi.update(id, {
        language: newLanguage,
      });
      
      setCurrentLanguage(newLanguage);
      
      toast({
        title: 'Success',
        description: `Language switched to ${newLanguage === 'en' ? 'English' : 'Arabic'}`,
      });

      await loadQuotation(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to switch language',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddPayment = async () => {
    if (!id) return;

    if (!paymentForm.amount || Number.parseFloat(paymentForm.amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      await paymentsApi.create({
        quotation_id: id,
        amount: Number.parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        cash_received_by: paymentForm.payment_method === 'Cash' ? paymentForm.cash_received_by : null,
        notes: paymentForm.notes || null,
      });

      toast({
        title: 'Success',
        description: 'Payment added successfully',
      });

      setShowPaymentDialog(false);
      setPaymentForm({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'InstaPay',
        cash_received_by: '',
        notes: '',
      });

      await loadQuotation(id);
      await loadPayments(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add payment',
        variant: 'destructive',
      });
    }
  };

  const handleEditPayment = async () => {
    if (!id || !editingPayment) return;

    if (!paymentForm.amount || Number.parseFloat(paymentForm.amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid payment amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      await paymentsApi.update(editingPayment.id, {
        amount: Number.parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        cash_received_by: paymentForm.payment_method === 'Cash' ? paymentForm.cash_received_by : null,
        notes: paymentForm.notes || null,
      });

      toast({
        title: 'Success',
        description: 'Payment updated successfully',
      });

      setEditingPayment(null);
      setShowPaymentDialog(false);
      setPaymentForm({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'InstaPay',
        cash_received_by: '',
        notes: '',
      });

      await loadQuotation(id);
      await loadPayments(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update payment',
        variant: 'destructive',
      });
    }
  };

  const handleApproveQuotation = async () => {
    if (!id) return;

    try {
      setIsSaving(true);
      await quotationsApi.approveQuotation(id, approvalNotes);

      toast({
        title: 'Success',
        description: 'Quotation approved successfully',
      });

      setShowApproveDialog(false);
      setApprovalNotes('');
      await loadQuotation(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve quotation',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRejectQuotation = async () => {
    if (!id || !rejectionReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      await quotationsApi.rejectQuotation(id, rejectionReason);

      toast({
        title: 'Success',
        description: 'Quotation rejected',
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      await loadQuotation(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject quotation',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!id) return;

    try {
      await paymentsApi.delete(paymentId);

      toast({
        title: 'Success',
        description: 'Payment deleted successfully',
      });

      setDeletingPaymentId(null);
      await loadQuotation(id);
      await loadPayments(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete payment',
        variant: 'destructive',
      });
    }
  };

  const handleRefundPayment = async (payment: Payment) => {
    if (!id) return;

    try {
      await paymentsApi.create({
        quotation_id: id,
        amount: -payment.amount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: payment.payment_method,
        cash_received_by: payment.cash_received_by,
        notes: `Refund for payment on ${formatDate(payment.payment_date)}${payment.notes ? ` - Original note: ${payment.notes}` : ''}`,
      });

      toast({
        title: 'Success',
        description: 'Refund recorded successfully',
      });

      await loadQuotation(id);
      await loadPayments(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to record refund',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      amount: payment.amount.toString(),
      payment_date: payment.payment_date,
      payment_method: payment.payment_method,
      cash_received_by: payment.cash_received_by || '',
      notes: payment.notes || '',
    });
    setShowPaymentDialog(true);
  };

  const handleConvertToInvoice = async () => {
    if (!id || !quotation) return;

    if (quotation.remaining_balance !== 0) {
      toast({
        title: 'Cannot Convert',
        description: 'Remaining balance must be zero to convert to invoice',
        variant: 'destructive',
      });
      return;
    }

    try {
      const invoiceNumber = await quotationsApi.convertToInvoice(id);
      
      toast({
        title: 'Success',
        description: `Converted to Invoice: ${invoiceNumber}`,
      });

      setShowConvertDialog(false);
      await loadQuotation(id);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to convert to invoice',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleStartEditDevice = (device: Device) => {
    setEditingDeviceId(device.id);
    setEditDeviceForm({
      device_name: device.device_name || getDeviceName(device),
      brand: device.brand || '',
      quantity: device.quantity || 1,
      unit_price: device.unit_price || 0
    });
  };

  const handleSaveDeviceEdit = async (deviceId: string) => {
    if (!quotation || !id) return;
    try {
      const devices = quotation.devices_data as Device[];
      const updatedDevices = devices.map(d => 
        d.id === deviceId ? { 
          ...d, 
          device_name: editDeviceForm.device_name,
          brand: editDeviceForm.brand,
          quantity: editDeviceForm.quantity,
          unit_price: editDeviceForm.unit_price
        } : d
      );
      
      // Calculate new total amount
      const devicesTotal = updatedDevices.reduce((sum, device) => {
        const price = device.unit_price || 0;
        const quantity = device.quantity || 1;
        const subtotal = price * quantity;
        const vat = subtotal * ((device.vat_rate || 0) / 100);
        return sum + subtotal + vat;
      }, 0);

      const subtotalBeforeDiscount = devicesTotal + formData.commissioning_price + formData.visit_price + formData.installation_price;
      
      let discountAmount = 0;
      if (formData.discount_type && formData.discount_value > 0) {
        if (formData.discount_type === 'percentage') {
          discountAmount = subtotalBeforeDiscount * (formData.discount_value / 100);
        } else {
          discountAmount = formData.discount_value;
        }
      }

      const newTotalAmount = subtotalBeforeDiscount - discountAmount;
      const newRemainingBalance = newTotalAmount - quotation.total_paid;

      await quotationsApi.update(id, {
        devices_data: updatedDevices,
        total_amount: newTotalAmount,
        remaining_balance: newRemainingBalance,
      });
      
      setEditingDeviceId(null);
      await loadQuotation(id);
      toast({
        title: 'Success',
        description: 'Device updated successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update device',
        variant: 'destructive',
      });
    }
  };

  const handleCancelDeviceEdit = () => {
    setEditingDeviceId(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  const getStatusBadgeVariant = (_status: string) => 'secondary' as const;

  const STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
    'Draft':          ['Approved'],
    'Approved':       ['Invoiced', 'Partially Paid', 'Pipeline', 'Declined'],
    'Pipeline':       ['Approved', 'Invoiced', 'Partially Paid', 'Declined'],
    'Declined':       ['Approved', 'Pipeline'],
    'Invoiced':       ['Fully Paid', 'Partially Paid'],
    'Partially Paid': ['Invoiced', 'Fully Paid'],
    'Fully Paid':     [],
  };

  // Pending status change awaiting pipeline/decline confirmation
  const [pendingViewChange, setPendingViewChange] = useState<QuotationStatus | null>(null);
  // Status audit trail
  const [auditLog, setAuditLog] = useState<QuotationStatusAudit[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);

  const loadAuditLog = async (qid: string) => {
    setIsAuditLoading(true);
    try {
      const rows = await quotationStatusAuditApi.getForQuotation(qid);
      setAuditLog(rows as QuotationStatusAudit[]);
    } catch { /* non-critical */ }
    finally { setIsAuditLoading(false); }
  };

  const applyViewStatusChange = async (newStatus: QuotationStatus) => {
    if (!quotation) return;
    try {
      await quotationsApi.updateStatus(quotation.id, newStatus);
      await quotationStatusAuditApi.record(quotation.id, quotation.status, newStatus);
      setQuotation(prev => prev ? { ...prev, status: newStatus } : prev);
      loadAuditLog(quotation.id);
      toast({ title: 'Status Updated', description: `Changed to "${newStatus}"` });
    } catch (err) {
      console.error('[StatusChange] Failed:', err);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const handleViewStatusChange = (newStatus: QuotationStatus) => {
    if (!quotation) return;
    if (needsPipelineConfirmation(quotation.status, newStatus)) {
      setPendingViewChange(newStatus);
    } else {
      applyViewStatusChange(newStatus);
    }
  };

  const getDeviceName = (device: Device): string => {
    const lang = currentLanguage;
    const parts: string[] = [];
    
    // Add device name if available
    if (device.device_name) {
      parts.push(device.device_name);
    }
    
    // Add brand if available
    if (device.brand) {
      parts.push(device.brand);
    }
    
    // Add model if available
    if (device.model) {
      parts.push(device.model);
    }
    
    // Add category-specific details
    if (device.category === 'mini_switch') {
      const gangText = translate(`${device.gang}_gang`, lang);
      parts.push(`${translateCategory('mini_switch', lang)} ${gangText}`);
    } else if (device.category === 'touch_switch') {
      const gangText = translate(`${device.gang}_gang`, lang);
      parts.push(`${translateCategory('touch_switch', lang)} ${gangText}`);
    } else if (device.category === 'shutter_switch') {
      parts.push(translateCategory('shutter_switch', lang));
    } else if (device.category === 'smart_shutter_switch') {
      parts.push(translateCategory('smart_shutter_switch', lang));
    } else if (device.category === 'ir_remote') {
      parts.push(translateCategory('ir_remote', lang));
    } else if (device.category === 'gas_sensor') {
      parts.push(translateCategory('gas_sensor', lang));
    } else if (device.category === 'water_leak_sensor') {
      parts.push(translateCategory('water_leak_sensor', lang));
    } else if (device.category === 'gas_valve') {
      parts.push(translateCategory('gas_valve', lang));
    } else if (device.category === 'water_valve') {
      parts.push(translateCategory('water_valve', lang));
    } else if (device.category === 'intercom') {
      parts.push(device.intercom_type === 'doorbell' ? translate('doorbell', lang) : translate('indoor_station', lang));
    } else if (device.category === 'camera') {
      const resolution = translate(device.camera_resolution || '2mp', lang);
      const type = translate(device.camera_type || 'indoor', lang);
      parts.push(`${translateCategory('camera', lang)} ${resolution} ${type}`);
    } else if (device.category === 'access_point') {
      parts.push(translateCategory('access_point', lang));
    } else if (device.category === 'mesh_wifi') {
      parts.push(`${translateCategory('mesh_wifi', lang)}${device.mesh_model ? ` (${device.mesh_model})` : ''}`);
    } else if (device.category === 'network_switch') {
      parts.push(`${translateCategory('network_switch', lang)}${device.port_count ? ` (${device.port_count} ${translate('ports', lang)})` : ''}`);
    } else if (device.category === 'nvr') {
      parts.push(`${translateCategory('nvr', lang)}${device.hdd_capacity ? ` (${device.hdd_capacity.toUpperCase()})` : ''}`);
    } else if (device.category === 'hdd') {
      parts.push(`${translateCategory('hdd', lang)}${device.hdd_capacity ? ` (${device.hdd_capacity.toUpperCase()})` : ''}`);
    } else if (device.category === 'cat6_cable') {
      parts.push(`${translateCategory('cat6_cable', lang)}${device.cable_length ? ` (${device.cable_length}m)` : ''}`);
    } else if (device.category === 'custom_device') {
      parts.push(device.custom_name || translateCategory('custom_device', lang));
    } else {
      parts.push(translateCategory(device.category, lang));
    }
    
    // Return combined parts or just category if no specific details
    return parts.length > 0 ? parts.join(' - ') : translateCategory(device.category, lang);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Quotation not found</p>
            <Button onClick={() => navigate('/quotations')} className="mt-4">
              Back to Quotations
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const rooms = quotation.rooms_data as Room[];
  const devices = quotation.devices_data as Device[];
  const isReadOnly = quotation.is_invoice;

  const categoryDisplayNames: { [key: string]: string } = categoryLabels;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/quotations')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quotations
          </Button>
          
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print Current View
          </Button>
        </div>
        
        <div className="flex gap-2">
          {quotation.is_editable && (
            <>
              <Select value={currentLanguage} onValueChange={(value) => handleSwitchLanguage(value as QuotationLanguage)}>
                <SelectTrigger className="w-[180px]">
                  <Languages className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية (Arabic)</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => navigate(`/?edit=${id}`)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Quotation
              </Button>
            </>
          )}
          
          {!isReadOnly && (
            <>
              <Button onClick={handleSaveQuotation} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Quotation
              </Button>
              {quotation.remaining_balance === 0 && !quotation.is_invoice && (
                <Button onClick={() => setShowConvertDialog(true)} variant="default">
                  <FileCheck className="h-4 w-4 mr-2" />
                  Convert to Invoice
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <div className="w-full overflow-x-auto">
          <TabsList className="inline-flex w-auto min-w-full justify-start">
            <TabsTrigger value="details" className="flex-shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="devices" className="flex-shrink-0">
              <Package className="h-4 w-4 mr-2" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-shrink-0">Payments</TabsTrigger>
            {/* Backup tab hidden - Google Sheets blocked, use Excel export instead */}
            {/* <TabsTrigger value="backup" className="flex-shrink-0">
              <Cloud className="h-4 w-4 mr-2" />
              Backup
            </TabsTrigger> */}
            <TabsTrigger value="versions" className="flex-shrink-0">
              <History className="h-4 w-4 mr-2" />
              Amendment & Version History
            </TabsTrigger>
            <TabsTrigger
              value="status-history"
              className="flex-shrink-0"
              onClick={() => quotation && loadAuditLog(quotation.id)}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Status History
            </TabsTrigger>
            <TabsTrigger value="print" className="flex-shrink-0">
              <Printer className="h-4 w-4 mr-2" />
              Print & Export
            </TabsTrigger>
            {isAdminUser && (
              <TabsTrigger value="cost-analysis" className="flex-shrink-0">
                <TrendingUp className="h-4 w-4 mr-2" />
                Cost Analysis
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <TabsContent value="details" className="space-y-6">
          {/* Pipeline / Declined / Approved warning banner */}
          {quotation && ['Approved', 'Pipeline', 'Declined'].includes(quotation.status) && (
            <PipelineWarningBanner status={quotation.status as QuotationStatus} variant="banner" />
          )}

          {/* Pipeline confirmation dialog */}
          <AlertDialog open={!!pendingViewChange} onOpenChange={open => { if (!open) setPendingViewChange(null); }}>
            <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-amber-700 dark:text-amber-400">Revenue Exclusion Warning</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <span className="block">
                    Moving this quotation from <strong>Approved</strong> to <strong>{pendingViewChange}</strong> will{' '}
                    <span className="text-destructive font-semibold">exclude it from all financial calculations and revenue reports.</span>
                  </span>
                  <span className="block text-sm">
                    Only <strong>Invoiced</strong> or <strong>Partially Paid</strong> quotations count toward revenue. You can revert this change later if needed.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setPendingViewChange(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-amber-600 hover:bg-amber-700"
                  onClick={() => {
                    if (pendingViewChange) applyViewStatusChange(pendingViewChange);
                    setPendingViewChange(null);
                  }}
                >
                  Confirm — Move to {pendingViewChange}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Quotation Approval Panel - Admin Only */}
          {isAdminUser && quotation && quotation.status === 'Draft' && !quotation.approved_by && !quotation.rejected_by && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Quotation Pending Approval</AlertTitle>
              <AlertDescription>
                <p className="mb-4">This quotation is awaiting admin approval before it can be sent to the client.</p>
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowApproveDialog(true)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Approve Quotation
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Quotation
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Approval Status Display */}
          {quotation?.approved_by && (
            <Alert>
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle>Quotation Approved</AlertTitle>
              <AlertDescription>
                <p>Approved on {quotation.approved_at ? new Date(quotation.approved_at).toLocaleDateString() : 'N/A'}</p>
                {quotation.approval_notes && (
                  <p className="mt-2"><strong>Notes:</strong> {quotation.approval_notes}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {quotation?.rejected_by && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Quotation Rejected</AlertTitle>
              <AlertDescription>
                <p>Rejected on {quotation.rejected_at ? new Date(quotation.rejected_at).toLocaleDateString() : 'N/A'}</p>
                {quotation.rejection_reason && (
                  <p className="mt-2"><strong>Reason:</strong> {quotation.rejection_reason}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Price Update Panel - Admin Only */}
          {quotation?.pending_price_update && (
            <QuotationPriceUpdatePanel
              quotationId={quotation.id}
              hasPendingUpdate={quotation.pending_price_update}
              onUpdateApplied={() => id && loadQuotation(id)}
              onUpdateIgnored={() => id && loadQuotation(id)}
            />
          )}

          {/* Price Change Alert */}
          {priceChange && priceChange.hasChanges && !quotation?.pending_price_update && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Price Update Notice</AlertTitle>
              <AlertDescription>
                Prices have increased by {priceChange.percentageIncrease.toFixed(2)}% since this quotation was created
                {priceChange.priceSnapshotDate && (
                  <> on {new Date(priceChange.priceSnapshotDate).toLocaleDateString()}</>
                )}.
                {priceChange.affectedDevices.length > 0 && (
                  <div className="mt-2 text-sm">
                    <strong>Affected devices:</strong>
                    <ul className="list-disc list-inside mt-1">
                      {priceChange.affectedDevices.slice(0, 3).map((device, idx) => (
                        <li key={idx}>
                          {device.name}: {device.oldPrice.toFixed(2)} EGP → {device.newPrice.toFixed(2)} EGP 
                          ({device.increase > 0 ? '+' : ''}{device.increase.toFixed(1)}%)
                        </li>
                      ))}
                      {priceChange.affectedDevices.length > 3 && (
                        <li>...and {priceChange.affectedDevices.length - 3} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <FileText className="h-6 w-6" />
                    {quotation.is_invoice ? quotation.invoice_number : quotation.project_code}
                    <Badge variant="outline" className="ml-2 text-sm font-normal">
                      V{quotation.current_version || 1}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {quotation.is_invoice ? 'Invoice' : 'Quotation'} • Created on {formatDate(quotation.created_at)}
                    {quotation.last_edited_at && (
                      <> • Last edited {formatDate(quotation.last_edited_at)}</>
                    )}
                    {quotation.last_amendment_date && (
                      <span className="text-amber-600 font-semibold ml-2">
                        • Amended on {formatDate(quotation.last_amendment_date)}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {isAdminUser && STATUS_TRANSITIONS[quotation.status]?.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="inline-flex items-center gap-1 focus:outline-none" title="Change status">
                          <StatusBadge status={quotation.status} />
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Change status to:</div>
                        <DropdownMenuSeparator />
                        {STATUS_TRANSITIONS[quotation.status].map(next => (
                          <DropdownMenuItem key={next} onClick={() => handleViewStatusChange(next)} className="gap-2">
                            <StatusBadge status={next} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <StatusBadge status={quotation.status} />
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Information */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Client Information
                  </h3>
                  {!isReadOnly && (
                    <Button
                      size="sm"
                      onClick={handleSaveClientInfo}
                      disabled={isSavingClient}
                      variant={clientSaved ? 'secondary' : 'default'}
                      className="h-8 gap-1.5"
                    >
                      {isSavingClient ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : clientSaved ? (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {isSavingClient ? 'Saving…' : clientSaved ? 'Saved!' : 'Save Client Info'}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Code</Label>
                    <Input
                      value={formData.project_code}
                      onChange={(e) => setFormData({ ...formData, project_code: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Name <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="Enter client name"
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input
                      placeholder="Enter address"
                      value={formData.client_address}
                      onChange={(e) => setFormData({ ...formData, client_address: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      placeholder="Enter phone number"
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Client Approval */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Client Approval
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="client_approval"
                      checked={formData.client_approval}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          client_approval: checked as boolean,
                          approval_date: checked ? new Date().toISOString().split('T')[0] : formData.approval_date,
                        });
                      }}
                      disabled={isReadOnly}
                    />
                    <Label htmlFor="client_approval" className="cursor-pointer">
                      Client Approval
                    </Label>
                  </div>
                  <div className="space-y-2">
                    <Label>Approval Date</Label>
                    <Input
                      type="date"
                      value={formData.approval_date}
                      onChange={(e) => setFormData({ ...formData, approval_date: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Installation & Warranty */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Installation & Warranty
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Installation Date *</Label>
                    <Input
                      type="date"
                      value={formData.installation_date}
                      onChange={(e) => setFormData({ ...formData, installation_date: e.target.value })}
                      disabled={isReadOnly}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Warranty Start Date</Label>
                    <Input
                      value={formatDate(quotation.warranty_start_date)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Warranty End Date</Label>
                    <Input
                      value={formatDate(quotation.warranty_end_date)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Summary */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Financial Summary
                </h3>
                
                {/* Info Alert */}
                <Alert className="mb-4">
                  <DollarSign className="h-4 w-4" />
                  <AlertTitle>Editable Service Fees</AlertTitle>
                  <AlertDescription>
                    Commissioning and Installation fees can be edited directly below. 
                    These amounts may vary based on actual installation requirements. 
                    The total will update automatically when you save changes.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">VAT:</span>
                      <span className="font-medium">{quotation.vat_percentage}%</span>
                    </div>
                    
                    {/* Editable Commissioning Fee */}
                    <div className="space-y-2">
                      <Label htmlFor="commissioning_price" className="text-sm text-muted-foreground">
                        Commissioning Fee (Editable)
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">EGP</span>
                        <Input
                          id="commissioning_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.commissioning_price}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0) {
                              setFormData({ 
                                ...formData, 
                                commissioning_price: value
                              });
                            }
                          }}
                          className="flex-1"
                          disabled={quotation.is_invoice}
                        />
                      </div>
                    </div>
                    
                    {/* Editable Visit Fee */}
                    <div className="space-y-2">
                      <Label htmlFor="visit_price" className="text-sm text-muted-foreground">
                        Visit Fee (Editable)
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">EGP</span>
                        <Input
                          id="visit_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.visit_price}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0) {
                              setFormData({ 
                                ...formData, 
                                visit_price: value
                              });
                            }
                          }}
                          className="flex-1"
                          disabled={quotation.is_invoice}
                        />
                      </div>
                    </div>
                    
                    {/* Editable Installation Fee */}
                    <div className="space-y-2">
                      <Label htmlFor="installation_price" className="text-sm text-muted-foreground">
                        Installation & Commissioning Fee (ICU)
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">EGP</span>
                        <Input
                          id="installation_price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.installation_price}
                          onChange={(e) => {
                            const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                            if (!isNaN(value) && value >= 0) {
                              setFormData({ 
                                ...formData, 
                                installation_price: value
                              });
                            }
                          }}
                          className="flex-1"
                          disabled={quotation.is_invoice}
                        />
                      </div>
                    </div>

                    {/* Editable Discount Section */}
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Discount (Editable)</Label>
                      <div className="flex flex-col gap-2">
                        <Select
                          value={formData.discount_type || 'none'}
                          onValueChange={(value) => setFormData({ 
                            ...formData, 
                            discount_type: value === 'none' ? null : value as any,
                            discount_value: value === 'none' ? 0 : formData.discount_value
                          })}
                          disabled={quotation.is_invoice}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Discount Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Discount</SelectItem>
                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                            <SelectItem value="fixed">Fixed Amount (EGP)</SelectItem>
                          </SelectContent>
                        </Select>

                        {formData.discount_type && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {formData.discount_type === 'percentage' ? '%' : 'EGP'}
                            </span>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={formData.discount_value}
                              onChange={(e) => {
                                const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                if (!isNaN(value) && value >= 0) {
                                  setFormData({ ...formData, discount_value: value });
                                }
                              }}
                              className="flex-1"
                              placeholder={formData.discount_type === 'percentage' ? 'Percentage' : 'Amount'}
                              disabled={quotation.is_invoice}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold">Current Total:</span>
                      <span className="font-bold">{formatCurrency(quotation.total_amount)}</span>
                    </div>
                    
                    {/* Show new calculated total if commissioning/installation changed */}
                    {hasChanges && (
                      <div className="flex justify-between text-lg border-t pt-2">
                        <span className="font-semibold text-primary">New Total (After Save):</span>
                        <span className="font-bold text-primary">{formatCurrency(calculatedTotal)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Paid:</span>
                      <span className="font-medium text-green-600">{formatCurrency(quotation.total_paid)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Remaining Balance:</span>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(hasChanges ? calculatedTotal - quotation.total_paid : quotation.remaining_balance)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rooms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Rooms ({rooms.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {rooms.length === 0 ? (
                        <div className="col-span-full p-8 text-center border-2 border-dashed rounded-lg bg-muted/20">
                          <p className="text-muted-foreground">No rooms found in this quotation data. (Debug: rooms_data length = {quotation.rooms_data?.length || 0})</p>
                        </div>
                      ) : (
                        rooms.map((room) => (
                          <div key={room.id} className="p-4 border rounded-lg">
                            <h4 className="font-semibold">{room.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {devices.filter(d => d.room_id === room.id).length} devices
                            </p>
                          </div>
                        ))
                      )}
              </div>
            </CardContent>
          </Card>

          {/* Devices Summary in Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {translate('device', currentLanguage)}s ({devices.length})
              </CardTitle>
              <CardDescription>Quick summary - Click "Devices" tab for full details and notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(devicesByCategory).map(([categoryGroup, categoryDevices]) => (
                  <div key={categoryGroup} className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">{categoryGroup}</p>
                    <p className="text-2xl font-bold text-primary">{categoryDevices.length}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Devices Tab with Notes Feature */}
        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {translate('device', currentLanguage)}s ({devices.length})
              </CardTitle>
              <CardDescription>
                Add installation notes directly in the "Installation Notes" column for each device
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(devicesByCategory).map(([categoryGroup, categoryDevices]) => (
                <div key={categoryGroup} className="space-y-2">
                  <h3 className="font-semibold text-lg text-primary border-b pb-2">
                    {categoryGroup}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{translate('device', currentLanguage)} {translate('name', currentLanguage)}</TableHead>
                        <TableHead>{translate('room', currentLanguage)}</TableHead>
                        <TableHead>{translate('protocol', currentLanguage)}</TableHead>
                        <TableHead className="text-right">{translate('quantity', currentLanguage)}</TableHead>
                        <TableHead className="text-right">{translate('unit_price', currentLanguage)}</TableHead>
                        <TableHead className="text-right">{translate('total', currentLanguage)}</TableHead>
                        <TableHead className="w-64">Installation Notes</TableHead>
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryDevices.map((device) => {
                        const room = rooms.find(r => r.id === device.room_id);
                        const isEditing = editingDeviceId === device.id;
                        const total = isEditing 
                          ? editDeviceForm.unit_price * editDeviceForm.quantity
                          : (device.unit_price || 0) * (device.quantity || 1);
                        
                        const handleNoteChange = async (note: string) => {
                          try {
                            // Update device in quotation
                            const updatedDevices = devices.map(d => 
                              d.id === device.id ? { ...d, installation_note: note } : d
                            );
                            
                            // Update quotation with new devices data
                            await quotationsApi.update(quotation.id, {
                              devices_data: updatedDevices
                            });
                            
                            // Reload quotation
                            await loadQuotation(quotation.id);
                            
                            toast({
                              title: 'Success',
                              description: 'Note saved successfully.'
                            });
                          } catch (error) {
                            console.error('Error saving note:', error);
                            toast({
                              title: 'Error',
                              description: 'Failed to save note. Please try again.',
                              variant: 'destructive'
                            });
                          }
                        };
                        
                        return (
                          <TableRow key={device.id}>
                            <TableCell className="font-medium">
                              {isEditing ? (
                                <Input
                                  value={editDeviceForm.device_name}
                                  onChange={(e) => setEditDeviceForm({ ...editDeviceForm, device_name: e.target.value })}
                                  className="h-8"
                                />
                              ) : (
                                getDeviceName(device)
                              )}
                            </TableCell>
                            <TableCell>{room?.name || 'Unassigned'}</TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={editDeviceForm.brand}
                                  onChange={(e) => setEditDeviceForm({ ...editDeviceForm, brand: e.target.value })}
                                  placeholder="Brand"
                                  className="h-8 w-24"
                                />
                              ) : (
                                translateProtocol(device.protocol, currentLanguage) || '-'
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="1"
                                  value={editDeviceForm.quantity}
                                  onChange={(e) => setEditDeviceForm({ ...editDeviceForm, quantity: parseInt(e.target.value) || 1 })}
                                  className="h-8 w-20 ml-auto"
                                />
                              ) : (
                                device.quantity || 1
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={editDeviceForm.unit_price}
                                  onChange={(e) => setEditDeviceForm({ ...editDeviceForm, unit_price: parseFloat(e.target.value) || 0 })}
                                  className="h-8 w-28 ml-auto"
                                />
                              ) : (
                                <div className="flex items-center justify-end gap-1.5">
                                  <span>{formatCurrency(device.unit_price || 0)}</span>
                                  {(() => {
                                    const ps = devicePriceStatusMap[device.id];
                                    if (!ps || ps.status === 'not_in_db') return null;
                                    if (ps.status === 'current') {
                                      return (
                                        <TooltipProvider delayDuration={200}>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                              <p className="text-xs">Price matches database</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      );
                                    }
                                    // outdated
                                    const arrow = ps.diff > 0 ? '↓' : '↑';
                                    const label = ps.diff > 0
                                      ? `DB price is lower: ${formatCurrency(ps.currentDbPrice)} (${arrow}${formatCurrency(Math.abs(ps.diff))})`
                                      : `DB price is higher: ${formatCurrency(ps.currentDbPrice)} (${arrow}${formatCurrency(Math.abs(ps.diff))})`;
                                    return (
                                      <TooltipProvider delayDuration={200}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 cursor-help" />
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[220px]">
                                            <p className="text-xs font-medium text-amber-600">Price outdated</p>
                                            <p className="text-xs">{label}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  })()}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                            <TableCell>
                              <Input
                                type="text"
                                placeholder="Add installation notes..."
                                defaultValue={device.installation_note || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== device.installation_note) {
                                    handleNoteChange(e.target.value);
                                  }
                                }}
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {isEditing ? (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => handleSaveDeviceEdit(device.id)}>
                                      <CheckCircle2 className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={handleCancelDeviceEdit}>
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  !quotation.is_invoice && (
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => handleStartEditDevice(device)}>
                                      <Edit2 className="h-4 w-4" />
                                    </Button>
                                  )
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-muted/50">
                        <TableCell colSpan={6} className="text-right font-semibold">
                          {categoryGroup} Subtotal:
                        </TableCell>
                        <TableCell className="text-right font-bold text-primary">
                          {formatCurrency(
                            categoryDevices.reduce((sum, d) => sum + (d.unit_price || 0) * (d.quantity || 1), 0)
                          )}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backup tab hidden - Google Sheets blocked, use Excel export in Print & Export tab instead */}
        {/* <TabsContent value="backup" className="space-y-6">
          <GoogleSheetsBackup quotationId={quotation.id} />
        </TabsContent> */}

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment History</CardTitle>
                {!quotation.is_invoice && (
                  <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
                    <DialogTrigger asChild>
                      <Button>Add Payment</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingPayment ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
                        <DialogDescription>
                          {editingPayment ? 'Update payment details' : 'Record a new payment for this quotation'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Amount *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={paymentForm.amount}
                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Payment Date *</Label>
                          <Input
                            type="date"
                            value={paymentForm.payment_date}
                            onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Payment Method *</Label>
                          <Select
                            value={paymentForm.payment_method}
                            onValueChange={(value: PaymentMethod) =>
                              setPaymentForm({ ...paymentForm, payment_method: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="InstaPay">InstaPay</SelectItem>
                              <SelectItem value="Visa">Visa</SelectItem>
                              <SelectItem value="Cash">Cash</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {paymentForm.payment_method === 'Cash' && (
                          <div className="space-y-2">
                            <Label>Cash Received By</Label>
                            <Input
                              value={paymentForm.cash_received_by}
                              onChange={(e) => setPaymentForm({ ...paymentForm, cash_received_by: e.target.value })}
                              placeholder="Name of person who received cash"
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label>Notes</Label>
                          <Input
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                            placeholder="Optional notes"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => {
                          setShowPaymentDialog(false);
                          setEditingPayment(null);
                          setPaymentForm({
                            amount: '',
                            payment_date: new Date().toISOString().split('T')[0],
                            payment_method: 'InstaPay',
                            cash_received_by: '',
                            notes: '',
                          });
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={editingPayment ? handleEditPayment : handleAddPayment}>
                          {editingPayment ? 'Update Payment' : 'Add Payment'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Received By</TableHead>
                      <TableHead>Notes</TableHead>
                      {quotation?.status !== 'Invoiced' && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{formatDate(payment.payment_date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.payment_method}</Badge>
                        </TableCell>
                        <TableCell className={`font-medium ${payment.amount < 0 ? 'text-red-600' : ''}`}>
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>{payment.cash_received_by || '-'}</TableCell>
                        <TableCell className="text-muted-foreground">{payment.notes || '-'}</TableCell>
                        {quotation?.status !== 'Invoiced' && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(payment)}
                                title="Edit payment"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRefundPayment(payment)}
                                title="Create refund"
                                disabled={payment.amount < 0}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingPaymentId(payment.id)}
                                title="Delete payment"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      {/* Versions Tab */}
      <TabsContent value="versions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Amendment & Version History
              </CardTitle>
              <CardDescription>
                Track all changes and revisions made to this quotation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {versionHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-2">No version history available</p>
                  <p className="text-sm text-muted-foreground">
                    Version history will appear here when changes are made to the quotation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {versionHistory.map((version, index) => (
                    <div
                      key={version.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <Badge variant={index === 0 ? 'default' : 'outline'} className="text-sm">
                          V{version.version_number}
                        </Badge>
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {index === 0 ? 'Current Version' : `Version ${version.version_number}`}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Created on {formatDate(version.created_at)}
                            </p>
                            {version.last_edited_at && (
                              <p className="text-sm text-muted-foreground">
                                Last edited on {formatDate(version.last_edited_at)}
                              </p>
                            )}
                            {version.last_amendment_date && (
                              <p className="text-sm font-semibold text-amber-600">
                                Amendment Date: {formatDate(version.last_amendment_date)}
                              </p>
                            )}
                            {(version.editor_username || version.editor_email) && (
                              <p className="text-sm font-medium text-primary mt-1">
                                Edited by: {version.editor_username || version.editor_email}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold">
                              {formatCurrency(version.total_amount)}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Client: </span>
                            <span className="font-medium">{version.client_name || 'Not specified'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Project Code: </span>
                            <span className="font-medium">{version.project_code}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Commissioning: </span>
                            <span className="font-medium">{formatCurrency(version.commissioning_price)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Visit Fee: </span>
                            <span className="font-medium">{formatCurrency(version.visit_price)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Installation: </span>
                            <span className="font-medium">{formatCurrency(version.installation_price)}</span>
                          </div>
                        </div>
                        {version.client_approval && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span>Client Approved</span>
                            {version.approval_date && (
                              <span className="text-muted-foreground">
                                on {formatDate(version.approval_date)}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewVersion(version.quotation_id, version.version_number)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Full Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Status History Tab */}
        <TabsContent value="status-history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Status History
              </CardTitle>
              <CardDescription>
                Full audit trail of status changes for this quotation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isAuditLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : auditLog.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No status changes recorded yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Status changes will appear here after the first update</p>
                </div>
              ) : (
                <div className="space-y-0 divide-y">
                  {auditLog.map((entry, idx) => (
                    <div key={entry.id} className="flex items-start gap-4 py-4">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center shrink-0 mt-1">
                        <div className={`h-2.5 w-2.5 rounded-full ${idx === 0 ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                        {idx < auditLog.length - 1 && <div className="w-px flex-1 bg-border mt-1 min-h-[1.5rem]" />}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {entry.from_status ? (
                            <>
                              <StatusBadge status={entry.from_status} />
                              <span className="text-muted-foreground text-xs">→</span>
                              <StatusBadge status={entry.to_status} />
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground italic">Initial status</span>
                              <span className="text-muted-foreground text-xs">→</span>
                              <StatusBadge status={entry.to_status} />
                            </>
                          )}
                          {idx === 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">Latest</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {new Date(entry.created_at).toLocaleString('en-GB', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </span>
                          {entry.changed_by && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {entry.changed_by.slice(0, 8)}…
                            </span>
                          )}
                        </div>
                        {entry.notes && (
                          <p className="mt-1 text-xs text-muted-foreground italic">"{entry.notes}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Print Tab */}
        <TabsContent value="print" className="space-y-6">
          {/* Print & PDF Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                Print & PDF Export
              </CardTitle>
              <CardDescription>
                Print or export this quotation to PDF format
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
                <Button 
                  onClick={handleExportPDF} 
                  className="flex-1"
                  variant="outline"
                  size="lg"
                  disabled={isExporting}
                >
                  {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                  Export Full PDF
                </Button>
                <Button
                  onClick={handleExportBriefPDF}
                  className="flex-1"
                  variant="outline"
                  size="lg"
                  disabled={isBriefExporting}
                >
                  {isBriefExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                  Export Brief Quotation
                </Button>
              </div>
              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg print:hidden">
                <p className="font-medium mb-2">💡 PDF Export Tips:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Use "Export Full PDF" (Recommended) for a professional document</li>
                  <li>"Print Current View" prints exactly what you see on the screen</li>
                  <li>The exported PDF includes payment history, approval dates and guarantee periods</li>
                  <li>For browser printing, switch to the tab you want to print first</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Excel & CSV Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="h-5 w-5" />
                Data Export
              </CardTitle>
              <CardDescription>
                Export quotation data to Excel, CSV, or JSON format with professional styling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
                <Button 
                  onClick={handleExportExcel} 
                  size="lg"
                  className="w-full"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export to Excel
                </Button>
                <Button 
                  onClick={handleExportCSV} 
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export to CSV
                </Button>
                <Button 
                  onClick={handleExportJSON} 
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <FileDown className="h-4 w-4 mr-2" />
                  Export to JSON
                </Button>
              </div>
              <div className="text-sm text-muted-foreground bg-muted p-4 rounded-lg print:hidden">
                <p className="font-medium mb-2">📊 Data Export Formats:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Excel (.xlsx)</strong>: Professional multi-sheet workbook with colors, borders, and formatting - includes overview, devices, rooms, and payments</li>
                  <li><strong>CSV (.csv)</strong>: Simple comma-separated format for easy import to other tools</li>
                  <li><strong>JSON (.json)</strong>: Complete data structure for developers and API integration</li>
                  <li>Excel export features light blue headers, gray section titles, green totals, and professional borders</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Analysis — admin only */}
        {isAdminUser && (
          <TabsContent value="cost-analysis" className="space-y-6">
            <CostAnalysisTab
              quotationId={quotation.id}
              devices={(quotation.devices_data as Device[]) || []}
              clientInfo={{ id: '', client_name: quotation.client_name || '', project_code: quotation.project_code || '', address: quotation.client_address || '', phone_number: quotation.client_phone || '', last_amendment_date: null, created_at: '', updated_at: '' } as ClientInfo}
              commissioningFee={quotation.commissioning_price || 0}
              visitFee={quotation.visit_price || 0}
              installationFee={quotation.installation_price || 0}
              quotationTotal={quotation.total_amount || 0}
              currentVersion={quotation.current_version || 1}
              onCostUpdate={() => id && loadQuotation(id)}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Convert to Invoice Dialog */}
      <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert to Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The quotation will be converted to an invoice and all fields will be locked.
              No further edits can be made.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConvertToInvoice}>
              Convert to Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment Dialog */}
      <AlertDialog open={!!deletingPaymentId} onOpenChange={(open) => !open && setDeletingPaymentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The payment record will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingPaymentId && handleDeletePayment(deletingPaymentId)}>
              Delete Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Version Details Dialog */}
      <Dialog open={showVersionDialog} onOpenChange={setShowVersionDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version {selectedVersion?.version_number} Details
            </DialogTitle>
            <DialogDescription>
              Complete details of this quotation version
            </DialogDescription>
          </DialogHeader>

          {isLoadingVersion ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : selectedVersion ? (
            <div className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Project Code</Label>
                    <p className="font-medium">{selectedVersion.project_code}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Version Number</Label>
                    <p className="font-medium">V{selectedVersion.version_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Client Name</Label>
                    <p className="font-medium">{selectedVersion.client_name || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Client Phone</Label>
                    <p className="font-medium">{selectedVersion.client_phone || 'Not specified'}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">Client Address</Label>
                    <p className="font-medium">{selectedVersion.client_address || 'Not specified'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Global Protocol</Label>
                    <p className="font-medium">{translateProtocol(selectedVersion.global_protocol, currentLanguage)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">VAT Percentage</Label>
                    <p className="font-medium">{selectedVersion.vat_percentage}%</p>
                  </div>
                  {selectedVersion.editor_username && (
                    <div>
                      <Label className="text-muted-foreground">Last Edited By</Label>
                      <p className="font-medium text-primary">{selectedVersion.editor_username}</p>
                    </div>
                  )}
                  {selectedVersion.last_edited_at && (
                    <div>
                      <Label className="text-muted-foreground">Last Edited At</Label>
                      <p className="font-medium">{formatDate(selectedVersion.last_edited_at)}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Rooms */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Home className="h-5 w-5" />
                    Rooms ({(selectedVersion.rooms_data as Room[]).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {(selectedVersion.rooms_data as Room[]).map((room) => (
                      <div key={room.id} className="p-3 border rounded-lg">
                        <p className="font-medium">{room.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Devices by Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Devices ({(selectedVersion.devices_data as Device[]).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.entries(
                    (selectedVersion.devices_data as Device[]).reduce((acc, device) => {
                      const category = device.category;
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(device);
                      return acc;
                    }, {} as { [key: string]: Device[] })
                  ).map(([category, devices]) => (
                    <div key={category} className="mb-6 last:mb-0">
                      <h4 className="font-semibold mb-3 text-primary">
                        {translateCategory(category as any, currentLanguage)} ({devices.length})
                      </h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Device</TableHead>
                            <TableHead>Room</TableHead>
                            <TableHead>Protocol</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">VAT</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {devices.map((device) => {
                            const subtotal = (device.unit_price || 0) * (device.quantity || 1);
                            const vat = subtotal * ((device.vat_rate || 0) / 100);
                            const total = subtotal + vat;
                            const room = (selectedVersion.rooms_data as Room[]).find(r => r.id === device.room_id);
                            
                              return (
                              <TableRow key={device.id}>
                                <TableCell className="font-medium">{getDeviceName(device)}</TableCell>
                                <TableCell>{room?.name || 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {translateProtocol(device.protocol, currentLanguage)}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">{device.quantity || 1}</TableCell>
                                <TableCell className="text-right">{formatCurrency(device.unit_price || 0)}</TableCell>
                                <TableCell className="text-right">{device.vat_rate || 0}%</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(total)}</TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Devices Total:</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        (selectedVersion.devices_data as Device[]).reduce((sum, device) => {
                          const subtotal = (device.unit_price || 0) * (device.quantity || 1);
                          const vat = subtotal * ((device.vat_rate || 0) / 100);
                          return sum + subtotal + vat;
                        }, 0)
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Commissioning Price:</span>
                    <span className="font-semibold">{formatCurrency(selectedVersion.commissioning_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Visit Fee:</span>
                    <span className="font-semibold">{formatCurrency(selectedVersion.visit_price)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Installation Price:</span>
                    <span className="font-semibold">{formatCurrency(selectedVersion.installation_price)}</span>
                  </div>

                  {selectedVersion.discount_value > 0 && (
                    <div className="flex justify-between text-destructive font-medium">
                      <span>
                        Discount ({selectedVersion.discount_type === 'percentage' 
                          ? `${selectedVersion.discount_value}%` 
                          : 'Fixed'})
                      </span>
                      <span>
                        - {formatCurrency(
                          selectedVersion.discount_type === 'percentage'
                            ? (
                                (selectedVersion.devices_data as Device[]).reduce((sum, device) => {
                                  const subtotal = (device.unit_price || 0) * (device.quantity || 1);
                                  const vat = subtotal * ((device.vat_rate || 0) / 100);
                                  return sum + subtotal + vat;
                                }, 0) + 
                                (selectedVersion.commissioning_price || 0) + 
                                (selectedVersion.visit_price || 0) + 
                                (selectedVersion.installation_price || 0)
                              ) * (selectedVersion.discount_value / 100)
                            : selectedVersion.discount_value
                        )}
                      </span>
                    </div>
                  )}

                  <Separator />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Total Amount:</span>
                    <span className="font-bold text-primary">{formatCurrency(selectedVersion.total_amount)}</span>
                  </div>
                  {selectedVersion.client_approval && (
                    <div className="flex items-center gap-2 text-green-600 pt-2">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="font-medium">Client Approved</span>
                      {selectedVersion.approval_date && (
                        <span className="text-muted-foreground">
                          on {formatDate(selectedVersion.approval_date)}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No version data available</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVersionDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Quotation Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Quotation</DialogTitle>
            <DialogDescription>
              Approve this quotation to allow it to be sent to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Approval Notes (Optional)</Label>
              <Textarea
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleApproveQuotation} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Quotation Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quotation</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this quotation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Reason *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this quotation is being rejected..."
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRejectQuotation} disabled={isSaving || !rejectionReason.trim()}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

