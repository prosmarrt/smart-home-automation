/**
 * PDF Export Utility for Smart Home Quotations
 * 
 * RECENT ENHANCEMENTS (2025-12-11 & 2026-01-14):
 * 
 * 1. THOUSAND SEPARATOR FORMATTING:
 *    - All currency values now display with comma separators (e.g., "1,234.56")
 *    - Implemented formatCurrency() helper using toLocaleString('en-US')
 *    - Applied to all price fields: unit prices, subtotals, totals, fees, VAT, etc.
 * 
 * 2. ENHANCED PAYMENT STATUS VISIBILITY (CRITICAL FIX 2026-01-14):
 *    - Changed labels: "Total Paid" → "Paid Amount", "Amount Due" → "Due Amount"
 *    - "Paid Amount" displayed in bold green (RGB: 40, 167, 69) at 11pt font size
 *    - "Due Amount" displayed in bold red (RGB: 220, 53, 69) if balance > 0, green if fully paid
 *    - Due Amount correctly calculated as: Total Amount - Paid Amount
 *    - CRITICAL FIX: Payment section now ALWAYS displays (removed conditional check)
 *    - CRITICAL FIX: Added actualDueAmount calculation to ensure correct Due Amount display
 *    - Increased font size from 10pt to 11pt for maximum readability
 *    - Payment section header increased to 12pt bold
 *    - Increased cell padding from 5 to 6 for better spacing
 *    - Enhanced visual spacer (height: 6) before payment section
 * 
 * 3. SMART SYSTEMS LOGO - TRANSPARENT VERSION (FINAL UPDATE 2026-01-14):
 *    - Replaced with new high-quality transparent PNG logo (720x320 pixels)
 *    - Logo path: /smart-systems-logo-transparent.png
 *    - Optimized size: width 45 units with proportional height (aspect ratio 2.25:1)
 *    - Improved positioning: pageWidth - logoWidth - 10 (top-right corner with margin)
 *    - Clean, professional appearance with transparent background
 *    - Dynamic aspect ratio calculation maintains logo integrity
 *    - CRITICAL FIX: Moved "Total: EGP" text from yPosition+20 to yPosition+35 to avoid logo overlap
 *    - CRITICAL FIX: Increased yPosition increment from 35 to 42 to accommodate moved total text
 * 
 * 4. PROTOCOL COLUMN IN DEVICE SUMMARY (NEW 2026-01-14):
 *    - Added "Protocol" column to Device Summary by Room table
 *    - Displays device protocol (Zigbee, Matter, Wi-Fi) for each device
 *    - Essential for multi-protocol projects where different devices use different protocols
 *    - Protocol displayed with capitalized first letter (e.g., "Zigbee", "Matter", "Wifi")
 *    - Shows "-" for devices without protocol specified
 *    - Column positioned between Device and Qty columns for logical flow
 *    - Table structure: Device | Protocol | Qty | Unit Price | Subtotal | VAT | Total
 *    - Column widths optimized: Protocol=20, Device=55 (reduced from 60)
 *    - All colspan values updated: room headers=7, subtotals=6, totals=6
 * 
 * 5. LAYOUT OPTIMIZATION FOR CLARITY (NEW 2026-01-14):
 *    - Increased top margin on Financial Summary page: 20 → 25 units
 *    - Enhanced spacing after title: 15 → 18 units
 *    - Added "TOTAL AMOUNT" row with prominent styling (12pt bold, blue background)
 *    - Replaced "GRAND TOTAL" with "TOTAL AMOUNT" for clarity
 *    - Increased table cell padding: 5 → 6 for better readability
 *    - Added explicit margins to financial table: top 25, left/right 15
 *    - Enhanced spacer between Total Amount and Payment Status: 5 → 6
 *    - All elements properly spaced to prevent overlapping
 *    - Professional layout with adequate breathing room
 * 
 * 6. CLIENT ACCEPTANCE DISCLAIMER (2026-01-14):
 *    - Added required disclaimer text: "The enclosed disclaimer is an integral part of this offer."
 *    - Positioned between acceptance terms and validity period
 *    - Maintains professional formatting with proper spacing
 *    - Ensures legal compliance for quotation documents
 * 
 * 7. FINANCIAL INFORMATION DISPLAY (CRITICAL FIX 2026-01-14):
 *    - Total Amount: Clearly displayed with blue background (RGB: 66, 139, 202)
 *    - Paid Amount: Bold green text (RGB: 40, 167, 69) at 11pt - NOW ALWAYS VISIBLE
 *    - Due Amount: Bold red text (RGB: 220, 53, 69) at 11pt when balance > 0 - NOW ALWAYS VISIBLE
 *    - All amounts right-aligned for easy comparison
 *    - Proper calculation: Due Amount = Total Amount - Paid Amount (actualDueAmount variable)
 *    - No overlapping with logo or other elements
 * 
 * 8. PROFESSIONAL FORMATTING:
 *    - All numerical values consistently formatted with 2 decimal places
 *    - Proper alignment: prices right-aligned, quantities centered, protocols centered
 *    - Enhanced visual hierarchy with color-coded sections
 *    - Improved spacing throughout document for better readability
 *    - Clean grid lines with subtle gray color (RGB: 200, 200, 200)
 * 
 * @module pdfExport
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Device, Room, ClientInfo, DiscountType, Payment } from '@/types/types';
import prosmartLogoImage from '/prosmart-logo.png';
import smartSystemsLogoImage from '/smart-systems-logo-transparent.png';

const COMPANY_INFO = {
  name: 'Prosmart Egypt',
  address: '18 Ashmoun Street, Heliopolis',
  phone: '0150 0166533',
  website: 'www.smartsystemsegypt.com',
  prosmartLogoPath: prosmartLogoImage,
  smartSystemsLogoPath: smartSystemsLogoImage
};

interface PDFExportOptions {
  devices: Device[];
  rooms: Room[];
  clientInfo?: ClientInfo;
  commissioningFee?: number;
  visitFee?: number;
  installationFee?: number;
  vatPercentage?: number;
  discountType?: DiscountType | null;
  discountValue?: number;
  currentVersion?: number;
  totalPaid?: number;
  remainingBalance?: number;
  payments?: Payment[];
  approvalDate?: string | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  includeSmartSystemsLogo?: boolean;
  isInvoice?: boolean;
  categoryLabels?: Record<string, string>;
  openInNewTab?: boolean;
  targetWindow?: Window | null;
}

/**
 * Format date in a consistent format
 * @param dateStr - The date string to format
 * @returns Formatted date string (e.g., "11 Dec 2025")
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch (e) {
    return dateStr;
  }
}

/**
 * Format currency with thousand separators
 * @param amount - The numeric amount to format
 * @returns Formatted string with commas (e.g., "1,234.56")
 */
