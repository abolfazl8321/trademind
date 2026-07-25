import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const hasConfig = Boolean(supabaseUrl && supabaseAnonKey);
const missing = [];

if (!supabaseUrl) {
  missing.push("VITE_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL");
}
if (!supabaseAnonKey) {
  missing.push(
    "VITE_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  );
}

if (!hasConfig) {
  console.warn(`Supabase env vars are missing: ${missing.join(" + ")}`);
}

export const supabase = hasConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;
export const supabaseConfigStatus = { hasConfig, missing };
