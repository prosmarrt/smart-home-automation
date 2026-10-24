import * as XLSX from 'xlsx-js-style';
import type { Quotation, Device, Room, Payment } from '@/types/types';

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

/**
 * Apply cell styling for Excel export
 */
function applyCellStyle(ws: XLSX.WorkSheet, cell: string, style: any) {
  if (!ws[cell]) return;
  ws[cell].s = style;
}

/**
 * Apply header styling (light blue background, white text, bold)
 */
function applyHeaderStyle(ws: XLSX.WorkSheet, cells: string[]) {
  const headerStyle = {
    fill: { fgColor: { rgb: "4FC3F7" } }, // Light blue (Prosmart style)
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12 },
    alignment: { horizontal: "center", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };
  cells.forEach(cell => applyCellStyle(ws, cell, headerStyle));
}

/**
 * Apply section title styling (gray background, bold)
 */
function applySectionStyle(ws: XLSX.WorkSheet, cells: string[]) {
  const sectionStyle = {
    fill: { fgColor: { rgb: "E0E0E0" } },
    font: { bold: true, sz: 11 },
    alignment: { horizontal: "left", vertical: "center" },
    border: {
      top: { style: "thin", color: { rgb: "000000" } },
      bottom: { style: "thin", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };
  cells.forEach(cell => applyCellStyle(ws, cell, sectionStyle));
}

/**
 * Apply data cell styling (borders, alignment)
 */
function applyDataStyle(ws: XLSX.WorkSheet, range: string) {
  const dataStyle = {
    border: {
      top: { style: "thin", color: { rgb: "CCCCCC" } },
      bottom: { style: "thin", color: { rgb: "CCCCCC" } },
      left: { style: "thin", color: { rgb: "CCCCCC" } },
      right: { style: "thin", color: { rgb: "CCCCCC" } }
    },
    alignment: { vertical: "center" }
  };
  
  const match = range.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);
  if (!match) return;
  
  const startCol = match[1];
  const startRow = parseInt(match[2]);
  const endCol = match[3];
  const endRow = parseInt(match[4]);
  
  for (let row = startRow; row <= endRow; row++) {
    for (let col = startCol.charCodeAt(0); col <= endCol.charCodeAt(0); col++) {
      const cell = String.fromCharCode(col) + row;
      applyCellStyle(ws, cell, dataStyle);
    }
  }
}

/**
 * Apply total row styling (light green background, bold)
 */
function applyTotalStyle(ws: XLSX.WorkSheet, cells: string[]) {
  const totalStyle = {
    fill: { fgColor: { rgb: "C8E6C9" } },
    font: { bold: true, sz: 11 },
    alignment: { horizontal: "right", vertical: "center" },
    border: {
      top: { style: "medium", color: { rgb: "000000" } },
      bottom: { style: "medium", color: { rgb: "000000" } },
      left: { style: "thin", color: { rgb: "000000" } },
      right: { style: "thin", color: { rgb: "000000" } }
    }
  };
  cells.forEach(cell => applyCellStyle(ws, cell, totalStyle));
}

/**
 * Export complete quotation to Excel with professional styling
 */
export function exportQuotationToExcel(quotation: Quotation, payments: Payment[] = [], categoryLabels: Record<string, string> = {}) {
  const wb = XLSX.utils.book_new();

  // Calculate devices subtotal
  const devices = quotation.devices_data as Device[];
  const devicesSubtotal = devices.reduce((sum, d) => sum + ((d.unit_price || 0) * (d.quantity || 1)), 0);

  // Sheet 1: Quotation Overview
  const overviewData = [
    ['QUOTATION DETAILS', ''],
    ['Project Code', quotation.project_code],
    ['Version', `V${quotation.current_version}`],
    ['Status', quotation.status],
    ['Type', quotation.is_invoice ? 'Invoice' : 'Quotation'],
    ['Language', quotation.language === 'ar' ? 'Arabic' : 'English'],
    ['', ''],
    ['CLIENT INFORMATION', ''],
    ['Client Name', quotation.client_name || ''],
    ['Address', quotation.client_address || ''],
    ['Phone', quotation.client_phone || ''],
    ['', ''],
    ['FINANCIAL SUMMARY', ''],
    ['Devices Subtotal', `EGP ${devicesSubtotal.toFixed(2)}`],
    ['Commissioning Fee', `EGP ${quotation.commissioning_price?.toFixed(2) || '0.00'}`],
    ['Installation Fee', `EGP ${quotation.installation_price?.toFixed(2) || '0.00'}`],
    ['VAT (%)', `${quotation.vat_percentage || 0}%`],
    ['Discount Type', quotation.discount_type || 'None'],
    ['Discount Value', quotation.discount_type === 'percentage' ? `${quotation.discount_value}%` : `EGP ${quotation.discount_value?.toFixed(2) || '0.00'}`],
    ['Total Amount', `EGP ${quotation.total_amount?.toFixed(2) || '0.00'}`],
    ['Total Paid', `EGP ${quotation.total_paid?.toFixed(2) || '0.00'}`],
    ['Remaining Balance', `EGP ${quotation.remaining_balance?.toFixed(2) || '0.00'}`],
    ['', ''],
    ['DATES', ''],
    ['Created At', new Date(quotation.created_at).toLocaleString()],
    ['Updated At', new Date(quotation.updated_at).toLocaleString()],
    ...(quotation.approval_date ? [['Approval Date', new Date(quotation.approval_date).toLocaleDateString()]] : []),
    ...(quotation.warranty_start_date ? [['Warranty Start', new Date(quotation.warranty_start_date).toLocaleDateString()]] : []),
    ...(quotation.warranty_end_date ? [['Warranty End', new Date(quotation.warranty_end_date).toLocaleDateString()]] : []),
  ];

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
  wsOverview['!cols'] = [{ wch: 25 }, { wch: 40 }];
  
  // Apply styling to Overview sheet
  applySectionStyle(wsOverview, ['A1', 'B1']); // QUOTATION DETAILS header
  applySectionStyle(wsOverview, ['A8', 'B8']); // CLIENT INFORMATION header
  applySectionStyle(wsOverview, ['A13', 'B13']); // FINANCIAL SUMMARY header
  applySectionStyle(wsOverview, ['A24', 'B24']); // DATES header
  applyTotalStyle(wsOverview, ['A20', 'B20']); // Total Amount row
  applyTotalStyle(wsOverview, ['A22', 'B22']); // Remaining Balance row
  
  XLSX.utils.book_append_sheet(wb, wsOverview, 'Overview');

  // Sheet 2: Devices
  const rooms = quotation.rooms_data as Room[];

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return 'Unassigned';
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Unknown';
  };

  const getFullDeviceName = (device: Device) => {
    const getLabel = (category: string) => {
      return categoryLabels[category] || DEFAULT_LABELS[category] || category;
    };

    const parts: string[] = [];
    if (device.device_name) parts.push(device.device_name);
    if (device.brand) parts.push(device.brand);
    if (device.model) parts.push(device.model);
    if (parts.length === 0) {
      let label = getLabel(device.category);
      if (device.gang && ['mini_switch', 'mini_shutter_switch', 'touch_switch', 'touch_shutter_switch'].includes(device.category)) {
        label += ` ${device.gang}G`;
      }
      parts.push(label);
    }
    return parts.join(' - ');
  };

  const devicesData = devices.map(device => ({
    'Device Name': getFullDeviceName(device),
    'Room': getRoomName(device.room_id),
    'Protocol': device.protocol ? device.protocol.toUpperCase() : 'N/A',
    'Quantity': device.quantity,
    'Unit Price (EGP)': device.unit_price?.toFixed(2) || '0.00',
    'Total Price (EGP)': ((device.unit_price || 0) * (device.quantity || 1)).toFixed(2),
    'Installation Note': device.installation_note || '',
    'Description': device.custom_description || '',
  }));

  const wsDevices = XLSX.utils.json_to_sheet(devicesData);
  wsDevices['!cols'] = [
    { wch: 35 },
    { wch: 20 },
    { wch: 12 },
    { wch: 10 },
    { wch: 18 },
    { wch: 18 },
    { wch: 50 },
    { wch: 40 }
  ];
  
  // Apply styling to Devices sheet
  applyHeaderStyle(wsDevices, ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'G1', 'H1']);
  if (devices.length > 0) {
    applyDataStyle(wsDevices, `A2:H${devices.length + 1}`);
  }
  
  XLSX.utils.book_append_sheet(wb, wsDevices, 'Devices');

  // Sheet 3: Rooms Summary
  if (rooms.length > 0) {
    const roomsData = rooms.map(room => {
      const roomDevices = devices.filter(d => d.room_id === room.id);
      const totalDevices = roomDevices.reduce((sum, d) => sum + (d.quantity || 0), 0);
      const totalValue = roomDevices.reduce((sum, d) => sum + ((d.unit_price || 0) * (d.quantity || 1)), 0);

      return {
        'Room Name': room.name,
        'Total Devices': totalDevices,
        'Total Value (EGP)': totalValue.toFixed(2),
      };
    });

    const wsRooms = XLSX.utils.json_to_sheet(roomsData);
    wsRooms['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
    
    // Apply styling to Rooms sheet
    applyHeaderStyle(wsRooms, ['A1', 'B1', 'C1']);
    if (rooms.length > 0) {
      applyDataStyle(wsRooms, `A2:C${rooms.length + 1}`);
    }
    
    XLSX.utils.book_append_sheet(wb, wsRooms, 'Rooms');
  }

  // Sheet 4: Payment History
  if (payments.length > 0) {
    const paymentsData = payments.map(payment => ({
      'Date': new Date(payment.payment_date).toLocaleDateString(),
      'Amount (EGP)': payment.amount.toFixed(2),
      'Method': payment.payment_method,
      'Notes': payment.notes || '',
    }));

    const wsPayments = XLSX.utils.json_to_sheet(paymentsData);
    wsPayments['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 15 }, { wch: 40 }];
    
    // Apply styling to Payments sheet
    applyHeaderStyle(wsPayments, ['A1', 'B1', 'C1', 'D1']);
    if (payments.length > 0) {
      applyDataStyle(wsPayments, `A2:D${payments.length + 1}`);
    }
    
    XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments');
  }

  // Generate filename with proper styling support
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Quotation_${quotation.project_code}_${timestamp}.xlsx`;
  
  // Write file with cell styles enabled
  XLSX.writeFile(wb, filename, { cellStyles: true, bookSST: true });
}

/**
 * Export quotation to CSV format
 */
export function exportQuotationToCSV(quotation: Quotation, payments: Payment[] = []) {
  const rooms = quotation.rooms_data as Room[];
  const devices = quotation.devices_data as Device[];

  // Calculate devices subtotal
  const devicesSubtotal = devices.reduce((sum, d) => sum + ((d.unit_price || 0) * (d.quantity || 1)), 0);

  const getRoomName = (roomId: string | null) => {
    if (!roomId) return 'Unassigned';
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Unknown';
  };

  // Create CSV content
  let csvContent = '';

  // Header section
  csvContent += 'QUOTATION DETAILS\n';
  csvContent += `Project Code,${quotation.project_code}\n`;
  csvContent += `Version,V${quotation.current_version}\n`;
  csvContent += `Status,${quotation.status}\n`;
  csvContent += `Type,${quotation.is_invoice ? 'Invoice' : 'Quotation'}\n`;
  csvContent += '\n';

  csvContent += 'CLIENT INFORMATION\n';
  csvContent += `Client Name,${quotation.client_name || ''}\n`;
  csvContent += `Address,${quotation.client_address || ''}\n`;
  csvContent += `Phone,${quotation.client_phone || ''}\n`;
  csvContent += '\n';

  csvContent += 'FINANCIAL SUMMARY\n';
  csvContent += `Devices Subtotal,EGP ${devicesSubtotal.toFixed(2)}\n`;
  csvContent += `Commissioning Fee,EGP ${quotation.commissioning_price?.toFixed(2) || '0.00'}\n`;
  csvContent += `Installation Fee,EGP ${quotation.installation_price?.toFixed(2) || '0.00'}\n`;
  csvContent += `VAT,${quotation.vat_percentage || 0}%\n`;
  csvContent += `Discount Type,${quotation.discount_type || 'None'}\n`;
  csvContent += `Discount Value,${quotation.discount_type === 'percentage' ? `${quotation.discount_value}%` : `EGP ${quotation.discount_value?.toFixed(2) || '0.00'}`}\n`;
  csvContent += `Total Amount,EGP ${quotation.total_amount?.toFixed(2) || '0.00'}\n`;
  csvContent += `Total Paid,EGP ${quotation.total_paid?.toFixed(2) || '0.00'}\n`;
  csvContent += `Remaining Balance,EGP ${quotation.remaining_balance?.toFixed(2) || '0.00'}\n`;
  csvContent += '\n';

  // Devices section
  csvContent += 'DEVICES\n';
  csvContent += 'Device Name,Room,Protocol,Quantity,Unit Price (EGP),Total Price (EGP),Description\n';
  devices.forEach(device => {
    const parts: string[] = [];
    if (device.device_name) parts.push(device.device_name);
    if (device.brand) parts.push(device.brand);
    if (device.model) parts.push(device.model);
    if (parts.length === 0) parts.push(device.category);
    const deviceName = parts.join(' - ').replace(/,/g, ';');
    const roomName = getRoomName(device.room_id).replace(/,/g, ';');
    const protocol = device.protocol ? device.protocol.toUpperCase() : 'N/A';
    const quantity = device.quantity || 0;
    const unitPrice = (device.unit_price || 0).toFixed(2);
    const totalPrice = ((device.unit_price || 0) * quantity).toFixed(2);
    const description = (device.custom_description || '').replace(/,/g, ';');
    
    csvContent += `${deviceName},${roomName},${protocol},${quantity},${unitPrice},${totalPrice},${description}\n`;
  });
  csvContent += '\n';

  // Payments section
  if (payments.length > 0) {
    csvContent += 'PAYMENT HISTORY\n';
    csvContent += 'Date,Amount (EGP),Method,Notes\n';
    payments.forEach(payment => {
      const date = new Date(payment.payment_date).toLocaleDateString();
      const amount = payment.amount.toFixed(2);
      const method = payment.payment_method.replace(/,/g, ';');
      const notes = (payment.notes || '').replace(/,/g, ';');
      
      csvContent += `${date},${amount},${method},${notes}\n`;
    });
  }

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Quotation_${quotation.project_code}_${timestamp}.csv`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export quotation to JSON format
 */
export function exportQuotationToJSON(quotation: Quotation, payments: Payment[] = []) {
  // Calculate devices subtotal
  const devices = quotation.devices_data as Device[];
  const devicesSubtotal = devices.reduce((sum, d) => sum + ((d.unit_price || 0) * (d.quantity || 1)), 0);

  const exportData = {
    quotation: {
      id: quotation.id,
      project_code: quotation.project_code,
      version: quotation.current_version,
      status: quotation.status,
      is_invoice: quotation.is_invoice,
      language: quotation.language,
      client_info: {
        name: quotation.client_name,
        address: quotation.client_address,
        phone: quotation.client_phone,
      },
      financial: {
        devices_subtotal: devicesSubtotal,
        commissioning_fee: quotation.commissioning_price,
        installation_fee: quotation.installation_price,
        vat_percentage: quotation.vat_percentage,
        discount_type: quotation.discount_type,
        discount_value: quotation.discount_value,
        total_amount: quotation.total_amount,
        total_paid: quotation.total_paid,
        remaining_balance: quotation.remaining_balance,
      },
      dates: {
        created_at: quotation.created_at,
        updated_at: quotation.updated_at,
        approval_date: quotation.approval_date,
        warranty_start_date: quotation.warranty_start_date,
        warranty_end_date: quotation.warranty_end_date,
      },
      rooms: quotation.rooms_data,
      devices: quotation.devices_data,
    },
    payments: payments,
    exported_at: new Date().toISOString(),
  };

  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `Quotation_${quotation.project_code}_${timestamp}.json`;
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
