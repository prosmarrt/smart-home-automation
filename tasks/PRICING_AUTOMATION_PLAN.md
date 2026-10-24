# Pricing Automation Implementation Plan

## 1. Pricing Database Verification & Population
### Current Audit Findings
- **Devices missing pricing**: The following categories have devices with `unit_price IS NULL OR unit_price = 0`: `touch_switch`, `gas_sensor`, `access_point`, `gas_valve`, `mini_switch`, `smart_shutter_switch`.
- **Existing schema**: 
  - `devices` table contains instance-specific data.
  - `device_prices` contains canonical reference prices by category, protocol, etc.

### Actions
1. Execute a backfill script to ensure all `devices` correctly inherit base prices from `device_prices`.
2. Generate missing records in `device_prices` where gaps exist.

## 2. Data Source Integration
- **Source API**: Configure an external API integration (e.g., using a supplier API or an internal ERP endpoint) to fetch updated catalog prices.
- **Edge Function Setup**: Deploy a Supabase Edge Function (`sync-pricing`) to run on a schedule (pg_cron). It will:
  - Fetch catalog prices from the Data Source.
  - Map external IDs/SKUs to internal categories and protocols.
  - Upsert pricing details to the `device_prices` table.
- **Accuracy Verification**: Use transactional bounds and threshold checks (e.g., block price changes > 50% without manual approval) during synchronization.

## 3. Device Selection & Mapping
- **Mapping Logic**: Map devices purely by `category`, `protocol`, `gang`, `camera_resolution`, etc.
- **Brand Handling**: Standardize the extraction logic so that `brand` and `model` are stored for indicative/display purposes only and are ignored during price lookup matching.
- **Population**: Trigger a database function or edge function to cascade `device_prices` updates to any active `devices` drafts.

## 4. Custom Device Handling
- **Automated Workflow**:
  1. User adds a `custom_device` via the UI.
  2. The frontend categorizes the device automatically based on keyword matching in its `description` or `device_name`.
  3. A new row in `device_prices` is created specifically for this custom configuration if it differs significantly, marking it with a specific flag (`pending_approval = true`).
  4. Once approved, the custom pricing becomes part of the permanent lookup for similar future items.
- **Validation**: Enforce enum checks so a custom device cannot masquerade as a core category without explicit matching parameters.

## 5. Automation & Maintenance
- **Cron Jobs**: Utilize `pg_cron` in Supabase to run `SELECT sync_pricing_from_api()` nightly.
- **Alerts**: Create a trigger on `device_prices` and `devices` that sets an alert flag if a price is updated to $0 or remains NULL after sync.
- **Auditing**: Create an Admin Dashboard widget summarizing out-of-sync or unpriced devices.
- **Documentation**: All mapping rules between external supplier SKUs and internal category properties are maintained in `database_mappings.md`.
