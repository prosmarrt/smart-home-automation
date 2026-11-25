import * as XLSX from 'xlsx';
import type { DeviceCategory, Protocol, SwitchGang, IntercomType, CameraResolution, CameraType, NVRChannels, HDDCapacity } from '@/types/types';

/**
 * Reader for the PROSMART_SURVEY v1 file exported by prosmart-field.
 * Sheet INFO  : key | value   (format, version, order_no, customer, location, date, notes, smart_style, zigbee_hubs, panels_count)
 * Sheet ITEMS : section | floor | room | item_ar | item_en | qty | unit | catalog_id
 */
export interface SurveyInfo {
  order_no: string;
  customer: string;
  location: string;
  date: string;
  notes: string;
  smart_style: 'wifi' | 'zigbee' | 'panel';
  zigbee_hubs: number;
  panels_count: number;
}
export interface SurveyRow {
  section: 'smart_home' | 'cctv' | 'network';
  floor: string;
  room: string;
  item_ar: string;
  item_en: string;
  qty: number;
  unit: 'pcs' | 'm';
}
export interface ParsedSurvey { info: SurveyInfo; rows: SurveyRow[] }

const str = (v: unknown) => (v == null ? '' : String(v).trim());

export async function parseSurveyFile(file: File): Promise<ParsedSurvey> {
  const wb = XLSX.read(await file.arrayBuffer());
  const infoWs = wb.Sheets['INFO'];
  const itemsWs = wb.Sheets['ITEMS'];
  if (!infoWs || !itemsWs) throw new Error('الملف مش بصيغة معاينة PROSMART (مفيش شيت INFO / ITEMS). استخدم زر "ملف للمقايسة" من تطبيق prosmart-field.');

  const kv: Record<string, string> = {};
  XLSX.utils.sheet_to_json<Record<string, unknown>>(infoWs, { defval: '' }).forEach((r) => { kv[str(r.key)] = str(r.value); });
  if (kv.format !== 'PROSMART_SURVEY') throw new Error('الملف مش بصيغة PROSMART_SURVEY.');
  if (Number(kv.version) > 1) throw new Error('نسخة الملف أحدث من اللي النظام بيدعمه — حدّث smart-home-automation.');

  const style = kv.smart_style === 'zigbee' || kv.smart_style === 'panel' ? kv.smart_style : 'wifi';
  const info: SurveyInfo = {
    order_no: kv.order_no ?? '',
    customer: kv.customer ?? '',
    location: kv.location ?? '',
    date: kv.date ?? '',
    notes: kv.notes ?? '',
    smart_style: style,
    zigbee_hubs: Number(kv.zigbee_hubs) || 0,
    panels_count: Number(kv.panels_count) || 0,
  };

  const rows: SurveyRow[] = XLSX.utils
    .sheet_to_json<Record<string, unknown>>(itemsWs, { defval: '' })
    .map((r) => ({
      section: (['smart_home', 'cctv', 'network'].includes(str(r.section)) ? str(r.section) : 'smart_home') as SurveyRow['section'],
      floor: str(r.floor),
      room: str(r.room),
      item_ar: str(r.item_ar),
      item_en: str(r.item_en),
      qty: Number(r.qty) || 0,
      unit: (str(r.unit) === 'm' ? 'm' : 'pcs') as 'pcs' | 'm',
    }))
    .filter((r) => r.item_ar && r.qty > 0);
  return { info, rows };
}

export interface DeviceSpec {
  category: DeviceCategory;
  protocol: Protocol | null;
  gang?: SwitchGang;
  intercom_type?: IntercomType;
  camera_type?: CameraType;
  camera_resolution?: CameraResolution;
  nvr_channels?: NVRChannels;
  hdd_capacity?: HDDCapacity;
  custom_name?: string; // set when there is no matching category → added as a custom device
}

const STYLE_PROTOCOL: Record<SurveyInfo['smart_style'], Protocol> = { wifi: 'wifi', zigbee: 'zigbee', panel: 'knx' };

// Smart-home survey items → device category (protocol comes from the survey's smart_style)
const SMART_MAP: [RegExp, DeviceCategory][] = [
  [/سمارت شاتر/, 'smart_shutter_switch'],
  [/موتور ستارة/, 'curtain_motor'],
  [/موتور رول/, 'roller_blind_motor'],
  [/حساس تواجد/, 'presence_sensor'],
  [/حساس حركة/, 'motion_sensor'],
  [/حساس غاز/, 'gas_sensor'],
  [/حساس مياه/, 'water_leak_sensor'],
  [/حساس دخان/, 'smoke_sensor'],
  [/سمارت لوك/, 'smart_lock'],
  [/سمارت بلج/, 'smart_plug'],
  [/ريموت IR/i, 'ir_remote'],
  [/محبس مياه/, 'water_valve'],
  [/محبس غاز/, 'gas_valve'],
  [/جيت واي|هب زيجبي/, 'zigbee_hub'],
  [/شاشة تحكم مركزية/, 'central_control'],
];

export function mapRow(r: SurveyRow, info: SurveyInfo): DeviceSpec {
  const name = r.item_ar;
  const custom = (): DeviceSpec => ({ category: 'custom_device', protocol: null, custom_name: r.item_en && r.item_en !== name ? `${name} / ${r.item_en}` : name });

  if (r.section === 'smart_home') {
    const protocol = STYLE_PROTOCOL[info.smart_style];
    const touch = name.match(/^تاتش سويتش (\d) خط/);
    if (touch) return { category: 'touch_switch', protocol, gang: touch[1] as SwitchGang };
    if (/جرس فيديو/.test(name)) return { category: 'intercom', protocol: 'wired', intercom_type: 'doorbell' };
    const hit = SMART_MAP.find(([re]) => re.test(name));
    if (hit) return { category: hit[1], protocol: hit[1] === 'zigbee_hub' ? 'zigbee' : protocol };
    return custom();
  }
  if (r.section === 'cctv') {
    const nvr = name.match(/^NVR (\d+) /);
    if (nvr && ['4', '8', '16'].includes(nvr[1])) return { category: 'nvr', protocol: null, nvr_channels: `${nvr[1]}ch` as NVRChannels };
    const cam = name.match(/^كاميرا (\d)MP/);
    if (cam && ['2', '3', '4', '6'].includes(cam[1])) return { category: 'camera', protocol: 'lan', camera_resolution: `${cam[1]}mp` as CameraResolution };
    const hdd = name.match(/^هارد (\d)TB/);
    if (hdd && ['1', '2', '4'].includes(hdd[1])) return { category: 'hdd', protocol: null, hdd_capacity: `${hdd[1]}tb` as HDDCapacity };
  }
  return custom(); // everything else (cables, racks, routers, 6TB+ HDDs, …) is added as a custom device, price 0 → fill in later
}

/** Room key used to group rows: same floor + room name in the same section → one room. */
export const roomKey = (r: SurveyRow) => `${r.section}|${r.floor}|${r.room}`;
const SECTION_LABEL = { smart_home: 'Smart Home', cctv: 'CCTV', network: 'Network' } as const;
export function roomLabel(r: SurveyRow): string {
  const base = r.room || 'Room';
  const withFloor = r.floor ? `${base} (${r.floor})` : base;
  return r.section === 'smart_home' ? withFloor : `${withFloor} — ${SECTION_LABEL[r.section]}`;
}
