import { AlertTriangle, TrendingDown, GitBranch, X } from 'lucide-react';
import { useState } from 'react';
import type { QuotationStatus } from '@/types/types';
import { APPROVED_OUTCOMES } from '@/types/types';

interface Props {
  status: QuotationStatus;
  /** If true, shows the full dismissible banner; if false, shows a compact inline tip */
  variant?: 'banner' | 'inline';
}

const CONFIG: Record<string, {
  icon: React.ReactNode;
  title: string;
  message: string;
  cls: string;
  iconCls: string;
}> = {
  Approved: {
    icon: <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />,
    title: 'Revenue Exclusion Notice',
    message:
      'This quotation is Approved (pricing confirmed) but is NOT yet counted in revenue. ' +
      'Moving it to Pipeline or Declined will permanently exclude it from all financial calculations. ' +
      'Move to Invoiced or Partially Paid to include it in revenue reporting.',
    cls: 'bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200',
    iconCls: 'text-amber-600 dark:text-amber-400',
  },
  Pipeline: {
    icon: <GitBranch className="h-4 w-4 shrink-0 mt-0.5" />,
    title: 'Pipeline — Excluded from Revenue',
    message:
      'This quotation is in the sales Pipeline and is excluded from all financial calculations and revenue reports.',
    cls: 'bg-orange-50 border-orange-300 text-orange-900 dark:bg-orange-950/40 dark:border-orange-700 dark:text-orange-200',
    iconCls: 'text-orange-600 dark:text-orange-400',
  },
  Declined: {
    icon: <TrendingDown className="h-4 w-4 shrink-0 mt-0.5" />,
    title: 'Declined — Excluded from Revenue',
    message:
      'This quotation has been declined and is excluded from all financial calculations and revenue reports.',
    cls: 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/40 dark:border-red-700 dark:text-red-200',
    iconCls: 'text-red-600 dark:text-red-400',
  },
};

/** Shows a contextual warning banner for Approved, Pipeline, and Declined quotations. */
export function PipelineWarningBanner({ status, variant = 'banner' }: Props) {
  const [dismissed, setDismissed] = useState(false);

  // Only render for relevant statuses
  const cfg = CONFIG[status];
  if (!cfg || dismissed) return null;

  if (variant === 'inline') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${cfg.cls}`}>
        <span className={cfg.iconCls}>{cfg.icon}</span>
        <span className="font-medium">Not counted in revenue</span>
      </span>
    );
  }

  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${cfg.cls}`} role="alert">
      <span className={cfg.iconCls}>{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold mb-0.5">{cfg.title}</p>
        <p className="leading-relaxed opacity-90">{cfg.message}</p>
        {status === 'Approved' && (
          <p className="mt-1.5 text-xs opacity-75">
            Transitions that exclude from revenue: <strong>Pipeline</strong>, <strong>Declined</strong>
            {' '}(set via the status dropdown above)
          </p>
        )}
      </div>
      {/* Only Approved banner is dismissible — Pipeline/Declined stay visible */}
      {status === 'Approved' && (
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-2"
          aria-label="Dismiss warning"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Returns true if a proposed status change from `from` should show a confirmation warning */
export function needsPipelineConfirmation(from: QuotationStatus, to: QuotationStatus): boolean {
  return from === 'Approved' && APPROVED_OUTCOMES.includes(to);
}
