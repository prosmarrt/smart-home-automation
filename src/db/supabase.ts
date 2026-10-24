import { createClient } from "@supabase/supabase-js";

// Configure these in the local environment (.env.local) and in your hosting provider.
// Do not put a Supabase secret/service_role key in frontend code.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment.",
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
