import { NextResponse } from "next/server";
import { syncLeaderboardReputation } from "@/lib/actions/leaderboard-sync.action";

export async function POST() {
  const result = await syncLeaderboardReputation();
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ data: result.data }, { status: 200 });
}
