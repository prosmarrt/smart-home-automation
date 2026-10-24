/**
 * Brief Quotation PDF Export — single page summary
 *
 * Layout:
 *   Header  : ProSmart logo (left) | Title + client info (centre) | Smart Systems logo (right)
 *   Table   : Device Name | Qty — one row per unique device/gang combination, aggregated across all rooms
 *   Footer  : Commissioning | Installation | Total (devices + services, no VAT breakdown on brief)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Device, Room, ClientInfo } from '@/types/types';
import prosmartLogoImage from '/prosmart-logo.png';
import smartSystemsLogoImage from '/smart-systems-logo-transparent.png';

export interface BriefPDFOptions {
  devices: Device[];
  rooms: Room[];
  clientInfo?: ClientInfo | null;
  commissioningFee?: number;
  visitFee?: number;
  installationFee?: number;
  vatPercentage?: number;
  discountType?: 'percentage' | 'fixed' | null;
  discountValue?: number;
  categoryLabels?: Record<string, string>;
  currentVersion?: number;
  totalPaid?: number;
  remainingBalance?: number;
}

// ─── helpers ───────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const DEFAULT_LABELS: Record<string, string> = {
  mini_switch: 'Mini Light Switch',
  touch_switch: 'Touch Light Switch',
  shutter_switch: 'Mini Shutter Switch',
  mini_shutter_switch: 'Mini Shutter Switch',
  smart_shutter_switch: 'Touch Shutter Switch',
  touch_shutter_switch: 'Touch Shutter Switch',
  curtain_switch: 'Curtain Switch',
  curtain_motor: 'Smart Curtain Motor',
  curtain_rail: 'Curtain Rail',
  roller_blind_motor: 'Roller Blind Motor',
  smart_plug: 'Smart Plug',
  ir_remote: 'IR Remote Controller',
  gas_sensor: 'Gas Sensor',
  water_leak_sensor: 'Water Leak Sensor',
  motion_sensor: 'Motion Sensor',
  presence_sensor: 'Presence Sensor',
  smoke_sensor: 'Smoke Sensor',
  smoke_detector: 'Smoke Detector',
  gas_valve: 'Gas Valve',
  water_valve: 'Water Valve',
  intercom: 'Intercom',
  camera: 'CCTV Camera',
  wifi_camera: 'WiFi Camera',
  ip_camera: 'IP Camera',
  ptz_camera: 'PTZ Camera',
  doorbell_camera: 'Doorbell Camera',
  nvr: 'NVR',
  dvr: 'DVR',
  hdd: 'HDD',
  memory_card: 'Memory Card',
  bracket: 'Bracket',
  smart_lock: 'Smart Lock',
  fingerprint_lock: 'Fingerprint Lock',
  face_recognition: 'Face Recognition',
  card_reader: 'Card Reader',
  zigbee_hub: 'Zigbee Hub',
  matter_hub: 'Matter Hub',
  gateway: 'Gateway',
  access_point: 'Access Point',
  repeater: 'Wi-Fi Repeater',
  mesh_wifi: 'Mesh Wi-Fi',
  network_switch: 'Network Switch',
  poe_switch: 'PoE Switch',
  router: 'Router',
  cat6_cable: 'CAT 6 Cable',
  cat6a_cable: 'CAT 6A Cable',
  fiber_cable: 'Fiber Cable',
  hdmi_cable: 'HDMI Cable',
  power_cable: 'Power Cable',
  central_control_panel: 'Central Control Panel',
  scene_panel: 'Scene Panel',
  voice_assistant: 'Voice Assistant',
  custom_device: 'Custom Device',
};

/** Build a human-readable label for a device, including gang suffix if applicable. */
function deviceLabel(device: Device, extraLabels: Record<string, string> = {}): string {
  const getL = (cat: string) => extraLabels[cat] || DEFAULT_LABELS[cat] || cat;

  // Custom device — use custom name
  if (device.category === 'custom_device') {
    return device.custom_name || 'Custom Device';
  }

  // Device with explicit name
  if (device.device_name) {
    let base = device.device_name;
    if (device.gang && ['mini_switch', 'mini_shutter_switch', 'touch_switch', 'touch_shutter_switch', 'shutter_switch', 'smart_shutter_switch'].includes(device.category)) {
      base += ` ${device.gang}G`;
    }
    return base;
  }

  let label = getL(device.category);

  // Append gang where it applies
  const gangCategories = ['mini_switch', 'mini_shutter_switch', 'touch_switch', 'touch_shutter_switch', 'shutter_switch', 'smart_shutter_switch', 'curtain_switch'];
  if (device.gang && gangCategories.includes(device.category)) {
    label += ` ${device.gang}G`;
  }

  // Category-specific suffixes
  if (device.category === 'intercom') {
    label = device.intercom_type === 'doorbell' ? 'Doorbell' : 'Indoor Station';
  } else if (device.category === 'camera' || device.category === 'wifi_camera') {
    label = `${getL(device.category)}${device.camera_resolution ? ` ${device.camera_resolution.toUpperCase()}` : ''}${device.camera_type ? ` ${device.camera_type}` : ''}`.trim();
  } else if (device.category === 'mesh_wifi' && device.mesh_model) {
    label = `${getL('mesh_wifi')} (${device.mesh_model})`;
  } else if (device.category === 'network_switch' && device.port_count) {
    label = `${getL('network_switch')} (${device.port_count}P)`;
  } else if (device.category === 'nvr' && device.hdd_capacity) {
    label = `${getL('nvr')} (${device.hdd_capacity.toUpperCase()})`;
  } else if (device.category === 'hdd' && device.hdd_capacity) {
    label = `${getL('hdd')} (${device.hdd_capacity.toUpperCase()})`;
  } else if (device.category === 'memory_card' && device.memory_card_capacity) {
    label = `${getL('memory_card')} (${device.memory_card_capacity.toUpperCase()})`;
  } else if (device.category === 'cat6_cable' && device.cable_length) {
    label = `${getL('cat6_cable')} (${device.cable_length}m)`;
  }

  if (device.brand) label += ` — ${device.brand}`;
  if (device.model) label += ` ${device.model}`;

  return label.trim();
}

