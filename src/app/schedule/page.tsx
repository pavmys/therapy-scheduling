import Link from "next/link";
import { redirect } from "next/navigation";
import { StaffNav } from "@/app/staff-nav";
import { ActionMessage } from "@/components/ui/action-message";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { getCurrentUser, isStaffRole } from "@/lib/auth";
import { loadTherapistWeek } from "@/lib/schedule/load";
import { addDays, formatPracticeDateTime, formatPracticeTime, isPracticeDate, practiceToday } from "@/lib/time";

const WEEKDAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const navLink = buttonVariants({ variant: "ghost", size: "sm" });

// Тижневий розклад терапевта: лише власні слоти, утримання й сеанси, пн–нд, перемикання тижнів
// (AC-HOLD-09, AC-HOLD-21, AC-HOLD-30, AC-HOLD-31).
export default async function SchedulePage({ searchParams }: PageProps<"/schedule">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (isStaffRole(user.role)) redirect("/slots");
  if (user.role !== "therapist") redirect("/");

  const { week: weekParam } = await searchParams;
  const now = new Date();
  const date = typeof weekParam === "string" && isPracticeDate(weekParam) ? weekParam : practiceToday(now);
  const { week, days, clientName, error } = await loadTherapistWeek(user.supabase, user.id, date, now);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <StaffNav email={user.email} title="My schedule" role="therapist" />

      <div className="flex items-center justify-between text-sm">
        <Link href={`/schedule?week=${addDays(week.monday, -7)}`} className={navLink}>
          ← Previous week
        </Link>
        <span className="font-medium tabular-nums" data-testid="week-range">
          {week.monday} – {week.sunday}
        </span>
        <Link href={`/schedule?week=${addDays(week.monday, 7)}`} className={navLink}>
          Next week →
        </Link>
      </div>

      {error ? (
        <ActionMessage ok={false} message="Could not load the schedule. Try again." />
      ) : (
        <div className="flex flex-col gap-5">
          {days.map((day, i) => (
            <section key={day.date} className="flex flex-col gap-2">
              <h2 className="font-heading text-sm font-semibold tabular-nums">
                {WEEKDAY[i]} {day.date}
              </h2>
              {day.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">No slots.</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border bg-card px-4">
                  {day.items.map(({ slot, status, hold }) => (
                    <li key={slot.id} className="flex flex-wrap items-center gap-4 py-2 text-sm" data-status={status}>
                      <span className="w-28 whitespace-nowrap tabular-nums">
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
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
