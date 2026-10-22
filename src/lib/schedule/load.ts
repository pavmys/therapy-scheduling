import type { SupabaseClient } from "@supabase/supabase-js";
import { therapistWeek } from "@/lib/holds/status";
import type { Database } from "@/lib/supabase/database.types";
import { practiceWeekRange } from "@/lib/time";

// Дані тижневого розкладу терапевта. RLS і так віддає терапевту лише його слоти, утримання й
// клієнтів (AC-HOLD-09); фільтр therapist_id тут — захист у глибину (design.md impl-hold, D4).
export async function loadTherapistWeek(
  supabase: SupabaseClient<Database>,
  therapistId: string,
  date: string,
  now: Date,
) {
  const week = practiceWeekRange(date);
  const slots = await supabase
    .from("slots")
    .select("id, starts_at, ends_at")
    .eq("therapist_id", therapistId)
    .gte("starts_at", week.start.toISOString())
    .lt("starts_at", week.end.toISOString())
    .order("starts_at");

  const slotIds = (slots.data ?? []).map((s) => s.id);
  const holds = slotIds.length
    ? await supabase
        .from("holds")
        .select("id, slot_id, client_id, created_at, expires_at, confirmed_at")
        .in("slot_id", slotIds)
    : { data: [], error: null };

  const days = therapistWeek(slots.data ?? [], holds.data ?? [], week.monday, now);
  const clientIds = [...new Set(days.flatMap((d) => d.items.flatMap((i) => (i.hold ? [i.hold.client_id] : []))))];
  const clients = clientIds.length
    ? await supabase.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [], error: null };

  return {
    week,
    days,
    clientName: new Map((clients.data ?? []).map((c) => [c.id, c.full_name])),
    error: slots.error || holds.error || clients.error,
  };
}
