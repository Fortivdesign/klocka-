import { supabase, supabaseConfigured } from '../supabase';
import { useStore, type SessionRecord } from '../store';

export function isCloudEnabled() { return supabaseConfigured && supabase !== null; }

export async function pushSession(rec: SessionRecord) {
  if (!supabase) return;
  await supabase.from('sessions').upsert({
    id: rec.id,
    user_id: rec.userId,
    start_at: new Date(rec.start).toISOString(),
    end_at: new Date(rec.end).toISOString(),
    clocked_minutes: rec.score.clockedMinutes,
    active_minutes: rec.score.activeMinutes,
    work_minutes: rec.score.workCategoryMinutes,
    fun_minutes: rec.score.funCategoryMinutes,
    focus_factor: rec.score.focusFactor,
    final_score: rec.score.finalScore,
    note: rec.note ?? null,
  });
}

export async function pullSessions(userIds: string[]) {
  if (!supabase) return [];
  const { data } = await supabase
    .from('sessions')
    .select('*')
    .in('user_id', userIds)
    .order('start_at', { ascending: false })
    .limit(500);
  return data ?? [];
}

let subscribed = false;
export function startRealtimeSync() {
  if (!supabase || subscribed) return;
  subscribed = true;
  supabase
    .channel('klocka-sessions')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' }, (payload) => {
      const row = payload.new as Record<string, unknown>;
      const id = row.id as string;
      const existing = useStore.getState().sessions.find((s) => s.id === id);
      if (existing) return;
      useStore.getState().pushToast({
        title: 'Ny session synkad',
        body: `Från cloud: ${row.user_id}`,
        kind: 'info',
      });
    })
    .subscribe();
}

export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error('Supabase är inte konfigurerat');
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function currentSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
