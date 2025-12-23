import { NextRequest, NextResponse } from "next/server";
import { searchMentionableUsers } from "@/lib/actions/community.action";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ data: [] });
  }

  const result = await searchMentionableUsers(query, 8);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ data: result.data ?? [] });
}
