"use server";

import { adminSupabase } from "@/lib/supabase/server";
import { syncReputationFromXP } from "@/lib/services/gamification.service";

const DEFAULT_SYNC_LIMIT = 500;

export async function syncLeaderboardReputation(limit: number = DEFAULT_SYNC_LIMIT): Promise<{
  data: { processed: number } | null;
  error: string | null;
}> {
  try {
    const { data, error } = await adminSupabase
      .from("user_xp")
      .select("userId, totalXp")
      .order("totalXp", { ascending: false })
      .limit(limit);

    if (error) return { data: null, error: error.message };

    let processed = 0;
    for (const row of data || []) {
      if (!row?.userId) continue;
      await syncReputationFromXP(row.userId, row.totalXp || 0);
      processed += 1;
    }

    return { data: { processed }, error: null };
  } catch (err) {
    console.error("Error syncing leaderboard reputation:", err);
    return { data: null, error: "Failed to sync reputation" };
  }
}
