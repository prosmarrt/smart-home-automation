import * as XLSX from 'xlsx';
import type { Device, Room, ClientInfo, DiscountType } from '@/types/types';

const DEFAULT_LABELS: Record<string, string> = {
  mini_switch: 'Mini Light Switch',
  touch_switch: 'Touch Light Switch',
  shutter_switch: 'Mini Shutter Switch',
  mini_shutter_switch: 'Mini Light Switch',
  smart_shutter_switch: 'Touch Shutter Switch',
  touch_shutter_switch: 'Touch Light Switch',
  curtain_switch: 'Mini Shutter/Curtain Switch',
  curtain_motor: 'Smart Curtain Motor',
  curtain_rail: 'Curtain Rail (per meter)',
  roller_blind_motor: 'Roller Blind Motor',
  smart_plug: 'Smart Plug',
  ir_remote: 'IR Remote Controller',
  gas_sensor: 'Gas Sensor',
  water_leak_sensor: 'Water Leak Sensor',
  motion_sensor: 'Motion Sensor',
  presence_sensor: 'Presence Sensor',
  smoke_sensor: 'Smoke Sensor',
  gas_valve: 'Gas Valve',
  water_valve: 'Water Valve',
  intercom: 'Intercom System',
  camera: 'CCTV Camera',
  wifi_camera: 'WiFi Camera',
  smart_lock: 'Smart Lock',
  zigbee_hub: 'Zigbee Hub',
  matter_hub: 'Matter Hub',
  access_point: 'Access Point',
  repeater: 'Wi-Fi Repeater',
  mesh_wifi: 'Mesh Wi-Fi System',
  network_switch: 'Network Switch',
  cat6_cable: 'CAT 6 Cable',
  bracket: 'Bracket',
  nvr: 'Network Video Recorder',
  hdd: 'Hard Disk Drive',
  memory_card: 'Memory Card',
  central_control: 'Central Control',
  cctv_security: 'CCTV & Security',
  networking: 'Networking',
  voice_assistant: 'Voice Assistant',
  custom_device: 'Custom Device',
  group_light: 'Light',
  group_shading: 'Shading',
  group_cctv_security: 'CCTV & Security',
  group_networking: 'Networking',
  group_voice_assistant: 'Voice Assistant',
  group_central_control: 'Central Control',
  group_custom_devices: 'Custom Devices'
};

interface ExportOptions {
  devices: Device[];
  rooms: Room[];
  clientInfo?: ClientInfo;
  commissioningFee?: number;
  visitFee?: number;
  installationFee?: number;
  vatPercentage?: number;
  discountType?: DiscountType | null;
  discountValue?: number;
  includeRoomDetails?: boolean;
  categoryLabels?: Record<string, string>;
}

