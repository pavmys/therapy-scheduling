import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "scheduler" | "therapist";

// Планувальник і адміністратор мають однакові права в зрізі 1 (AC-HOLD-19).
export function isStaffRole(role: string | null | undefined): boolean {
  return role === "admin" || role === "scheduler";
}

// Поточний користувач для сторінок і server actions; JWT перевіряє getClaims(), не getSession().
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, role")
    .eq("id", claims.sub)
    .maybeSingle();

  return {
    supabase,
    id: claims.sub,
    email: profile?.email ?? claims.email ?? null,
    fullName: profile?.full_name ?? null,
    role: (claims.user_metadata?.role ?? profile?.role ?? null) as AppRole | null,
  };
}
