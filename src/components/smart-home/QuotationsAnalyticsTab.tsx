import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Quotation } from '@/types/types';
import { REVENUE_STATUSES } from '@/types/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileCheck2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wrench,
  Eye,
  CalendarClock,
  GitBranch,
  Receipt,
  CreditCard,
  BarChart2,
} from 'lucide-react';

interface Props {
  quotations: Quotation[];
  totalExpenses?: number;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-EG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function ageInDays(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function ageSince(iso: string): string {
  const days = ageInDays(iso);
  if (days < 1) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}

function deriveCost(q: Quotation): number {
  if (!Array.isArray(q.devices_data)) return 0;
  return q.devices_data.reduce((acc, d) => {
    const cp = (d as { cost_price?: number }).cost_price ?? 0;
    return acc + cp * (d.quantity ?? 1);
  }, 0);
}

// ── Status badge ────────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    'Invoiced':        { cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-0', label: 'Invoiced' },
    'Partially Paid':  { cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-0',            label: 'Partially Paid' },
    'Fully Paid':      { cls: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0',        label: 'Fully Paid' },
    'Approved':        { cls: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 border-0',    label: 'Approved' },
    'Pipeline':        { cls: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border-0',    label: 'Pipeline' },
    'Declined':        { cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0',               label: 'Declined' },
    'Draft':           { cls: 'bg-secondary text-secondary-foreground border-0',                                       label: 'Draft' },
  };
  const c = cfg[status] ?? { cls: 'bg-secondary text-secondary-foreground border-0', label: status };
  return <Badge className={`${c.cls} text-[11px] whitespace-nowrap`}>{c.label}</Badge>;
}

export default function QuotationsAnalyticsTab({ quotations, totalExpenses = 0 }: Props) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const revenueQuotations = quotations.filter(q => REVENUE_STATUSES.includes(q.status));
    const invoiced      = quotations.filter(q => q.status === 'Invoiced');
    const partiallyPaid = quotations.filter(q => q.status === 'Partially Paid');
    const fullyPaid     = quotations.filter(q => q.status === 'Fully Paid');
    const pipeline      = quotations.filter(q => q.status === 'Pipeline');
    const declined      = quotations.filter(q => q.status === 'Declined');
    const approved      = quotations.filter(q => q.status === 'Approved');
    const draft         = quotations.filter(q => q.status === 'Draft');

    const totalRevenue = revenueQuotations.reduce((s, q) => s + (q.total_amount ?? 0), 0);
    const totalCost    = revenueQuotations.reduce((s, q) => s + deriveCost(q), 0);
    const grossProfit  = totalRevenue - totalCost;

    const feesFor = (list: Quotation[]) => ({
      commissioning: list.reduce((s, q) => s + (q.commissioning_price ?? 0), 0),
      visit:         list.reduce((s, q) => s + (q.visit_price ?? 0), 0),
      installation:  list.reduce((s, q) => s + (q.installation_price ?? 0), 0),
      revenue:       list.reduce((s, q) => s + (q.total_amount ?? 0), 0),
    });

    const invoicedFees  = feesFor(invoiced);
    const partialFees   = feesFor(partiallyPaid);
    const combinedFees  = feesFor(revenueQuotations);

    // Conversion funnel: only quotations that ever left Draft
    const postDraft     = quotations.filter(q => q.status !== 'Draft');
    const converted     = [...invoiced, ...partiallyPaid, ...fullyPaid];
    const conversionRate = postDraft.length > 0
      ? Math.round((converted.length / postDraft.length) * 100)
      : 0;
    const pipelineRate  = postDraft.length > 0
      ? Math.round((pipeline.length / postDraft.length) * 100)
      : 0;
    const declinedRate  = postDraft.length > 0
      ? Math.round((declined.length / postDraft.length) * 100)
      : 0;

    const expired = quotations.filter(q => {
      const ageDays = Math.floor((Date.now() - new Date(q.created_at).getTime()) / 86_400_000);
      return ageDays > 30 && !REVENUE_STATUSES.includes(q.status)
        && q.status !== 'Pipeline' && q.status !== 'Declined';
    });

    return {
      invoiced, partiallyPaid, fullyPaid, pipeline, declined, approved, draft,
      revenueQuotations, expired, postDraft, converted,
      totalRevenue, totalCost, grossProfit,
      invoicedFees, partialFees, combinedFees,
      conversionRate, pipelineRate, declinedRate,
    };
  }, [quotations]);

  const kpiCards = [
    {
      title: 'Invoiced Revenue',
      value: `EGP ${fmt(stats.invoicedFees.revenue)}`,
      sub: `${stats.invoiced.length} quotation${stats.invoiced.length !== 1 ? 's' : ''}`,
      icon: Receipt,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    },
    {
      title: 'Partially Paid Revenue',
      value: `EGP ${fmt(stats.partialFees.revenue)}`,
      sub: `${stats.partiallyPaid.length} quotation${stats.partiallyPaid.length !== 1 ? 's' : ''}`,
      icon: CreditCard,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Pipeline + Declined (excl.)',
      value: stats.pipeline.length + stats.declined.length,
      sub: `EGP ${fmt(
        [...stats.pipeline, ...stats.declined].reduce((s, q) => s + (q.total_amount ?? 0), 0)
      )} excluded`,
      icon: GitBranch,
      color: 'text-orange-600',
      bg: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      title: 'Gross Profit (Revenue only)',
      value: `EGP ${fmt(stats.grossProfit)}`,
      sub: `Rev EGP ${fmt(stats.totalRevenue)} · Cost EGP ${fmt(stats.totalCost)}`,
      icon: TrendingUp,
      color: stats.grossProfit >= 0 ? 'text-primary' : 'text-destructive',
      bg: 'bg-secondary',
    },
  ];

  // Net profit after deducting operating expenses
  const netProfit = stats.grossProfit - totalExpenses;
  const netMarginPct = stats.totalRevenue > 0 ? Math.round((netProfit / stats.totalRevenue) * 100) : 0;
  const grossMarginPct = stats.totalRevenue > 0 ? Math.round((stats.grossProfit / stats.totalRevenue) * 100) : 0;
  const expenseRatioPct = stats.totalRevenue > 0 ? Math.round((totalExpenses / stats.totalRevenue) * 100) : 0;

  const bridgeSteps = [
    {
      label: 'Gross Revenue',
      value: stats.totalRevenue,
      type: 'revenue' as const,
      sub: `${stats.revenueQuotations.length} revenue quotation${stats.revenueQuotations.length !== 1 ? 's' : ''}`,
    },
    {
      label: 'Direct COGS + Labor',
      value: -stats.totalCost,
      type: 'deduct' as const,
      sub: 'Hardware, parts & field labor',
    },
    {
      label: 'Gross Profit',
      value: stats.grossProfit,
      type: 'subtotal' as const,
      sub: `${grossMarginPct}% gross margin`,
    },
    {
      label: 'Operating Expenses',
      value: -totalExpenses,
      type: 'deduct' as const,
      sub: 'All manually logged expenses',
    },
    {
      label: 'Net Operating Profit',
      value: netProfit,
      type: 'net' as const,
      sub: `${netMarginPct}% net margin`,
    },
  ];

  const summaryRows: { status: string; list: Quotation[]; revenueEligible: boolean }[] = [
    { status: 'Invoiced',       list: stats.invoiced,      revenueEligible: true  },
    { status: 'Partially Paid', list: stats.partiallyPaid, revenueEligible: true  },
    { status: 'Approved',       list: stats.approved,      revenueEligible: false },
    { status: 'Pipeline',       list: stats.pipeline,      revenueEligible: false },
    { status: 'Declined',       list: stats.declined,      revenueEligible: false },
    { status: 'Draft',          list: stats.draft,         revenueEligible: false },
  ];

  return (
    <div className="space-y-6">
      {/* ── Revenue note ──────────────────────────────────────────────────── */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 text-xs text-blue-800 dark:text-blue-300">
        <strong>Financial Calculation Rule:</strong> Revenue figures include only{' '}
        <strong>Invoiced</strong> and <strong>Partially Paid</strong> quotations.{' '}
        <strong>Approved</strong> (pricing confirmed, not yet invoiced),{' '}
        <strong>Pipeline</strong> (in progress, changed from Approved), and{' '}
        <strong>Declined</strong> (rejected) are excluded from all revenue reporting.
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiCards.map(card => (
          <Card key={card.title} className={`border-0 ${card.bg}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground font-medium mb-1 truncate">{card.title}</p>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{card.sub}</p>
                </div>
                <card.icon className={`h-5 w-5 shrink-0 ${card.color} mt-0.5`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Profit Bridge: Gross → Expenses → Net ─────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            Profit Bridge — Gross to Net
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Three headline KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-emerald-700 dark:text-emerald-400 mb-1">Gross Profit</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">EGP {fmt(stats.grossProfit)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{grossMarginPct}% margin</p>
            </div>
            <div className="rounded-lg bg-destructive/10 dark:bg-destructive/20 p-3 text-center">
              <p className="text-[10px] uppercase tracking-wide font-semibold text-destructive mb-1">Operating Expenses</p>
              <p className="text-xl font-bold text-destructive tabular-nums">− EGP {fmt(totalExpenses)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{expenseRatioPct}% of revenue</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${netProfit >= 0 ? 'bg-primary/10 dark:bg-primary/20' : 'bg-destructive/10 dark:bg-destructive/20'}`}>
              <p className={`text-[10px] uppercase tracking-wide font-semibold mb-1 ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>Net Profit</p>
              <p className={`text-xl font-bold tabular-nums ${netProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>EGP {fmt(netProfit)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{netMarginPct}% net margin</p>
            </div>
          </div>

          {/* Waterfall step rows */}
          <div className="space-y-1.5">
            {bridgeSteps.map((step, idx) => {
              const isSubtotal = step.type === 'subtotal' || step.type === 'net';
              const isDeduct = step.type === 'deduct';
              const maxBar = stats.totalRevenue > 0 ? stats.totalRevenue : 1;
              const barPct = Math.min(Math.abs(step.value) / maxBar * 100, 100);
              return (
                <div key={idx} className={`flex items-center gap-3 rounded-md px-3 py-2 ${isSubtotal ? 'bg-muted/60 font-semibold' : 'bg-transparent'}`}>
                  <div className="w-40 shrink-0">
                    <p className={`text-xs truncate ${isSubtotal ? 'font-semibold' : 'text-muted-foreground'}`}>{step.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{step.sub}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          step.type === 'revenue'  ? 'bg-emerald-500' :
                          step.type === 'deduct'   ? 'bg-destructive/70' :
                          step.type === 'subtotal' ? 'bg-blue-500' :
                          netProfit >= 0           ? 'bg-primary' : 'bg-destructive'
                        }`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-32 shrink-0 text-right">
                    <span className={`text-xs font-semibold tabular-nums ${
                      isDeduct ? 'text-destructive' :
                      step.type === 'net' ? (netProfit >= 0 ? 'text-primary' : 'text-destructive') :
                      'text-foreground'
                    }`}>
                      {isDeduct ? '− ' : ''}EGP {fmt(Math.abs(step.value))}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {totalExpenses === 0 && (
            <p className="text-xs text-muted-foreground text-center mt-3 pt-3 border-t">
              No operating expenses logged yet. Add expenses in the <strong>Expenses</strong> tab to see the full profit bridge.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Revenue & status summary ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Revenue by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 pr-4 text-muted-foreground font-medium">Count</th>
                    <th className="text-right py-2 pr-4 text-muted-foreground font-medium">Total</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">In Revenue?</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summaryRows.filter(r => r.list.length > 0).map(r => (
                    <tr key={r.status} className="hover:bg-muted/40">
                      <td className="py-2 pr-4"><StatusBadge status={r.status} /></td>
                      <td className="text-right py-2 pr-4 font-medium">{r.list.length}</td>
                      <td className={`text-right py-2 pr-4 font-medium ${r.revenueEligible ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                        EGP {fmt(r.list.reduce((s, q) => s + (q.total_amount ?? 0), 0))}
                      </td>
                      <td className="text-right py-2">
                        {r.revenueEligible
                          ? <span className="text-emerald-600 font-semibold">✓ Yes</span>
                          : <span className="text-muted-foreground">— No</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="py-2 pr-4 text-xs">Revenue Total</td>
                    <td className="text-right py-2 pr-4">{stats.revenueQuotations.length}</td>
                    <td className="text-right py-2 pr-4 text-emerald-700 dark:text-emerald-400">
                      EGP {fmt(stats.totalRevenue)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ── Fee breakdown ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              Fee Breakdown (Revenue Quotations Only)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4 text-muted-foreground font-medium">Status</th>
                    <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Installation</th>
                    <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Commissioning</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[
                    { label: 'Invoiced',       fees: stats.invoicedFees,  status: 'Invoiced' },
                    { label: 'Partially Paid', fees: stats.partialFees,   status: 'Partially Paid' },
                  ].map(row => (
                    <tr key={row.label} className="hover:bg-muted/40">
                      <td className="py-2 pr-4"><StatusBadge status={row.status} /></td>
                      <td className="text-right py-2 pr-3 font-medium">
                        {row.fees.installation > 0 ? `EGP ${fmt(row.fees.installation)}` : '—'}
                      </td>
                      <td className="text-right py-2 pr-3 font-medium">
                        {row.fees.commissioning > 0 ? `EGP ${fmt(row.fees.commissioning)}` : '—'}
                      </td>
                      <td className="text-right py-2 font-medium">
                        {row.fees.visit > 0 ? `EGP ${fmt(row.fees.visit)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t font-semibold">
                    <td className="py-2 pr-4 text-xs">Combined</td>
                    <td className="text-right py-2 pr-3">EGP {fmt(stats.combinedFees.installation)}</td>
                    <td className="text-right py-2 pr-3">EGP {fmt(stats.combinedFees.commissioning)}</td>
                    <td className="text-right py-2">EGP {fmt(stats.combinedFees.visit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Invoiced detail ───────────────────────────────────────────────── */}
      {stats.invoiced.length > 0 && (
        <QuotationDetailTable
          title={<><FileCheck2 className="h-4 w-4 text-emerald-600" />Invoiced Quotations ({stats.invoiced.length})</>}
          quotations={stats.invoiced}
          navigate={navigate}
        />
      )}

      {/* ── Partially Paid detail ─────────────────────────────────────────── */}
      {stats.partiallyPaid.length > 0 && (
        <QuotationDetailTable
          title={<><CreditCard className="h-4 w-4 text-blue-600" />Partially Paid Quotations ({stats.partiallyPaid.length})</>}
          quotations={stats.partiallyPaid}
          navigate={navigate}
          highlightColor="text-blue-700 dark:text-blue-400"
        />
      )}

      {/* ── Conversion funnel ─────────────────────────────────────────────── */}
      {stats.postDraft.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-primary" />
              Approval-to-Revenue Conversion Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: 'Converted to Revenue', pct: stats.conversionRate, color: 'bg-emerald-500', icon: TrendingUp, textColor: 'text-emerald-700 dark:text-emerald-400' },
                { label: 'In Pipeline',          pct: stats.pipelineRate,   color: 'bg-orange-400',  icon: GitBranch,  textColor: 'text-orange-700 dark:text-orange-400' },
                { label: 'Declined',             pct: stats.declinedRate,   color: 'bg-red-400',     icon: TrendingDown, textColor: 'text-red-700 dark:text-red-400' },
              ].map(({ label, pct, color, icon: Icon, textColor }) => (
                <div key={label} className="text-center space-y-1.5">
                  <div className={`text-2xl font-bold ${textColor}`}>{pct}%</div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {label}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Based on <strong>{stats.postDraft.length}</strong> post-Draft quotation{stats.postDraft.length !== 1 ? 's' : ''}.
              Converted = Invoiced + Partially Paid + Fully Paid.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ── Pipeline detail ───────────────────────────────────────────────── */}
      {stats.pipeline.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <GitBranch className="h-4 w-4" />
              Pipeline Quotations — Excluded from Revenue ({stats.pipeline.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These quotations were changed from <strong>Approved</strong> status. They are tracked for project management but excluded from all financial calculations.
            </p>
            <QuotationTable quotations={stats.pipeline} navigate={navigate} amountClass="text-muted-foreground line-through" />
          </CardContent>
        </Card>
      )}

      {/* ── Declined detail ───────────────────────────────────────────────── */}
      {stats.declined.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-red-700 dark:text-red-400">
              <TrendingDown className="h-4 w-4" />
              Declined Quotations — Excluded from Revenue ({stats.declined.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              These quotations have been declined or are no longer viable. Excluded from all financial calculations.
            </p>
            <QuotationTable quotations={stats.declined} navigate={navigate} amountClass="text-muted-foreground line-through" />
          </CardContent>
        </Card>
      )}

      {/* ── Pending (Draft + Approved) ────────────────────────────────────── */}
      {(stats.approved.length > 0 || stats.draft.length > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Pending Quotations — Draft &amp; Approved ({stats.approved.length + stats.draft.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              <strong>Approved</strong> means pricing is confirmed — it does <em>not</em> indicate an invoice has been issued. Move to <strong>Invoiced</strong> or <strong>Partially Paid</strong> to include in revenue.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium">#</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Project</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Client</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Age</th>
                    <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Total</th>
                    <th className="text-right py-2 text-muted-foreground font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {[...stats.approved, ...stats.draft].map((q, i) => (
                    <tr key={q.id} className="hover:bg-muted/40">
                      <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
                      <td className="py-2 pr-3 font-medium">{q.project_code}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{q.client_name || '—'}</td>
                      <td className="py-2 pr-3"><StatusBadge status={q.status} /></td>
                      <td className="py-2 pr-3">
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
                          <CalendarClock className="h-3 w-3" />
                          {ageSince(q.created_at)}
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium">EGP {fmt(q.total_amount)}</td>
                      <td className="py-2 text-right">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/quotation/${q.id}`)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Expired ───────────────────────────────────────────────────────── */}
      {stats.expired.length > 0 && (
        <Card className="border-rose-200 dark:border-rose-900">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-rose-600">
              <AlertTriangle className="h-4 w-4" />
              Stale Quotations — Needs Follow-up ({stats.expired.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuotationTable quotations={stats.expired} navigate={navigate} showAge />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────

function QuotationDetailTable({
  title,
  quotations,
  navigate,
  highlightColor = 'text-emerald-700 dark:text-emerald-400',
}: {
  title: React.ReactNode;
  quotations: Quotation[];
  navigate: (path: string) => void;
  highlightColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <QuotationTable quotations={quotations} navigate={navigate} amountClass={highlightColor} />
      </CardContent>
    </Card>
  );
}

function QuotationTable({
  quotations,
  navigate,
  amountClass = 'text-foreground',
  showAge = false,
}: {
  quotations: Quotation[];
  navigate: (path: string) => void;
  amountClass?: string;
  showAge?: boolean;
}) {
  function ageSince(iso: string): string {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days < 1) return 'today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs whitespace-nowrap">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 pr-3 text-muted-foreground font-medium">#</th>
            <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Project / Invoice</th>
            <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Client</th>
            <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Status</th>
            {showAge && <th className="text-left py-2 pr-3 text-muted-foreground font-medium">Age</th>}
            <th className="text-right py-2 pr-3 text-muted-foreground font-medium">Total</th>
            <th className="text-right py-2 text-muted-foreground font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {quotations.map((q, i) => (
            <tr key={q.id} className="hover:bg-muted/40">
              <td className="py-2 pr-3 text-muted-foreground">{i + 1}</td>
              <td className="py-2 pr-3 font-medium">{q.is_invoice ? q.invoice_number : q.project_code}</td>
              <td className="py-2 pr-3 text-muted-foreground">{q.client_name || '—'}</td>
              <td className="py-2 pr-3"><StatusBadge status={q.status} /></td>
              {showAge && (
                <td className="py-2 pr-3 text-muted-foreground">
                  {ageSince(q.created_at)}
                </td>
              )}
              <td className={`py-2 pr-3 text-right font-medium ${amountClass}`}>EGP {fmt(q.total_amount)}</td>
              <td className="py-2 text-right">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => navigate(`/quotation/${q.id}`)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
