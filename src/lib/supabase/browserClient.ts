"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "./env";
import type { Database } from "./types";

let client: SupabaseClient<Database> | undefined;

export function getBrowserSupabaseClient(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false },
    });
  }
  return client;
}
