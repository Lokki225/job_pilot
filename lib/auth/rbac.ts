import "server-only";

import { createClient, adminSupabase } from "@/lib/supabase/server";

export type UserRole = "USER" | "RECRUITER" | "ORGANIZATION" | "ADMIN" | "SUPER_ADMIN";

const ROLE_RANK: Record<UserRole, number> = {
  USER: 0,
  RECRUITER: 0,
  ORGANIZATION: 0,
  ADMIN: 10,
  SUPER_ADMIN: 20,
};

export function hasAtLeastRole(role: UserRole, required: UserRole): boolean {
  return (ROLE_RANK[role] ?? 0) >= (ROLE_RANK[required] ?? 0);
}

export async function getRoleForUserId(userId: string): Promise<UserRole> {
  const { data, error } = await adminSupabase.from("users").select("role").eq("id", userId).maybeSingle();

  if (error) {
    console.error("Error fetching user role:", error);
    return "USER";
  }

  const role = (data as any)?.role;
  if (role === "USER" || role === "RECRUITER" || role === "ORGANIZATION" || role === "ADMIN" || role === "SUPER_ADMIN") {
    return role;
  }

  return "USER";
}

export async function getCurrentUserRole(): Promise<{ userId: string; role: UserRole } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const role = await getRoleForUserId(user.id);
  return { userId: user.id, role };
}

export async function requireAtLeastRole(required: UserRole): Promise<{ userId: string; role: UserRole }> {
  const current = await getCurrentUserRole();
  if (!current) throw new Error("Unauthorized");
  if (!hasAtLeastRole(current.role, required)) throw new Error("Unauthorized");
  return current;
}

export async function requireUserAtLeastRole(userId: string, required: UserRole): Promise<UserRole> {
  const role = await getRoleForUserId(userId);
  if (!hasAtLeastRole(role, required)) throw new Error("Unauthorized");
  return role;
}
