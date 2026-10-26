import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { clientSearchFilter } from "@/lib/clients/search";
import { ActionMessage } from "@/components/ui/action-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { dayView } from "@/lib/holds/status";
import {
  addDays,
  formatPracticeDateTime,
  formatPracticeTime,
  isPracticeDate,
  practiceDayRange,
  practiceToday,
} from "@/lib/time";
import { HoldForm } from "./hold-form";

const navLink = buttonVariants({ variant: "ghost", size: "sm" });

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

// Слоти терапевта на день зі статусами й утриманням за клієнтом (планувальник і адміністратор).
export default async function SlotsPage({ searchParams }: PageProps<"/slots">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStaffRole(user.role)) redirect("/");
  const { supabase } = user;

  const params = await searchParams;
  const now = new Date();
  const date = isPracticeDate(one(params.date)) ? one(params.date) : practiceToday(now);
  const clientQuery = one(params.client_q);

  const { data: therapists } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("role", "therapist")
    .order("email");
  const therapistId = therapists?.some((t) => t.id === one(params.therapist))
    ? one(params.therapist)
    : (therapists?.[0]?.id ?? "");

  const { start, end } = practiceDayRange(date);
  const { data: slots, error: slotsError } = therapistId
    ? await supabase
        .from("slots")
        .select("id, starts_at, ends_at")
        .eq("therapist_id", therapistId)
        .gte("starts_at", start.toISOString())
        .lt("starts_at", end.toISOString())
        .order("starts_at")
    : { data: [], error: null };

  const slotIds = (slots ?? []).map((s) => s.id);
  const { data: holds, error: holdsError } = slotIds.length
    ? await supabase
        .from("holds")
        .select("id, slot_id, client_id, created_at, expires_at, confirmed_at")
        .in("slot_id", slotIds)
        // Лише сеанси й ще активні утримання: прострочені не впливають на статус і не накопичуються.
        .or(`confirmed_at.not.is.null,expires_at.gt.${now.toISOString()}`)
    : { data: [], error: null };

  const holdClientIds = [...new Set((holds ?? []).map((h) => h.client_id))];
  const { data: holdClients } = holdClientIds.length
    ? await supabase.from("clients").select("id, full_name, email").in("id", holdClientIds)
    : { data: [] };
  const clientName = new Map((holdClients ?? []).map((c) => [c.id, c.full_name]));

  const filter = clientSearchFilter(clientQuery);
  let clientsRequest = supabase.from("clients").select("id, full_name, email").order("full_name").limit(50);
  if (filter) clientsRequest = clientsRequest.or(filter);
  const { data: clients } = await clientsRequest;

  const view = dayView(slots ?? [], holds ?? [], now);
  const loadError = slotsError || holdsError;
  const link = (d: string) =>
    `/slots?${new URLSearchParams({ therapist: therapistId, date: d, ...(clientQuery ? { client_q: clientQuery } : {}) })}`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <StaffNav email={user.email} title="Slots" />

      {/* key: при переході «Previous / Next day» React не скидає defaultValue полів — нова форма на кожен вибір. */}
      <Card>
        <CardContent>
          <form key={`${therapistId}|${date}|${clientQuery}`} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="slots-therapist">Therapist</Label>
              <NativeSelect id="slots-therapist" name="therapist" defaultValue={therapistId}>
                {(therapists ?? []).map((t) => (
                  <NativeSelectOption key={t.id} value={t.id}>
                    {t.full_name ?? t.email}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="slots-date">Day</Label>
              <Input id="slots-date" name="date" type="date" defaultValue={date} className="w-auto tabular-nums" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="slots-client-q">Find a client</Label>
              <Input
                id="slots-client-q"
                name="client_q"
                type="search"
                defaultValue={clientQuery}
                placeholder="Part of name or email"
              />
            </div>
            <Button type="submit" variant="outline">
              Show
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <Link href={link(addDays(date, -1))} className={navLink}>
          ← Previous day
        </Link>
        <span className="font-medium tabular-nums">{date}</span>
        <Link href={link(addDays(date, 1))} className={navLink}>
          Next day →
        </Link>
      </div>

      {loadError ? (
        <ActionMessage ok={false} message="Could not load slots. Try again." />
      ) : (
        <section className="flex flex-col gap-3">
          {view.message ? <p className="text-sm font-medium">{view.message}</p> : null}
          <ul
            className="divide-y divide-border rounded-lg border bg-card px-4 empty:hidden"
            data-testid="slot-list"
          >
            {view.items.map(({ slot, status, hold }) => (
              <li key={slot.id} className="flex flex-wrap items-center gap-4 py-2.5 text-sm" data-status={status}>
                <span className="w-28 tabular-nums">
                  {formatPracticeTime(new Date(slot.starts_at))}–{formatPracticeTime(new Date(slot.ends_at))}
                </span>
                <span className="w-28">
                  <StatusBadge status={status} />
                </span>
                {hold ? <span className="font-medium">{clientName.get(hold.client_id) ?? "—"}</span> : null}
                {status === "held" && hold ? (
                  <span className="text-muted-foreground tabular-nums">
                    Held until {formatPracticeDateTime(new Date(hold.expires_at))}
                  </span>
                ) : null}
                {status === "free" ? <HoldForm slotId={slot.id} clients={clients ?? []} /> : null}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
