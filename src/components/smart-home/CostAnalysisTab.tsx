import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/db/supabase';
import type { Device, DevicePrice, ClientInfo } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, DollarSign, ShoppingCart, BarChart3, AlertCircle, FileDown, Loader2, Save, RotateCcw } from 'lucide-react';
import { exportCostAnalysisToPDF } from '@/utils/pdfExportLazy';

interface Props {
  quotationId?: string;
  devices: Device[];
  clientInfo?: ClientInfo | null;
  commissioningFee?: number;
  visitFee?: number;
  installationFee?: number;
  quotationTotal: number;
  currentVersion?: number;
  onCostUpdate?: () => void;
}

interface LineRow {
  ids: string[];         // device IDs associated with this row
  mapKey: string;
  label: string;
  qty: number;
  sellPrice: number;     // unit sell price
  originalCostPrice: number; // catalog unit cost
  costPrice: number;     // effective unit cost
  revenue: number;       // qty × sell
  cost: number;          // qty × cost
  profit: number;
  margin: number;        // %
}

function buildLabel(d: Device): string {
  if (d.custom_name) return d.custom_name;
  if (d.device_name) return d.device_name;
  let label = d.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  if (d.gang) label += ` ${d.gang}G`;
  if (d.camera_resolution) label += ` ${d.camera_resolution.toUpperCase()}`;
  if (d.brand) label += ` (${d.brand})`;
  return label;
}

