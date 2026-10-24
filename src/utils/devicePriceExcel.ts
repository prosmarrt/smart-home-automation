import * as XLSX from 'xlsx';
import type { DeviceTemplate } from '@/types/types';

export interface DevicePriceRow {
  id: string;
  name: string;
  category: string;
  protocol: string;
  brand: string;
  gang_options: string;
  port_options: string;
  capacity_options: string;
  current_price: number;
  new_price: number | null;
  notes: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  mini_switch: 'Mini Switch',
  touch_switch: 'Touch Switch',
  shutter_switch: 'Shutter Switch',
  ir_remote: 'IR Remote',
  sensor: 'Sensor',
  valve: 'Valve',
  intercom: 'Intercom',
  camera: 'Camera',
  access_point: 'Access Point',
  mesh_wifi: 'Mesh Wi-Fi',
  network_switch: 'Network Switch',
  other: 'Other'
};

const PROTOCOL_LABELS: Record<string, string> = {
  zigbee: 'Zigbee',
  matter: 'Matter',
  wifi: 'Wi-Fi',
  knx: 'KNX (Wired)',
  wired: 'Wired',
  lan: 'LAN'
};

export function generateDevicePriceTemplate(templates: DeviceTemplate[]): void {
  const rows: DevicePriceRow[] = templates.map(template => ({
    id: template.id,
    name: template.name,
    category: CATEGORY_LABELS[template.category] || template.category,
    protocol: template.default_protocol ? (PROTOCOL_LABELS[template.default_protocol] || template.default_protocol) : '',
    brand: template.brand || '',
    gang_options: template.gang_options?.join(', ') || '',
    port_options: template.port_options?.join(', ') || '',
    capacity_options: template.capacity_options?.join(', ') || '',
    current_price: template.default_unit_price,
    new_price: null,
    notes: ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows, {
    header: [
      'id',
      'name',
      'category',
      'protocol',
      'brand',
      'gang_options',
      'port_options',
      'capacity_options',
      'current_price',
      'new_price',
      'notes'
    ]
  });

  const headerLabels = [
    'Device ID',
    'Device Name',
    'Category',
    'Protocol',
    'Brand',
    'Gang Options',
    'Port Options',
    'Capacity Options',
    'Current Price (EGP)',
    'New Price (EGP)',
    'Notes'
  ];

  XLSX.utils.sheet_add_aoa(worksheet, [headerLabels], { origin: 'A1' });

  const columnWidths = [
    { wch: 38 },
    { wch: 35 },
    { wch: 18 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 30 }
  ];
  worksheet['!cols'] = columnWidths;

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '2196F3' } },
      alignment: { horizontal: 'center', vertical: 'center' }
    };
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Device Prices');

  const instructionsData = [
    ['Device Price Update Instructions'],
    [''],
    ['How to use this template:'],
    ['1. The "Device Prices" sheet contains all device templates with their current prices'],
    ['2. Fill in the "New Price (EGP)" column with updated prices for devices you want to change'],
    ['3. Leave "New Price (EGP)" empty for devices you don\'t want to update'],
    ['4. You can add notes in the "Notes" column for reference (optional)'],
    ['5. DO NOT modify the "Device ID" column - it is required for matching'],
    ['6. DO NOT modify device names, categories, or other information columns'],
    ['7. Save the file and upload it back to the application'],
    ['8. The system will validate and update only the devices with new prices'],
    [''],
    ['Important Notes:'],
    ['• Prices must be positive numbers'],
    ['• Use decimal point (.) for decimal values (e.g., 150.50)'],
    ['• Empty "New Price" cells will be ignored (device price unchanged)'],
    ['• Invalid prices will be reported during upload'],
    ['• You can update prices multiple times by downloading and re-uploading'],
    ['• All prices are in Egyptian Pounds (EGP)'],
    [''],
    ['Tips:'],
    ['• Sort by Category or Protocol to update similar devices together'],
    ['• Use Excel formulas to calculate bulk price changes (e.g., increase all by 10%)'],
    ['• Keep a backup copy before making changes'],
    ['• Review the "Current Price" column to see existing prices'],
    [''],
    ['Support:'],
    ['If you encounter any issues, please contact your system administrator.']
  ];

  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 80 }];

  if (instructionsSheet['A1']) {
    instructionsSheet['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: '2196F3' } },
      alignment: { horizontal: 'left', vertical: 'center' }
    };
  }

  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');

  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `device_prices_${timestamp}.xlsx`;
  
  XLSX.writeFile(workbook, filename);
}

export interface PriceUpdateResult {
  success: boolean;
  updates: Array<{ id: string; default_unit_price: number }>;
  errors: Array<{ row: number; message: string }>;
  skipped: number;
}

export function parseDevicePriceExcel(file: File): Promise<PriceUpdateResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const sheetName = workbook.SheetNames.find(name => 
          name.toLowerCase().includes('device') || name.toLowerCase().includes('price')
        ) || workbook.SheetNames[0];
        
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          reject(new Error('Excel file is empty or has no data rows'));
          return;
        }

        const headers = jsonData[0] as string[];
        const idIndex = headers.findIndex(h => 
          h?.toLowerCase().includes('id') || h?.toLowerCase() === 'device id'
        );
        const newPriceIndex = headers.findIndex(h => 
          h?.toLowerCase().includes('new price') || h?.toLowerCase().includes('new_price')
        );

        if (idIndex === -1) {
          reject(new Error('Could not find "Device ID" column in Excel file'));
          return;
        }

        if (newPriceIndex === -1) {
          reject(new Error('Could not find "New Price" column in Excel file'));
          return;
        }

        const updates: Array<{ id: string; default_unit_price: number }> = [];
        const errors: Array<{ row: number; message: string }> = [];
        let skipped = 0;

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          const rowNumber = i + 1;

          const id = row[idIndex];
          const newPrice = row[newPriceIndex];

          if (!id || typeof id !== 'string') {
            errors.push({ row: rowNumber, message: 'Missing or invalid Device ID' });
            continue;
          }

          if (newPrice === null || newPrice === undefined || newPrice === '') {
            skipped++;
            continue;
          }

          const price = typeof newPrice === 'number' ? newPrice : parseFloat(String(newPrice));

          if (isNaN(price)) {
            errors.push({ row: rowNumber, message: `Invalid price value: "${newPrice}"` });
            continue;
          }

          if (price < 0) {
            errors.push({ row: rowNumber, message: `Price cannot be negative: ${price}` });
            continue;
          }

          updates.push({ id, default_unit_price: price });
        }

        resolve({
          success: errors.length === 0,
          updates,
          errors,
          skipped
        });

      } catch (error) {
        reject(new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read Excel file'));
    };

    reader.readAsBinaryString(file);
  });
}
