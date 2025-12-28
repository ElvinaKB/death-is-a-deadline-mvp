import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  import.meta.env.VITE_APP_SUPABASE_URL ||
  "https://rugpmeqhhmbyrlijbkog.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_APP_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
