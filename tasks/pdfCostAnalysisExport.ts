/**
 * Cost Analysis PDF Export — admin-only profitability report
 *
 * Layout:
 *   Page 1+  : Header (logos + title + client bar)
 *              Grouped device table per section:
 *                # | Device | Qty | Sell Price | Cost Price | Revenue | Cost Total | Profit | Margin%
 *              Per-section subtotal rows
 *   Last page: Financial summary (devices subtotal + services + grand total + profit overview)
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Device, ClientInfo } from '@/types/types';
import prosmartLogoImage from '/prosmart-logo.png';
import smartSystemsLogoImage from '/smart-systems-logo-transparent.png';

export interface CostAnalysisPDFOptions {
  devices: Device[];
  clientInfo?: ClientInfo | null;
  commissioningFee?: number;
  visitFee?: number;
  installationFee?: number;
  quotationTotal: number;
  costPriceMap: Map<string, number>;  // keyed as built in CostAnalysisTab
  categoryLabels?: Record<string, string>;
  currentVersion?: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────

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
  voice_assistant: 'Voice Assistant',
  custom_device: 'Custom Device',
};

function deviceLabel(device: Device, extraLabels: Record<string, string> = {}): string {
  if (device.custom_name) return device.custom_name;
  if (device.device_name) return device.device_name;

  const getL = (cat: string) => extraLabels[cat] || DEFAULT_LABELS[cat] || cat;
  let label = getL(device.category);

  if (device.gang) label += ` ${device.gang}G`;
  if (device.camera_resolution) label += ` ${device.camera_resolution.toUpperCase()}`;
  if (device.camera_type) label += ` ${device.camera_type.charAt(0).toUpperCase() + device.camera_type.slice(1)}`;
  if (device.brand) label += ` (${device.brand})`;
  return label;
}

// ─── section grouping (mirrors pdfBriefExport) ────────────────────────────

interface SectionGroup {
  title: string;
  color: [number, number, number];
  categories: string[];
}

const SECTION_GROUPS: SectionGroup[] = [
  { title: 'Lighting',        color: [245, 176, 65],  categories: ['mini_switch','touch_switch','motion_sensor','presence_sensor','smart_plug'] },
  { title: 'Shading',         color: [88, 160, 220],  categories: ['mini_shutter_switch','touch_shutter_switch','shutter_switch','smart_shutter_switch','curtain_switch','curtain_motor','curtain_rail','roller_blind_motor'] },
  { title: 'Security',        color: [231, 76, 60],   categories: ['camera','wifi_camera','ip_camera','ptz_camera','doorbell_camera','nvr','dvr','hdd','memory_card','bracket','intercom','smart_lock','fingerprint_lock','face_recognition','card_reader','gas_sensor','water_leak_sensor','smoke_sensor','smoke_detector','gas_valve','water_valve'] },
  { title: 'Networking',      color: [39, 174, 96],   categories: ['access_point','mesh_wifi','network_switch','poe_switch','repeater','router','cat6_cable','cat6a_cable','fiber_cable','hdmi_cable','power_cable'] },
  { title: 'HUBs',            color: [142, 68, 173],  categories: ['zigbee_hub','matter_hub','gateway'] },
  { title: 'Voice Assistant', color: [26, 188, 156],  categories: ['voice_assistant'] },
  { title: 'Central Control', color: [41, 98, 168],   categories: ['central_control_panel','scene_panel','central_control','ir_remote'] },
  { title: 'Other',           color: [120, 120, 120], categories: ['custom_device'] },
];

// ─── row aggregation ──────────────────────────────────────────────────────

interface CostRow {
  label: string;
  qty: number;
  sellPrice: number;
  costPrice: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  category: string;
}

function aggregateRows(
  devices: Device[],
  costPriceMap: Map<string, number>,
  extraLabels: Record<string, string>
): CostRow[] {
  const map = new Map<string, CostRow>();

  for (const d of devices) {
    const qty = d.category === 'cat6_cable' && d.cable_length ? d.cable_length : d.quantity;
    const label = deviceLabel(d, extraLabels);

    // Priority: d.cost_price (from DB or injected override) > device_name > catalog lookup
    let costPrice = d.cost_price;
    
    if (costPrice === undefined || costPrice === null) {
      costPrice = 0;
      if (d.device_name) {
        costPrice = costPriceMap.get(`name:${d.device_name}`) ?? 0;
      }
      if (!costPrice && d.custom_name) {
        costPrice = costPriceMap.get(`name:${d.custom_name}`) ?? 0;
      }
      if (!costPrice && d.brand && d.model) {
        costPrice = costPriceMap.get(`brand_model:${d.brand}|${d.model}`) ?? 0;
      }
      if (!costPrice) {
        const key = [
          d.category,
          d.protocol ?? '',
          d.gang ?? '',
          (d as any).intercom_type ?? '',
          d.camera_resolution ?? '',
          d.camera_type ?? '',
        ].join('|');
        costPrice = costPriceMap.get(key) ?? 0;
      }
    }

    const mapKey = `${label}|${d.unit_price}|${costPrice}`;
    const existing = map.get(mapKey);
    if (existing) {
      existing.qty += qty;
      existing.revenue += d.unit_price * qty;
      existing.cost += costPrice * qty;
      existing.profit = existing.revenue - existing.cost;
      existing.margin = existing.revenue > 0 ? (existing.profit / existing.revenue) * 100 : 0;
    } else {
      const revenue = d.unit_price * qty;
      const cost = costPrice * qty;
      const profit = revenue - cost;
      map.set(mapKey, {
        label, qty,
        sellPrice: d.unit_price,
        costPrice,
        revenue, cost, profit,
        margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        category: d.category,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
}

// ─── margin badge colours ─────────────────────────────────────────────────

function marginFill(pct: number): [number, number, number] {
  if (pct >= 40) return [220, 252, 231];   // green-100
  if (pct >= 20) return [254, 243, 199];   // amber-100
  return [254, 226, 226];                  // red-100
}
function marginText(pct: number): [number, number, number] {
  if (pct >= 40) return [22, 101, 52];
  if (pct >= 20) return [120, 80, 10];
  return [153, 27, 27];
}

// ─── main export ──────────────────────────────────────────────────────────

export async function exportCostAnalysisToPDF({
  devices,
  clientInfo,
  commissioningFee = 0,
  visitFee = 0,
  installationFee = 0,
  quotationTotal,
  costPriceMap,
  categoryLabels = {},
  currentVersion = 1,
}: CostAnalysisPDFOptions): Promise<void> {

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();   // 297 landscape
  const ph = doc.internal.pageSize.getHeight();  // 210
  const margin = 12;
  let y = 10;

  // ── logos ─────────────────────────────────────────────────────────────────
  const LOGO_H = 14;
  try {
    const img = await loadImage(prosmartLogoImage);
    const w = (img.width / img.height) * LOGO_H;
    doc.addImage(img, 'PNG', margin, y, w, LOGO_H);
  } catch { /* optional */ }

  try {
    const img = await loadImage(smartSystemsLogoImage);
    const w = (img.width / img.height) * LOGO_H;
    doc.addImage(img, 'PNG', pw - margin - w, y, w, LOGO_H);
  } catch { /* optional */ }

  // ── header title ──────────────────────────────────────────────────────────
  const cx = pw / 2;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(41, 98, 168);
  doc.text('COST ANALYSIS REPORT', cx, y + 5, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('CONFIDENTIAL — For Internal Use Only', cx, y + 10, { align: 'center' });

  // version badge
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(41, 98, 168);
  doc.roundedRect(cx - 8, y + 11.5, 16, 4.5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.text(`V${currentVersion}`, cx, y + 14.5, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  y += LOGO_H + 5;

  // ── client info bar ───────────────────────────────────────────────────────
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  if (clientInfo) {
    doc.setFillColor(245, 247, 250);
    doc.setDrawColor(210, 215, 225);
    doc.setLineWidth(0.2);
    doc.rect(margin, y, pw - margin * 2, 13, 'FD');

    doc.setFontSize(7.5);
    const c1 = margin + 3, c2 = pw / 3, c3 = pw * 2 / 3;
    const r1 = y + 5, r2 = y + 10;

    const field = (label: string, value: string, x: number, row: number) => {
      doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
      doc.text(label, x, row);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 0, 0);
      doc.text(value, x + doc.getTextWidth(label) + 1, row);
    };

    if (clientInfo.client_name) field('Client:', clientInfo.client_name, c1, r1);
    if (clientInfo.project_code) field('Project:', clientInfo.project_code, c2, r1);
    field('Date:', dateStr, c3, r1);
    if (clientInfo.phone_number) field('Phone:', clientInfo.phone_number, c1, r2);
    if (clientInfo.address) field('Address:', clientInfo.address, c2, r2);

    y += 16;
  } else {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${dateStr}`, pw - margin, y + 4, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    y += 8;
  }

  // ── build rows & group them ───────────────────────────────────────────────
  const allRows = aggregateRows(devices, costPriceMap, categoryLabels);

  const grouped = SECTION_GROUPS.map(sg => ({
    ...sg,
    rows: allRows.filter(r => sg.categories.includes(r.category)),
  })).filter(sg => sg.rows.length > 0);

  const mappedCats = new Set(SECTION_GROUPS.flatMap(sg => sg.categories));
  const unmapped = allRows.filter(r => !mappedCats.has(r.category));
  if (unmapped.length > 0) {
    grouped.push({ title: 'Other', color: [120, 120, 120], categories: [], rows: unmapped });
  }

  // ── per-section tables ────────────────────────────────────────────────────
  let rowNum = 1;

  for (const group of grouped) {
    const [hr, hg, hb] = group.color;

    // section totals
    const secRevenue = group.rows.reduce((s, r) => s + r.revenue, 0);
    const secCost = group.rows.reduce((s, r) => s + r.cost, 0);
    const secProfit = secRevenue - secCost;
    const secMargin = secRevenue > 0 ? (secProfit / secRevenue) * 100 : 0;

    autoTable(doc, {
      startY: y,
      head: [
        [{ content: group.title, colSpan: 9, styles: { halign: 'left', fontStyle: 'bold', fontSize: 9, fillColor: [hr, hg, hb], textColor: 255, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } } }],
        ['#', 'Device', 'Cost Price', 'Sell Price', 'Qty', 'Cost Total', 'Revenue', 'Profit', 'Margin %'],
      ],
      body: [
        ...group.rows.map(r => {
          const hasCost = r.costPrice > 0;
          return [
            rowNum++,
            r.label,
            hasCost ? `EGP ${fmt(r.costPrice)}` : '—',
            `EGP ${fmt(r.sellPrice)}`,
            r.qty,
            hasCost ? `EGP ${fmt(r.cost)}` : '—',
            `EGP ${fmt(r.revenue)}`,
            hasCost ? `EGP ${fmt(r.profit)}` : '—',
            hasCost ? `${r.margin.toFixed(1)}%` : '—',
          ];
        }),
        // section subtotal row
        [
          { content: 'Section Subtotal', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250], fontSize: 8 } },
          { content: `EGP ${fmt(secRevenue)}`, styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: secCost > 0 ? `EGP ${fmt(secCost)}` : '—', styles: { halign: 'right', fontStyle: 'bold', fillColor: [245, 247, 250] } },
          { content: secCost > 0 ? `EGP ${fmt(secProfit)}` : '—', styles: { halign: 'right', fontStyle: 'bold', fillColor: secProfit >= 0 ? [220, 252, 231] : [254, 226, 226], textColor: secProfit >= 0 ? [22, 101, 52] : [153, 27, 27] } },
          { content: secCost > 0 ? `${secMargin.toFixed(1)}%` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: secCost > 0 ? marginFill(secMargin) : [245, 247, 250] as [number,number,number], textColor: secCost > 0 ? marginText(secMargin) : [120, 120, 120] as [number,number,number] } },
        ],
      ],
      margin: { left: margin, right: margin },
      tableWidth: pw - margin * 2,
      styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 2.5, right: 2.5 }, overflow: 'linebreak', lineColor: [210, 215, 220], lineWidth: 0.2 },
      headStyles: { fillColor: [50, 55, 65], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 7,  halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 26, halign: 'right', textColor: [80, 80, 80] as [number,number,number] },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
        5: { cellWidth: 26, halign: 'right', textColor: [80, 80, 80] as [number,number,number] },
        6: { cellWidth: 26, halign: 'right' },
        7: { cellWidth: 26, halign: 'right' },
        8: { cellWidth: 20, halign: 'center' },
      },
      alternateRowStyles: { fillColor: [249, 250, 252] },
    });

    // @ts-expect-error jspdf-autotable extends doc
    y = doc.lastAutoTable.finalY + 4;
  }

  // ── financial summary table ───────────────────────────────────────────────
  const totalDeviceRevenue = allRows.reduce((s, r) => s + r.revenue, 0);
  const totalDeviceCost    = allRows.reduce((s, r) => s + r.cost, 0);
  const totalDeviceProfit  = totalDeviceRevenue - totalDeviceCost;
  const devMargin          = totalDeviceRevenue > 0 ? (totalDeviceProfit / totalDeviceRevenue) * 100 : 0;

  const totalRevenue = quotationTotal;
  const totalCost    = totalDeviceCost;
  const totalProfit  = totalRevenue - totalCost;
  const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const summaryBody: (string | { content: string; styles: object })[][] = [];

  const sumRow = (label: string, val: string, costVal: string, profitVal: string, marginVal: string, highlight = false) => {
    const base = highlight ? { fillColor: [235, 242, 255], fontStyle: 'bold' } : {};
    return [
      { content: label, styles: { ...base, halign: 'left' as const } },
      { content: val,   styles: { ...base, halign: 'right' as const } },
      { content: costVal,   styles: { ...base, halign: 'right' as const, textColor: [80,80,80] } },
      { content: profitVal, styles: { ...base, halign: 'right' as const } },
      { content: marginVal, styles: { ...base, halign: 'center' as const } },
    ];
  };

  summaryBody.push(sumRow('Devices Subtotal', `EGP ${fmt(totalDeviceRevenue)}`, totalDeviceCost > 0 ? `EGP ${fmt(totalDeviceCost)}` : '—', totalDeviceCost > 0 ? `EGP ${fmt(totalDeviceProfit)}` : '—', totalDeviceCost > 0 ? `${devMargin.toFixed(1)}%` : '—'));
  if (commissioningFee > 0) summaryBody.push(sumRow('Commissioning & Programming', `EGP ${fmt(commissioningFee)}`, '—', `EGP ${fmt(commissioningFee)}`, '100%'));
  if (visitFee > 0)         summaryBody.push(sumRow('Visit Fee',                   `EGP ${fmt(visitFee)}`,        '—', `EGP ${fmt(visitFee)}`,         '100%'));
  if (installationFee > 0)  summaryBody.push(sumRow('Installation Fee',            `EGP ${fmt(installationFee)}`, '—', `EGP ${fmt(installationFee)}`,   '100%'));
  summaryBody.push(sumRow('GRAND TOTAL', `EGP ${fmt(totalRevenue)}`, `EGP ${fmt(totalCost)}`, `EGP ${fmt(totalProfit)}`, `${overallMargin.toFixed(1)}%`, true));

  // Leave room — add new page if needed
  if (y > ph - 50) {
    doc.addPage();
    y = 15;
  }

  autoTable(doc, {
    startY: y,
    head: [
      [{ content: 'Financial Summary', colSpan: 5, styles: { halign: 'center', fontStyle: 'bold', fontSize: 9.5, fillColor: [41, 98, 168], textColor: 255, cellPadding: { top: 3, bottom: 3 } } }],
      ['', 'Revenue (EGP)', 'Cost (EGP)', 'Profit (EGP)', 'Margin %'],
    ],
    body: summaryBody,
    margin: { left: pw / 2, right: margin },
    tableWidth: pw / 2 - margin,
    styles: { fontSize: 8.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 }, lineColor: [210, 215, 220], lineWidth: 0.2 },
    headStyles: { fillColor: [50, 55, 65], textColor: 255, fontStyle: 'bold', fontSize: 8 },
  });

  // ── footer on every page ──────────────────────────────────────────────────
  const FOOTER = '18 Ashmoun Street, Heliopolis  |  Phone: 0150 0166533  |  www.smartsystemsegypt.com';
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    // border
    doc.setDrawColor(200, 205, 212);
    doc.setLineWidth(0.3);
    doc.rect(4, 4, pw - 8, ph - 8);
    // footer text
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(140, 140, 140);
    doc.text(FOOTER, pw / 2, ph - 6, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, pw - margin, ph - 6, { align: 'right' });
    // CONFIDENTIAL watermark stamp (light, diagonal)
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 225, 235);
    doc.text('CONFIDENTIAL', pw / 2, ph / 2 + 8, { align: 'center', angle: 30 });
    doc.setTextColor(0, 0, 0);
  }

  // ── save ──────────────────────────────────────────────────────────────────
  const projectCode = clientInfo?.project_code ? `_${clientInfo.project_code}` : '';
  const clientName  = clientInfo?.client_name  ? `_${clientInfo.client_name.replace(/\s+/g, '-')}` : '';
  doc.save(`Cost_Analysis${projectCode}${clientName}_V${currentVersion}.pdf`);
}