export function exportDevicesToExcel({ 
  devices, 
  rooms, 
  includeRoomDetails = true,
  categoryLabels = {}
}: ExportOptions) {
  const getLabel = (category: string) => {
    return categoryLabels[category] || DEFAULT_LABELS[category] || category;
  };

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return 'Unassigned';
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Unknown';
  };

  const getDeviceDetails = (device: Device) => {
    let details = getLabel(device.category);
    
    // Handle custom device names first
    if (device.custom_name) {
      details = device.custom_name;
    } 
    // Handle smart locks - show brand and model
    else if (device.category === 'smart_lock') {
      const brandName = device.brand ? device.brand.charAt(0).toUpperCase() + device.brand.slice(1) : 'Smart Lock';
      const modelName = device.model || '';
      details = modelName ? `${brandName} ${modelName}` : brandName;
    }
    // Handle central control - use device_name field
    else if (device.category === 'central_control') {
      details = device.device_name || 'Central Control Device';
    }
    // Handle other device types with additional details
    else {
      if (device.gang) details += ` ${device.gang} Gang`;
      if (device.camera_type) details += ` ${device.camera_type}`;
      if (device.camera_resolution) details += ` ${device.camera_resolution.toUpperCase()}`;
      if (device.mesh_model) details += ` ${device.mesh_model}`;
      if (device.port_count) details += ` ${device.port_count} Port`;
      if (device.hdd_capacity) details += ` ${device.hdd_capacity.toUpperCase()}`;
      if (device.memory_card_capacity) details += ` ${device.memory_card_capacity.toUpperCase()}`;
      if (device.cable_length) details += ` ${device.cable_length}m`;
      if (device.intercom_type) {
        details += ` - ${device.intercom_type === 'doorbell' ? 'Doorbell' : 'Indoor Station'}`;
      }
    }
    
    return details;
  };

  const exportData = devices.map(device => {
    const baseData: any = {
      'Device Name': getDeviceDetails(device),
      'Category': getLabel(device.category),
      'Protocol': device.protocol ? device.protocol.toUpperCase() : 'N/A',
      'Quantity': device.quantity,
      'Unit Price (EGP)': device.unit_price.toFixed(2),
      'Total Price (EGP)': (device.quantity * device.unit_price).toFixed(2)
    };

    if (includeRoomDetails) {
      baseData['Room'] = getRoomName(device.room_id);
    }

    if (device.custom_description) {
      baseData['Description'] = device.custom_description;
    }

    return baseData;
  });

  const ws = XLSX.utils.json_to_sheet(exportData);

  const columnWidths = [
    { wch: 35 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 40 }
  ];
  ws['!cols'] = columnWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Device Inventory');

  if (includeRoomDetails && rooms.length > 0) {
    const roomData = rooms.map(room => {
      const roomDevices = devices.filter(d => d.room_id === room.id);
      const totalDevices = roomDevices.reduce((sum, d) => sum + d.quantity, 0);
      const totalValue = roomDevices.reduce((sum, d) => sum + (d.quantity * d.unit_price), 0);

      return {
        'Room Name': room.name,
        'Total Devices': totalDevices,
        'Total Value (EGP)': totalValue.toFixed(2)
      };
    });

    const wsRooms = XLSX.utils.json_to_sheet(roomData);
    wsRooms['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsRooms, 'Room Summary');
  }

  const summaryData = [
    { 'Metric': 'Total Devices', 'Value': devices.reduce((sum, d) => sum + d.quantity, 0) },
    { 'Metric': 'Total Categories', 'Value': new Set(devices.map(d => d.category)).size },
    { 'Metric': 'Total Rooms', 'Value': rooms.length },
    { 'Metric': 'Total Value (EGP)', 'Value': devices.reduce((sum, d) => sum + (d.quantity * d.unit_price), 0).toFixed(2) }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Smart_Home_Inventory_${timestamp}.xlsx`);
}
export function exportExpensesToExcel(expenses: any[]) {
  const exportData = expenses.map(expense => ({
    'Expense': expense.name,
    'Category': expense.expense_categories?.name ?? 'Uncategorized',
    'Date': expense.expense_date,
    'Vendor': expense.vendor || '',
    'Amount (EGP)': Number(expense.amount),
    'Notes': expense.notes || '',
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);

  ws['!cols'] = [
    { wch: 30 },
    { wch: 25 },
    { wch: 15 },
    { wch: 25 },
    { wch: 18 },
    { wch: 45 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

  const summaryData = [
    {
      'Metric': 'Total Expenses',
      'Value': expenses.length,
    },
    {
      'Metric': 'Total Amount (EGP)',
      'Value': expenses.reduce((sum, expense) => sum + Number(expense.amount), 0),
    },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Smart_Home_Expenses_${timestamp}.xlsx`);
}



// ── Analytics and Financial Reports ──────────────────────────────

function getQuotationCost(q: any): number {
  if (!Array.isArray(q.devices_data)) return 0;
  return q.devices_data.reduce((sum: number, device: any) => {
    return sum + Number(device.cost_price ?? 0) * Number(device.quantity ?? 1);
  }, 0);
}

