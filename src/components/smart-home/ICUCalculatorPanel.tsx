/**
 * ICUCalculatorPanel
 *
 * Shows per-device I&C breakdown and a final total.
 * Supports Auto (formula + minimum) or Manual Override modes.
 * Calls onTotalChange whenever the final I&C amount changes so the
 * parent can feed it into the quotation total.
 *
 * ISOLATION GUARANTEE: this component NEVER writes to
 * commissioning_price, installation_price, or visit_price.
 */
import { useEffect } from 'react';
import { useICUCalculator, type ICUMode } from '@/hooks/useICUCalculator';
import type { Device } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wrench, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useState } from 'react';

function fmt(n: number) {
  return n.toLocaleString('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

interface Props {
  devices: Device[];
  /** Called whenever the final I&C total changes */
  onTotalChange: (total: number) => void;
  /** Optionally pass initial mode/amount restored from quotation */
  initialMode?: ICUMode;
  initialManualAmount?: number;
}

export default function ICUCalculatorPanel({
  devices,
  onTotalChange,
  initialMode = 'auto',
  initialManualAmount = 0,
}: Props) {
  const calc = useICUCalculator(devices);
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Apply initial values once settings have loaded
  useEffect(() => {
    if (!calc.isLoading) {
      calc.setMode(initialMode);
      if (initialMode === 'manual') calc.setManualAmount(initialManualAmount);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calc.isLoading]);

  // Notify parent whenever finalTotal changes
  useEffect(() => {
    onTotalChange(calc.finalTotal);
  }, [calc.finalTotal, onTotalChange]);

  const unmatchedCount = calc.lines.filter(l => !l.isMatched && l.quantity > 0).length;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-primary" />
            Installation &amp; Commissioning Calculator (ICU)
            {calc.isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant={calc.mode === 'manual' ? 'default' : 'secondary'} className="text-[10px]">
              {calc.mode === 'manual' ? 'Manual Override' : 'Auto'}
            </Badge>
            <span className="text-base font-bold text-primary tabular-nums">
              EGP {fmt(calc.finalTotal)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* ── Auto / Manual toggle ── */}
        <div className="flex flex-wrap items-center gap-4 p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2">
            <button
              role="switch"
              aria-checked={calc.mode === 'manual'}
              onClick={() => {
                const next: ICUMode = calc.mode === 'manual' ? 'auto' : 'manual';
                calc.setMode(next);
                if (next === 'auto') calc.setManualAmount(0);
              }}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${calc.mode === 'manual' ? 'bg-primary' : 'bg-input'}`}
              id="icu-mode"
            >
              <span className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${calc.mode === 'manual' ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <Label htmlFor="icu-mode" className="text-xs cursor-pointer font-medium">
              Manual Override
            </Label>
          </div>

          {calc.mode === 'manual' ? (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">I&amp;C Amount (EGP)</Label>
              <Input
                type="number"
                min="0"
                step="50"
                className="h-8 w-36 text-sm"
                value={calc.manualAmount || ''}
                onChange={e => calc.setManualAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Auto = max(calculated, minimum EGP {fmt(calc.icMinimum)}).
              Rate: EGP {fmt(calc.icuRate)}/ICU.
            </p>
          )}
        </div>

        {/* ── Summary strip (auto mode) ── */}
        {calc.mode === 'auto' && !calc.isLoading && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Calculated</p>
              <p className="text-sm font-semibold tabular-nums">EGP {fmt(calc.calculatedTotal)}</p>
            </div>
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Minimum</p>
              <p className="text-sm font-semibold tabular-nums">EGP {fmt(calc.icMinimum)}</p>
            </div>
            <div className={`rounded-md px-3 py-2 ${calc.finalTotal > calc.calculatedTotal ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}`}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Final I&amp;C</p>
              <p className="text-sm font-bold text-primary tabular-nums">EGP {fmt(calc.finalTotal)}</p>
              {calc.finalTotal > calc.calculatedTotal && (
                <p className="text-[9px] text-amber-600 mt-0.5">minimum applied</p>
              )}
            </div>
          </div>
        )}

        {/* ── Unmatched warning ── */}
        {unmatchedCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-md px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {unmatchedCount} device type{unmatchedCount !== 1 ? 's' : ''} have no ICU rule and contribute EGP 0.
            Add rules in the ICU Database panel.
          </div>
        )}

        {/* ── Breakdown toggle ── */}
        {calc.lines.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1 -ml-1"
            onClick={() => setShowBreakdown(p => !p)}
          >
            {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showBreakdown ? 'Hide' : 'Show'} per-device breakdown
          </Button>
        )}

        {/* ── Breakdown table ── */}
        {showBreakdown && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Device</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">Qty</th>
                  <th className="text-center px-3 py-2 font-medium text-muted-foreground">ICU</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Mode</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Unit I&amp;C</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {calc.lines.map(line => (
                  <tr key={line.deviceId} className={`hover:bg-muted/30 ${!line.isMatched ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2">
                      <span className="max-w-[180px] truncate block">{line.label}</span>
                      {!line.isMatched && (
                        <span className="text-[10px] text-amber-600">no rule</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">{line.quantity}</td>
                    <td className="px-3 py-2 text-center">{line.icuValue || '—'}</td>
                    <td className="px-3 py-2">
                      <Badge variant={line.pricingMode === 'fixed' ? 'default' : 'outline'} className="text-[10px]">
                        {line.pricingMode}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {line.unitIcCost > 0 ? `EGP ${fmt(line.unitIcCost)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {line.lineTotal > 0 ? `EGP ${fmt(line.lineTotal)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold bg-muted/30">
                  <td colSpan={5} className="px-3 py-2 text-xs">Calculated subtotal</td>
                  <td className="px-3 py-2 text-right tabular-nums">EGP {fmt(calc.calculatedTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ── PDF note ── */}
        <p className="text-[10px] text-muted-foreground border-t pt-2">
          Customer PDF will show: <strong>Installation &amp; Commissioning — EGP {fmt(calc.finalTotal)}</strong>.
          ICU breakdown is internal only.
        </p>
      </CardContent>
    </Card>
  );
}
