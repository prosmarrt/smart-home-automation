export type Protocol = 'zigbee' | 'matter' | 'wifi' | 'wired' | 'lan' | 'knx';

export type SwitchType = 'mini' | 'touch' | 'shutter';

export type SwitchGang = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';

export type CameraType = 'indoor' | 'outdoor';

export type CameraResolution = '2mp' | '3mp' | '4mp' | '6mp';

export type HDDCapacity = '1tb' | '2tb' | '4tb';

export type MemoryCardCapacity = '64gb' | '128gb' | '256gb' | '512gb' | '1tb';

export type NVRChannels = '4ch' | '8ch' | '16ch';

export type SwitchPortCount = '4' | '8' | '16' | '24';

export type NetworkSwitchType = 'poe' | 'standard';

export type IntercomType = 'doorbell' | 'indoor_station';

export type DeviceCategory = 
  | 'mini_switch'
  | 'touch_switch'
  | 'shutter_switch'
  | 'mini_shutter_switch'
  | 'smart_shutter_switch'
  | 'touch_shutter_switch'
  | 'curtain_switch'
  | 'curtain_motor'
  | 'curtain_rail'
  | 'roller_blind_motor'
  | 'smart_plug'
  | 'ir_remote'
  | 'gas_sensor'
  | 'water_leak_sensor'
  | 'motion_sensor'
  | 'presence_sensor'
  | 'smoke_sensor'
  | 'gas_valve'
  | 'water_valve'
  | 'intercom'
  | 'camera'
  | 'wifi_camera'
  | 'smart_lock'
  | 'zigbee_hub'
  | 'matter_hub'
  | 'access_point'
  | 'repeater'
  | 'mesh_wifi'
  | 'network_switch'
  | 'cat6_cable'
  | 'bracket'
  | 'nvr'
  | 'hdd'
  | 'memory_card'
  | 'central_control'
  | 'cctv_security'
  | 'networking'
  | 'voice_assistant'
  | 'custom_device'
  | (string & {});

export type WiFiCameraBrand = 'ezvis' | 'tapo' | 'tenda' | 'custom';

export type SmartLockBrand = 'lezn' | 'philips' | 'emaks_prime' | 'other' | 'custom';