function getRevenueQuotations(quotations: any[]): any[] {
  return quotations.filter(q =>
    q.status === 'Invoiced' || q.status === 'Partially Paid'
  );
}

function prepareReportSheet(
  wb: XLSX.WorkBook,
  name: string,
  data: any[],
  widths: number[],
  currencyColumns: string[] = []
) {
  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = widths.map(wch => ({ wch }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  if (ws['!ref']) {
    ws['!autofilter'] = { ref: ws['!ref'] };
  }

  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const header = String(ws[XLSX.utils.encode_cell({ r: 0, c: col })]?.v ?? '');
    if (currencyColumns.includes(header)) {
      for (let row = 1; row <= range.e.r; row++) {
        const cell = ws[XLSX.utils.encode_cell({ r: row, c: col })];
        if (ws[cell] && typeof ws[cell].v === 'number') {
          ws[cell].z = '#,##0.00 "EGP"';
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, name);
  return ws;
}

function buildFinancialSummary(quotations: any[], totalExpenses: number) {
  const revenueQuotations = getRevenueQuotations(quotations);
  const revenue = revenueQuotations.reduce(
    (sum, q) => sum + Number(q.total_amount ?? 0), 0
  );
  const directCost = revenueQuotations.reduce(
    (sum, q) => sum + getQuotationCost(q), 0
  );
  const grossProfit = revenue - directCost;
  const netProfit = grossProfit - totalExpenses;

  return {
    revenue,
    directCost,
    grossProfit,
    totalExpenses,
    netProfit,
    grossMargin: revenue ? grossProfit / revenue : 0,
    netMargin: revenue ? netProfit / revenue : 0,
    revenueQuotations,
  };
}

function addProfitLossSheet(
  wb: XLSX.WorkBook,
  quotations: any[],
  totalExpenses: number
) {
  const s = buildFinancialSummary(quotations, totalExpenses);

  const rows = [
    { Metric: 'Gross Revenue', 'Amount (EGP)': s.revenue },
    { Metric: 'Direct Cost / COGS', 'Amount (EGP)': s.directCost },
    { Metric: 'Gross Profit', 'Amount (EGP)': s.grossProfit },
    { Metric: 'Operating Expenses', 'Amount (EGP)': s.totalExpenses },
    { Metric: 'Net Operating Profit', 'Amount (EGP)': s.netProfit },
    { Metric: 'Gross Margin', 'Amount (EGP)': s.grossMargin, Type: 'Percentage' },
    { Metric: 'Net Margin', 'Amount (EGP)': s.netMargin, Type: 'Percentage' },
    { Metric: 'Revenue Quotations', 'Amount (EGP)': s.revenueQuotations.length, Type: 'Count' },
    { Metric: 'All Quotations', 'Amount (EGP)': quotations.length, Type: 'Count' },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 16 }];
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };

  for (let row = 1; row <= 5; row++) {
    const cell = 'B' + (row + 1);
    if (ws[cell]) ws[cell].z = '#,##0.00 "EGP"';
  }

  ['B7', 'B8'].forEach(cell => {
    if (ws[cell]) ws[cell].z = '0.00%';
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Profit & Loss');
}

function addRevenueStatusSheet(wb: XLSX.WorkBook, quotations: any[]) {
  const statuses = [
    'Invoiced', 'Partially Paid', 'Fully Paid',
    'Approved', 'Pipeline', 'Declined', 'Draft'
  ];

  const rows = statuses.map(status => {
    const list = quotations.filter(q => q.status === status);
    return {
      Status: status,
      'Quotation Count': list.length,
      'Total Value (EGP)': list.reduce(
        (sum, q) => sum + Number(q.total_amount ?? 0), 0
      ),
      'Direct Cost (EGP)': list.reduce(
        (sum, q) => sum + getQuotationCost(q), 0
      ),
    };
  });

  prepareReportSheet(
    wb, 'Revenue by Status', rows, [22, 18, 23, 23],
    ['Total Value (EGP)', 'Direct Cost (EGP)']
  );
}

function addQuotationsSheet(wb: XLSX.WorkBook, quotations: any[]) {
  const rows = quotations.map(q => {
    const cost = getQuotationCost(q);
    const revenue = Number(q.total_amount ?? 0);

    return {
      'Project Code': q.project_code ?? '',
      'Invoice Number': q.invoice_number ?? '',
      Client: q.client_name ?? '',
      Status: q.status ?? '',
      'Revenue (EGP)': revenue,
      'Direct Cost (EGP)': cost,
      'Gross Profit (EGP)': revenue - cost,
      'Paid (EGP)': Number(q.total_paid ?? 0),
      'Remaining (EGP)': Number(q.remaining_balance ?? 0),
      'Created Date': q.created_at
        ? String(q.created_at).slice(0, 10) : '',
    };
  });

  prepareReportSheet(
    wb, 'Quotations', rows,
    [18, 20, 28, 20, 20, 20, 20, 18, 20, 16],
    ['Revenue (EGP)', 'Direct Cost (EGP)', 'Gross Profit (EGP)', 'Paid (EGP)', 'Remaining (EGP)']
  );
}

function addFeeBreakdownSheet(wb: XLSX.WorkBook, quotations: any[]) {
  const eligible = getRevenueQuotations(quotations);

  const rows = [
    {
      Fee: 'Commissioning',
      'Amount (EGP)': eligible.reduce((s, q) => s + Number(q.commissioning_price ?? 0), 0),
    },
    {
      Fee: 'Visit',
      'Amount (EGP)': eligible.reduce((s, q) => s + Number(q.visit_price ?? 0), 0),
    },
    {
      Fee: 'Installation',
      'Amount (EGP)': eligible.reduce((s, q) => s + Number(q.installation_price ?? 0), 0),
    },
  ];

  prepareReportSheet(wb, 'Fee Breakdown', rows, [25, 22], ['Amount (EGP)']);
}

function addExpensesSheet(wb: XLSX.WorkBook, expenses: any[]) {
  const rows = expenses.map(e => ({
    Expense: e.name ?? '',
    Category: e.expense_categories?.name ?? 'Uncategorized',
    Date: e.expense_date ?? '',
    Vendor: e.vendor ?? '',
    'Amount (EGP)': Number(e.amount ?? 0),
    Notes: e.notes ?? '',
  }));

  prepareReportSheet(
    wb, 'Expenses', rows, [30, 24, 16, 25, 20, 45],
    ['Amount (EGP)']
  );
}

export function exportAnalyticsToExcel({
  quotations,
  totalExpenses = 0,
}: {
  quotations: any[];
  totalExpenses?: number;
}) {
  const wb = XLSX.utils.book_new();

  addProfitLossSheet(wb, quotations, totalExpenses);
  addRevenueStatusSheet(wb, quotations);
  addQuotationsSheet(wb, quotations);
  addFeeBreakdownSheet(wb, quotations);

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, 'Smart_Home_Analytics_' + timestamp + '.xlsx');
}

export function exportFullFinancialReportToExcel({
  quotations,
  totalExpenses = 0,
  expenses = [],
}: {
  quotations: any[];
  totalExpenses?: number;
  expenses?: any[];
}) {
  const wb = XLSX.utils.book_new();

  addProfitLossSheet(wb, quotations, totalExpenses);
  addRevenueStatusSheet(wb, quotations);
  addQuotationsSheet(wb, quotations);
  addExpensesSheet(wb, expenses);
  addFeeBreakdownSheet(wb, quotations);

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, 'Smart_Home_Full_Financial_Report_' + timestamp + '.xlsx');
}
