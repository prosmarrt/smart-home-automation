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