function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

interface DeviceTypeSummary {
  label: string;
  count: number;
  total: number;
}

interface CategoryGroup {
  name: string;
  devices: DeviceTypeSummary[];
  subtotal: number;
}

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getDeviceLabel(device: Device, rooms: Room[], categoryLabels: Record<string, string> = {}): string {
  const getLabel = (category: string) => {
    return categoryLabels[category] || DEFAULT_LABELS[category] || category;
  };

  const parts: string[] = [];
  
  // Add device name if available
  if (device.device_name) {
    parts.push(device.device_name);
  }
  
  // Add brand if available
  if (device.brand) {
    parts.push(device.brand);
  }
  
  // Add model if available
  if (device.model) {
    parts.push(device.model);
  }
  
  // Add category-specific label
  let label = getLabel(device.category);
  if (device.category === 'mini_switch' || device.category === 'mini_shutter_switch') label = `${getLabel(device.category)} ${device.gang}G`;
  else if (device.category === 'touch_switch' || device.category === 'touch_shutter_switch') label = `${getLabel(device.category)} ${device.gang}G`;
  else if (device.category === 'intercom') {
    label = device.intercom_type === 'doorbell' ? 'Doorbell' : 'Indoor Station';
  }
  else if (device.category === 'camera' || device.category === 'wifi_camera') label = `${getLabel(device.category)} ${device.camera_resolution?.toUpperCase()} ${device.camera_type}`;
  else if (device.category === 'mesh_wifi') label = `${getLabel('mesh_wifi')}${device.mesh_model ? ` (${device.mesh_model})` : ''}`;
  else if (device.category === 'network_switch') label = `${getLabel('network_switch')}${device.port_count ? ` (${device.port_count}P)` : ''}`;
  else if (device.category === 'nvr') label = `${getLabel('nvr')}${device.hdd_capacity ? ` (${device.hdd_capacity.toUpperCase()})` : ''}`;
  else if (device.category === 'hdd') label = `${getLabel('hdd')}${device.hdd_capacity ? ` (${device.hdd_capacity.toUpperCase()})` : ''}`;
  else if (device.category === 'memory_card') label = `${getLabel('memory_card')}${device.memory_card_capacity ? ` (${device.memory_card_capacity.toUpperCase()})` : ''}`;
  else if (device.category === 'cat6_cable') label = `${getLabel('cat6_cable')}${device.cable_length ? ` (${device.cable_length}m)` : ''}`;
  else if (device.category === 'custom_device') label = device.custom_name || getLabel('custom_device');
  else label = device.category;
  
  // Add category label to parts
  if (label) {
    parts.push(label);
  }
  
  // Return combined parts or just label if no specific details
  return parts.length > 0 ? parts.join(' - ') : label;
}

