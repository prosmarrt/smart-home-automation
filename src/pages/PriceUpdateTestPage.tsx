import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { quotationsApi, devicePricesApi } from '@/db/api';
import { CheckCircle, XCircle, AlertCircle, Play, RefreshCw, Trash2 } from 'lucide-react';
import type { Quotation, DevicePrice } from '@/types/types';

interface TestLog {
  step: string;
  status: 'pending' | 'success' | 'error' | 'info';
  message: string;
  data?: any;
  timestamp: string;
}

export default function PriceUpdateTestPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<TestLog[]>([]);
  const [testQuotation, setTestQuotation] = useState<Quotation | null>(null);
  const [testDevicePrice, setTestDevicePrice] = useState<DevicePrice | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (step: string, status: TestLog['status'], message: string, data?: any) => {
    const log: TestLog = {
      step,
      status,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    };
    setLogs(prev => [...prev, log]);
    console.log(`[TEST ${status.toUpperCase()}] ${step}: ${message}`, data);
  };

  const clearLogs = () => {
    setLogs([]);
    setCurrentStep(0);
    setTestQuotation(null);
    setTestDevicePrice(null);
  };

  // Step 1: Create a test quotation with specific devices
  const createTestQuotation = async () => {
    try {
      addLog('Step 1', 'info', 'Creating test quotation...');
      
      const testData: any = {
        client_name: 'Test Client - Price Update',
        client_address: '123 Test Street',
        client_phone: '+1234567890',
        project_code: `TEST-${Date.now()}`,
        status: 'Draft' as const,
        devices_data: [
          {
            id: crypto.randomUUID(),
            category: 'mini_switch',
            protocol: 'wifi',
            gang: '1',
            device_name: 'Mini Switch 1 Gang WiFi',
            brand: 'Test Brand',
            model: 'Test Model',
            quantity: 2,
            unit_price: 950,
            total_price: 1900,
            room_name: 'Living Room',
            notes: 'Test device for price update workflow'
          },
          {
            id: crypto.randomUUID(),
            category: 'mini_switch',
            protocol: 'wifi',
            gang: '3',
            device_name: 'Mini Switch 3 Gang WiFi',
            brand: 'Test Brand',
            model: 'Test Model',
            quantity: 1,
            unit_price: 1250,
            total_price: 1250,
            room_name: 'Bedroom',
            notes: 'Another test device'
          }
        ],
        total_amount: 3150,
        vat_percentage: 0,
        total_paid: 0,
        remaining_balance: 3150,
        commissioning_price: 0,
        installation_price: 0,
        discount_value: 0,
        price_snapshot_date: new Date().toISOString()
      };

      const quotation = await quotationsApi.create(testData);
      setTestQuotation(quotation);
      
      addLog('Step 1', 'success', 'Test quotation created successfully', {
        id: quotation.id,
        project_code: quotation.project_code,
        total_amount: quotation.total_amount,
        devices_count: quotation.devices_data.length
      });
      
      setCurrentStep(1);
      
      toast({
        title: 'Success',
        description: `Test quotation created: ${quotation.project_code}`
      });
    } catch (error: any) {
      addLog('Step 1', 'error', 'Failed to create test quotation', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Step 2: Update device prices
  const updateDevicePrices = async () => {
    if (!testQuotation) {
      addLog('Step 2', 'error', 'No test quotation found');
      return;
    }

    try {
      addLog('Step 2', 'info', 'Updating device prices...');
      
      // Update the price for mini_switch wifi 1 gang
      const newPrice: any = {
        category: 'mini_switch' as const,
        protocol: 'wifi' as const,
        gang: '1' as const,
        unit_price: 1100, // Increased from 950 to 1100 (15.8% increase)
        brand: 'Test Brand',
        model: 'Test Model',
        device_name: 'Mini Switch 1 Gang WiFi',
        description: 'Updated price for testing'
      };

      const updatedPrice = await devicePricesApi.upsert(newPrice);
      setTestDevicePrice(updatedPrice);
      
      addLog('Step 2', 'success', 'Device price updated successfully', {
        category: updatedPrice.category,
        protocol: updatedPrice.protocol,
        gang: updatedPrice.gang,
        old_price: 950,
        new_price: updatedPrice.unit_price,
        increase_percentage: ((1100 - 950) / 950 * 100).toFixed(2) + '%'
      });
      
      setCurrentStep(2);
      
      toast({
        title: 'Success',
        description: 'Device price updated from 950 to 1100 EGP'
      });
    } catch (error: any) {
      addLog('Step 2', 'error', 'Failed to update device price', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Step 3: Check for price updates (automatic detection)
  const checkPriceUpdates = async () => {
    if (!testQuotation) {
      addLog('Step 3', 'error', 'No test quotation found');
      return;
    }

    try {
      addLog('Step 3', 'info', 'Checking for price updates...');
      
      const hasUpdates = await quotationsApi.checkForPriceUpdates(testQuotation.id);
      
      if (hasUpdates) {
        addLog('Step 3', 'success', 'Price updates detected and quotation marked', {
          quotation_id: testQuotation.id,
          pending_price_update: true
        });
        
        // Reload quotation to get updated status
        const updated = await quotationsApi.getById(testQuotation.id);
        if (updated) {
          setTestQuotation(updated);
          addLog('Step 3', 'info', 'Quotation reloaded', {
            pending_price_update: updated.pending_price_update
          });
        }
      } else {
        addLog('Step 3', 'info', 'No price updates detected or conditions not met', {
          quotation_status: testQuotation.status,
          total_paid: testQuotation.total_paid
        });
      }
      
      setCurrentStep(3);
      
      toast({
        title: hasUpdates ? 'Success' : 'Info',
        description: hasUpdates 
          ? 'Quotation marked for price update' 
          : 'No price updates detected'
      });
    } catch (error: any) {
      addLog('Step 3', 'error', 'Failed to check for price updates', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Step 4: Manual mark quotations for update
  const manualMarkQuotations = async () => {
    try {
      addLog('Step 4', 'info', 'Manually marking quotations for update...');
      
      const markedQuotations = await quotationsApi.markQuotationsForPriceUpdate();
      
      addLog('Step 4', 'success', `Marked ${markedQuotations.length} quotation(s)`, markedQuotations);
      
      // Reload test quotation
      if (testQuotation) {
        const updated = await quotationsApi.getById(testQuotation.id);
        if (updated) {
          setTestQuotation(updated);
          addLog('Step 4', 'info', 'Test quotation reloaded', {
            pending_price_update: updated.pending_price_update
          });
        }
      }
      
      setCurrentStep(4);
      
      toast({
        title: 'Success',
        description: `Marked ${markedQuotations.length} quotation(s) for update`
      });
    } catch (error: any) {
      addLog('Step 4', 'error', 'Failed to mark quotations', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Step 5: Apply price increase
  const applyPriceIncrease = async () => {
    if (!testQuotation) {
      addLog('Step 5', 'error', 'No test quotation found');
      return;
    }

    try {
      addLog('Step 5', 'info', 'Applying price increase...');
      
      const oldTotal = testQuotation.total_amount;
      const updated = await quotationsApi.applyPriceIncrease(
        testQuotation.id,
        'Test: Applying price increase for workflow verification'
      );
      
      setTestQuotation(updated);
      
      addLog('Step 5', 'success', 'Price increase applied successfully', {
        old_total: oldTotal,
        new_total: updated.total_amount,
        difference: updated.total_amount - oldTotal,
        pending_price_update: updated.pending_price_update
      });
      
      setCurrentStep(5);
      
      toast({
        title: 'Success',
        description: `Price increase applied. Total: ${oldTotal} → ${updated.total_amount} EGP`
      });
    } catch (error: any) {
      addLog('Step 5', 'error', 'Failed to apply price increase', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Step 6: Ignore price update (alternative to step 5)
  const ignorePriceUpdate = async () => {
    if (!testQuotation) {
      addLog('Step 6', 'error', 'No test quotation found');
      return;
    }

    try {
      addLog('Step 6', 'info', 'Ignoring price update...');
      
      const updated = await quotationsApi.ignorePriceUpdate(
        testQuotation.id,
        'Test: Ignoring price update for workflow verification'
      );
      
      setTestQuotation(updated);
      
      addLog('Step 6', 'success', 'Price update ignored successfully', {
        pending_price_update: updated.pending_price_update,
        update_ignored_at: updated.update_ignored_at
      });
      
      setCurrentStep(6);
      
      toast({
        title: 'Success',
        description: 'Price update ignored'
      });
    } catch (error: any) {
      addLog('Step 6', 'error', 'Failed to ignore price update', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Cleanup: Delete test quotation
  const cleanupTest = async () => {
    if (!testQuotation) {
      addLog('Cleanup', 'error', 'No test quotation to delete');
      return;
    }

    try {
      addLog('Cleanup', 'info', 'Deleting test quotation...');
      
      await quotationsApi.delete(testQuotation.id);
      
      addLog('Cleanup', 'success', 'Test quotation deleted successfully');
      
      setTestQuotation(null);
      setCurrentStep(0);
      
      toast({
        title: 'Success',
        description: 'Test quotation deleted'
      });
    } catch (error: any) {
      addLog('Cleanup', 'error', 'Failed to delete test quotation', error.message);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Run all steps automatically
  const runFullTest = async () => {
    setIsRunning(true);
    clearLogs();
    
    try {
      // Step 1: Create quotation
      await createTestQuotation();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 2: Update prices
      await updateDevicePrices();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 3: Check for updates
      await checkPriceUpdates();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Step 4: Manual mark
      await manualMarkQuotations();
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addLog('Test Complete', 'success', 'All steps completed. Now you can test Apply or Ignore.');
    } catch (error: any) {
      addLog('Test Failed', 'error', 'Test sequence failed', error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestLog['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'info':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: TestLog['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Price Update Workflow Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the complete price increase workflow with detailed logging
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          Step {currentStep} / 6
        </Badge>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>
            Run individual steps or execute the full test sequence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={runFullTest}
              disabled={isRunning}
              className="flex-1 min-w-[200px]"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Full Test'}
            </Button>
            <Button
              onClick={clearLogs}
              variant="outline"
              disabled={isRunning}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Logs
            </Button>
            {testQuotation && (
              <Button
                onClick={cleanupTest}
                variant="destructive"
                disabled={isRunning}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Test Quotation
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <Button
              onClick={createTestQuotation}
              variant="outline"
              disabled={isRunning || currentStep >= 1}
            >
              1. Create Test Quotation
            </Button>
            <Button
              onClick={updateDevicePrices}
              variant="outline"
              disabled={isRunning || !testQuotation || currentStep >= 2}
            >
              2. Update Device Prices
            </Button>
            <Button
              onClick={checkPriceUpdates}
              variant="outline"
              disabled={isRunning || !testQuotation || currentStep >= 3}
            >
              3. Check Price Updates
            </Button>
            <Button
              onClick={manualMarkQuotations}
              variant="outline"
              disabled={isRunning || !testQuotation || currentStep >= 4}
            >
              4. Manual Mark Quotations
            </Button>
            <Button
              onClick={applyPriceIncrease}
              variant="outline"
              disabled={isRunning || !testQuotation || currentStep >= 5}
            >
              5. Apply Price Increase
            </Button>
            <Button
              onClick={ignorePriceUpdate}
              variant="outline"
              disabled={isRunning || !testQuotation || currentStep >= 6}
            >
              6. Ignore Price Update
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Quotation Status */}
      {testQuotation && (
        <Card>
          <CardHeader>
            <CardTitle>Test Quotation Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Project Code</p>
                <p className="font-semibold">{testQuotation.project_code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-semibold">EGP {testQuotation.total_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{testQuotation.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Update</p>
                <Badge variant={testQuotation.pending_price_update ? 'default' : 'outline'}>
                  {testQuotation.pending_price_update ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Test Logs</CardTitle>
          <CardDescription>
            Detailed logs of each step in the workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No logs yet</AlertTitle>
              <AlertDescription>
                Run a test to see detailed logs of the workflow
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getStatusColor(log.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(log.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-sm">{log.step}</p>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{log.message}</p>
                      {log.data && (
                        <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Automatic Test:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click "Run Full Test" to execute steps 1-4 automatically</li>
              <li>Wait for all steps to complete</li>
              <li>Then manually test either "Apply Price Increase" or "Ignore Price Update"</li>
              <li>Check the logs to verify each step executed correctly</li>
              <li>Open browser console (F12) to see detailed console.log output</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Manual Test:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Click each step button in sequence (1 through 6)</li>
              <li>Review the logs after each step</li>
              <li>Verify the quotation status updates correctly</li>
              <li>Check browser console for detailed debugging information</li>
            </ol>
          </div>
          <div>
            <h4 className="font-semibold mb-2">What to Check:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Step 1: Quotation created with 2 devices, total 3150 EGP</li>
              <li>Step 2: Device price updated from 950 to 1100 EGP (15.8% increase)</li>
              <li>Step 3: Price comparison detects changes</li>
              <li>Step 4: Quotation marked with pending_price_update = true</li>
              <li>Step 5: Apply increases total to 3450 EGP (2×1100 + 1250)</li>
              <li>Step 6: Ignore keeps total at 3150 EGP</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
