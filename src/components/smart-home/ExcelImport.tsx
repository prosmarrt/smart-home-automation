import { useState } from 'react';
import { Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { devicePricesApi } from '@/db/api';
import * as XLSX from 'xlsx';
import type { DeviceCategory, Protocol, SwitchGang, IntercomType } from '@/types/types';

interface ExcelImportProps {
  onImportComplete: () => void;
}

interface PriceRow {
  category: string;
  protocol?: string;
  gang?: string;
  intercom_type?: string;
  unit_price: number;
}

export default function ExcelImport({ onImportComplete }: ExcelImportProps) {
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const templateData = [
      {
        Category: 'mini_switch',
        Protocol: 'zigbee',
        Gang: '1',
        'Intercom Type': '',
        'Unit Price': 150.00
      },
      {
        Category: 'mini_switch',
        Protocol: 'zigbee',
        Gang: '2',
        'Intercom Type': '',
        'Unit Price': 200.00
      },
      {
        Category: 'touch_switch',
        Protocol: 'matter',
        Gang: '1',
        'Intercom Type': '',
        'Unit Price': 180.00
      },
      {
        Category: 'smart_plug',
        Protocol: 'wifi',
        Gang: '',
        'Intercom Type': '',
        'Unit Price': 120.00
      },
      {
        Category: 'intercom',
        Protocol: 'wired',
        Gang: '',
        'Intercom Type': 'doorbell',
        'Unit Price': 500.00
      },
      {
        Category: 'camera',
        Protocol: 'wifi',
        Gang: '',
        'Intercom Type': '',
        'Unit Price': 800.00
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pricing Template');

    ws['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 }
    ];

    XLSX.writeFile(wb, 'Smart_Home_Pricing_Template.xlsx');

    toast({
      title: 'Template Downloaded',
      description: 'Excel template has been downloaded successfully.'
    });
  };

  const validateCategory = (category: string): DeviceCategory | null => {
    const validCategories: DeviceCategory[] = [
      'mini_switch', 'touch_switch', 'shutter_switch', 'smart_shutter_switch', 'curtain_switch',
      'curtain_motor', 'curtain_rail', 'roller_blind_motor', 'smart_plug',
      'ir_remote', 'gas_sensor', 'water_leak_sensor', 'motion_sensor', 'presence_sensor', 'smoke_sensor',
      'gas_valve', 'water_valve', 'intercom', 'camera', 'zigbee_hub', 'matter_hub',
      'access_point', 'repeater', 'mesh_wifi', 'network_switch',
      'cat6_cable', 'bracket', 'nvr', 'hdd', 'custom_device'
    ];
    
    const normalized = category.toLowerCase().trim();
    return validCategories.includes(normalized as DeviceCategory) 
      ? normalized as DeviceCategory 
      : null;
  };

  const validateProtocol = (protocol: string): Protocol | null => {
    if (!protocol) return null;
    const validProtocols: Protocol[] = ['zigbee', 'matter', 'wifi', 'wired', 'lan'];
    const normalized = protocol.toLowerCase().trim();
    return validProtocols.includes(normalized as Protocol) 
      ? normalized as Protocol 
      : null;
  };

  const validateGang = (gang: string): SwitchGang | null => {
    if (!gang) return null;
    const validGangs: SwitchGang[] = ['1', '2', '3', '4'];
    const normalized = gang.toString().trim();
    return validGangs.includes(normalized as SwitchGang) 
      ? normalized as SwitchGang 
      : null;
  };

  const validateIntercomType = (type: string): IntercomType | null => {
    if (!type) return null;
    const validTypes: IntercomType[] = ['doorbell', 'indoor_station'];
    const normalized = type.toLowerCase().trim();
    return validTypes.includes(normalized as IntercomType) 
      ? normalized as IntercomType 
      : null;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      };

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        const rowNum = i + 2;

        try {
          const category = validateCategory(row.Category || row.category);
          if (!category) {
            results.errors.push(`Row ${rowNum}: Invalid category "${row.Category}"`);
            results.failed++;
            continue;
          }

          const unitPrice = Number.parseFloat(row['Unit Price'] || row.unit_price || row.price);
          if (Number.isNaN(unitPrice) || unitPrice < 0) {
            results.errors.push(`Row ${rowNum}: Invalid unit price`);
            results.failed++;
            continue;
          }

          const priceData: any = {
            category,
            unit_price: unitPrice
          };

          const protocol = validateProtocol(row.Protocol || row.protocol || '');
          if (protocol) {
            priceData.protocol = protocol;
          }

          const gang = validateGang(row.Gang || row.gang || '');
          if (gang) {
            priceData.gang = gang;
          }

          const intercomType = validateIntercomType(row['Intercom Type'] || row.intercom_type || '');
          if (intercomType) {
            priceData.intercom_type = intercomType;
          }

          await devicePricesApi.upsert(priceData);
          results.success++;
        } catch (error) {
          results.errors.push(`Row ${rowNum}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.failed++;
        }
      }

      setImportResults(results);

      if (results.success > 0) {
        toast({
          title: 'Import Complete',
          description: `Successfully imported ${results.success} price records.`
        });
        onImportComplete();
      }

      if (results.failed > 0) {
        toast({
          title: 'Import Completed with Errors',
          description: `${results.failed} records failed to import. Check details below.`,
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error importing Excel file:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import Excel file.',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <CardTitle>Excel Import</CardTitle>
        </div>
        <CardDescription>Import pricing data from Excel spreadsheet</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>

          <div className="flex-1">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              disabled={importing}
              className="hidden"
              id="excel-upload"
            />
            <label htmlFor="excel-upload" className="w-full">
              <Button
                variant="default"
                disabled={importing}
                className="w-full"
                asChild
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? 'Importing...' : 'Upload Excel File'}
                </span>
              </Button>
            </label>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Excel Format Requirements</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>Your Excel file should have the following columns:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Category</strong>: Device category (e.g., mini_switch, camera)</li>
              <li><strong>Protocol</strong>: Communication protocol (zigbee, matter, wifi, wired, lan)</li>
              <li><strong>Gang</strong>: Switch gang count (1, 2, 3, 4) - for switches only</li>
              <li><strong>Intercom Type</strong>: doorbell or indoor_station - for intercom only</li>
              <li><strong>Unit Price</strong>: Price in EGP</li>
            </ul>
            <p className="text-sm mt-2">Download the template to see the exact format.</p>
          </AlertDescription>
        </Alert>

        {importResults && (
          <Alert variant={importResults.failed > 0 ? 'destructive' : 'default'}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Import Results</AlertTitle>
            <AlertDescription className="space-y-2 mt-2">
              <p>Successfully imported: <strong>{importResults.success}</strong> records</p>
              {importResults.failed > 0 && (
                <>
                  <p>Failed: <strong>{importResults.failed}</strong> records</p>
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    <p className="font-semibold mb-1">Errors:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {importResults.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
