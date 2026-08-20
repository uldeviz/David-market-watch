import { createClient } from "@supabase/supabase-js";

// Client-side / server-component client: read-only, uses the public anon key.
// RLS policies (see supabase/schema.sql) only allow SELECT for this role.
export function getSupabaseAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Mancano NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY nelle env vars."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

// Server-side only client with the service role key: full read/write.
// Used exclusively by the ingestion script (GitHub Actions), never bundled client-side.
export function getSupabaseService() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Mancano SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY nelle env vars."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
