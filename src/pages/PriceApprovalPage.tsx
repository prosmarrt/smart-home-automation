import { useEffect, useState } from 'react';
import { priceApprovalsApi } from '@/db/api';
import type { PriceApproval } from '@/types/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, XCircle, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCategoryLabels } from '@/hooks/useCategoryLabels';


export default function PriceApprovalPage() {
  const { getLabel } = useCategoryLabels();
  const [approvals, setApprovals] = useState<PriceApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApproval, setSelectedApproval] = useState<PriceApproval | null>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const { toast } = useToast();

  useEffect(() => {
    loadApprovals();
  }, [activeTab]);

  const loadApprovals = async () => {
    try {
      setIsLoading(true);
      const data = activeTab === 'all' 
        ? await priceApprovalsApi.getAll()
        : await priceApprovalsApi.getAll(activeTab);
      setApprovals(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load price approvals',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedApproval) return;

    try {
      setIsProcessing(true);
      await priceApprovalsApi.approve(selectedApproval.id, notes);
      toast({
        title: 'Success',
        description: 'Price change approved successfully'
      });
      setShowApproveDialog(false);
      setNotes('');
      setSelectedApproval(null);
      loadApprovals();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve price change',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedApproval) return;

    try {
      setIsProcessing(true);
      await priceApprovalsApi.reject(selectedApproval.id, notes);
      toast({
        title: 'Success',
        description: 'Price change rejected'
      });
      setShowRejectDialog(false);
      setNotes('');
      setSelectedApproval(null);
      loadApprovals();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject price change',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getPriceChange = (approval: PriceApproval) => {
    const change = approval.new_price - approval.old_price;
    const percentage = ((change / approval.old_price) * 100).toFixed(1);
    return { change, percentage };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Price Change Approvals</CardTitle>
          <CardDescription>Review and approve or reject price change requests</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4 mt-6">
              {approvals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No {activeTab === 'all' ? '' : activeTab} price approvals found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvals.map((approval) => {
                    const { change, percentage } = getPriceChange(approval);
                    const isIncrease = change > 0;

                    return (
                      <Card key={approval.id} className="border-l-4" style={{
                        borderLeftColor: approval.status === 'approved' ? 'hsl(var(--success))' : 
                                       approval.status === 'rejected' ? 'hsl(var(--destructive))' : 
                                       'hsl(var(--warning))'
                      }}>
                        <CardContent className="pt-6">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-lg">{approval.device_name}</h3>
                                <Badge variant={
                                  approval.status === 'pending' ? 'default' :
                                  approval.status === 'approved' ? 'default' :
                                  'destructive'
                                }>
                                  {approval.status}
                                </Badge>
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-muted-foreground">
                                  {new Date(approval.requested_at).toLocaleDateString()}
                                </span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-muted-foreground capitalize">
                                  {getLabel(approval.device_category)}
                                </span>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">Old:</span>
                                  <span className="font-medium">EGP {approval.old_price.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isIncrease ? (
                                    <TrendingUp className="w-4 h-4 text-destructive" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-success" />
                                  )}
                                  <span className={`text-sm font-medium ${isIncrease ? 'text-destructive' : 'text-success'}`}>
                                    {isIncrease ? '+' : ''}{percentage}%
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">New:</span>
                                  <span className="font-semibold text-primary">EGP {approval.new_price.toFixed(2)}</span>
                                </div>
                              </div>

                              {approval.reason && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>Reason:</strong> {approval.reason}
                                </p>
                              )}

                              {approval.approval_notes && (
                                <p className="text-sm text-muted-foreground">
                                  <strong>Notes:</strong> {approval.approval_notes}
                                </p>
                              )}
                            </div>

                            {approval.status === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedApproval(approval);
                                    setShowApproveDialog(true);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedApproval(approval);
                                    setShowRejectDialog(true);
                                  }}
                                >
                                  <XCircle className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Price Change</DialogTitle>
            <DialogDescription>
              Approve the price change for {selectedApproval?.device_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Approval Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this approval..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleApprove} disabled={isProcessing}>
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Price Change</DialogTitle>
            <DialogDescription>
              Reject the price change for {selectedApproval?.device_name}?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rejection Notes (Optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add reason for rejection..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isProcessing}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={isProcessing}>
              {isProcessing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
