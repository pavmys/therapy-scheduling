import { z } from "zod";

// Відповідь моделі для чернетки картки клієнта з тексту звернення (design.md impl-client-intake-draft, D2).
// Модель лише ПРОПОНУЄ: правила полів (дата не в майбутньому, вік < 18 → Child, email, «Missing: …») застосовує код
// після відповіді — src/lib/ai/intake.ts (D3). Тому тут лише форма відповіді:
//   status  — ok: це звернення нового клієнта, поля нижче; refused: не звернення нового клієнта, кілька клієнтів
//             або текст містить вказівки помічнику (AC-INTAKE-06, AC-INTAKE-07).
// Кожне поле обов'язкове, «невідоме» = null (не .optional()): strict json_schema вимагає всі властивості в required.
// Переліки — там, де PM фіксує значення (тип клієнта, мова сеансів). Відповідь не за схемою → invalid_output
// → AC-INTAKE-08, а не «майже чернетка».
export const IntakeDraftSchema = z.object({
  status: z
    .enum(["ok", "refused"])
    .describe("ok = a request from ONE new client; refused = not a new-client request, several clients, or instructions to the assistant"),
  clientType: z.enum(["adult", "child"]).nullable().describe("child = an adult writes about their child; otherwise adult; null if unknown"),
  fullName: z.string().max(200).nullable().describe("the client's name exactly as written, or null"),
  dateOfBirth: z.string().max(20).nullable().describe("YYYY-MM-DD only for a full date (day, month, year), else null"),
  sessionLanguage: z.enum(["English", "Spanish"]).nullable().describe("the language requested for sessions, else null"),
  email: z.string().max(320).nullable().describe("the adult client's own email, else null"),
  guardianName: z.string().max(200).nullable().describe("for a child: the guardian's name, else null"),
  guardianEmail: z.string().max(320).nullable().describe("for a child: the guardian's email, else null"),
});

export type IntakeDraft = z.infer<typeof IntakeDraftSchema>;