export interface Room {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Device {
  id: string;
  user_id: string;
  room_id: string | null;
  category: DeviceCategory;
  protocol: Protocol | null;
  quantity: number;
  unit_price: number;
  vat_rate: number;
  gang?: SwitchGang;
  camera_type?: CameraType;
  camera_resolution?: CameraResolution;
  mesh_model?: string;
  port_count?: number;
  switch_type?: NetworkSwitchType;
  ir_devices?: string[];
  hdd_capacity?: string;
  memory_card_capacity?: string;
  nvr_channels?: string;
  cable_length?: number;
  intercom_type?: IntercomType;
  custom_name?: string;
  custom_description?: string;
  brand?: string;
  model?: string;
  device_name?: string;
  config?: Record<string, unknown>;
  commissioning_distributed?: number;
  installation_distributed?: number;
  installation_note?: string;
  cost_price?: number;
  created_at: string;
  updated_at: string;
}

export interface DeviceSummary {
  totalDevices: number;
  totalSwitches: number;
  totalSensors: number;
  protocolBreakdown: {
    zigbee: number;
    matter: number;
    wifi: number;
  };
  categoryTotals: {
    [key in DeviceCategory]?: number;
  };
  roomDeviceCounts: {
    [roomId: string]: number;
  };
}

export interface ClientInfo {
  id: string;
  client_name: string;
  address: string | null;
  phone_number: string | null;
  project_code: string;
  last_amendment_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DevicePrice {
  id: string;
  category: DeviceCategory;
  protocol?: Protocol;
  gang?: SwitchGang;
  intercom_type?: IntercomType;
  camera_resolution?: CameraResolution;
  camera_type?: CameraType;
  nvr_channels?: NVRChannels;
  hdd_capacity?: HDDCapacity;
  switch_type?: NetworkSwitchType;
  switch_ports?: SwitchPortCount;
  brand?: string;
  model?: string;
  device_name?: string;
  description?: string;
  notes?: string;
  unit_price: number;
  cost_price: number;
  pending_price?: number;
  pending_approval: boolean;
  price_change_requested_by?: string;
  price_change_requested_at?: string;
  created_at: string;
  updated_at: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface PriceApproval {
  id: string;
  device_price_id: string;
  device_name: string;
  device_category: string;
  old_price: number;
  new_price: number;
  requested_by: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  status: ApprovalStatus;
  reason: string | null;
  approval_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceTemplate {
  id: string;
  name: string;
  category: string;
  description: string | null;
  default_protocol: Protocol | null;
  brand: string | null;
  supports_gangs: boolean;
  supports_ports: boolean;
  supports_capacity: boolean;
  gang_options: string[] | null;
  port_options: string[] | null;
  capacity_options: string[] | null;
  default_unit_price: number;
  gang_prices: Record<string, number> | null;
  port_prices: Record<string, number> | null;
  capacity_prices: Record<string, number> | null;
  is_system: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'user' | 'admin';

export type PriceChangeType = 'update' | 'revert' | 'apply_increase' | 'ignore_update' | 'initial';

export interface PriceHistory {
  id: string;
  device_price_id: string | null;
  quotation_id: string | null;
  device_name: string;
  device_category: string;
  old_price: number;
  new_price: number;
  change_type: PriceChangeType;
  change_reason: string | null;
  changed_by: string | null;
  changed_at: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  role: UserRole;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  suspended: boolean;
  suspended_by: string | null;
  suspended_at: string | null;
  declined: boolean;
  declined_by: string | null;
  declined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VATSettings {
  id: string;
  user_id: string;
  vat_percentage: number;
  created_at: string;
  updated_at: string;
}

export type DiscountType = 'percentage' | 'fixed';

export interface CommissioningInstallation {
  id: string;
  user_id: string;
  commissioning_fee: number;
  visit_fee: number;
  installation_fee: number;
  commissioning_notes: string | null;
  installation_notes: string | null;
  estimated_days: number;
  technicians_required: number;
  discount_type: DiscountType | null;
  discount_value: number;
  created_at: string;
  updated_at: string;
}

export type QuotationStatus = 'Draft' | 'Approved' | 'Pipeline' | 'Declined' | 'Invoiced' | 'Partially Paid' | 'Fully Paid';

/**
 * Revenue-eligible statuses: only these are included in financial calculations.
 * - Approved: pricing confirmed, NOT included in revenue (not yet operational)
 * - Pipeline: previously Approved, moving forward in sales; excluded from financial reporting
 * - Declined: quotation rejected / no longer viable; excluded from all financial reporting
 */
export const REVENUE_STATUSES: QuotationStatus[] = ['Invoiced', 'Partially Paid'];
export const NON_REVENUE_STATUSES: QuotationStatus[] = ['Draft', 'Approved', 'Pipeline', 'Declined'];

/** Statuses that originate from an Approved quotation and affect revenue exclusion */
export const APPROVED_OUTCOMES: QuotationStatus[] = ['Pipeline', 'Declined'];

export interface QuotationStatusAudit {
  id: string;
  quotation_id: string;
  changed_by: string | null;
  from_status: string | null;
  to_status: string;
  notes: string | null;
  created_at: string;
}

export type PaymentMethod = 'InstaPay' | 'Visa' | 'Cash';

export type QuotationLanguage = 'en' | 'ar';

export interface Quotation {
  id: string;
  user_id: string;
  project_code: string;
  client_name: string | null;
  client_address: string | null;
  client_phone: string | null;
  global_protocol: string | null;
  vat_percentage: number;
  rooms_data: Room[];
  devices_data: Device[];
  commissioning_price: number;
  visit_price: number;
  installation_price: number;
  total_amount: number;
  current_version: number;
  client_approval: boolean;
  approval_date: string | null;
  installation_date: string | null;
  warranty_start_date: string | null;
  warranty_end_date: string | null;
  status: QuotationStatus;
  is_invoice: boolean;
  invoice_number: string | null;
  total_paid: number;
  remaining_balance: number;
  language: QuotationLanguage;
  is_editable: boolean;
  last_edited_by: string | null;
  last_edited_at: string | null;
  last_amendment_date: string | null;
  discount_type: DiscountType | null;
  discount_value: number;
  price_snapshot_date: string | null;
  pending_price_update: boolean;
  update_ignored_at: string | null;
  update_applied_at: string | null;
  update_ignored_by: string | null;
  update_applied_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuotationVersion {
  id: string;
  quotation_id: string;
  version_number: number;
  project_code: string;
  client_name: string | null;
  client_address: string | null;
  client_phone: string | null;
  global_protocol: string | null;
  vat_percentage: number;
  rooms_data: Room[];
  devices_data: Device[];
  commissioning_price: number;
  visit_price: number;
  installation_price: number;
  total_amount: number;
  discount_type: DiscountType | null;
  discount_value: number;
  client_approval: boolean;
  approval_date: string | null;
  installation_date: string | null;
  last_edited_by: string | null;
  last_edited_at: string | null;
  last_amendment_date: string | null;
  created_at: string;
  editor_email?: string | null;
  editor_username?: string | null;
}

export interface Payment {
  id: string;
  quotation_id: string;
  amount: number;
  payment_date: string;
  payment_method: PaymentMethod;
  cash_received_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoogleOAuthToken {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expiry: string;
  scope: string;
  created_at: string;
  updated_at: string;
}

export type BackupType = 'manual' | 'auto' | 'scheduled';
export type BackupStatus = 'pending' | 'success' | 'failed';

export interface BackupHistory {
  id: string;
  user_id: string;
  quotation_id: string | null;
  backup_type: BackupType;
  status: BackupStatus;
  spreadsheet_id: string | null;
  sheet_name: string | null;
  error_message: string | null;
  backed_up_at: string;
  created_at: string;
}

export interface CategorySetting {
  id: string;
  category: string;
  display_label: string;
  created_at: string;
  updated_at: string;
}
