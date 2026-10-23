import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { HOLD_STATUS_LABEL, holdsList } from "@/lib/holds/status";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { formatPracticeDateTime, formatPracticeTime } from "@/lib/time";
import { ConfirmForm } from "./confirm-form";

const HOLD_COLUMNS = "id, slot_id, client_id, created_at, expires_at, confirmed_at, slot:slots!inner(id, therapist_id, starts_at, ends_at)";

// Список утримань «кому зателефонувати» (AC-HOLD-38): «Held» і «Expired» до початку слоту, усі терапевти,
// за часом слоту від найближчого; «Held» можна підтвердити, коли клієнт погодився.
export default async function HoldsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaffRole(user.role)) redirect("/");
  const { supabase } = user;

  const now = new Date();
  const nowIso = now.toISOString();
  // Лише рядки, які можуть потрапити в список: непідтверджені й або ще «Held», або прострочені
  // з майбутнім слотом. Минулі прострочені утримання не накопичуються у вибірці.
  const [held, expired, therapists] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("holds")
        .select(HOLD_COLUMNS)
        .is("confirmed_at", null)
        .gt("expires_at", nowIso)
        .order("id")
        .range(from, to),
    ),
    fetchAll((from, to) =>
      supabase
        .from("holds")
        .select(HOLD_COLUMNS)
        .is("confirmed_at", null)
        .lte("expires_at", nowIso)
        .gt("slots.starts_at", nowIso)
        .order("id")
        .range(from, to),
    ),
    supabase.from("profiles").select("id, full_name, email").eq("role", "therapist"),
  ]);

  const rows = [...(held.data ?? []), ...(expired.data ?? [])];
  // Повторне утримання, яке вже підтвердили, теж приховує старе «Expired» того самого клієнта на цьому
  // слоті (AC-HOLD-37): підтверджені рядки лише для слотів прострочених утримань, у списку не показуються.
  const expiredSlotIds = [...new Set((expired.data ?? []).map((h) => h.slot_id))];
  const reheldConfirmed = expiredSlotIds.length
    ? await supabase
        .from("holds")
        .select("id, slot_id, client_id, created_at, expires_at, confirmed_at")
        .in("slot_id", expiredSlotIds)
        .not("confirmed_at", "is", null)
    : { data: [], error: null };
  const clientIds = [...new Set(rows.map((h) => h.client_id))];
  const clients = clientIds.length
    ? await supabase.from("clients").select("id, full_name").in("id", clientIds)
    : { data: [] as { id: string; full_name: string }[], error: null };

  const error = held.error || expired.error || reheldConfirmed.error || therapists.error || clients.error;
  const slots = rows.map((h) => h.slot);
  const items = holdsList([...rows, ...(reheldConfirmed.data ?? [])], slots, now);
  const clientName = new Map((clients.data ?? []).map((c) => [c.id, c.full_name]));
  const therapistName = new Map((therapists.data ?? []).map((t) => [t.id, t.full_name ?? t.email]));
  const slotOf = new Map(rows.map((h) => [h.id, h.slot]));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <StaffNav email={user.email} title="Holds" />

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          Could not load holds. Try again.
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-zinc-500">No holds waiting for a decision.</p>
      ) : (
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800" data-testid="hold-list">
          {items.map(({ hold, status }) => {
            const slot = slotOf.get(hold.id)!;
            return (
              <li key={hold.id} className="flex flex-wrap items-center gap-4 py-3 text-sm" data-status={status}>
                <span className="w-52 whitespace-nowrap font-mono">
                  {formatPracticeDateTime(new Date(slot.starts_at))}–{formatPracticeTime(new Date(slot.ends_at))}
                </span>
                <span className="w-32">{therapistName.get(slot.therapist_id) ?? "—"}</span>
                <span className="w-36">{clientName.get(hold.client_id) ?? "—"}</span>
                <span className="w-20">{HOLD_STATUS_LABEL[status]}</span>
                {status === "held" ? (
                  <>
                    <span className="text-zinc-500">Held until {formatPracticeDateTime(new Date(hold.expires_at))}</span>
                    <ConfirmForm holdId={hold.id} />
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
