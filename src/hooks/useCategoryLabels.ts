import { useState, useEffect, useCallback } from 'react';
import { categorySettingsApi } from '@/db/api';
import type { DeviceCategory } from '@/types/types';

// Default labels as fallback
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

export function useCategoryLabels() {
  const [labels, setLabels] = useState<Record<string, string>>(DEFAULT_LABELS);
  const [loading, setLoading] = useState(true);

  const fetchLabels = useCallback(async () => {
    try {
      setLoading(true);
      const dbLabels = await categorySettingsApi.getAll();
      setLabels(prev => ({ ...prev, ...dbLabels }));
    } catch (error) {
      console.error('Error fetching category labels:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const getLabel = useCallback((category: string) => {
    return labels[category] || DEFAULT_LABELS[category] || category;
  }, [labels]);

  const updateLabel = async (category: string, label: string) => {
    await categorySettingsApi.update(category, label);
    setLabels(prev => ({ ...prev, [category]: label }));
  };

  const updateBulk = async (updates: Array<{ category: string, display_label: string }>) => {
    await categorySettingsApi.updateBulk(updates);
    const newLabels = { ...labels };
    updates.forEach(u => {
      newLabels[u.category] = u.display_label;
    });
    setLabels(newLabels);
  };

  return {
    labels,
    loading,
    getLabel,
    updateLabel,
    updateBulk,
    refresh: fetchLabels
  };
}