function getDeviceTypeSummary(devices: Device[], rooms: Room[], categoryLabels: Record<string, string> = {}): DeviceTypeSummary[] {
  const summaryMap = new Map<string, DeviceTypeSummary>();

  devices.forEach(device => {
    const label = getDeviceLabel(device, rooms, categoryLabels);
    const key = `${device.category}_${label}`;
    
    // For cables, use cable_length instead of quantity
    const effectiveQuantity = device.category === 'cat6_cable' && device.cable_length 
      ? device.cable_length 
      : device.quantity;
    
    const deviceTotal = device.unit_price * effectiveQuantity;
    
    if (summaryMap.has(key)) {
      const existing = summaryMap.get(key)!;
      existing.count += effectiveQuantity;
      existing.total += deviceTotal;
    } else {
      summaryMap.set(key, {
        label,
        count: effectiveQuantity,
        total: deviceTotal
      });
    }
  });

  return Array.from(summaryMap.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function getCategorizedSummary(devices: Device[], rooms: Room[], categoryLabels: Record<string, string> = {}): CategoryGroup[] {
  const deviceSummary = getDeviceTypeSummary(devices, rooms, categoryLabels);
  
  const getLabel = (category: string) => {
    return categoryLabels[category] || DEFAULT_LABELS[category] || category;
  };

  // COMPREHENSIVE: All device types included
  const lightingCategories = [
    'mini_switch', 'touch_switch', 'motion_sensor', 'presence_sensor', 'mini_shutter_switch', 'touch_shutter_switch'
  ];

  const shadingCategories = [
    'shutter_switch', 'smart_shutter_switch', 'curtain_switch', 
    'curtain_motor', 'curtain_rail', 'roller_blind_motor'
  ];

  const securityAccessCategories = [
    'camera', 'wifi_camera', 'nvr', 'hdd', 'memory_card', 'bracket', 
    'intercom', 'smart_lock',
    'gas_sensor', 'water_leak_sensor', 'smoke_sensor', 
    'gas_valve', 'water_valve'
  ];

  const networkingCategories = [
    'access_point', 'mesh_wifi', 'network_switch', 'repeater', 'cat6_cable'
  ];

  const controlCategories = [
    'ir_remote', 'central_control', 'smart_plug', 
    'zigbee_hub', 'matter_hub', 'custom_device'
  ];

  const lightingDevices = deviceSummary.filter(d => {
    const device = devices.find(dev => getDeviceLabel(dev, rooms, categoryLabels) === d.label);
    return device && lightingCategories.includes(device.category);
  });

  const shadingDevices = deviceSummary.filter(d => {
    const device = devices.find(dev => getDeviceLabel(dev, rooms, categoryLabels) === d.label);
    return device && shadingCategories.includes(device.category);
  });

  const securityAccessDevices = deviceSummary.filter(d => {
    const device = devices.find(dev => getDeviceLabel(dev, rooms, categoryLabels) === d.label);
    return device && securityAccessCategories.includes(device.category);
  });

  const networkingDevices = deviceSummary.filter(d => {
    const device = devices.find(dev => getDeviceLabel(dev, rooms, categoryLabels) === d.label);
    return device && networkingCategories.includes(device.category);
  });

  const controlDevices = deviceSummary.filter(d => {
    const device = devices.find(dev => getDeviceLabel(dev, rooms, categoryLabels) === d.label);
    return device && controlCategories.includes(device.category);
  });

  const groups: CategoryGroup[] = [];

  if (lightingDevices.length > 0) {
    groups.push({
      name: getLabel('group_light'),
      devices: lightingDevices,
      subtotal: lightingDevices.reduce((sum, d) => sum + d.total, 0)
    });
  }

  if (shadingDevices.length > 0) {
    groups.push({
      name: getLabel('group_shading'),
      devices: shadingDevices,
      subtotal: shadingDevices.reduce((sum, d) => sum + d.total, 0)
    });
  }

  if (securityAccessDevices.length > 0) {
    groups.push({
      name: getLabel('group_cctv_security'),
      devices: securityAccessDevices,
      subtotal: securityAccessDevices.reduce((sum, d) => sum + d.total, 0)
    });
  }

  if (networkingDevices.length > 0) {
    groups.push({
      name: getLabel('group_networking'),
      devices: networkingDevices,
      subtotal: networkingDevices.reduce((sum, d) => sum + d.total, 0)
    });
  }

  if (controlDevices.length > 0) {
    groups.push({
      name: getLabel('group_central_control'),
      devices: controlDevices,
      subtotal: controlDevices.reduce((sum, d) => sum + d.total, 0)
    });
  }

  return groups;
}

export async function exportToPDF({ 
  devices, 
  rooms, 
  clientInfo,
  commissioningFee = 0,
  visitFee = 0,
  installationFee = 0,
  vatPercentage = 0,
  discountType = null,
  discountValue = 0,
  currentVersion = 1,
  totalPaid = 0,
  remainingBalance = 0,
  payments = [],
  approvalDate = null,
  warrantyStartDate = null,
  warrantyEndDate = null,
  includeSmartSystemsLogo = true,
  isInvoice = false,
  categoryLabels = {}
}: PDFExportOptions) {
  const doc = new jsPDF();
  
  const getLabel = (category: string) => {
    return categoryLabels[category] || DEFAULT_LABELS[category] || category;
  };

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  const devicesSubtotal = devices.reduce((sum, d) => sum + (d.quantity * d.unit_price), 0);
  const vatAmount = devicesSubtotal * (vatPercentage / 100);
  const devicesTotalWithVAT = devicesSubtotal + vatAmount;
  const serviceFees = commissioningFee + visitFee + installationFee;
  const subtotalBeforeDiscount = devicesTotalWithVAT + serviceFees;

  // Calculate discount - ensure numeric values
  let discountAmount = 0;
  const dValue = Number(discountValue) || 0;
  if (discountType && dValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = subtotalBeforeDiscount * (dValue / 100);
    } else {
      discountAmount = dValue;
    }
  }

  const grandTotal = Math.max(0, subtotalBeforeDiscount - discountAmount);
  
  // Calculate actual due amount: Total - Paid
  const actualDueAmount = remainingBalance !== undefined ? remainingBalance : (grandTotal - totalPaid);

  try {
    const prosmartLogo = await loadImage(COMPANY_INFO.prosmartLogoPath);
    doc.addImage(prosmartLogo, 'PNG', 15, yPosition, 25, 25);
  } catch (error) {
    console.warn('ProSmart logo not found:', error);
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Smart Home Automation', pageWidth / 2, yPosition + 8, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(isInvoice ? 'INVOICE' : 'Quotation', pageWidth / 2, yPosition + 15, { align: 'center' });

  // Add version badge
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(pageWidth / 2 - 10, yPosition + 17, 20, 6, 2, 2, 'F');
  doc.setTextColor(60, 60, 60);
  doc.text(`V${currentVersion}`, pageWidth / 2, yPosition + 21, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Add Smart Systems logo with proper aspect ratio (only if enabled)
  // CRITICAL: Logo positioned to avoid overlapping with financial information
  if (includeSmartSystemsLogo) {
    try {
      const smartSystemsLogo = await loadImage(COMPANY_INFO.smartSystemsLogoPath);
      
      // New transparent logo dimensions: 720x320 (aspect ratio 2.25:1)
      // Optimized size for professional appearance without overlapping content
      const logoWidth = 45;
      const logoHeight = (smartSystemsLogo.height / smartSystemsLogo.width) * logoWidth;
      
      // Position logo in top-right corner with adequate margin
      const logoX = pageWidth - logoWidth - 10; // 10 units margin from right edge
      const logoY = yPosition + 2; // Slight offset from top
      
      doc.addImage(smartSystemsLogo, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      console.warn('Smart Systems logo not found or could not be loaded:', error);
    }
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  doc.text(`Date: ${currentDate}`, pageWidth / 2, yPosition + 28, { align: 'center' });

  // Move Total text down to avoid logo overlap - positioned below logo area
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total: EGP ${formatCurrency(grandTotal)}`, pageWidth - 15, yPosition + 35, { align: 'right' });

  yPosition += 42; // Increased from 35 to accommodate moved total text

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Information', 15, yPosition);

  yPosition += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');

  if (clientInfo) {
    if (clientInfo.project_code) {
      doc.text(`Project Code: ${clientInfo.project_code}`, 15, yPosition);
      yPosition += 4;
    }
    doc.text(`Client Name: ${clientInfo.client_name || ''}`, 15, yPosition);
    yPosition += 4;
    if (clientInfo.phone_number) {
      doc.text(`Phone: ${clientInfo.phone_number}`, 15, yPosition);
      yPosition += 4;
    }
    if (clientInfo.address) {
      doc.text(`Address: ${clientInfo.address}`, 15, yPosition);
      yPosition += 4;
    }
    if (clientInfo.last_amendment_date) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 53, 69); // Use red for amendment
      doc.text(`Last Amendment: ${formatDate(clientInfo.last_amendment_date)}`, 15, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      yPosition += 4;
    }
  }

  yPosition += 8;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Device Summary by Room', 15, yPosition);

  yPosition += 8;

  const tableData: any[] = [];

  rooms.forEach(room => {
    const roomDevices = devices.filter(d => d.room_id === room.id);
    if (roomDevices.length === 0) return;

    tableData.push([
      { content: room.name.toUpperCase(), colSpan: 7, styles: { fillColor: [66, 139, 202], textColor: [255, 255, 255], fontStyle: 'bold' } }
    ]);

    let roomDevicesSubtotal = 0;
    let roomDevicesVAT = 0;

    roomDevices.forEach(device => {
      const label = getDeviceLabel(device, rooms, categoryLabels);
      
      // For cables, use cable_length instead of quantity
      const effectiveQuantity = device.category === 'cat6_cable' && device.cable_length 
        ? device.cable_length 
        : device.quantity;
      
      const subtotal = effectiveQuantity * device.unit_price;
      const deviceVAT = subtotal * (vatPercentage / 100);
      const deviceTotal = subtotal + deviceVAT;

      roomDevicesSubtotal += subtotal;
      roomDevicesVAT += deviceVAT;

      // Format protocol display: capitalize first letter
      const protocolDisplay = device.protocol 
        ? device.protocol.charAt(0).toUpperCase() + device.protocol.slice(1)
        : '-';

      tableData.push([
        label,
        protocolDisplay,
        device.category === 'cat6_cable' && device.cable_length 
          ? `${device.cable_length}m` 
          : device.quantity.toString(),
        `EGP ${formatCurrency(device.unit_price)}`,
        `EGP ${formatCurrency(subtotal)}`,
        `${vatPercentage}%`,
        `EGP ${formatCurrency(deviceTotal)}`
      ]);

      // Add installation note if exists
      if (device.installation_note && device.installation_note.trim()) {
        tableData.push([
          { 
            content: `Note: ${device.installation_note}`, 
            colSpan: 7, 
            styles: { 
              fontSize: 8, 
              textColor: [100, 100, 100], 
              fontStyle: 'italic',
              fillColor: [250, 250, 250],
              cellPadding: { top: 2, right: 4, bottom: 2, left: 8 }
            } 
          }
        ]);
      }
    });

    const roomDevicesTotal = roomDevicesSubtotal + roomDevicesVAT;
    const roomRatio = devicesSubtotal > 0 ? roomDevicesSubtotal / devicesSubtotal : 0;
    const roomServiceFee = serviceFees * roomRatio;

    tableData.push([
      { content: 'Subtotal', colSpan: 6, styles: { halign: 'right', textColor: [100, 100, 100], fontSize: 8, fillColor: [245, 245, 245] } },
      { content: `EGP ${formatCurrency(roomDevicesTotal)}`, styles: { textColor: [100, 100, 100], fontSize: 8, fillColor: [245, 245, 245], fontStyle: 'bold' } }
    ]);

    if (roomServiceFee > 0) {
      tableData.push([
        { content: 'Service Fee (Pro-rata)', colSpan: 6, styles: { halign: 'right', textColor: [100, 100, 100], fontSize: 8, fillColor: [245, 245, 245], fontStyle: 'italic' } },
        { content: `EGP ${formatCurrency(roomServiceFee)}`, styles: { textColor: [100, 100, 100], fontSize: 8, fillColor: [245, 245, 245], fontStyle: 'bold' } }
      ]);
    }

    const roomGrandTotal = roomDevicesTotal + roomServiceFee;
    tableData.push([
      { content: `${room.name.toUpperCase()} Total`, colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', fillColor: [230, 230, 230] } },
      { content: `EGP ${formatCurrency(roomGrandTotal)}`, styles: { fontStyle: 'bold', fillColor: [230, 230, 230] } }
    ]);
  });

  // Add discount row to the main table for clarity if it exists
  if (discountAmount > 0) {
    tableData.push([
      { content: 'SUBTOTAL (BEFORE DISCOUNT)', colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] } },
      { content: `EGP ${formatCurrency(subtotalBeforeDiscount)}`, styles: { fontStyle: 'bold', fillColor: [240, 240, 240], textColor: [0, 0, 0] } }
    ]);

    const discountLabel = discountType === 'percentage' 
      ? `Discount (${discountValue}%)` 
      : 'Discount (Fixed)';
    tableData.push([
      { content: discountLabel, colSpan: 6, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [0, 0, 0] } },
      { content: `- EGP ${formatCurrency(discountAmount)}`, styles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [220, 53, 69] } }
    ]);
  }

  tableData.push([
    { content: 'GRAND TOTAL', colSpan: 6, styles: { fontStyle: 'bold', halign: 'right', fillColor: [66, 139, 202], textColor: [255, 255, 255], fontSize: 11 } },
    { content: `EGP ${formatCurrency(grandTotal)}`, styles: { fontStyle: 'bold', fillColor: [66, 139, 202], textColor: [255, 255, 255], fontSize: 11 } }
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Device', 'Protocol', 'Qty', 'Unit Price', 'Subtotal', 'VAT', 'Total']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [52, 58, 64],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 55 },  // Device - reduced slightly to make room for protocol
      1: { cellWidth: 20, halign: 'center' },  // Protocol - new column
      2: { cellWidth: 12, halign: 'center' },  // Qty - reduced slightly
      3: { cellWidth: 26, halign: 'right' },   // Unit Price - reduced slightly
      4: { cellWidth: 26, halign: 'right' },   // Subtotal - reduced slightly
      5: { cellWidth: 12, halign: 'center' },  // VAT - reduced slightly
      6: { cellWidth: 26, halign: 'right' }    // Total - reduced slightly
    }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DEVICE TYPE SUMMARY (REFERENCE)', 15, yPosition);
  yPosition += 10;

  const categorizedSummary = getCategorizedSummary(devices, rooms, categoryLabels);

  categorizedSummary.forEach((group, index) => {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(15, yPosition - 5, pageWidth - 30, 8, 'F');
    doc.setTextColor(66, 139, 202);
    doc.text(group.name, 17, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 10;

    const groupTableData = group.devices.map(item => [
      item.label,
      item.count.toString(),
      `EGP ${formatCurrency(item.total)}`
    ]);

    groupTableData.push([
      { content: `${group.name} Subtotal`, styles: { fontStyle: 'bold', fillColor: [245, 245, 245] } } as any,
      { content: group.devices.reduce((sum, d) => sum + d.count, 0).toString(), styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'center' } } as any,
      { content: `EGP ${formatCurrency(group.subtotal)}`, styles: { fontStyle: 'bold', fillColor: [245, 245, 245], halign: 'right' } } as any
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Device Type', 'Quantity', 'Total']],
      body: groupTableData,
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [52, 58, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      columnStyles: {
        0: { cellWidth: 100 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 50, halign: 'right' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 8;
  });

  // Add Category Summary Table (NEW REQUIREMENT)
  doc.addPage();
  yPosition = 25;
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CATEGORY SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 18;

  // Calculate pro-rated installation costs per category
  const devicesSubtotalForProRata = devices.reduce((sum, device) => {
    const qty = device.category === 'cat6_cable' && device.cable_length ? device.cable_length : device.quantity;
    return sum + (device.unit_price * qty);
  }, 0);

  const categorySummaryData: any[] = [
    [
      { content: 'Category', styles: { fontStyle: 'bold', fillColor: [66, 139, 202], textColor: [255, 255, 255] } },
      { content: 'Equipment Cost', styles: { fontStyle: 'bold', fillColor: [66, 139, 202], textColor: [255, 255, 255], halign: 'right' } },
      { content: 'Installation Cost', styles: { fontStyle: 'bold', fillColor: [66, 139, 202], textColor: [255, 255, 255], halign: 'right' } },
      { content: 'Total', styles: { fontStyle: 'bold', fillColor: [66, 139, 202], textColor: [255, 255, 255], halign: 'right' } }
    ]
  ];

  categorizedSummary.forEach(category => {
    const categoryInstallationCost = devicesSubtotalForProRata > 0 
      ? (category.subtotal / devicesSubtotalForProRata) * installationFee 
      : 0;
    const categoryTotal = category.subtotal + categoryInstallationCost;

    categorySummaryData.push([
      category.name,
      `EGP ${formatCurrency(category.subtotal)}`,
      `EGP ${formatCurrency(categoryInstallationCost)}`,
      `EGP ${formatCurrency(categoryTotal)}`
    ]);
  });

  // Add Grand Total row
  const totalEquipmentCost = categorizedSummary.reduce((sum, cat) => sum + cat.subtotal, 0);
  const totalInstallationCost = installationFee;
  const grandTotalForCategories = totalEquipmentCost + totalInstallationCost;

  categorySummaryData.push([
    { content: 'Grand Total', styles: { fontStyle: 'bold', fontSize: 11, fillColor: [240, 240, 240] } },
    { content: `EGP ${formatCurrency(totalEquipmentCost)}`, styles: { fontStyle: 'bold', fontSize: 11, fillColor: [240, 240, 240], halign: 'right' } },
    { content: `EGP ${formatCurrency(totalInstallationCost)}`, styles: { fontStyle: 'bold', fontSize: 11, fillColor: [240, 240, 240], halign: 'right' } },
    { content: `EGP ${formatCurrency(grandTotalForCategories)}`, styles: { fontStyle: 'bold', fontSize: 11, fillColor: [66, 139, 202], textColor: [255, 255, 255], halign: 'right' } }
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: categorySummaryData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 5,
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 60, fontStyle: 'bold' },
      1: { cellWidth: 45, halign: 'right' },
      2: { cellWidth: 45, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' }
    },
    margin: { top: 25, left: 15, right: 15 }
  });

  // Add Financial Summary Section
  // LAYOUT OPTIMIZATION: Adequate spacing to prevent logo overlap
  doc.addPage();
  yPosition = 25; // Increased from 20 to provide more top margin
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('FINANCIAL SUMMARY', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 18; // Increased from 15 for better spacing
  
  // Financial breakdown table with clear Total Amount display
  const financialData = [
    ['Devices Subtotal', `EGP ${formatCurrency(devicesSubtotal)}`],
    [`VAT (${vatPercentage}%)`, `EGP ${formatCurrency(vatAmount)}`],
    ['Devices Total (with VAT)', `EGP ${formatCurrency(devicesTotalWithVAT)}`],
    ['Commissioning Fee', `EGP ${formatCurrency(commissioningFee)}`],
    ['Visit Fee', `EGP ${formatCurrency(visitFee)}`],
    ['Installation & Commissioning', `EGP ${formatCurrency(installationFee)}`],
    ['Subtotal (Before Discount)', `EGP ${formatCurrency(subtotalBeforeDiscount)}`],
  ];

  if (discountAmount > 0) {
    const discountLabel = discountType === 'percentage' 
      ? `Discount (${discountValue}%)` 
      : 'Discount (Fixed)';
    financialData.push([
      { content: discountLabel, styles: { fontStyle: 'bold', textColor: [220, 53, 69] } } as any, 
      { content: `- EGP ${formatCurrency(discountAmount)}`, styles: { fontStyle: 'bold', textColor: [220, 53, 69] } } as any
    ]);
  }

  financialData.push(
    [{ content: '', colSpan: 2, styles: { minCellHeight: 3, fillColor: [255, 255, 255] } } as any], // Spacer
    [{ content: 'TOTAL AMOUNT', styles: { fontStyle: 'bold', fontSize: 12, fillColor: [66, 139, 202], textColor: [255, 255, 255] } } as any, 
     { content: `EGP ${formatCurrency(grandTotal)}`, styles: { fontStyle: 'bold', fontSize: 12, fillColor: [66, 139, 202], textColor: [255, 255, 255] } } as any],
    [{ content: '', colSpan: 2, styles: { minCellHeight: 6, fillColor: [255, 255, 255] } } as any], // Enhanced spacer
    [{ content: 'PAYMENT STATUS', colSpan: 2, styles: { fontStyle: 'bold', fontSize: 12, fillColor: [240, 240, 240], textColor: [0, 0, 0], halign: 'center' } } as any],
    [{ content: 'Paid Amount', styles: { fontStyle: 'bold', fontSize: 11 } } as any, 
     { content: `EGP ${formatCurrency(totalPaid)}`, styles: { fontStyle: 'bold', fontSize: 11, textColor: [40, 167, 69] } } as any],
    [{ content: 'Due Amount', styles: { fontStyle: 'bold', fontSize: 11 } } as any, 
     { content: `EGP ${formatCurrency(actualDueAmount)}`, styles: { fontStyle: 'bold', fontSize: 11, textColor: actualDueAmount > 0 ? [220, 53, 69] : [40, 167, 69] } } as any]
  );
  
  autoTable(doc, {
    startY: yPosition,
    body: financialData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 6, // Increased from 5 for better spacing
      lineWidth: 0.1,
      lineColor: [200, 200, 200]
    },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      1: { cellWidth: 90, halign: 'right' }
    },
    margin: { top: 25, left: 15, right: 15 } // Enhanced margins to prevent overlap
  });

  // Add Payment History section if there are payments
  if (payments && payments.length > 0) {
    yPosition = (doc as any).lastAutoTable.finalY + 10;
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT HISTORY', 15, yPosition);
    yPosition += 8;
    
    const paymentTableData = payments.map(p => [
      formatDate(p.payment_date),
      `EGP ${formatCurrency(p.amount)}`,
      p.payment_method,
      p.notes || '-'
    ]);
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Date', 'Amount', 'Method', 'Notes']],
      body: paymentTableData,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [52, 58, 64], textColor: [255, 255, 255] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' }
      }
    });
    
    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  doc.addPage();

  yPosition = 20;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(isInvoice ? 'INVOICE TERMS' : 'CLIENT ACCEPTANCE', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 20;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const acceptanceText = isInvoice ? [
    'This invoice represents the final billing for services and products provided.',
    'Payment is due according to the agreed terms and conditions.',
    '',
    'The enclosed disclaimer is an integral part of this invoice.',
    '',
    'Please retain this invoice for your records.'
  ] : [
    'I hereby acknowledge that I have reviewed and accept the quotation provided above.',
    'I understand and agree to the terms and conditions outlined in this document.',
    '',
    'The enclosed disclaimer is an integral part of this offer.',
    '',
    'This quotation is valid for 30 days from the date of issue.'
  ];

  acceptanceText.forEach(line => {
    doc.text(line, 15, yPosition);
    yPosition += 8;
  });

  yPosition += 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Client Signature:', 15, yPosition);
  doc.line(50, yPosition, 120, yPosition);

  yPosition += 20;
  doc.text('Date:', 15, yPosition);
  doc.line(50, yPosition, 120, yPosition);

  // Add Client Approval Date and Guarantee Period at the end
  yPosition += 15;
  if (approvalDate) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Client Approval Date: ${formatDate(approvalDate)}`, 15, yPosition);
    yPosition += 6;
  }
  
  if (warrantyStartDate || warrantyEndDate) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const guaranteeText = `Guarantee Period: ${formatDate(warrantyStartDate)} To ${formatDate(warrantyEndDate)}`;
    doc.text(guaranteeText, 15, yPosition);
    yPosition += 6;
  }

  // Add Terms & Conditions Section
  doc.addPage();
  yPosition = 20;
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TERMS & CONDITIONS', pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  
  // Important Notice
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 53, 69); // Red color for important notice
  const importantNotice = 'The company is not responsible for damage caused by missing power protector and recommends installing one.';
  const noticeLines = doc.splitTextToSize(importantNotice, pageWidth - 30);
  doc.text(noticeLines, 15, yPosition);
  yPosition += noticeLines.length * 6 + 8;
  
  doc.setTextColor(0, 0, 0); // Reset to black
  
  // Payment Conditions
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Conditions:', 15, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const paymentConditions = 'If order is cancelled by the customer where return is not possible, then cancellation Fees will be calculated at 70% from the total PO Value, otherwise shipping and handling fees will be deducted from downpayment and the balance will be refunded to the customer.';
  const paymentLines = doc.splitTextToSize(paymentConditions, pageWidth - 30);
  doc.text(paymentLines, 15, yPosition);
  yPosition += paymentLines.length * 6 + 8;
  
  // Payment Terms
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Terms:', 15, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('• 70% in advance payable in Cash with PO', 20, yPosition);
  yPosition += 6;
  doc.text('• 30% After delivery and Installation', 20, yPosition);
  yPosition += 10;
  
  // Offer Validity
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Offer Validity:', 15, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Offer is valid for 1 week from the above date', 15, yPosition);
  yPosition += 10;
  
  // Prices Do Not Include
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Prices Do Not Include the Following:', 15, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const exclusions = 'Power source, power source connections, conduits, ducts, ancillaries, network, network cables, fitting accessories, any Civil / Electrical works';
  const exclusionLines = doc.splitTextToSize(exclusions, pageWidth - 30);
  doc.text(exclusionLines, 15, yPosition);
  yPosition += exclusionLines.length * 6 + 8;
  
  // Delivery Terms
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Delivery Terms:', 15, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('• Delivery will be from 1 to 2 weeks from receiving down payment/PO', 20, yPosition);
  yPosition += 6;
  doc.text('• Delivery time may vary according to international market situation', 20, yPosition);
  yPosition += 6;
  doc.text('• Partial delivery is allowed', 20, yPosition);
  yPosition += 10;
  
  // General Terms
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('General Terms:', 15, yPosition);
  yPosition += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('• All devices are under warranty for 1 year from delivery date', 20, yPosition);
  yPosition += 6;
  doc.text('• Warranty is against manufacturing faults and not against misuse', 20, yPosition);
  yPosition += 6;
  const maintenanceText = '• Maintenance after warranty will be calculated @ 10% from total offer above and excludes all spare parts';
  const maintenanceLines = doc.splitTextToSize(maintenanceText, pageWidth - 25);
  doc.text(maintenanceLines, 20, yPosition);
  yPosition += maintenanceLines.length * 6;

  // Add footer to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    
    const footerText = `${COMPANY_INFO.address} | Phone: ${COMPANY_INFO.phone} | ${COMPANY_INFO.website}`;
    doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
    
    doc.text(`Page ${i}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
  }

  const documentType = isInvoice ? 'Invoice' : 'Quotation';
  const fileName = `${documentType}_${clientInfo?.client_name?.replace(/\s+/g, '_') || 'Client'}_${new Date().toISOString().split('T')[0]}.pdf`;
  if (openInNewTab) {
    const pdfBlob = doc.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    const target = targetWindow || window.open(pdfUrl, '_blank', 'noopener,noreferrer');
    if (target) target.location.href = pdfUrl;
    setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
  } else {
    doc.save(fileName);
  }
}
