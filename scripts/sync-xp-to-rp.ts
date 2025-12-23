import { adminSupabase } from "../lib/supabase/server";
import { syncReputationFromXP } from "../lib/services/gamification.service";

async function syncAllUsers() {
  console.time("sync-xp-to-rp");
  const batchSize = 100;
  let offset = 0;
  let processed = 0;

  while (true) {
    const { data, error } = await adminSupabase
      .from("user_xp")
      .select("userId, totalXp")
      .order("userId", { ascending: true })
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error("Failed to fetch user_xp batch", error.message);
      break;
    }

    if (!data || data.length === 0) {
      break;
    }

    await Promise.all(
      data.map(async (row: { userId: string | null; totalXp: number | null }) => {
        if (!row?.userId) return;
        const totalXp = row.totalXp || 0;
        await syncReputationFromXP(row.userId, totalXp);
      })
    );

    processed += data.length;
    offset += batchSize;
    console.log(`Synced ${processed} user records...`);
  }

  console.timeEnd("sync-xp-to-rp");
  console.log("XP → RP sync complete.");
}

syncAllUsers()
  .catch((err) => {
    console.error("Unexpected error while syncing XP to RP", err);
  })
  .finally(() => {
    process.exit(0);
  });
