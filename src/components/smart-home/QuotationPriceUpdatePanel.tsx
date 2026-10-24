import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { quotationsApi } from '@/db/api';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';

interface QuotationPriceUpdatePanelProps {
  quotationId: string;
  hasPendingUpdate: boolean;
  onUpdateApplied?: () => void;
  onUpdateIgnored?: () => void;
}

export default function QuotationPriceUpdatePanel({
  quotationId,
  hasPendingUpdate,
  onUpdateApplied,
  onUpdateIgnored
}: QuotationPriceUpdatePanelProps) {
  const { toast } = useToast();
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [ignoreDialogOpen, setIgnoreDialogOpen] = useState(false);
  const [applyReason, setApplyReason] = useState('');
  const [ignoreReason, setIgnoreReason] = useState('');
  const [processing, setProcessing] = useState(false);

  if (!hasPendingUpdate) {
    return null;
  }

  const handleApplyIncrease = async () => {
    try {
      setProcessing(true);
      await quotationsApi.applyPriceIncrease(
        quotationId,
        applyReason || 'Price increase applied'
      );
      
      toast({
        title: 'Success',
        description: 'Price increase applied successfully',
        variant: 'default'
      });
      
      setApplyDialogOpen(false);
      setApplyReason('');
      onUpdateApplied?.();
    } catch (error) {
      console.error('Error applying price increase:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to apply price increase',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleIgnoreUpdate = async () => {
    try {
      setProcessing(true);
      await quotationsApi.ignorePriceUpdate(
        quotationId,
        ignoreReason || 'Price update ignored'
      );
      
      toast({
        title: 'Success',
        description: 'Price update ignored',
        variant: 'default'
      });
      
      setIgnoreDialogOpen(false);
      setIgnoreReason('');
      onUpdateIgnored?.();
    } catch (error) {
      console.error('Error ignoring price update:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to ignore price update',
        variant: 'destructive'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      <Card className="border-orange-200 bg-orange-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertCircle className="h-5 w-5" />
            Pending Price Update
          </CardTitle>
          <CardDescription className="text-orange-700">
            Device prices have been updated since this quotation was created. 
            You can apply the new prices or ignore this update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              onClick={() => setApplyDialogOpen(true)}
              className="flex-1"
              variant="default"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Apply Price Increase
            </Button>
            <Button
              onClick={() => setIgnoreDialogOpen(true)}
              className="flex-1"
              variant="outline"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Ignore Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Apply Price Increase Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Price Increase</DialogTitle>
            <DialogDescription>
              This will update the quotation to reflect the new device prices. 
              This action will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Applying (Optional)</Label>
              <Textarea
                placeholder="e.g., Supplier cost increase, Market adjustment..."
                value={applyReason}
                onChange={(e) => setApplyReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setApplyDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyIncrease} disabled={processing}>
              {processing ? 'Applying...' : 'Confirm Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ignore Update Dialog */}
      <Dialog open={ignoreDialogOpen} onOpenChange={setIgnoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignore Price Update</DialogTitle>
            <DialogDescription>
              This will dismiss the price update notification for this quotation. 
              The quotation will keep its current prices. This action will be logged.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Ignoring (Optional)</Label>
              <Textarea
                placeholder="e.g., Client already approved, Special pricing agreement..."
                value={ignoreReason}
                onChange={(e) => setIgnoreReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIgnoreDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleIgnoreUpdate} disabled={processing} variant="outline">
              {processing ? 'Processing...' : 'Confirm Ignore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
