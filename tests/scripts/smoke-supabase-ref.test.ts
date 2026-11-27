// Дія з postmortem docs/incidents/2026-11-27-staging-bad-supabase-url.md → перевірка: smoke червоніє, коли деплой
// дивиться не в ту базу Supabase, і зеленіє на виправленому стані.
import { describe, expect, it } from "vitest";
import { supabaseRefMismatch } from "../../scripts/lib/supabase-ref.mjs";

const STAGING = "hybpxpocqbxrkedomsbe";

describe("supabaseRefMismatch (smoke)", () => {
  it("зламаний стан дрілу: ref з одним хибним символом — помилка з обома ref", () => {
    const msg = supabaseRefMismatch("hybpxpocqbxrkedomsbX", STAGING);
    expect(msg).toContain("supabaseRef=hybpxpocqbxrkedomsbX");
    expect(msg).toContain(`очікувався ${STAGING}`);
    expect(msg).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("виправлений стан: ref збігається — помилки немає", () => {
    expect(supabaseRefMismatch(STAGING, STAGING)).toBeNull();
  });

  it("staging дивиться в прод-базу — теж помилка", () => {
    expect(supabaseRefMismatch("uthmwvubjxghsoimeeje", STAGING)).not.toBeNull();
  });

  it("немає ref у health — помилка, а не тихий успіх", () => {
    expect(supabaseRefMismatch(undefined, STAGING)).toContain("supabaseRef=?");
  });

  it("очікуваний ref не задано (локальний чи ручний запуск) — перевірка не діє", () => {
    expect(supabaseRefMismatch("будь-що", "")).toBeNull();
    expect(supabaseRefMismatch("будь-що", undefined)).toBeNull();
  });
});
