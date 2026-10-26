// Пошук наявного клієнта за частиною імені, email або email опікуна без урахування регістру
// (власне припущення розробника, docs/spec-reading.md; email опікуна — Q6, Sofiia-pm/therapy-scheduling-spec#31). Повертає фільтр PostgREST для .or(…).
//
// Пошуковий рядок шукаємо буквально:
//   1) для ilike екрануємо \, % і _ (escape-символ LIKE за замовчуванням — \), тож john_doe шукає саме «john_doe»;
//   2) * PostgREST сам перетворює на % у шаблоні like/ilike — його прибираємо;
//   3) значення беремо в подвійні лапки PostgREST (кома й дужки всередині не ламають .or(…)),
//      а \ і " у ньому екрануємо зворотною скісною рискою. Апостроф лишається як є (O'Brien).
export function clientSearchFilter(query: string): string | null {
  const term = query.replace(/\*/g, " ").trim().replace(/\s+/g, " ");
  if (!term) return null;
  const likeEscaped = term.replace(/[\\%_]/g, (c) => `\\${c}`);
  const quoted = `"%${likeEscaped.replace(/[\\"]/g, (c) => `\\${c}`)}%"`;
  return `full_name.ilike.${quoted},email.ilike.${quoted},guardian_email.ilike.${quoted}`;
}
