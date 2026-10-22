// Статуси утримань і слотів (design.md impl-hold, D2, D6). Статус не зберігається в базі,
// а обчислюється з часу створення, підтвердження й поточного часу `now` — тому прострочення
// не потребує фонової задачі. Рішення про запис приймає лише база (hold_slot); тут — показ.
import { NO_FREE_SLOTS_MESSAGE } from "./messages";

export type HoldStatus = "held" | "confirmed" | "expired";
export type SlotStatus = "free" | "held" | "confirmed" | "past";

export type SlotRow = { id: string; starts_at: string; ends_at: string };
export type HoldRow = {
  id: string;
  slot_id: string;
  client_id: string;
  created_at: string;
  expires_at: string;
  confirmed_at: string | null;
};

export const SLOT_STATUS_LABEL: Record<SlotStatus, string> = {
  free: "Free",
  held: "Held",
  confirmed: "Confirmed",
  past: "Past",
};

export const HOLD_STATUS_LABEL: Record<HoldStatus, string> = {
  held: "Held",
  confirmed: "Confirmed",
  expired: "Expired",
};

const ms = (iso: string) => new Date(iso).getTime();

// «Confirmed» — підтверджено; «Held» — ще не минуло 24 години; інакше «Expired» (AC-HOLD-05, AC-HOLD-06).
export function holdStatus(hold: HoldRow, now: Date): HoldStatus {
  if (hold.confirmed_at) return "confirmed";
  return now.getTime() < ms(hold.expires_at) ? "held" : "expired";
}

// Активне утримання чи сеанс слоту: у слоті їх не більше одного (припущення PM).
export function activeHold(slotId: string, holds: HoldRow[], now: Date): HoldRow | undefined {
  return holds.find((h) => h.slot_id === slotId && holdStatus(h, now) !== "expired");
}

// Слот, що вже почався (з моменту початку включно), без активного утримання чи сеансу — «Past»;
// сеанс лишається «Confirmed», активне утримання — «Held» до прострочення (AC-HOLD-01, AC-HOLD-32).
export function slotStatus(slot: SlotRow, holds: HoldRow[], now: Date): SlotStatus {
  const hold = activeHold(slot.id, holds, now);
  if (hold) return holdStatus(hold, now) === "confirmed" ? "confirmed" : "held";
  return now.getTime() >= ms(slot.starts_at) ? "past" : "free";
}

export type DaySlot = { slot: SlotRow; status: SlotStatus; hold?: HoldRow };

// Слоти дня з їхніми статусами; якщо вільних немає — повідомлення PM над списком (AC-HOLD-18, -24, -33).
export function dayView(slots: SlotRow[], holds: HoldRow[], now: Date) {
  const items: DaySlot[] = [...slots]
    .sort((a, b) => ms(a.starts_at) - ms(b.starts_at))
    .map((slot) => ({ slot, status: slotStatus(slot, holds, now), hold: activeHold(slot.id, holds, now) }));
  const noFreeSlots = !items.some((i) => i.status === "free");
  return { items, message: noFreeSlots ? NO_FREE_SLOTS_MESSAGE : null };
}
