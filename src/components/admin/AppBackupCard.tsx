import React, { useState } from 'react';
import { 
  Download, 
  Archive, 
  Database, 
  Code, 
  FileCheck, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  FileText, 
  Sparkles,
  Layers,
  FolderArchive
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { AppBackupService, type DataValidationReport } from '@/services/appBackupService';

export const AppBackupCard: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [validationReport, setValidationReport] = useState<DataValidationReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const { toast } = useToast();

  const handleStartBackup = async () => {
    setIsExporting(true);
    setProgressPercent(5);
    setCurrentStep('Initializing export package...');

    try {
      const report = await AppBackupService.generateAndDownloadBackup((step, pct) => {
        setCurrentStep(step);
        setProgressPercent(pct);
      });

      setValidationReport(report);
      setIsModalOpen(false);
      setShowReportModal(true);

      toast({
        title: 'Backup Generated Successfully',
        description: `Downloaded ${report.zipFileName} (${report.totalRecordsExported} records, ${report.totalSourceFilesExported} source files).`,
      });
    } catch (err: any) {
      console.error('Backup generation failed:', err);
      toast({
        title: 'Backup Failed',
        description: err.message || 'An error occurred while compiling the backup package.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card className="border-primary/20 bg-card shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderArchive className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg font-bold text-foreground">
                  Application Migration & Complete Backup
                </CardTitle>
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  Full Parity
                </Badge>
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                Official owner-controlled backup and migration package. Export live production code, complete database structure, all existing data records, preserved quotations, business formulas, assets, and AI rebuild instructions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50 border border-border">
              <Code className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span>Full Source Code</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50 border border-border">
              <Database className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Schema & Live Data</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50 border border-border">
              <FileText className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Business Formulas</span>
            </div>
            <div className="flex items-center gap-1.5 p-2 rounded-md bg-muted/50 border border-border">
              <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
              <span>AI Rebuild Prompt</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2.5 text-blue-900 dark:text-blue-200">
              <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold block">100% Read-Only Safety Guarantee</span>
                <span className="text-blue-700/80 dark:text-blue-300/80">
                  Will not modify, lock, or delete any live quotation, client, or database record.
                </span>
              </div>
            </div>

            <Button
              size="lg"
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm gap-2 h-auto py-2.5 px-4 shrink-0 flex-col sm:flex-row items-start sm:items-center text-left"
            >
              <Download className="h-4 w-4 shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">Download Complete App Backup</span>
                <span className="text-[11px] opacity-90 font-normal leading-tight hidden sm:inline">
                  Export source code, database, data, quotations, assets & migration package
                </span>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation & Progress Dialog */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !isExporting && setIsModalOpen(open)}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Archive className="h-5 w-5 text-primary" />
              Download Complete App Backup & Migration Package
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm text-left pt-1">
              This process compiles a self-contained, production-grade export package allowing you to migrate and recreate this exact application on another AI app builder or development platform with full functionality and data preservation.
            </DialogDescription>
          </DialogHeader>

          {!isExporting ? (
            <div className="space-y-3 py-2 text-xs md:text-sm">
              <div className="p-3 bg-muted/60 rounded-lg space-y-2 border border-border">
                <p className="font-medium text-foreground">The generated ZIP package will contain:</p>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>/app-source/</strong>: Latest live production source code (Frontend, Backend, APIs, calculations, auth).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>/database/</strong>: 70 sequential migrations, consolidated full DDL schema, and complete JSON + SQL data dumps of all tables.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Preserved Quotations</strong>: Every quotation with exact frozen numbers, ICU installation fees, and line items (zero recalculation).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>/docs/</strong>: Complete specifications for business logic, pro-rata formulas, warranty rules, and architecture.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>AI_REBUILD_PROMPT.md</strong>: Turnkey prompt ready to copy & paste into another AI builder for instant functional parity.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>/config/</strong>: Sanitized configuration templates (.env.example) with placeholders (no sensitive keys exposed).</span>
                  </li>
                </ul>
              </div>

              <div className="p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>Zero Risk: The export is executed via read-only queries. Existing database records are untouched.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-medium text-foreground">{currentStep}</span>
                  <span className="text-muted-foreground">{progressPercent}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Compiling package... The download will begin automatically when ready.</span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {!isExporting ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleStartBackup}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Archive className="h-4 w-4" />
                  Generate & Download Backup
                </Button>
              </>
            ) : (
              <Button disabled variant="outline" className="w-full">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing Backup ({progressPercent}%)...
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Report Dialog */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg text-emerald-700 dark:text-emerald-400">
              <FileCheck className="h-5 w-5" />
              Backup Package Downloaded Successfully
            </DialogTitle>
            <DialogDescription className="text-xs md:text-sm text-left">
              Validation report for backup archive: <strong>{validationReport?.zipFileName}</strong>
            </DialogDescription>
          </DialogHeader>

          {validationReport && (
            <div className="space-y-3 py-2 text-xs md:text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-md bg-muted/60 border border-border">
                  <span className="text-[11px] text-muted-foreground block">Total Records</span>
                  <span className="text-base font-bold text-foreground">{validationReport.totalRecordsExported}</span>
                </div>
                <div className="p-2.5 rounded-md bg-muted/60 border border-border">
                  <span className="text-[11px] text-muted-foreground block">Quotations</span>
                  <span className="text-base font-bold text-foreground">{validationReport.totalQuotationsExported}</span>
                </div>
                <div className="p-2.5 rounded-md bg-muted/60 border border-border">
                  <span className="text-[11px] text-muted-foreground block">Source Files</span>
                  <span className="text-base font-bold text-foreground">{validationReport.totalSourceFilesExported}</span>
                </div>
                <div className="p-2.5 rounded-md bg-muted/60 border border-border">
                  <span className="text-[11px] text-muted-foreground block">Status</span>
                  <Badge className="bg-emerald-600 text-white mt-0.5">
                    {validationReport.validationStatus}
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-muted/40 rounded-lg border border-border text-xs space-y-1">
                <p className="font-semibold text-foreground">Archive Key Details:</p>
                <p className="text-muted-foreground"><strong>Backup ID:</strong> {validationReport.backupId}</p>
                <p className="text-muted-foreground"><strong>Export Timestamp:</strong> {new Date(validationReport.exportDate).toLocaleString()}</p>
                <p className="text-muted-foreground"><strong>Structure:</strong> /app-source, /database (schema + data + migrations), /assets, /config, /docs, AI_REBUILD_PROMPT.md, EXPORT_MANIFEST.json</p>
              </div>

              <div className="p-2.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs">
                💡 <strong>Migration Tip:</strong> To rebuild on another platform, open <code>AI_REBUILD_PROMPT.md</code> in the root of the ZIP and paste it directly into the AI builder prompt.
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setShowReportModal(false)} className="w-full sm:w-auto">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppBackupCard;
