import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { priceHistoryApi, devicePricesApi, isAdmin } from '@/db/api';
import type { PriceHistory, PriceChangeType } from '@/types/types';
import { ArrowLeft, TrendingUp, TrendingDown, RotateCcw, Filter } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function PriceHistoryPage() {
  const { devicePriceId } = useParams<{ devicePriceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  
  // Filters
  const [changeTypeFilter, setChangeTypeFilter] = useState<PriceChangeType | 'all'>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'7' | '30' | '90' | 'all'>('30');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Revert dialog
  const [revertDialogOpen, setRevertDialogOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<PriceHistory | null>(null);
  const [revertReason, setRevertReason] = useState('');
  const [reverting, setReverting] = useState(false);

  useEffect(() => {
    loadData();
  }, [devicePriceId]);

  useEffect(() => {
    applyFilters();
  }, [history, changeTypeFilter, dateRangeFilter, searchTerm]);

  const loadData = async () => {
    if (!devicePriceId) return;
    
    try {
      setLoading(true);
      const adminStatus = await isAdmin();
      setIsAdminUser(adminStatus);
      
      const historyData = await priceHistoryApi.getByDevice(devicePriceId);
      setHistory(historyData);
      
      // Get device name
      const allPrices = await devicePricesApi.getAll();
      const device = allPrices?.find(d => d.id === devicePriceId);
      if (device) {
        const name = device.device_name || 
          `${device.brand || ''} ${device.model || ''}`.trim() ||
          'Unknown Device';
        setDeviceName(name);
      }
    } catch (error) {
      console.error('Error loading price history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load price history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];
    
    // Change type filter
    if (changeTypeFilter !== 'all') {
      filtered = filtered.filter(h => h.change_type === changeTypeFilter);
    }
    
    // Date range filter
    if (dateRangeFilter !== 'all') {
      const days = Number.parseInt(dateRangeFilter);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      filtered = filtered.filter(h => new Date(h.changed_at) >= cutoffDate);
    }
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(h => 
        h.device_name.toLowerCase().includes(term) ||
        h.change_reason?.toLowerCase().includes(term) ||
        h.change_type.toLowerCase().includes(term)
      );
    }
    
    setFilteredHistory(filtered);
  };

  const handleRevert = async () => {
    if (!selectedHistory || !devicePriceId) return;
    
    try {
      setReverting(true);
      await priceHistoryApi.revertToPrice(
        devicePriceId,
        selectedHistory.id,
        revertReason || 'Price reversion'
      );
      
      toast({
        title: 'Success',
        description: 'Price reverted successfully'
      });
      
      setRevertDialogOpen(false);
      setSelectedHistory(null);
      setRevertReason('');
      loadData();
    } catch (error) {
      console.error('Error reverting price:', error);
      toast({
        title: 'Error',
        description: 'Failed to revert price',
        variant: 'destructive'
      });
    } finally {
      setReverting(false);
    }
  };

  const openRevertDialog = (historyItem: PriceHistory) => {
    setSelectedHistory(historyItem);
    setRevertDialogOpen(true);
  };

  const getChangeTypeLabel = (type: PriceChangeType) => {
    const labels: Record<PriceChangeType, string> = {
      update: 'Manual Update',
      revert: 'Reverted',
      apply_increase: 'Applied Increase',
      ignore_update: 'Ignored Update',
      initial: 'Initial Price'
    };
    return labels[type];
  };

  const getChangeTypeColor = (type: PriceChangeType) => {
    const colors: Record<PriceChangeType, string> = {
      update: 'text-blue-600',
      revert: 'text-purple-600',
      apply_increase: 'text-green-600',
      ignore_update: 'text-orange-600',
      initial: 'text-gray-600'
    };
    return colors[type];
  };

  const getPriceChange = (oldPrice: number, newPrice: number) => {
    const diff = newPrice - oldPrice;
    const percentage = oldPrice > 0 ? ((diff / oldPrice) * 100).toFixed(2) : '0';
    return { diff, percentage };
  };

  // Prepare chart data
  const chartData = filteredHistory
    .slice()
    .reverse()
    .map(h => ({
      date: new Date(h.changed_at).toLocaleDateString(),
      price: h.new_price,
      changeType: getChangeTypeLabel(h.change_type)
    }));

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading price history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/pricing')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Price History</h1>
            <p className="text-muted-foreground">{deviceName}</p>
          </div>
        </div>
      </div>

      {/* Price Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Price Trend</CardTitle>
          <CardDescription>Historical price changes over time</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No price history data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Change Type</Label>
              <Select value={changeTypeFilter} onValueChange={(v) => setChangeTypeFilter(v as PriceChangeType | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="update">Manual Update</SelectItem>
                  <SelectItem value="revert">Reverted</SelectItem>
                  <SelectItem value="apply_increase">Applied Increase</SelectItem>
                  <SelectItem value="ignore_update">Ignored Update</SelectItem>
                  <SelectItem value="initial">Initial Price</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRangeFilter} onValueChange={(v) => setDateRangeFilter(v as '7' | '30' | '90' | 'all')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 Days</SelectItem>
                  <SelectItem value="30">Last 30 Days</SelectItem>
                  <SelectItem value="90">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                placeholder="Search by reason or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Change History</CardTitle>
          <CardDescription>
            {filteredHistory.length} {filteredHistory.length === 1 ? 'entry' : 'entries'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Change Type</TableHead>
                  <TableHead>Old Price</TableHead>
                  <TableHead>New Price</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                  {isAdminUser && <TableHead>Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdminUser ? 7 : 6} className="text-center text-muted-foreground">
                      No history entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredHistory.map((item) => {
                    const { diff, percentage } = getPriceChange(item.old_price, item.new_price);
                    const isIncrease = diff > 0;
                    
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(item.changed_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <span className={`font-medium ${getChangeTypeColor(item.change_type)}`}>
                            {getChangeTypeLabel(item.change_type)}
                          </span>
                        </TableCell>
                        <TableCell>{item.old_price.toFixed(2)} EGP</TableCell>
                        <TableCell>{item.new_price.toFixed(2)} EGP</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {isIncrease ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : diff < 0 ? (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            ) : null}
                            <span className={isIncrease ? 'text-green-600' : diff < 0 ? 'text-red-600' : ''}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(2)} ({percentage}%)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {item.change_reason || '-'}
                        </TableCell>
                        {isAdminUser && (
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openRevertDialog(item)}
                              disabled={item.change_type === 'initial'}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Revert
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Revert Dialog */}
      <Dialog open={revertDialogOpen} onOpenChange={setRevertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revert to Historical Price</DialogTitle>
            <DialogDescription>
              This will set the current price to {selectedHistory?.new_price.toFixed(2)} EGP
              (from {new Date(selectedHistory?.changed_at || '').toLocaleDateString()})
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for Reversion</Label>
              <Textarea
                placeholder="Enter reason for reverting to this price..."
                value={revertReason}
                onChange={(e) => setRevertReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevertDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRevert} disabled={reverting}>
              {reverting ? 'Reverting...' : 'Confirm Revert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
