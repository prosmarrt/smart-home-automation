import { useEffect, useState, useMemo } from 'react';
import { expensesApi, expenseCategoriesApi } from '@/db/api';
import type { Expense, ExpenseCategory } from '@/db/api';
import MonthlyExpensesChart from '@/components/smart-home/MonthlyExpensesChart';
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
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, Search, Tag, Loader2,
  TrendingDown, Receipt, ChevronDown, ChevronUp, X,
} from 'lucide-react';

function fmt(n: number) {
  return new Intl.NumberFormat('en-EG', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

// ── Default categories for quick reference ────────────────────────────────
const DEFAULT_CATEGORY_NAMES = [
  'Operating Costs', 'Salaries & Wages', 'Utilities & Facilities',
  'Marketing & Advertising', 'Equipment & Maintenance', 'Shipping & Logistics',
  'Taxes & Compliance', 'Professional Services', 'Depreciation', 'Miscellaneous / Other',
];

interface Props {
  /** Called whenever total expenses change so analytics can re-render */
  onTotalChange?: (total: number) => void;
  isAdmin: boolean;
}

export default function ExpensesTab({ onTotalChange, isAdmin }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterCatId, setFilterCatId] = useState<string>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // Expense dialog
  const [expenseDialog, setExpenseDialog] = useState<'add' | 'edit' | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({ name: '', amount: '', category_id: '', expense_date: '', vendor: '', notes: '' });
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(null);

  // Category dialog
  const [catDialog, setCatDialog] = useState<'add' | 'edit' | null>(null);
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', description: '' });
  const [isSavingCat, setIsSavingCat] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  // Collapse categories panel
  const [catPanelOpen, setCatPanelOpen] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────────
  async function loadAll() {
    setIsLoading(true);
    try {
      const [exp, cats] = await Promise.all([expensesApi.list(), expenseCategoriesApi.list()]);
      setExpenses(exp);
      setCategories(cats);
      const total = exp.reduce((s, e) => s + Number(e.amount), 0);
      onTotalChange?.(total);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ─────────────────────────────────────────────────────────────
  const totalExpenses = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  const categoryTotals = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(e => {
      const catName = e.expense_categories?.name ?? 'Uncategorized';
      map.set(catName, (map.get(catName) ?? 0) + Number(e.amount));
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    let list = [...expenses];
    if (filterCatId !== 'all') {
      list = list.filter(e => e.category_id === filterCatId);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.vendor ?? '').toLowerCase().includes(q) ||
        (e.expense_categories?.name ?? '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const diff = new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
      return sortDir === 'desc' ? -diff : diff;
    });
    return list;
  }, [expenses, filterCatId, search, sortDir]);

  // ── Expense CRUD ────────────────────────────────────────────────────────
  function openAddExpense() {
    setEditingExpense(null);
    setExpenseForm({
      name: '', amount: '',
      category_id: categories[0]?.id ?? '',
      expense_date: new Date().toISOString().slice(0, 10),
      vendor: '', notes: '',
    });
    setExpenseDialog('add');
  }

  function openEditExpense(e: Expense) {
    setEditingExpense(e);
    setExpenseForm({
      name: e.name,
      amount: String(e.amount),
      category_id: e.category_id ?? '',
      expense_date: e.expense_date,
      vendor: e.vendor ?? '',
      notes: e.notes ?? '',
    });
    setExpenseDialog('edit');
  }

  async function saveExpense() {
    if (!expenseForm.name.trim() || !expenseForm.amount) return;
    setIsSavingExpense(true);
    try {
      const payload = {
        name: expenseForm.name.trim(),
        amount: parseFloat(expenseForm.amount),
        category_id: expenseForm.category_id || null,
        expense_date: expenseForm.expense_date,
        vendor: expenseForm.vendor.trim() || null,
        notes: expenseForm.notes.trim() || null,
      };
      if (expenseDialog === 'edit' && editingExpense) {
        const updated = await expensesApi.update(editingExpense.id, payload);
        setExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
        toast.success('Expense updated');
      } else {
        const created = await expensesApi.create(payload);
        setExpenses(prev => [created, ...prev]);
        toast.success('Expense added');
      }
      setExpenseDialog(null);
      // Re-compute total signal
      setExpenses(prev => {
        onTotalChange?.(prev.reduce((s, e) => s + Number(e.amount), 0));
        return prev;
      });
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to save expense');
    } finally {
      setIsSavingExpense(false);
    }
  }

  async function deleteExpense(id: string) {
    try {
      await expensesApi.delete(id);
      setExpenses(prev => {
        const next = prev.filter(e => e.id !== id);
        onTotalChange?.(next.reduce((s, e) => s + Number(e.amount), 0));
        return next;
      });
      toast.success('Expense deleted');
    } catch {
      toast.error('Failed to delete expense');
    } finally {
      setDeletingExpenseId(null);
    }
  }

  // ── Category CRUD ────────────────────────────────────────────────────────
  function openAddCat() {
    setEditingCat(null);
    setCatForm({ name: '', description: '' });
    setCatDialog('add');
  }

  function openEditCat(c: ExpenseCategory) {
    setEditingCat(c);
    setCatForm({ name: c.name, description: c.description ?? '' });
    setCatDialog('edit');
  }

  async function saveCat() {
    if (!catForm.name.trim()) return;
    setIsSavingCat(true);
    try {
      if (catDialog === 'edit' && editingCat) {
        const updated = await expenseCategoriesApi.update(editingCat.id, catForm.name, catForm.description);
        setCategories(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast.success('Category updated');
      } else {
        const created = await expenseCategoriesApi.create(catForm.name, catForm.description);
        setCategories(prev => [...prev, created]);
        toast.success('Category created');
      }
      setCatDialog(null);
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to save category');
    } finally {
      setIsSavingCat(false);
    }
  }

  async function deleteCat(id: string) {
    try {
      await expenseCategoriesApi.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Category deleted');
    } catch {
      toast.error('Cannot delete a default category or one with linked expenses');
    } finally {
      setDeletingCatId(null);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Total expenses KPI card ───────────────────────────────────── */}
      <Card className="border-0 bg-destructive/10 dark:bg-destructive/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-destructive/80 mb-1">
                Total Operating Expenses
              </p>
              <p className="text-3xl font-bold text-destructive tabular-nums">
                EGP {fmt(totalExpenses)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Across {expenses.length} expense record{expenses.length !== 1 ? 's' : ''} — automatically deducted from gross profit
              </p>
            </div>
            <TrendingDown className="h-10 w-10 text-destructive/40 shrink-0" />
          </div>
        </CardContent>
      </Card>

      {/* ── Category breakdown strip ──────────────────────────────────── */}
      {categoryTotals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {categoryTotals.map(([name, total]) => {
            const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0;
            return (
              <div
                key={name}
                className="flex items-center gap-1.5 text-xs bg-muted border rounded-full px-3 py-1 cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => {
                  const cat = categories.find(c => c.name === name);
                  if (cat) setFilterCatId(prev => prev === cat.id ? 'all' : cat.id);
                }}
              >
                <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="font-medium truncate max-w-[100px]">{name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold text-foreground">{pct}%</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Monthly chart ────────────────────────────────────────────── */}
      <MonthlyExpensesChart expenses={expenses} />

      {/* ── Toolbar: search + filter + add ───────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-8 text-sm"
            placeholder="Search expenses…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <Select value={filterCatId} onValueChange={setFilterCatId}>
          <SelectTrigger className="h-8 text-sm w-auto min-w-[150px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs gap-1"
          onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
        >
          Date
          {sortDir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
        </Button>

        {filterCatId !== 'all' && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground" onClick={() => setFilterCatId('all')}>
            Clear filter
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isAdmin && (
            <Button size="sm" className="h-8 gap-1.5" onClick={openAddExpense}>
              <Plus className="h-3.5 w-3.5" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      {/* ── Expenses table ────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
              <Receipt className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                {search || filterCatId !== 'all' ? 'No expenses match your filter.' : 'No expenses yet. Add your first expense above.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Expense</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Category</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Date</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground">Vendor</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th>
                    {isAdmin && <th className="text-right px-4 py-2.5 font-medium text-muted-foreground"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredExpenses.map((e, i) => (
                    <tr key={e.id} className={`hover:bg-muted/40 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-foreground max-w-[180px] truncate">{e.name}</div>
                        {e.notes && <div className="text-muted-foreground text-[11px] truncate max-w-[180px]">{e.notes}</div>}
                      </td>
                      <td className="px-3 py-2.5">
                        {e.expense_categories?.name
                          ? <Badge variant="outline" className="text-[10px] font-normal whitespace-nowrap">{e.expense_categories.name}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {new Date(e.expense_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground max-w-[120px] truncate">{e.vendor || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-destructive tabular-nums">
                        EGP {fmt(Number(e.amount))}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditExpense(e)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive hover:text-destructive"
                              onClick={() => setDeletingExpenseId(e.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30">
                    <td colSpan={isAdmin ? 4 : 3} className="px-4 py-2.5 font-semibold text-xs">
                      {filterCatId !== 'all' || search ? `Filtered total (${filteredExpenses.length})` : `All expenses (${filteredExpenses.length})`}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-destructive tabular-nums">
                      EGP {fmt(filteredExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                    </td>
                    {isAdmin && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Category management panel ─────────────────────────────────── */}
      <Card>
        <CardHeader
          className="pb-2 pt-3 px-4 cursor-pointer select-none"
          onClick={() => setCatPanelOpen(p => !p)}
        >
          <CardTitle className="text-sm flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-primary" />
              Expense Categories ({categories.length})
            </span>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1"
                  onClick={e => { e.stopPropagation(); openAddCat(); }}
                >
                  <Plus className="h-3 w-3" /> New Category
                </Button>
              )}
              {catPanelOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CardTitle>
        </CardHeader>

        {catPanelOpen && (
          <CardContent className="pt-0 px-4 pb-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {categories.map(cat => {
                const spend = expenses
                  .filter(e => e.category_id === cat.id)
                  .reduce((s, e) => s + Number(e.amount), 0);
                return (
                  <div
                    key={cat.id}
                    className="flex items-start justify-between gap-2 rounded-md border px-3 py-2 hover:bg-muted/40 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium truncate">{cat.name}</span>
                        {cat.is_default && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Default</Badge>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{cat.description}</p>
                      )}
                      {spend > 0 && (
                        <p className="text-[11px] font-semibold text-destructive mt-0.5">EGP {fmt(spend)} logged</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1 shrink-0">
                        {!cat.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => openEditCat(cat)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {!cat.is_default && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={() => setDeletingCatId(cat.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {/* ── Add / Edit Expense Dialog ─────────────────────────────────── */}
      <Dialog open={!!expenseDialog} onOpenChange={open => { if (!open) setExpenseDialog(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg">
          <DialogHeader>
            <DialogTitle>{expenseDialog === 'edit' ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-name">Expense Name <span className="text-destructive">*</span></Label>
              <Input
                id="exp-name"
                placeholder="e.g. Monthly office lease"
                value={expenseForm.name}
                onChange={e => setExpenseForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="exp-amount">Amount (EGP) <span className="text-destructive">*</span></Label>
                <Input
                  id="exp-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="exp-date">Date</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={e => setExpenseForm(p => ({ ...p, expense_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select
                value={expenseForm.category_id}
                onValueChange={v => setExpenseForm(p => ({ ...p, category_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-vendor">Vendor / Payee</Label>
              <Input
                id="exp-vendor"
                placeholder="e.g. City Power Co."
                value={expenseForm.vendor}
                onChange={e => setExpenseForm(p => ({ ...p, vendor: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-notes">Notes</Label>
              <Textarea
                id="exp-notes"
                rows={2}
                placeholder="Optional description or reference…"
                value={expenseForm.notes}
                onChange={e => setExpenseForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenseDialog(null)}>Cancel</Button>
            <Button
              onClick={saveExpense}
              disabled={isSavingExpense || !expenseForm.name.trim() || !expenseForm.amount}
            >
              {isSavingExpense && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {expenseDialog === 'edit' ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add / Edit Category Dialog ────────────────────────────────── */}
      <Dialog open={!!catDialog} onOpenChange={open => { if (!open) setCatDialog(null); }}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <DialogHeader>
            <DialogTitle>{catDialog === 'edit' ? 'Edit Category' : 'New Expense Category'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="cat-name">Category Name <span className="text-destructive">*</span></Label>
              <Input
                id="cat-name"
                placeholder="e.g. Research & Development"
                value={catForm.name}
                onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea
                id="cat-desc"
                rows={2}
                placeholder="Describe what costs belong in this category…"
                value={catForm.description}
                onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Suggested defaults already available:{' '}
              {DEFAULT_CATEGORY_NAMES.slice(0, 4).join(', ')} &amp; more.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialog(null)}>Cancel</Button>
            <Button
              onClick={saveCat}
              disabled={isSavingCat || !catForm.name.trim()}
            >
              {isSavingCat && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {catDialog === 'edit' ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Expense Confirm ────────────────────────────────────── */}
      <AlertDialog open={!!deletingExpenseId} onOpenChange={open => { if (!open) setDeletingExpenseId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the expense record and update the total. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingExpenseId && deleteExpense(deletingExpenseId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Category Confirm ───────────────────────────────────── */}
      <AlertDialog open={!!deletingCatId} onOpenChange={open => { if (!open) setDeletingCatId(null); }}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              Only custom categories can be deleted. Expenses linked to this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingCatId && deleteCat(deletingCatId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
