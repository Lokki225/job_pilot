"use server";

import { getCurrentUserRole, hasAtLeastRole, type UserRole } from "@/lib/auth/rbac";

export async function getMyAccess(): Promise<{
  data: { role: UserRole; isAdmin: boolean; isSuperAdmin: boolean } | null;
  error: string | null;
}> {
  try {
    const current = await getCurrentUserRole();
    if (!current) return { data: null, error: "Unauthorized" };

    return {
      data: {
        role: current.role,
        isAdmin: hasAtLeastRole(current.role, "ADMIN"),
        isSuperAdmin: hasAtLeastRole(current.role, "SUPER_ADMIN"),
      },
      error: null,
    };
  } catch (err) {
    console.error("Error getting my access:", err);
    return { data: null, error: "Failed to load access" };
  }
}
