import { useMemo, useState } from 'react';
import type { Expense } from '@/db/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Line, ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BarChart2, TrendingUp } from 'lucide-react';

// ── Colour palette for categories (cycles if > palette length) ────────────
const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#64748b',
];

function fmt(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(Math.round(n));
}

function fmtFull(n: number) {
  return new Intl.NumberFormat('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

interface Props {
  expenses: Expense[];
}

type ViewMode = 'stacked' | 'grouped';
type RangeOption = '6' | '12' | '24' | 'all';

export default function MonthlyExpensesChart({ expenses }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('stacked');
  const [range, setRange] = useState<RangeOption>('12');

  // ── Derive sorted unique categories ────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach(e => set.add(e.expense_categories?.name ?? 'Uncategorized'));
    return Array.from(set).sort();
  }, [expenses]);

  const catColor = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c, i) => { map[c] = PALETTE[i % PALETTE.length]; });
    return map;
  }, [categories]);

  // ── Aggregate by month ─────────────────────────────────────────────────
  const allMonthData = useMemo(() => {
    if (!expenses.length) return [];

    // Build month → category → total map
    const monthMap = new Map<string, Record<string, number>>();
    expenses.forEach(e => {
      const d = new Date(e.expense_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) monthMap.set(key, {});
      const cat = e.expense_categories?.name ?? 'Uncategorized';
      const bucket = monthMap.get(key)!;
      bucket[cat] = (bucket[cat] ?? 0) + Number(e.amount);
    });

    // Sort months ascending
    const sorted = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));

    return sorted.map(([key, cats]) => {
      const [year, month] = key.split('-');
      const label = new Date(Number(year), Number(month) - 1, 1)
        .toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      const total = Object.values(cats).reduce((s, v) => s + v, 0);
      return { month: label, key, total, ...cats };
    });
  }, [expenses]);

  // ── Apply range filter ─────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (range === 'all') return allMonthData;
    const n = Number(range);
    return allMonthData.slice(-n);
  }, [allMonthData, range]);

  // ── Running total series ───────────────────────────────────────────────
  const chartDataWithRunning = useMemo(() => {
    let acc = 0;
    return chartData.map(row => {
      acc += row.total;
      return { ...row, running: acc };
    });
  }, [chartData]);

  const totalInRange = useMemo(
    () => chartData.reduce((s, r) => s + r.total, 0),
    [chartData],
  );

  const avgMonthly = chartData.length > 0 ? totalInRange / chartData.length : 0;
  const peakRow = chartData.reduce<{ month: string; total: number } | null>((max, r) =>
    !max || r.total > max.total ? r : max, null);

  if (!expenses.length) return null;

  // ── Custom tooltip ────────────────────────────────────────────────────
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; fill?: string; color?: string }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const monthTotal = payload.filter(p => p.name !== 'Running Total').reduce((s, p) => s + (p.value ?? 0), 0);
    return (
      <div className="rounded-lg border bg-popover shadow-md p-3 text-xs min-w-[160px]">
        <p className="font-semibold mb-2 text-foreground">{label}</p>
        {payload.filter(p => p.name !== 'Running Total' && p.value > 0).map(p => (
          <div key={p.name} className="flex items-center justify-between gap-4 mb-0.5">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ background: p.fill ?? p.color }} />
              {p.name}
            </span>
            <span className="font-medium text-foreground tabular-nums">EGP {fmtFull(p.value)}</span>
          </div>
        ))}
        <div className="border-t mt-2 pt-2 flex justify-between font-semibold text-foreground">
          <span>Month Total</span>
          <span className="tabular-nums">EGP {fmtFull(monthTotal)}</span>
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            Monthly Spend by Category
          </CardTitle>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex rounded-md border overflow-hidden text-xs">
              {(['stacked', 'grouped'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={`px-3 py-1.5 capitalize transition-colors ${
                    viewMode === v
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'bg-background text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Range selector */}
            <Select value={range} onValueChange={v => setRange(v as RangeOption)}>
              <SelectTrigger className="h-8 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Last 6 mo.</SelectItem>
                <SelectItem value="12">Last 12 mo.</SelectItem>
                <SelectItem value="24">Last 24 mo.</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary metrics strip */}
        <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
          <span>
            Total:{' '}
            <span className="font-semibold text-destructive tabular-nums">EGP {fmtFull(totalInRange)}</span>
          </span>
          <span>
            Avg/month:{' '}
            <span className="font-semibold text-foreground tabular-nums">EGP {fmtFull(avgMonthly)}</span>
          </span>
          {peakRow && (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Peak: <span className="font-semibold text-foreground ml-1">{peakRow.month}</span>
              <span className="tabular-nums">(EGP {fmtFull(peakRow.total)})</span>
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
            No data for the selected range.
          </div>
        ) : (
          <div className="w-full min-w-0 overflow-hidden">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chartDataWithRunning} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="bar"
                  tickFormatter={fmt}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <YAxis
                  yAxisId="line"
                  orientation="right"
                  tickFormatter={fmt}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  layout="horizontal"
                  wrapperStyle={{ paddingTop: 12, fontSize: 11 }}
                  formatter={(value) => value === 'Running Total' ? (
                    <span style={{ color: '#94a3b8' }}>{value}</span>
                  ) : value}
                />

                {/* Stacked / grouped bars per category */}
                {categories.map(cat => (
                  <Bar
                    key={cat}
                    yAxisId="bar"
                    dataKey={cat}
                    name={cat}
                    stackId={viewMode === 'stacked' ? 'stack' : undefined}
                    fill={catColor[cat]}
                    radius={viewMode === 'grouped' ? [3, 3, 0, 0] : undefined}
                    maxBarSize={viewMode === 'grouped' ? 32 : undefined}
                  />
                ))}

                {/* Running total line */}
                <Line
                  yAxisId="line"
                  type="monotone"
                  dataKey="running"
                  name="Running Total"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
