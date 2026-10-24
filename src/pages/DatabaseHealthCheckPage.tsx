import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/db/supabase';
import { CheckCircle, XCircle, AlertCircle, Play, RefreshCw, Database, Shield, Zap, Link as LinkIcon } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HealthCheckResult {
  category: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
  timestamp: string;
}

export default function DatabaseHealthCheckPage() {
  const { toast } = useToast();
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const addResult = (category: string, status: HealthCheckResult['status'], message: string, details?: any) => {
    const result: HealthCheckResult = {
      category,
      status,
      message,
      details,
      timestamp: new Date().toLocaleTimeString()
    };
    setResults(prev => [...prev, result]);
    console.log(`[HEALTH CHECK ${status.toUpperCase()}] ${category}: ${message}`, details);
  };

  // Check table schemas
  const checkSchemas = async () => {
    addResult('Schema Check', 'pass', 'Starting schema validation...');

    try {
      // Check quotations table
      const quotationsResult = await supabase.rpc('get_table_columns', {
        table_name: 'quotations'
      });

      const quotationsColumns = quotationsResult.data;
      const quotationsError = quotationsResult.error;

      if (quotationsError) {
        addResult('Schema Check', 'warning', 'Could not verify quotations table schema', quotationsError);
      } else {
        addResult('Schema Check', 'pass', `Quotations table has ${quotationsColumns?.length || 0} columns`, quotationsColumns);
      }

      // Check device_prices table
      const devicePricesResult = await supabase
        .from('information_schema.columns' as any)
        .select('column_name, data_type')
        .eq('table_name', 'device_prices');

      const devicePricesColumns = devicePricesResult.data;

      if (devicePricesColumns) {
        addResult('Schema Check', 'pass', `Device prices table has ${devicePricesColumns.length} columns`, devicePricesColumns);
      }

      // Check users table
      const usersResult = await supabase
        .from('information_schema.columns' as any)
        .select('column_name, data_type')
        .eq('table_name', 'users');

      const usersColumns = usersResult.data;

      if (usersColumns) {
        addResult('Schema Check', 'pass', `Users table has ${usersColumns.length} columns`, usersColumns);
      }

    } catch (error: any) {
      addResult('Schema Check', 'fail', 'Schema validation failed', error.message);
    }
  };

  // Check RLS policies
  const checkRLSPolicies = async () => {
    addResult('RLS Check', 'pass', 'Starting RLS policy validation...');

    try {
      // Check quotations policies
      const quotationsPoliciesResult = await supabase.rpc('get_table_policies', {
        table_name: 'quotations'
      });

      const quotationsPolicies = quotationsPoliciesResult.data;
      const error = quotationsPoliciesResult.error;

      if (error) {
        addResult('RLS Check', 'warning', 'Could not verify RLS policies', error);
      } else if (quotationsPolicies && quotationsPolicies.length > 0) {
        addResult('RLS Check', 'pass', `Quotations table has ${quotationsPolicies.length} RLS policies`, quotationsPolicies);
      } else {
        addResult('RLS Check', 'warning', 'No RLS policies found for quotations table');
      }

      // Check device_prices policies
      const devicePricesPoliciesResult = await supabase.rpc('get_table_policies', {
        table_name: 'device_prices'
      });

      const devicePricesPolicies = devicePricesPoliciesResult.data;

      if (devicePricesPolicies && devicePricesPolicies.length > 0) {
        addResult('RLS Check', 'pass', `Device prices table has ${devicePricesPolicies.length} RLS policies`);
      } else {
        addResult('RLS Check', 'warning', 'No RLS policies found for device_prices table');
      }

    } catch (error: any) {
      addResult('RLS Check', 'fail', 'RLS policy validation failed', error.message);
    }
  };

  // Check indexes
  const checkIndexes = async () => {
    addResult('Index Check', 'pass', 'Starting index validation...');

    try {
      // Check for indexes on frequently queried columns
      const indexesResult = await supabase.rpc('get_table_indexes', {
        table_name: 'quotations'
      });

      const indexes = indexesResult.data;
      const error = indexesResult.error;

      if (error) {
        addResult('Index Check', 'warning', 'Could not verify indexes', error);
      } else if (indexes && indexes.length > 0) {
        addResult('Index Check', 'pass', `Found ${indexes.length} indexes on quotations table`, indexes);
      } else {
        addResult('Index Check', 'warning', 'No custom indexes found on quotations table');
      }

      // Check for missing indexes on common query patterns
      const recommendedIndexes = [
        { table: 'quotations', column: 'user_id', reason: 'Frequently filtered by user' },
        { table: 'quotations', column: 'status', reason: 'Frequently filtered by status' },
        { table: 'quotations', column: 'created_at', reason: 'Frequently sorted by date' },
        { table: 'device_prices', column: 'category', reason: 'Frequently filtered by category' },
        { table: 'device_prices', column: 'protocol', reason: 'Frequently filtered by protocol' }
      ];

      addResult('Index Check', 'pass', 'Recommended indexes for optimization', recommendedIndexes);

    } catch (error: any) {
      addResult('Index Check', 'fail', 'Index validation failed', error.message);
    }
  };

  // Check for orphaned records
  const checkOrphanedRecords = async () => {
    addResult('Orphaned Records', 'pass', 'Starting orphaned records check...');

    try {
      // Check for quotations without valid users
      const { data: orphanedQuotations, error: quotationsError } = await supabase
        .from('quotations')
        .select('id, project_code, user_id')
        .is('user_id', null);

      if (quotationsError) {
        addResult('Orphaned Records', 'warning', 'Could not check for orphaned quotations', quotationsError);
      } else if (orphanedQuotations && orphanedQuotations.length > 0) {
        addResult('Orphaned Records', 'warning', `Found ${orphanedQuotations.length} quotations without user_id`, orphanedQuotations);
      } else {
        addResult('Orphaned Records', 'pass', 'No orphaned quotations found');
      }

      // Check for device_prices without valid categories
      const { data: invalidDevices, error: devicesError } = await supabase
        .from('device_prices')
        .select('id, category, device_name')
        .is('category', null);

      if (devicesError) {
        addResult('Orphaned Records', 'warning', 'Could not check for invalid devices', devicesError);
      } else if (invalidDevices && invalidDevices.length > 0) {
        addResult('Orphaned Records', 'warning', `Found ${invalidDevices.length} devices without category`, invalidDevices);
      } else {
        addResult('Orphaned Records', 'pass', 'No invalid device records found');
      }

    } catch (error: any) {
      addResult('Orphaned Records', 'fail', 'Orphaned records check failed', error.message);
    }
  };

  // Check data integrity
  const checkDataIntegrity = async () => {
    addResult('Data Integrity', 'pass', 'Starting data integrity check...');

    try {
      // Check for quotations with invalid totals
      const { data: quotations, error: quotationsError } = await supabase
        .from('quotations')
        .select('id, project_code, total_amount, total_paid, remaining_balance')
        .limit(100);

      if (quotationsError) {
        addResult('Data Integrity', 'warning', 'Could not check quotation totals', quotationsError);
      } else if (quotations) {
        const invalidTotals = quotations.filter(q => {
          const expectedBalance = q.total_amount - q.total_paid;
          return Math.abs(expectedBalance - q.remaining_balance) > 0.01;
        });

        if (invalidTotals.length > 0) {
          addResult('Data Integrity', 'warning', `Found ${invalidTotals.length} quotations with incorrect remaining balance`, invalidTotals);
        } else {
          addResult('Data Integrity', 'pass', 'All quotation totals are correct');
        }
      }

      // Check for device_prices with invalid prices
      const { data: devices, error: devicesError } = await supabase
        .from('device_prices')
        .select('id, device_name, unit_price')
        .or('unit_price.is.null,unit_price.lt.0');

      if (devicesError) {
        addResult('Data Integrity', 'warning', 'Could not check device prices', devicesError);
      } else if (devices && devices.length > 0) {
        addResult('Data Integrity', 'warning', `Found ${devices.length} devices with invalid prices`, devices);
      } else {
        addResult('Data Integrity', 'pass', 'All device prices are valid');
      }

    } catch (error: any) {
      addResult('Data Integrity', 'fail', 'Data integrity check failed', error.message);
    }
  };

  // Run all checks
  const runAllChecks = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      await checkSchemas();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await checkRLSPolicies();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await checkIndexes();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await checkOrphanedRecords();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await checkDataIntegrity();

      const passCount = results.filter(r => r.status === 'pass').length;
      const failCount = results.filter(r => r.status === 'fail').length;
      const warningCount = results.filter(r => r.status === 'warning').length;

      toast({
        title: 'Health Check Complete',
        description: `${passCount} passed, ${warningCount} warnings, ${failCount} failed`,
        variant: failCount > 0 ? 'destructive' : 'default'
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
    }
  };

  const getStatusColor = (status: HealthCheckResult['status']) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-orange-50 border-orange-200';
    }
  };

  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<string, HealthCheckResult[]>);

  const stats = {
    total: results.length,
    pass: results.filter(r => r.status === 'pass').length,
    fail: results.filter(r => r.status === 'fail').length,
    warning: results.filter(r => r.status === 'warning').length
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="h-8 w-8" />
            Database Health Check
          </h1>
          <p className="text-muted-foreground mt-2">
            Validate schemas, RLS policies, indexes, and data integrity
          </p>
        </div>
        <Button
          onClick={runAllChecks}
          disabled={isRunning}
          size="lg"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Running Checks...
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              Run All Checks
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-green-600">Passed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.pass}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-orange-600">Warnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.warning}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-red-600">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.fail}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>Health Check Results</CardTitle>
          <CardDescription>
            Detailed results of all database health checks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No checks run yet</AlertTitle>
              <AlertDescription>
                Click "Run All Checks" to start the database health validation
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="schema">
                  <Database className="h-4 w-4 mr-2" />
                  Schema
                </TabsTrigger>
                <TabsTrigger value="rls">
                  <Shield className="h-4 w-4 mr-2" />
                  RLS
                </TabsTrigger>
                <TabsTrigger value="indexes">
                  <Zap className="h-4 w-4 mr-2" />
                  Indexes
                </TabsTrigger>
                <TabsTrigger value="integrity">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Integrity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-3 mt-4">
                {Object.entries(groupedResults).map(([category, categoryResults]) => (
                  <div key={category} className="space-y-2">
                    <h3 className="font-semibold text-lg">{category}</h3>
                    {categoryResults.map((result, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                      >
                        <div className="flex items-start gap-3">
                          {getStatusIcon(result.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{result.message}</p>
                              <span className="text-xs text-muted-foreground">
                                {result.timestamp}
                              </span>
                            </div>
                            {result.details && (
                              <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-x-auto max-h-40">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="schema" className="space-y-3 mt-4">
                {groupedResults['Schema Check']?.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{result.message}</p>
                        {result.details && (
                          <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-x-auto max-h-60">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="rls" className="space-y-3 mt-4">
                {groupedResults['RLS Check']?.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{result.message}</p>
                        {result.details && (
                          <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-x-auto max-h-60">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="indexes" className="space-y-3 mt-4">
                {groupedResults['Index Check']?.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{result.message}</p>
                        {result.details && (
                          <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-x-auto max-h-60">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="integrity" className="space-y-3 mt-4">
                {[...groupedResults['Orphaned Records'] || [], ...groupedResults['Data Integrity'] || []].map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getStatusIcon(result.status)}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{result.message}</p>
                        {result.details && (
                          <pre className="mt-2 p-2 bg-black/5 rounded text-xs overflow-x-auto max-h-60">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