/** Aggregate devices by label+price, keeping category for grouping. */
function aggregateDevices(
  devices: Device[],
  extraLabels: Record<string, string> = {}
): { label: string; qty: number; unitPrice: number; lineTotal: number; category: string }[] {
  const map = new Map<string, { label: string; qty: number; unitPrice: number; lineTotal: number; category: string }>();
  for (const d of devices) {
    const label = deviceLabel(d, extraLabels);
    const qty = d.category === 'cat6_cable' && d.cable_length ? d.cable_length : d.quantity;
    const key = `${label}__${d.unit_price}`;
    const existing = map.get(key);
    if (existing) {
      existing.qty += qty;
      existing.lineTotal += d.unit_price * qty;
    } else {
      map.set(key, { label, qty, unitPrice: d.unit_price, lineTotal: d.unit_price * qty, category: d.category });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

// ─── section grouping ─────────────────────────────────────────────────────

interface SectionGroup {
  title: string;
  color: [number, number, number]; // header fill RGB
  categories: string[];
}

const SECTION_GROUPS: SectionGroup[] = [
  {
    title: 'Lighting',
    color: [245, 176, 65],
    categories: ['mini_switch', 'touch_switch', 'motion_sensor', 'presence_sensor', 'smart_plug'],
  },
  {
    title: 'Shading',
    color: [88, 160, 220],
    categories: ['mini_shutter_switch', 'touch_shutter_switch', 'shutter_switch', 'smart_shutter_switch', 'curtain_switch', 'curtain_motor', 'curtain_rail', 'roller_blind_motor'],
  },
  {
    title: 'Security',
    color: [231, 76, 60],
    categories: ['camera', 'wifi_camera', 'ip_camera', 'ptz_camera', 'doorbell_camera', 'nvr', 'dvr', 'hdd', 'memory_card', 'bracket', 'intercom', 'smart_lock', 'fingerprint_lock', 'face_recognition', 'card_reader', 'gas_sensor', 'water_leak_sensor', 'smoke_sensor', 'smoke_detector', 'gas_valve', 'water_valve'],
  },
  {
    title: 'Networking',
    color: [39, 174, 96],
    categories: ['access_point', 'mesh_wifi', 'network_switch', 'poe_switch', 'repeater', 'router', 'cat6_cable', 'cat6a_cable', 'fiber_cable', 'hdmi_cable', 'power_cable'],
  },
  {
    title: 'HUBs',
    color: [142, 68, 173],
    categories: ['zigbee_hub', 'matter_hub', 'gateway'],
  },
  {
    title: 'Voice Assistant',
    color: [26, 188, 156],
    categories: ['voice_assistant'],
  },
  {
    title: 'Central Control',
    color: [41, 98, 168],
    categories: ['central_control_panel', 'scene_panel', 'central_control', 'ir_remote'],
  },
  {
    title: 'Other',
    color: [120, 120, 120],
    categories: ['custom_device'],
  },
];

// ─── main export ──────────────────────────────────────────────────────────

export async function exportBriefToPDF({
  devices,
  rooms: _rooms,
  clientInfo,
  commissioningFee = 0,
  visitFee = 0,
  installationFee = 0,
  vatPercentage = 0,
  discountType = null,
  discountValue = 0,
  categoryLabels = {},
  currentVersion = 1,
  totalPaid = 0,
  remainingBalance = 0,
}: BriefPDFOptions): Promise<void> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pw = doc.internal.pageSize.getWidth();   // 210
  const ph = doc.internal.pageSize.getHeight();  // 297
  const margin = 14;
  let y = 12;

  // ── logos ────────────────────────────────────────────────────────────────
  const LOGO_H = 18;

  try {
    const img = await loadImage(prosmartLogoImage);
    const w = (img.width / img.height) * LOGO_H;
    doc.addImage(img, 'PNG', margin, y, w, LOGO_H);
  } catch { /* logo optional */ }

  try {
    const img = await loadImage(smartSystemsLogoImage);
    const w = (img.width / img.height) * LOGO_H;
    doc.addImage(img, 'PNG', pw - margin - w, y, w, LOGO_H);
  } catch { /* logo optional */ }

  // ── header text ──────────────────────────────────────────────────────────
  const cx = pw / 2;

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('Smart Home Automation', cx, y + 6, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Brief Quotation', cx, y + 12, { align: 'center' });

  // version badge
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(240, 240, 240);
  doc.roundedRect(cx - 8, y + 13.5, 16, 5, 1.5, 1.5, 'F');
  doc.setTextColor(60, 60, 60);
  doc.text(`V${currentVersion}`, cx, y + 17, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  y += LOGO_H + 6;

  // ── client info bar ──────────────────────────────────────────────────────
  if (clientInfo) {
    doc.setFillColor(245, 247, 250);
    doc.rect(margin, y, pw - margin * 2, 16, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(60, 60, 60);

    const col1 = margin + 3;
    const col2 = pw / 2 + 2;
    const row1 = y + 5;
    const row2 = y + 10;
    const row3 = y + 15;

    if (clientInfo.client_name) {
      doc.text(`Client: `, col1, row1);
      doc.setFont('helvetica', 'normal');
      doc.text(clientInfo.client_name, col1 + 14, row1);
      doc.setFont('helvetica', 'bold');
    }
    if (clientInfo.project_code) {
      doc.text(`Project: `, col2, row1);
      doc.setFont('helvetica', 'normal');
      doc.text(clientInfo.project_code, col2 + 16, row1);
      doc.setFont('helvetica', 'bold');
    }
    if (clientInfo.phone_number) {
      doc.text(`Phone: `, col1, row2);
      doc.setFont('helvetica', 'normal');
      doc.text(clientInfo.phone_number, col1 + 14, row2);
      doc.setFont('helvetica', 'bold');
    }
    // date
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`Date: `, col2, row2);
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, col2 + 12, row2);
    doc.setFont('helvetica', 'bold');

    if (clientInfo.address) {
      doc.text(`Address: `, col1, row3);
      doc.setFont('helvetica', 'normal');
      doc.text(clientInfo.address, col1 + 16, row3);
    }

    doc.setTextColor(0, 0, 0);
    y += 19;
  } else {
    const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${dateStr}`, pw - margin, y, { align: 'right' });
    y += 6;
  }

  // ── devices table — grouped by section ───────────────────────────────────
  const allRows = aggregateDevices(devices, categoryLabels);

  // Assign each row to a section (last section = Other catches anything unmatched)
  const grouped = SECTION_GROUPS.map(sg => ({
    ...sg,
    rows: allRows.filter(r => sg.categories.includes(r.category)),
  })).filter(sg => sg.rows.length > 0);

  // Catch any category not mapped to any group
  const mappedCats = new Set(SECTION_GROUPS.flatMap(sg => sg.categories));
  const unmapped = allRows.filter(r => !mappedCats.has(r.category));
  if (unmapped.length > 0) {
    grouped.push({ title: 'Other', color: [120, 120, 120], categories: [], rows: unmapped });
  }

  let rowCounter = 1;

  for (const group of grouped) {
    const subtotal = group.rows.reduce((s, r) => s + r.lineTotal, 0);
    const [hr, hg, hb] = group.color;

    autoTable(doc, {
      startY: y,
      head: [[
        { content: group.title, colSpan: 5, styles: { halign: 'left', fontStyle: 'bold', fontSize: 9, fillColor: [hr, hg, hb], textColor: 255, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } } }
      ],
      ['#', 'Device', 'Qty', 'Unit Price', 'Total']],
      body: [
        ...group.rows.map((r) => [rowCounter++, r.label, r.qty, `EGP ${fmt(r.unitPrice)}`, `EGP ${fmt(r.lineTotal)}`]),
        [{ content: 'Section Subtotal', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250], fontSize: 8.5 } }, { content: `EGP ${fmt(subtotal)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250], fontSize: 8.5 } }],
      ],
      margin: { left: margin, right: margin },
      tableWidth: pw - margin * 2,
      styles: {
        fontSize: 8.5,
        cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
        overflow: 'linebreak',
        lineColor: [210, 215, 220],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [60, 60, 60],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 9,  halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [248, 249, 251] },
    });

    // @ts-expect-error jspdf-autotable extends doc
    y = doc.lastAutoTable.finalY + 3;
  }

  // ── footer: services + grand total ───────────────────────────────────────
  const devicesSubtotal = devices.reduce((s, d) => s + d.unit_price * (d.category === 'cat6_cable' && d.cable_length ? d.cable_length : d.quantity), 0);
  const services = commissioningFee + visitFee + installationFee;
  const subtotalBeforeDiscount = devicesSubtotal + services;

  let discountAmount = 0;
  if (discountType && discountValue > 0) {
    discountAmount = discountType === 'percentage'
      ? subtotalBeforeDiscount * (discountValue / 100)
      : discountValue;
  }
  const afterDiscount = Math.max(0, subtotalBeforeDiscount - discountAmount);
  const vatAmount = afterDiscount * (vatPercentage / 100);
  const grandTotal = afterDiscount + vatAmount;

  const footerRows: [string, string][] = [
    ['Devices Subtotal', `EGP ${fmt(devicesSubtotal)}`],
  ];
  if (commissioningFee > 0) footerRows.push(['Commissioning & Programming', `EGP ${fmt(commissioningFee)}`]);
  if (visitFee > 0)         footerRows.push(['Visit Fee',                    `EGP ${fmt(visitFee)}`]);
  if (installationFee > 0)  footerRows.push(['Installation & Commissioning', `EGP ${fmt(installationFee)}`]);
  if (discountAmount > 0)   footerRows.push([`Discount ${discountType === 'percentage' ? `(${discountValue}%)` : ''}`, `− EGP ${fmt(discountAmount)}`]);
  if (vatPercentage > 0)    footerRows.push([`VAT (${vatPercentage}%)`,      `EGP ${fmt(vatAmount)}`]);
  footerRows.push(['TOTAL', `EGP ${fmt(grandTotal)}`]);
  if (totalPaid > 0)        footerRows.push(['Total Paid',   `EGP ${fmt(totalPaid)}`]);
  if (remainingBalance > 0) footerRows.push(['Remaining',  `EGP ${fmt(remainingBalance)}`]);

  autoTable(doc, {
    startY: y,
    body: footerRows,
    margin: { left: pw / 2, right: margin },
    tableWidth: pw / 2 - margin,
    styles: {
      fontSize: 9,
      cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
      lineColor: [210, 215, 220],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: 'normal', halign: 'left' },
      1: { halign: 'right', fontStyle: 'normal' },
    },
    didParseCell: (data) => {
      const isTotal = footerRows[data.row.index]?.[0] === 'TOTAL';
      if (isTotal) {
        data.cell.styles.fillColor = [41, 98, 168];
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fontSize = 10;
      }
    },
  });

  // ── page 2: Terms & Conditions ───────────────────────────────────────────
  doc.addPage();
  let ty = 20;

  // Header bar
  doc.setFillColor(41, 98, 168);
  doc.rect(0, 0, pw, 12, 'F');
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('TERMS & CONDITIONS', pw / 2, 8, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  ty = 22;

  // Important Notice
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(255, 243, 243);
  doc.roundedRect(margin, ty, pw - margin * 2, 10, 2, 2, 'F');
  doc.setTextColor(180, 30, 30);
  const noticeText = '⚠  The company is not responsible for damage caused by missing power protector and recommends installing one.';
  const noticeLines = doc.splitTextToSize(noticeText, pw - margin * 2 - 6);
  doc.text(noticeLines, margin + 3, ty + 6);
  doc.setTextColor(0, 0, 0);
  ty += noticeLines.length * 5 + 10;

  const sectionTitle = (text: string) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(235, 240, 250);
    doc.rect(margin, ty - 1, pw - margin * 2, 7, 'F');
    doc.text(text, margin + 2, ty + 4.5);
    ty += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
  };

  const bullet = (text: string, indent = 4) => {
    const lines = doc.splitTextToSize(`• ${text}`, pw - margin * 2 - indent - 2);
    doc.text(lines, margin + indent, ty);
    ty += lines.length * 5 + 1;
  };

  const bodyText = (text: string) => {
    const lines = doc.splitTextToSize(text, pw - margin * 2 - 2);
    doc.text(lines, margin + 2, ty);
    ty += lines.length * 5 + 2;
  };

  // Payment Conditions
  sectionTitle('Payment Conditions');
  bodyText('If order is cancelled by the customer where return is not possible, then cancellation Fees will be calculated at 70% from the total PO Value, otherwise shipping and handling fees will be deducted from downpayment and the balance will be refunded to the customer.');
  ty += 2;

  // Payment Terms
  sectionTitle('Payment Terms');
  bullet('70% in advance payable in Cash with PO');
  bullet('30% After delivery and Installation');
  ty += 2;

  // Offer Validity
  sectionTitle('Offer Validity');
  bodyText('Offer is valid for 1 week from the above date.');
  ty += 2;

  // Prices Do Not Include
  sectionTitle('Prices Do Not Include the Following');
  bodyText('Power source, power source connections, conduits, ducts, ancillaries, network, network cables, fitting accessories, any Civil / Electrical works.');
  ty += 2;

  // Delivery Terms
  sectionTitle('Delivery Terms');
  bullet('Delivery will be from 1 to 2 weeks from receiving down payment / PO');
  bullet('Delivery time may vary according to international market situation');
  bullet('Partial delivery is allowed');
  ty += 2;

  // General Terms
  sectionTitle('General Terms');
  bullet('All devices are under warranty for 1 year from delivery date');
  bullet('Warranty is against manufacturing faults and not against misuse');
  bullet('Maintenance after warranty will be calculated @ 10% from total offer above and excludes all spare parts');
  ty += 4;

  // Acceptance block
  doc.setDrawColor(180, 195, 220);
  doc.setLineWidth(0.3);
  doc.rect(margin, ty, pw - margin * 2, 22, 'S');
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text('Client Acceptance', margin + 3, ty + 6);
  doc.setFont('helvetica', 'normal');
  doc.text('I understand and agree to the terms and conditions outlined in this document.', margin + 3, ty + 12);
  doc.text('Signature: ____________________________', margin + 3, ty + 19);
  doc.text(`Date: ____________________`, pw - margin - 55, ty + 19);

  // ── footer on both pages ─────────────────────────────────────────────────
  const FOOTER_TEXT = '18 Ashmoun Street, Heliopolis  |  Phone: 0150 0166533  |  www.smartsystemsegypt.com';
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(FOOTER_TEXT, pw / 2, ph - 7, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, pw - margin, ph - 7, { align: 'right' });
    doc.setTextColor(0, 0, 0);
  }

  // ── page border on both pages ────────────────────────────────────────────
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(200, 205, 212);
    doc.setLineWidth(0.4);
    doc.rect(5, 5, pw - 10, ph - 10);
  }

  // ── save ─────────────────────────────────────────────────────────────────
  const projectCode = clientInfo?.project_code ? `_${clientInfo.project_code}` : '';
  const clientName = clientInfo?.client_name ? `_${clientInfo.client_name.replace(/\s+/g, '-')}` : '';
  doc.save(`Brief_Quotation${projectCode}${clientName}_V${currentVersion}.pdf`);
}
