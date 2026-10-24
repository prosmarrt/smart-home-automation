import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { quotationsApi, quotationStatusAuditApi } from '@/db/api';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Quotation, QuotationStatus } from '@/types/types';
import { Loader2, FileText, Trash2, Eye, Pencil, Save, Check, X, BarChart3, ChevronDown, Filter, SortAsc, SortDesc, CheckSquare, Square, Receipt } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import QuotationsAnalyticsTab, { StatusBadge } from '@/components/smart-home/QuotationsAnalyticsTab';
import ExpensesTab from '@/components/smart-home/ExpensesTab';
import { PipelineWarningBanner, needsPipelineConfirmation } from '@/components/smart-home/PipelineWarningBanner';
import { isAdmin as checkIsAdmin } from '@/db/api';

const ALL_STATUSES: QuotationStatus[] = ['Draft', 'Approved', 'Pipeline', 'Declined', 'Invoiced', 'Partially Paid', 'Fully Paid'];

const STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  'Draft':          ['Approved'],
  'Approved':       ['Invoiced', 'Partially Paid', 'Pipeline', 'Declined'],
  'Pipeline':       ['Approved', 'Invoiced', 'Partially Paid', 'Declined'],
  'Declined':       ['Approved', 'Pipeline'],
  'Invoiced':       ['Fully Paid', 'Partially Paid'],
  'Partially Paid': ['Invoiced', 'Fully Paid'],
  'Fully Paid':     [],
};

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState({ client_name: '', client_phone: '' });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [changingStatusId, setChangingStatusId] = useState<string | null>(null);

  // Filter & sort state
  const [filterStatuses, setFilterStatuses] = useState<QuotationStatus[]>([]);
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | null>(null);

  // Bulk-select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<QuotationStatus | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState(false);
  const [isBulkChanging, setIsBulkChanging] = useState(false);

  // Pending single-status change awaiting pipeline confirmation
  const [pendingChange, setPendingChange] = useState<{ quotation: Quotation; newStatus: QuotationStatus } | null>(null);

  // Expenses total — updated live by ExpensesTab via callback
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isAdminUser, setIsAdminUser] = useState(false);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Check admin once on mount
  useEffect(() => { checkIsAdmin().then(setIsAdminUser).catch(() => {}); }, []);

  useEffect(() => { loadQuotations(); }, []);

  const loadQuotations = async () => {
    try {
      const data = await quotationsApi.getAll();
      setQuotations(data);
    } catch {
      toast({ title: 'Error', description: 'Failed to load quotations', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await quotationsApi.delete(id);
      toast({ title: 'Success', description: 'Quotation deleted successfully' });
      loadQuotations();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete quotation', variant: 'destructive' });
    }
  };

  /** Execute a single status change (after any confirmation is resolved) */
  const applyStatusChange = async (quotation: Quotation, newStatus: QuotationStatus) => {
    setChangingStatusId(quotation.id);
    try {
      await quotationsApi.updateStatus(quotation.id, newStatus);
      await quotationStatusAuditApi.record(quotation.id, quotation.status, newStatus);
      setQuotations(prev => prev.map(q => q.id === quotation.id ? { ...q, status: newStatus } : q));
      toast({ title: 'Status Updated', description: `"${quotation.project_code}" → ${newStatus}` });
    } catch (err) {
      console.error('[StatusChange] Failed:', err);
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setChangingStatusId(null);
    }
  };

  /** Request a status change — shows confirmation dialog for revenue-exclusion transitions */
  const handleStatusChange = (quotation: Quotation, newStatus: QuotationStatus) => {
    if (needsPipelineConfirmation(quotation.status, newStatus)) {
      setPendingChange({ quotation, newStatus });
    } else {
      applyStatusChange(quotation, newStatus);
    }
  };

  /* ── Bulk operations ──────────────────────────────────────────────── */
  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleSelectAll = () =>
    setSelectedIds(prev => prev.size === filteredSorted.length
      ? new Set()
      : new Set(filteredSorted.map(q => q.id)));

  const handleBulkChangeRequest = (target: QuotationStatus) => {
    setBulkTarget(target);
    setIsBulkConfirmOpen(true);
  };

  const executeBulkChange = async () => {
    if (!bulkTarget) return;
    setIsBulkChanging(true);
    const toChange = filteredSorted.filter(q => selectedIds.has(q.id));
    let ok = 0;
    for (const q of toChange) {
      try {
        await quotationsApi.updateStatus(q.id, bulkTarget);
        await quotationStatusAuditApi.record(q.id, q.status, bulkTarget);
        ok++;
      } catch (err) {
        console.error('[BulkStatus] Failed for', q.id, err);
      }
    }
    setQuotations(prev => prev.map(q =>
      selectedIds.has(q.id) ? { ...q, status: bulkTarget! } : q
    ));
    setSelectedIds(new Set());
    setIsBulkChanging(false);
    setIsBulkConfirmOpen(false);
    setBulkTarget(null);
    toast({ title: 'Bulk Update Complete', description: `${ok} of ${toChange.length} quotations updated to "${bulkTarget}"` });
  };

  /* ── Filtering & sorting ──────────────────────────────────────────── */
  const toggleFilterStatus = (s: QuotationStatus) =>
    setFilterStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const filteredSorted = useMemo(() => {
    let list = filterStatuses.length > 0
      ? quotations.filter(q => filterStatuses.includes(q.status))
      : quotations;
    if (sortDir) {
      list = [...list].sort((a, b) => {
        const cmp = a.status.localeCompare(b.status);
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return list;
  }, [quotations, filterStatuses, sortDir]);

  /* ── Edit helpers ─────────────────────────────────────────────────── */
  const openEdit = (q: Quotation) => {
    setEditingId(q.id);
    setEditDraft({ client_name: q.client_name || '', client_phone: q.client_phone || '' });
  };
  const closeEdit = () => { setEditingId(null); setEditDraft({ client_name: '', client_phone: '' }); };

  const handleSaveEdit = async (id: string) => {
    if (!editDraft.client_name.trim()) {
      toast({ title: 'Validation Error', description: 'Client name is required.', variant: 'destructive' });
      return;
    }
    setIsSavingEdit(true);
    try {
      await quotationsApi.update(id, { client_name: editDraft.client_name, client_phone: editDraft.client_phone || null });
      setQuotations(prev => prev.map(q => q.id === id ? { ...q, client_name: editDraft.client_name, client_phone: editDraft.client_phone || null } : q));
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
      closeEdit();
      toast({ title: 'Updated', description: 'Client info saved.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to update client info.', variant: 'destructive' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(amount);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Count chips for filter bar ──────────────────────────────────── */
  const statusCounts = ALL_STATUSES.reduce<Record<string, number>>((acc, s) => {
    acc[s] = quotations.filter(q => q.status === s).length;
    return acc;
  }, {});

  /* ── Bulk actions: only statuses reachable from ALL selected ─────── */
  const selectedQuotations = filteredSorted.filter(q => selectedIds.has(q.id));
  const bulkTransitions: QuotationStatus[] = selectedQuotations.length > 0
    ? ALL_STATUSES.filter(target =>
        selectedQuotations.every(q =>
          q.status !== target && STATUS_TRANSITIONS[q.status]?.includes(target)
        )
      )
    : [];

  return (
    <>
      {/* ── Pipeline/Declined confirmation dialog ───────────────────── */}
      <AlertDialog open={!!pendingChange} onOpenChange={open => { if (!open) setPendingChange(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              Revenue Exclusion Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                Moving <strong>{pendingChange?.quotation.project_code}</strong> from{' '}
                <strong>Approved</strong> to <strong>{pendingChange?.newStatus}</strong> will{' '}
                <span className="text-destructive font-semibold">permanently exclude it from all financial calculations and revenue reports.</span>
              </span>
              <span className="block text-sm">
                Only quotations in <strong>Invoiced</strong> or <strong>Partially Paid</strong> status are included in revenue. This action is reversible — you can move the quotation back to Approved if needed.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingChange(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-amber-600 hover:bg-amber-700"
              onClick={() => {
                if (pendingChange) applyStatusChange(pendingChange.quotation, pendingChange.newStatus);
                setPendingChange(null);
              }}
            >
              Confirm — Move to {pendingChange?.newStatus}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Bulk confirmation dialog ─────────────────────────────────── */}
      <AlertDialog open={isBulkConfirmOpen} onOpenChange={setIsBulkConfirmOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk Status Change</AlertDialogTitle>
            <AlertDialogDescription>
              Change <strong>{selectedIds.size}</strong> selected quotation{selectedIds.size !== 1 ? 's' : ''} to{' '}
              <strong>{bulkTarget}</strong>?
              {bulkTarget && ['Pipeline', 'Declined'].includes(bulkTarget) && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠ This will exclude all selected quotations from revenue reporting.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkChanging}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeBulkChange} disabled={isBulkChanging}>
              {isBulkChanging ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Apply to {selectedIds.size} quotation{selectedIds.size !== 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <div className="container mx-auto p-3 sm:p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            Saved Quotations
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            View, manage and analyse your saved quotations
          </p>
        </div>
        <Button onClick={() => navigate('/')} className="w-full sm:w-auto">
          Create New Quotation
        </Button>
      </div>

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list" className="gap-1.5">
            <FileText className="h-4 w-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-1.5">
            <Receipt className="h-4 w-4" />
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <QuotationsAnalyticsTab quotations={quotations} totalExpenses={totalExpenses} />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpensesTab isAdmin={isAdminUser} onTotalChange={setTotalExpenses} />
        </TabsContent>

        <TabsContent value="list">
          {/* ── Filter + sort bar ───────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <Filter className="h-3.5 w-3.5" />
              Filter:
            </span>
            {ALL_STATUSES.filter(s => statusCounts[s] > 0).map(s => (
              <button
                key={s}
                onClick={() => toggleFilterStatus(s)}
                className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
                  filterStatuses.includes(s)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background hover:bg-muted'
                }`}
              >
                <StatusBadge status={s} />
                <span className="font-medium tabular-nums">{statusCounts[s]}</span>
              </button>
            ))}
            {filterStatuses.length > 0 && (
              <button onClick={() => setFilterStatuses([])} className="text-xs text-muted-foreground hover:text-foreground underline">
                Clear
              </button>
            )}
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : d === 'desc' ? null : 'asc')}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted"
                title="Sort by status"
              >
                {sortDir === 'asc' ? <SortAsc className="h-3.5 w-3.5" /> : sortDir === 'desc' ? <SortDesc className="h-3.5 w-3.5" /> : <SortAsc className="h-3.5 w-3.5 opacity-40" />}
                <span>Status</span>
              </button>
            </div>
          </div>

          {/* ── Bulk action toolbar (appears when items selected) ─── */}
          {selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
              <span className="text-xs font-medium text-primary shrink-0">
                {selectedIds.size} selected
              </span>
              <span className="text-xs text-muted-foreground shrink-0">— Move to:</span>
              {bulkTransitions.length > 0 ? bulkTransitions.map(t => (
                <button
                  key={t}
                  onClick={() => handleBulkChangeRequest(t)}
                  className="inline-flex items-center gap-1"
                >
                  <StatusBadge status={t} />
                </button>
              )) : (
                <span className="text-xs text-muted-foreground italic">No common transitions available</span>
              )}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

      <Card>
        <CardHeader>
          <CardDescription className="text-xs sm:text-sm">
            {filteredSorted.length} of {quotations.length} quotation{quotations.length !== 1 ? 's' : ''}{filterStatuses.length > 0 ? ' (filtered)' : ''} — click View to open details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {filteredSorted.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {quotations.length === 0 ? 'No saved quotations yet' : 'No quotations match the current filter'}
                </p>
                {quotations.length === 0 && (
                  <Button onClick={() => navigate('/')}>Create Your First Quotation</Button>
                )}
              </div>
            ) : (
              <>
                {/* Select-all row */}
                <div className="flex items-center gap-2 px-1 pb-1 border-b">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {selectedIds.size === filteredSorted.length && filteredSorted.length > 0
                      ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                      : <Square className="h-3.5 w-3.5" />
                    }
                    {selectedIds.size === filteredSorted.length && filteredSorted.length > 0 ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
              {filteredSorted.map((quotation) => (
                <div
                  key={quotation.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg transition-colors gap-3 ${
                    selectedIds.has(quotation.id) ? 'border-primary/40 bg-primary/5' : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                      {/* Checkbox */}
                      <Checkbox
                        checked={selectedIds.has(quotation.id)}
                        onCheckedChange={() => toggleSelect(quotation.id)}
                        className="shrink-0"
                        aria-label={`Select ${quotation.project_code}`}
                      />
                      <h3 className="font-semibold text-base sm:text-lg">
                        {quotation.is_invoice ? quotation.invoice_number : quotation.project_code}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        V{quotation.current_version || 1}
                      </Badge>
                      {/* Status badge + quick-change dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="inline-flex items-center gap-1 focus:outline-none"
                            disabled={changingStatusId === quotation.id}
                            title="Change status"
                          >
                            <StatusBadge status={quotation.status} />
                            {changingStatusId === quotation.id
                              ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                              : <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            }
                          </button>
                        </DropdownMenuTrigger>
                        {(STATUS_TRANSITIONS[quotation.status]?.length ?? 0) > 0 && (
                          <DropdownMenuContent align="start" className="w-52">
                            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Change status to:</div>
                            <DropdownMenuSeparator />
                            {STATUS_TRANSITIONS[quotation.status].map(next => (
                              <DropdownMenuItem
                                key={next}
                                onClick={() => handleStatusChange(quotation, next)}
                                className="gap-2"
                              >
                                <StatusBadge status={next} />
                                {['Pipeline', 'Declined'].includes(next) && (
                                  <span className="ml-auto text-[10px] text-muted-foreground">excl. revenue</span>
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        )}
                      </DropdownMenu>
                    </div>

                    {/* Pipeline/Declined/Approved warning banner — inline compact */}
                    {['Approved', 'Pipeline', 'Declined'].includes(quotation.status) && (
                      <div className="mb-2">
                        <PipelineWarningBanner status={quotation.status as QuotationStatus} variant="inline" />
                      </div>
                    )}

                    {/* Inline-editable client name + phone */}
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        {quotation.client_name || <span className="italic">No client name</span>}
                        {quotation.client_phone && (
                          <span className="ml-1">• {quotation.client_phone}</span>
                        )}
                      </span>

                      <Popover
                        open={editingId === quotation.id}
                        onOpenChange={(open) => { if (!open) closeEdit(); }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => { e.stopPropagation(); openEdit(quotation); }}
                            title="Edit client info"
                          >
                            {savedId === quotation.id
                              ? <Check className="h-3.5 w-3.5 text-green-600" />
                              : <Pencil className="h-3.5 w-3.5" />
                            }
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-4" align="start" onClick={(e) => e.stopPropagation()}>
                          <p className="text-sm font-semibold mb-3">Edit Client Info</p>
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Client Name <span className="text-destructive">*</span></Label>
                              <Input
                                value={editDraft.client_name}
                                onChange={(e) => setEditDraft(d => ({ ...d, client_name: e.target.value }))}
                                placeholder="Enter client name"
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(quotation.id); if (e.key === 'Escape') closeEdit(); }}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Phone</Label>
                              <Input
                                value={editDraft.client_phone}
                                onChange={(e) => setEditDraft(d => ({ ...d, client_phone: e.target.value }))}
                                placeholder="Enter phone number"
                                className="h-8 text-sm"
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(quotation.id); if (e.key === 'Escape') closeEdit(); }}
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <Button
                                size="sm"
                                className="flex-1 h-8 gap-1.5"
                                onClick={() => handleSaveEdit(quotation.id)}
                                disabled={isSavingEdit}
                              >
                                {isSavingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                Save
                              </Button>
                              <Button variant="outline" size="sm" className="h-8" onClick={closeEdit}>
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                      <span>Created: {formatDate(quotation.created_at)}</span>
                      <span>Total: {formatCurrency(quotation.total_amount)}</span>
                      {quotation.remaining_balance > 0 && (
                        <span className="text-orange-600 font-medium">
                          Balance: {formatCurrency(quotation.remaining_balance)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/quotation/${quotation.id}`)}
                      className="flex-1 sm:flex-none"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-shrink-0">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this quotation? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(quotation.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
              </>
            )}
          </div>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
    </>
  );
}
