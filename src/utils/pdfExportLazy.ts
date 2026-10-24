// Lazy-loading wrapper for PDF export to reduce initial bundle size
import type { Device, Room, ClientInfo, DiscountType, Payment } from '@/types/types';

interface PDFExportOptions {
  devices: Device[];
  rooms: Room[];
  clientInfo?: ClientInfo;
  commissioningFee?: number;
  visitFee?: number;
  installationFee?: number;
  vatPercentage?: number;
  discountType?: DiscountType | null;
  discountValue?: number;
  currentVersion?: number;
  totalPaid?: number;
  remainingBalance?: number;
  payments?: Payment[];
  approvalDate?: string | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  includeSmartSystemsLogo?: boolean;
  isInvoice?: boolean;
  categoryLabels?: Record<string, string>;
}

// Lazy load the PDF export module only when needed
export async function exportToPDF(options: PDFExportOptions): Promise<void> {
  const { exportToPDF: actualExport } = await import('./pdfExport');
  return actualExport(options);
}

export type { BriefPDFOptions } from './pdfBriefExport';

export async function exportBriefToPDF(options: import('./pdfBriefExport').BriefPDFOptions): Promise<void> {
  const { exportBriefToPDF: actualExport } = await import('./pdfBriefExport');
  return actualExport(options);
}

export type { CostAnalysisPDFOptions } from './pdfCostAnalysisExport';

export async function exportCostAnalysisToPDF(options: import('./pdfCostAnalysisExport').CostAnalysisPDFOptions): Promise<void> {
  const { exportCostAnalysisToPDF: actualExport } = await import('./pdfCostAnalysisExport');
  return actualExport(options);
}
