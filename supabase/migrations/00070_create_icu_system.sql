
-- ── ICU Settings (global rate + minimum) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS icu_settings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icu_rate     numeric(10,2) NOT NULL DEFAULT 250,
  ic_minimum   numeric(10,2) NOT NULL DEFAULT 1500,
  updated_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Seed one default row
INSERT INTO icu_settings (icu_rate, ic_minimum)
SELECT 250, 1500
WHERE NOT EXISTS (SELECT 1 FROM icu_settings);

-- ── ICU Items (per-device-category mapping) ───────────────────────────────
CREATE TABLE IF NOT EXISTS icu_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label         text NOT NULL,
  device_category text NOT NULL,          -- matches Device.category
  gang          text,                     -- optional: '1','2','3','4' for switches
  switch_type   text,                     -- optional: 'mini','touch'
  icu_value     numeric(6,3) NOT NULL,
  pricing_mode  text NOT NULL DEFAULT 'formula'  -- 'formula' | 'fixed'
                  CHECK (pricing_mode IN ('formula','fixed')),
  fixed_price   numeric(10,2),            -- used when pricing_mode = 'fixed'
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS icu_items_updated_at ON icu_items;
CREATE TRIGGER icu_items_updated_at
  BEFORE UPDATE ON icu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS icu_settings_updated_at ON icu_settings;
CREATE TRIGGER icu_settings_updated_at
  BEFORE UPDATE ON icu_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Seed default ICU items ─────────────────────────────────────────────────
INSERT INTO icu_items (label, device_category, gang, switch_type, icu_value, pricing_mode, fixed_price, sort_order) VALUES
  ('1G Mini Switch',      'mini_switch',      '1', 'mini',  1.00,  'formula', NULL,   10),
  ('2G Mini Switch',      'mini_switch',      '2', 'mini',  1.25,  'formula', NULL,   11),
  ('3G Mini Switch',      'mini_switch',      '3', 'mini',  1.50,  'formula', NULL,   12),
  ('4G Mini Switch',      'mini_switch',      '4', 'mini',  1.75,  'formula', NULL,   13),
  ('1G Touch Switch',     'touch_switch',     '1', 'touch', 1.25,  'formula', NULL,   20),
  ('2G Touch Switch',     'touch_switch',     '2', 'touch', 1.50,  'formula', NULL,   21),
  ('3G Touch Switch',     'touch_switch',     '3', 'touch', 1.75,  'formula', NULL,   22),
  ('4G Touch Switch',     'touch_switch',     '4', 'touch', 2.00,  'formula', NULL,   23),
  ('Dimmer Switch',       'shutter_switch',   NULL, NULL,   1.50,  'formula', NULL,   30),
  ('Shutter Switch',      'smart_shutter_switch', NULL, NULL, 1.50, 'formula', NULL,  31),
  ('Curtain Switch',      'curtain_switch',   NULL, NULL,   1.50,  'formula', NULL,   32),
  ('IR Remote',           'ir_remote',        NULL, NULL,   1.00,  'formula', NULL,   40),
  ('Motion Sensor',       'motion_sensor',    NULL, NULL,   0.75,  'formula', NULL,   50),
  ('Presence Sensor',     'presence_sensor',  NULL, NULL,   0.75,  'formula', NULL,   51),
  ('Door/Window Sensor',  'door_window_sensor', NULL, NULL, 0.50,  'formula', NULL,   52),
  ('Water Leak Sensor',   'water_leak_sensor', NULL, NULL,  0.75,  'formula', NULL,   53),
  ('Gas Sensor',          'gas_sensor',       NULL, NULL,   0.75,  'formula', NULL,   54),
  ('Zigbee Hub',          'zigbee_hub',       NULL, NULL,   2.00,  'formula', NULL,   60),
  ('Matter Hub',          'matter_hub',       NULL, NULL,   2.00,  'formula', NULL,   61),
  ('Camera',              'camera',           NULL, NULL,   2.50,  'formula', NULL,   70),
  ('WiFi Camera',         'wifi_camera',      NULL, NULL,   2.50,  'formula', NULL,   71),
  ('Video Intercom',      'intercom',         NULL, NULL,   3.00,  'formula', NULL,   80),
  ('WiFi Access Point',   'access_point',     NULL, NULL,   2.00,  'formula', NULL,   90),
  ('Smart Lock',          'smart_lock',       NULL, NULL,   4.50,  'fixed',   1300,  100)
ON CONFLICT DO NOTHING;

-- ── RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE icu_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE icu_items    ENABLE ROW LEVEL SECURITY;

-- icu_settings: authenticated read, admin write
CREATE POLICY "Auth read icu_settings"   ON icu_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write icu_settings" ON icu_settings FOR UPDATE TO authenticated USING (is_admin(auth.uid()));

-- icu_items: authenticated read, admin full write
CREATE POLICY "Auth read icu_items"   ON icu_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin insert icu_items" ON icu_items FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "Admin update icu_items" ON icu_items FOR UPDATE TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admin delete icu_items" ON icu_items FOR DELETE TO authenticated USING (is_admin(auth.uid()));
