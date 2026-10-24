/**
 * ICUDatabaseManager
 *
 * Admin-only component for managing the ICU item database:
 * add / edit / deactivate items, set ICU value, pricing mode, fixed price,
 * and map to device categories.
 *
 * Also exposes the global ICU Rate and Minimum I&C settings.
 */
import { useEffect, useState } from 'react';
import { icuItemsApi, icuSettingsApi } from '@/db/api';
import type { ICUItem, ICUSettings } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Settings, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const DEVICE_CATEGORIES = [
  'mini_switch', 'touch_switch', 'shutter_switch', 'smart_shutter_switch',
  'mini_shutter_switch', 'touch_shutter_switch', 'curtain_switch', 'curtain_motor',
  'ir_remote', 'motion_sensor', 'presence_sensor', 'door_window_sensor',
  'water_leak_sensor', 'gas_sensor', 'smoke_sensor', 'gas_valve', 'water_valve',
  'zigbee_hub', 'matter_hub', 'camera', 'wifi_camera', 'smart_lock',
  'intercom', 'access_point', 'repeater', 'mesh_wifi', 'network_switch',
  'central_control', 'voice_assistant', 'custom_device',
];

const GANG_OPTIONS = ['', '1', '2', '3', '4', '5', '6', '7', '8'];

const EMPTY_FORM = {
  label: '', device_category: 'mini_switch', gang: '', switch_type: '',
  icu_value: '', pricing_mode: 'formula' as 'formula' | 'fixed',
  fixed_price: '', is_active: true, sort_order: '0',
};

