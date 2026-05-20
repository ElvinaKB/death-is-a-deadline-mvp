import { createClient } from "@supabase/supabase-js";
import { PREVIEW_BYPASS } from "../config/previewBypass";

const supabaseUrl =
  import.meta.env.VITE_APP_SUPABASE_URL ||
  (PREVIEW_BYPASS ? "https://placeholder.supabase.co" : "");
const supabaseAnonKey =
  import.meta.env.VITE_APP_SUPABASE_ANON_KEY ||
  (PREVIEW_BYPASS
    ? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
    : "");

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
