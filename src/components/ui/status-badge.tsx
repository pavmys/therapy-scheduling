import { CircleCheck, CircleDashed, History, Hourglass, TimerOff, type LucideIcon } from "lucide-react";
import { cn } from "cn";

// Статус домену — іконка + підпис + колір (DESIGN.md, розділ 5); підписи — дослівно з вимог PM.
export type DomainStatus = "free" | "held" | "confirmed" | "expired" | "past";

const STATUS: Record<DomainStatus, { label: string; icon: LucideIcon; className: string }> = {
  free: { label: "Free", icon: CircleDashed, className: "bg-status-free text-status-free-foreground" },
  held: { label: "Held", icon: Hourglass, className: "bg-status-held text-status-held-foreground" },
  confirmed: { label: "Confirmed", icon: CircleCheck, className: "bg-status-confirmed text-status-confirmed-foreground" },
  expired: { label: "Expired", icon: TimerOff, className: "bg-status-expired text-status-expired-foreground" },
  past: { label: "Past", icon: History, className: "bg-status-past text-status-past-foreground" },
};

function StatusBadge({ status, className }: { status: DomainStatus; className?: string }) {
  const { label, icon: Icon, className: tone } = STATUS[status];
  return (
    <span
      data-slot="status-badge"
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center gap-1 rounded-full px-2 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}

export { StatusBadge };