export default function ICUDatabaseManager() {
  const [items, setItems] = useState<ICUItem[]>([]);
  const [settings, setSettings] = useState<ICUSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const [dialog, setDialog] = useState<'add' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<ICUItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Global settings editing
  const [settingsEdit, setSettingsEdit] = useState({ rate: '', minimum: '' });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  async function load() {
    setIsLoading(true);
    try {
      const [its, s] = await Promise.all([icuItemsApi.list(), icuSettingsApi.get()]);
      setItems(its);
      setSettings(s);
      if (s) setSettingsEdit({ rate: String(s.icu_rate), minimum: String(s.ic_minimum) });
    } catch { toast.error('Failed to load ICU data'); }
    finally { setIsLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM });
    setDialog('add');
  }
  function openEdit(item: ICUItem) {
    setEditingItem(item);
    setForm({
      label: item.label,
      device_category: item.device_category,
      gang: item.gang ?? '',
      switch_type: item.switch_type ?? '',
      icu_value: String(item.icu_value),
      pricing_mode: item.pricing_mode,
      fixed_price: item.fixed_price != null ? String(item.fixed_price) : '',
      is_active: item.is_active,
      sort_order: String(item.sort_order),
    });
    setDialog('edit');
  }

  async function save() {
    if (!form.label.trim() || !form.icu_value) return;
    setIsSaving(true);
    try {
      const payload = {
        label: form.label.trim(),
        device_category: form.device_category,
        gang: form.gang || null,
        switch_type: form.switch_type || null,
        icu_value: parseFloat(form.icu_value),
        pricing_mode: form.pricing_mode,
        fixed_price: form.pricing_mode === 'fixed' && form.fixed_price ? parseFloat(form.fixed_price) : null,
        is_active: form.is_active,
        sort_order: parseInt(form.sort_order) || 0,
      };
      if (dialog === 'edit' && editingItem) {
        const updated = await icuItemsApi.update(editingItem.id, payload);
        setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
        toast.success('ICU item updated');
      } else {
        const created = await icuItemsApi.create(payload);
        setItems(prev => [...prev, created]);
        toast.success('ICU item created');
      }
      setDialog(null);
    } catch (e: unknown) { toast.error((e as Error).message ?? 'Save failed'); }
    finally { setIsSaving(false); }
  }

  async function toggleActive(item: ICUItem) {
    try {
      const updated = await icuItemsApi.update(item.id, { is_active: !item.is_active });
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
      toast.success(updated.is_active ? 'Item activated' : 'Item deactivated');
    } catch { toast.error('Failed to toggle item'); }
  }

  async function deleteItem(id: string) {
    try {
      await icuItemsApi.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Item deleted');
    } catch { toast.error('Failed to delete'); }
    finally { setDeletingId(null); }
  }

  async function saveSettings() {
    const rate = parseFloat(settingsEdit.rate);
    const minimum = parseFloat(settingsEdit.minimum);
    if (isNaN(rate) || isNaN(minimum)) return;
    setIsSavingSettings(true);
    try {
      const updated = await icuSettingsApi.update(rate, minimum);
      setSettings(updated);
      toast.success('ICU settings saved');
    } catch { toast.error('Failed to save settings'); }
    finally { setIsSavingSettings(false); }
  }

  const displayed = items.filter(i => showInactive || i.is_active);

  return (
    <Card>
      <CardHeader
        className="pb-2 pt-3 px-4 cursor-pointer select-none"
        onClick={() => setExpanded(p => !p)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            ICU Database — Installation &amp; Commissioning Rules
            <Badge variant="outline" className="text-[10px]">{items.filter(i => i.is_active).length} active</Badge>
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs gap-1"
              onClick={e => { e.stopPropagation(); openAdd(); }}>
              <Plus className="h-3 w-3" /> Add Rule
            </Button>
            {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </div>
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 px-4 pb-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <>
              {/* ── Global settings ── */}
              <div className="flex flex-wrap items-end gap-4 mb-4 p-3 rounded-lg bg-muted/50 border">
                <div className="grid gap-1">
                  <Label className="text-xs">ICU Rate (EGP / unit)</Label>
                  <Input className="h-8 w-28 text-sm" value={settingsEdit.rate}
                    onChange={e => setSettingsEdit(p => ({ ...p, rate: e.target.value }))} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Minimum I&amp;C (EGP)</Label>
                  <Input className="h-8 w-32 text-sm" value={settingsEdit.minimum}
                    onChange={e => setSettingsEdit(p => ({ ...p, minimum: e.target.value }))} />
                </div>
                <Button size="sm" className="h-8" onClick={saveSettings} disabled={isSavingSettings}>
                  {isSavingSettings && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Save Settings
                </Button>
                <p className="text-xs text-muted-foreground self-center">
                  Formula: Qty × ICU Value × Rate. Smart Lock uses Fixed Price regardless of rate.
                </p>
              </div>

              {/* ── Show inactive toggle ── */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  role="switch"
                  aria-checked={showInactive}
                  onClick={() => setShowInactive(p => !p)}
                  id="show-inactive"
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${showInactive ? 'bg-primary' : 'bg-input'}`}
                >
                  <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${showInactive ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <Label htmlFor="show-inactive" className="text-xs cursor-pointer">Show inactive rules</Label>
              </div>

              {/* ── Items table ── */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b bg-muted/40">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Label</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Gang</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">ICU Val</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Mode</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Fixed Price</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Active</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {displayed.map(item => (
                      <tr key={item.id} className={`hover:bg-muted/30 ${!item.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2 font-medium">{item.label}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.device_category}</td>
                        <td className="px-3 py-2 text-muted-foreground">{item.gang ?? '—'}</td>
                        <td className="px-3 py-2 text-right font-semibold">{item.icu_value}</td>
                        <td className="px-3 py-2">
                          <Badge variant={item.pricing_mode === 'fixed' ? 'default' : 'secondary'} className="text-[10px]">
                            {item.pricing_mode}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {item.pricing_mode === 'fixed' && item.fixed_price != null
                            ? `EGP ${item.fixed_price.toLocaleString()}`
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            role="switch"
                            aria-checked={item.is_active}
                            onClick={() => toggleActive(item)}
                            className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${item.is_active ? 'bg-primary' : 'bg-input'}`}
                          >
                            <span className={`pointer-events-none block h-3 w-3 rounded-full bg-background shadow-lg ring-0 transition-transform ${item.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(item)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => setDeletingId(item.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {displayed.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">No ICU rules found.</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={!!dialog} onOpenChange={open => { if (!open) setDialog(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog === 'edit' ? 'Edit ICU Rule' : 'New ICU Rule'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Label <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. 2G Touch Switch" value={form.label}
                onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Device Category <span className="text-destructive">*</span></Label>
                <Select value={form.device_category} onValueChange={v => setForm(p => ({ ...p, device_category: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-60">
                    {DEVICE_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Gang (optional)</Label>
                <Select value={form.gang} onValueChange={v => setForm(p => ({ ...p, gang: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Any" /></SelectTrigger>
                  <SelectContent>
                    {GANG_OPTIONS.map(g => <SelectItem key={g} value={g} className="text-xs">{g || 'Any / N/A'}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">ICU Value <span className="text-destructive">*</span></Label>
                <Input type="number" min="0" step="0.25" placeholder="e.g. 1.5" value={form.icu_value}
                  onChange={e => setForm(p => ({ ...p, icu_value: e.target.value }))} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Pricing Mode</Label>
                <Select value={form.pricing_mode} onValueChange={v => setForm(p => ({ ...p, pricing_mode: v as 'formula' | 'fixed' }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formula">Formula (Qty × ICU × Rate)</SelectItem>
                    <SelectItem value="fixed">Fixed Price per Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.pricing_mode === 'fixed' && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Fixed Price (EGP per unit)</Label>
                <Input type="number" min="0" step="1" placeholder="e.g. 1300" value={form.fixed_price}
                  onChange={e => setForm(p => ({ ...p, fixed_price: e.target.value }))} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" min="0" value={form.sort_order}
                  onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <button
                  role="switch"
                  aria-checked={form.is_active}
                  onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${form.is_active ? 'bg-primary' : 'bg-input'}`}
                >
                  <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${form.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <Label className="text-xs">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={save} disabled={isSaving || !form.label.trim() || !form.icu_value}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {dialog === 'edit' ? 'Save Changes' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <AlertDialog open={!!deletingId} onOpenChange={open => { if (!open) setDeletingId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ICU Rule?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes the rule. Existing quotations are unaffected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && deleteItem(deletingId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
