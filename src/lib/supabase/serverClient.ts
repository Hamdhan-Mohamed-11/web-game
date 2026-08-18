import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServiceRoleKey, getSupabaseUrl } from "./env";
import type { Database } from "./types";

let client: SupabaseClient<Database> | undefined;

/**
 * Service-role client. Bypasses RLS — only ever call this from server-side
 * route handlers that have already verified the admin session cookie.
 */
export function getServiceSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
      auth: { persistSession: false },
    });
  }
  return client;
}
