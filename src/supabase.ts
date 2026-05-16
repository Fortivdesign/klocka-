import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_URL ?? '';
const key = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(url && key);

export const supabase: SupabaseClient | null = supabaseConfigured ? createClient(url, key) : null;

export const TABLES = {
  users: 'users',
  clockEvents: 'clock_events',
  sessions: 'sessions',
  samples: 'activity_samples',
  screenshots: 'screenshots',
  weeklyPlans: 'weekly_plans',
  weeklyDeliveries: 'weekly_deliveries',
  awards: 'slacker_awards',
} as const;
