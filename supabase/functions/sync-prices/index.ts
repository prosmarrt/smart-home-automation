import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Expected payload: array of device_prices
    const updates = await req.json();

    if (!Array.isArray(updates)) {
      throw new Error("Payload must be an array of price updates");
    }

    // Process updates
    const now = new Date().toISOString();
    const results = [];
    const errors = [];

    for (const item of updates) {
      if (!item.external_id) {
        errors.push({ item, error: "Missing external_id" });
        continue;
      }

      // Check if item exists by external_id
      const { data: existing, error: findError } = await supabase
        .from("device_prices")
        .select("id")
        .eq("external_id", item.external_id)
        .single();

      if (findError && findError.code !== "PGRST116") {
        errors.push({ item, error: findError.message });
        continue;
      }

      if (existing) {
        // Update
        const { error: updateError } = await supabase
          .from("device_prices")
          .update({
            unit_price: item.unit_price,
            cost_price: item.cost_price,
            category: item.category,
            protocol: item.protocol,
            gang: item.gang,
            camera_resolution: item.camera_resolution,
            camera_type: item.camera_type,
            nvr_channels: item.nvr_channels,
            hdd_capacity: item.hdd_capacity,
            intercom_type: item.intercom_type,
            switch_type: item.switch_type,
            switch_ports: item.switch_ports,
            last_sync_at: now,
          })
          .eq("id", existing.id);

        if (updateError) {
          errors.push({ item, error: updateError.message });
        } else {
          results.push({ external_id: item.external_id, status: "updated" });
        }
      } else {
        // Insert
        const { error: insertError } = await supabase
          .from("device_prices")
          .insert({
            external_id: item.external_id,
            unit_price: item.unit_price,
            cost_price: item.cost_price,
            category: item.category,
            protocol: item.protocol,
            gang: item.gang,
            camera_resolution: item.camera_resolution,
            camera_type: item.camera_type,
            nvr_channels: item.nvr_channels,
            hdd_capacity: item.hdd_capacity,
            intercom_type: item.intercom_type,
            switch_type: item.switch_type,
            switch_ports: item.switch_ports,
            last_sync_at: now,
            pending_approval: false,
          });

        if (insertError) {
          errors.push({ item, error: insertError.message });
        } else {
          results.push({ external_id: item.external_id, status: "inserted" });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, errors }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