function fmt(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function marginColor(pct: number) {
  if (pct >= 40) return 'text-emerald-600';
  if (pct >= 20) return 'text-amber-600';
  return 'text-red-600';
}

export default function CostAnalysisTab({ quotationId, devices, clientInfo, commissioningFee = 0, visitFee = 0, installationFee = 0, quotationTotal, currentVersion = 1, onCostUpdate }: Props) {
  const [priceMap, setPriceMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [costOverrides, setCostOverrides] = useState<Record<string, number>>({});
  const { toast } = useToast();

  useEffect(() => {
    const fetchCosts = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('device_prices')
        .select('category, protocol, gang, intercom_type, camera_resolution, camera_type, device_name, brand, model, cost_price');

      if (data) {
        const map = new Map<string, number>();
        (data as DevicePrice[]).forEach(p => {
          // Build a lookup key matching how devices are typically matched
          const key = [
            p.category,
            p.protocol ?? '',
            p.gang ?? '',
            p.intercom_type ?? '',
            p.camera_resolution ?? '',
            p.camera_type ?? '',
          ].join('|');
          map.set(key, p.cost_price ?? 0);

          // Also map by device_name for custom devices
          if (p.device_name) {
            map.set(`name:${p.device_name}`, p.cost_price ?? 0);
          }
          
          // Map by brand + model as another fallback
          if (p.brand && p.model) {
            map.set(`brand_model:${p.brand}|${p.model}`, p.cost_price ?? 0);
          }
        });
        setPriceMap(map);
      }
      setLoading(false);
    };
    fetchCosts();
  }, []);

  const getCatalogCost = (d: Device): number => {
    // 1. Try exact device_name match
    if (d.device_name) {
      const byName = priceMap.get(`name:${d.device_name}`);
      if (byName !== undefined) return byName;
    }
    // 2. Try custom_name matching against device_name in DB
    if (d.custom_name) {
      const byCustomName = priceMap.get(`name:${d.custom_name}`);
      if (byCustomName !== undefined) return byCustomName;
    }
    // 3. Try to match by brand and model if they exist
    if (d.brand && d.model) {
      const byBrandModel = priceMap.get(`brand_model:${d.brand}|${d.model}`);
      if (byBrandModel !== undefined) return byBrandModel;
    }
    // 4. Fallback to generic category attributes
    const key = [
      d.category,
      d.protocol ?? '',
      d.gang ?? '',
      (d as any).intercom_type ?? '',
      d.camera_resolution ?? '',
      d.camera_type ?? '',
    ].join('|');
    return priceMap.get(key) ?? 0;
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const modifiedDevices = devices.map(d => {
        const label = buildLabel(d);
        const mapKey = `${label}|${d.unit_price}`;
        const effective = costOverrides[mapKey] !== undefined ? costOverrides[mapKey] : (d.cost_price ?? getCatalogCost(d));
        return { ...d, cost_price: effective };
      });

      await exportCostAnalysisToPDF({
        devices: modifiedDevices,
        clientInfo,
        commissioningFee,
        visitFee,
        installationFee,
        quotationTotal,
        costPriceMap: priceMap,
        currentVersion,
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!quotationId) {
      toast({ title: 'Error', description: 'No active quotation found', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Create a map of device ID to new cost price
      const updatesMap = new Map<string, number>();
      for (const [mapKey, newCost] of Object.entries(costOverrides)) {
        const row = rowMap.get(mapKey);
        if (row) {
          for (const id of row.ids) {
            updatesMap.set(id, newCost);
          }
        }
      }
      
      // Update the devices array from the quotation
      const updatedDevices = devices.map(d => {
        if (d.id && updatesMap.has(d.id)) {
          return { ...d, cost_price: updatesMap.get(d.id) };
        }
        return d;
      });

      const { error } = await supabase
        .from('quotations')
        .update({ devices_data: updatedDevices as any })
        .eq('id', quotationId);
        
      if (error) throw error;
      
      toast({ title: 'Cost Adjustments Saved', description: 'The modified costs have been saved to this quotation.' });
      setCostOverrides({});
      if (onCostUpdate) onCostUpdate();
    } catch (e: any) {
      toast({ title: 'Failed to save', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Build rows — aggregate by label+sell
  const rowMap = useMemo(() => {
    const map = new Map<string, LineRow>();
    for (const d of devices) {
      const qty = d.category === 'cat6_cable' && d.cable_length ? d.cable_length : d.quantity;
      const label = buildLabel(d);
      const sellPrice = d.unit_price;
      const mapKey = `${label}|${sellPrice}`;

      const catalogCost = getCatalogCost(d);
      const effectiveCost = costOverrides[mapKey] !== undefined ? costOverrides[mapKey] : (d.cost_price ?? catalogCost);

      const existing = map.get(mapKey);
      if (existing) {
        if (d.id) existing.ids.push(d.id);
        existing.qty += qty;
        existing.revenue += sellPrice * qty;
        existing.cost += effectiveCost * qty;
        existing.profit = existing.revenue - existing.cost;
        existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
      } else {
        const revenue = sellPrice * qty;
        const cost = effectiveCost * qty;
        const profit = revenue - cost;
        map.set(mapKey, {
          ids: d.id ? [d.id] : [],
          mapKey,
          label, qty, sellPrice, 
          originalCostPrice: catalogCost,
          costPrice: effectiveCost, 
          revenue, cost, profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        });
      }
    }
    return map;
  }, [devices, costOverrides, priceMap]);

  const rows = Array.from(rowMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  const hasCostData = rows.some(r => r.costPrice > 0);
  const hasChanges = Object.keys(costOverrides).length > 0;

  // Totals for devices
  const totalDeviceRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const totalDeviceCost = rows.reduce((s, r) => s + r.cost, 0);
  const totalDeviceProfit = totalDeviceRevenue - totalDeviceCost;

  // Grand totals including services (we assume services are 100% margin if cost unknown)
  const totalRevenue = quotationTotal;
  const totalCost = totalDeviceCost; // services cost not tracked → conservative
  const totalProfit = totalRevenue - totalCost;
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-3" />
        Loading cost data…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Cost Analysis
            {hasChanges && <Badge variant="secondary" className="text-amber-600 bg-amber-50">Unsaved Changes</Badge>}
          </h2>
          <p className="text-sm text-muted-foreground">Admin-only profitability view — not visible to clients</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button
              variant="default"
              className="shrink-0 bg-amber-600 hover:bg-amber-700"
              onClick={handleSaveChanges}
              disabled={saving || loading}
            >
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Adjustments</>}
            </Button>
          )}
          <Button
            onClick={handleExportPDF}
            disabled={exporting || loading}
            className="shrink-0"
          >
            {exporting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Exporting…</>
              : <><FileDown className="h-4 w-4 mr-2" />Export Cost Analysis PDF</>
            }
          </Button>
        </div>
      </div>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-primary">EGP {fmt(totalRevenue)}</p>
            <p className="text-xs text-muted-foreground mt-1">Quotation total (incl. services)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-bold text-foreground">EGP {fmt(totalCost)}</p>
            <p className="text-xs text-muted-foreground mt-1">Devices purchase cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Gross Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              EGP {fmt(totalProfit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Revenue − device costs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Overall Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${marginColor(overallMargin)}`}>
              {overallMargin.toFixed(1)}%
            </p>
            <Badge variant="outline" className={`text-xs mt-1 ${overallMargin >= 40 ? 'border-emerald-400 text-emerald-600' : overallMargin >= 20 ? 'border-amber-400 text-amber-600' : 'border-red-400 text-red-600'}`}>
              {overallMargin >= 40 ? 'Healthy' : overallMargin >= 20 ? 'Moderate' : 'Low'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Services row */}
      {(commissioningFee > 0 || visitFee > 0 || installationFee > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Services</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-muted-foreground">
                    <th className="text-left p-2 font-medium">Service</th>
                    <th className="text-right p-2 font-medium whitespace-nowrap">Revenue (EGP)</th>
                    <th className="text-right p-2 font-medium whitespace-nowrap">Cost (EGP)</th>
                    <th className="text-right p-2 font-medium whitespace-nowrap">Profit (EGP)</th>
                    <th className="text-right p-2 font-medium">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {commissioningFee > 0 && (
                    <tr className="hover:bg-muted/40">
                      <td className="p-2">Commissioning Fee</td>
                      <td className="p-2 text-right">{fmt(commissioningFee)}</td>
                      <td className="p-2 text-right text-muted-foreground">—</td>
                      <td className="p-2 text-right text-emerald-600 font-medium">{fmt(commissioningFee)}</td>
                      <td className="p-2 text-right text-emerald-600">100%</td>
                    </tr>
                  )}
                  {visitFee > 0 && (
                    <tr className="hover:bg-muted/40">
                      <td className="p-2">Visit Fee</td>
                      <td className="p-2 text-right">{fmt(visitFee)}</td>
                      <td className="p-2 text-right text-muted-foreground">—</td>
                      <td className="p-2 text-right text-emerald-600 font-medium">{fmt(visitFee)}</td>
                      <td className="p-2 text-right text-emerald-600">100%</td>
                    </tr>
                  )}
                  {installationFee > 0 && (
                    <tr className="hover:bg-muted/40">
                      <td className="p-2">Installation Fee</td>
                      <td className="p-2 text-right">{fmt(installationFee)}</td>
                      <td className="p-2 text-right text-muted-foreground">—</td>
                      <td className="p-2 text-right text-emerald-600 font-medium">{fmt(installationFee)}</td>
                      <td className="p-2 text-right text-emerald-600">100%</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Device breakdown table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">Device Cost Breakdown</CardTitle>
            {!hasCostData && (
              <div className="flex items-center gap-2 text-amber-600 text-sm bg-amber-50 border border-amber-200 rounded-md px-3 py-1.5">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No cost prices set. Go to Pricing Management to add purchase costs.
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted text-muted-foreground">
                  <th className="text-left p-2 font-medium">Device</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">Qty</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">Sell (EGP)</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">Cost (EGP)</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">Revenue (EGP)</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">Cost Total (EGP)</th>
                  <th className="text-right p-2 font-medium whitespace-nowrap">Profit (EGP)</th>
                  <th className="text-right p-2 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className={`hover:bg-muted/40 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                    <td className="p-2 font-medium text-foreground">{r.label}</td>
                    <td className="p-2 text-right">{r.qty}</td>
                    <td className="p-2 text-right">{fmt(r.sellPrice)}</td>
                    <td className="p-2 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center justify-end gap-1">
                          {costOverrides[r.mapKey] !== undefined && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 text-muted-foreground hover:text-foreground shrink-0" 
                              onClick={() => {
                                const newOverrides = {...costOverrides};
                                delete newOverrides[r.mapKey];
                                setCostOverrides(newOverrides);
                              }}
                              title={`Reset to catalog default: ${fmt(r.originalCostPrice)}`}
                            >
                              <RotateCcw className="h-3 w-3" />
                            </Button>
                          )}
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={r.costPrice || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setCostOverrides({...costOverrides, [r.mapKey]: isNaN(val) ? 0 : val});
                            }}
                            className={`h-8 w-24 text-right px-2 py-1 ${costOverrides[r.mapKey] !== undefined ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' : ''}`}
                          />
                        </div>
                        {costOverrides[r.mapKey] !== undefined && (
                          <span className="text-[10px] text-muted-foreground mr-1">Orig: {fmt(r.originalCostPrice)}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-2 text-right">{fmt(r.revenue)}</td>
                    <td className="p-2 text-right text-muted-foreground">
                      {r.costPrice > 0 ? fmt(r.cost) : '—'}
                    </td>
                    <td className={`p-2 text-right font-medium ${r.costPrice > 0 ? (r.profit >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-muted-foreground'}`}>
                      {r.costPrice > 0 ? fmt(r.profit) : '—'}
                    </td>
                    <td className={`p-2 text-right font-semibold ${r.costPrice > 0 ? marginColor(r.margin) : 'text-muted-foreground'}`}>
                      {r.costPrice > 0 ? `${r.margin.toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted font-semibold">
                  <td className="p-2" colSpan={4}>Devices Subtotal</td>
                  <td className="p-2 text-right">{fmt(totalDeviceRevenue)}</td>
                  <td className="p-2 text-right">{totalDeviceCost > 0 ? fmt(totalDeviceCost) : '—'}</td>
                  <td className={`p-2 text-right ${totalDeviceProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {totalDeviceCost > 0 ? fmt(totalDeviceProfit) : '—'}
                  </td>
                  <td className={`p-2 text-right ${totalDeviceCost > 0 ? marginColor(totalDeviceRevenue > 0 ? (totalDeviceProfit / totalDeviceRevenue) * 100 : 0) : 'text-muted-foreground'}`}>
                    {totalDeviceCost > 0 && totalDeviceRevenue > 0
                      ? `${((totalDeviceProfit / totalDeviceRevenue) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Grand profit summary */}
      {hasCostData && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Total Quotation Value</p>
                <p className="text-2xl font-bold text-primary">EGP {fmt(totalRevenue)}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Total Device Cost</p>
                <p className="text-2xl font-bold text-foreground">EGP {fmt(totalCost)}</p>
                <p className="text-xs text-muted-foreground mt-1">Services cost not tracked</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Estimated Gross Profit</p>
                <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  EGP {fmt(totalProfit)}
                </p>
                <p className={`text-sm font-medium mt-1 ${marginColor(overallMargin)}`}>
                  {overallMargin.toFixed(1)}% overall margin
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
