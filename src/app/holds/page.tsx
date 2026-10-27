import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { staffOnlyPage } from "@/app/staff-only";
import { accessFor } from "@/lib/access";
import { getCurrentUser } from "@/lib/auth";
import { ActionMessage } from "@/components/ui/action-message";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { holdsList } from "@/lib/holds/status";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { formatPracticeDateTime, formatPracticeTime } from "@/lib/time";
import { ConfirmForm } from "./confirm-form";

const HOLD_COLUMNS = "id, slot_id, client_id, created_at, expires_at, confirmed_at, slot:slots!inner(id, therapist_id, starts_at, ends_at)";

// Список утримань «кому зателефонувати» (AC-HOLD-38): «Held» і «Expired» до початку слоту (AC-HOLD-29, -42),
// усі терапевти, за часом слоту від найближчого; «Held» можна підтвердити, коли клієнт погодився.
// Терапевт за прямим посиланням бачить лише відмову (AC-HOLD-44).
export default async function HoldsPage() {
  const user = await getCurrentUser();
  const access = accessFor(user);
  if (access === "login") redirect("/login");
  if (access === "no-role") redirect("/");
  if (access === "therapist") return staffOnlyPage(user!.email, "Holds");
  const { supabase, email } = user!;

  const now = new Date();
  const nowIso = now.toISOString();
  // Лише рядки, які можуть потрапити в список: непідтверджені, зі слотом, що ще не почався, і або ще «Held»,
  // або прострочені. Минулі утримання не накопичуються у вибірці; правило списку — holdsList.
  const [held, expired, therapists] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from("holds")
        .select(HOLD_COLUMNS)
        .is("confirmed_at", null)
        .gt("expires_at", nowIso)
        .gt("slots.starts_at", nowIso)
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
      <StaffNav email={email} title="Holds" />

      {error ? (
        <ActionMessage ok={false} message="Could not load holds. Try again." />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No holds waiting for a decision.</p>
      ) : (
        <div className="rounded-lg border bg-card px-2">
          <Table data-testid="hold-list">
            <TableHeader>
              <TableRow>
                <TableHead className="text-muted-foreground">Slot</TableHead>
                <TableHead className="text-muted-foreground">Therapist</TableHead>
                <TableHead className="text-muted-foreground">Client</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(({ hold, status }) => {
                const slot = slotOf.get(hold.id)!;
                return (
                  <TableRow key={hold.id} data-status={status}>
                    <TableCell className="tabular-nums">
                      {formatPracticeDateTime(new Date(slot.starts_at))}–{formatPracticeTime(new Date(slot.ends_at))}
                    </TableCell>
                    <TableCell>{therapistName.get(slot.therapist_id) ?? "—"}</TableCell>
                    <TableCell className="font-medium">{clientName.get(hold.client_id) ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={status} />
                        {status === "held" ? (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            Held until {formatPracticeDateTime(new Date(hold.expires_at))}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {status === "held" ? <ConfirmForm holdId={hold.id} /> : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
