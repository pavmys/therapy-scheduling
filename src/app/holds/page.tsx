import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { HOLD_STATUS_LABEL, holdsList } from "@/lib/holds/status";
import { formatPracticeDateTime, formatPracticeTime } from "@/lib/time";
import { ConfirmForm } from "./confirm-form";

// Список утримань «кому зателефонувати» (Q3): «Held» і «Expired» до початку слоту, усі терапевти,
// за часом слоту від найближчого; «Held» можна підтвердити, коли клієнт погодився.
export default async function HoldsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaffRole(user.role)) redirect("/");
  const { supabase } = user;

  const { data: holds, error } = await supabase
    .from("holds")
    .select("id, slot_id, client_id, created_at, expires_at, confirmed_at")
    .is("confirmed_at", null);

  const slotIds = [...new Set((holds ?? []).map((h) => h.slot_id))];
  const clientIds = [...new Set((holds ?? []).map((h) => h.client_id))];
  const [{ data: slots }, { data: clients }, { data: therapists }] = await Promise.all([
    slotIds.length
      ? supabase.from("slots").select("id, therapist_id, starts_at, ends_at").in("id", slotIds)
      : Promise.resolve({ data: [] as { id: string; therapist_id: string; starts_at: string; ends_at: string }[] }),
    clientIds.length
      ? supabase.from("clients").select("id, full_name").in("id", clientIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    supabase.from("profiles").select("id, full_name, email").eq("role", "therapist"),
  ]);

  const items = holdsList(holds ?? [], slots ?? [], new Date());
  const clientName = new Map((clients ?? []).map((c) => [c.id, c.full_name]));
  const therapistName = new Map((therapists ?? []).map((t) => [t.id, t.full_name ?? t.email]));
  const therapistOf = new Map((slots ?? []).map((s) => [s.id, s.therapist_id]));

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
          {items.map(({ hold, slot, status }) => (
            <li key={hold.id} className="flex flex-wrap items-center gap-4 py-3 text-sm" data-status={status}>
              <span className="w-44 font-mono">
                {formatPracticeDateTime(new Date(slot.starts_at))}–{formatPracticeTime(new Date(slot.ends_at))}
              </span>
              <span className="w-32">{therapistName.get(therapistOf.get(slot.id) ?? "") ?? "—"}</span>
              <span className="w-36">{clientName.get(hold.client_id) ?? "—"}</span>
              <span className="w-20">{HOLD_STATUS_LABEL[status]}</span>
              {status === "held" ? (
                <>
                  <span className="text-zinc-500">Held until {formatPracticeDateTime(new Date(hold.expires_at))}</span>
                  <ConfirmForm holdId={hold.id} />
                </>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
