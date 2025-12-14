import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/server";

// This endpoint assigns careerTrackId to existing chapters
// Run once to update existing data

export async function POST() {
  try {
    // Get all chapters
    const { data: chapters, error: fetchError } = await adminSupabase
      .from("study_chapters")
      .select("id, title, orderIndex")
      .order("orderIndex");

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({ message: "No chapters found" });
    }

    // Define career tracks
    const careerTracks = [
      "software-engineer",
      "data-analyst", 
      "product-manager",
      "ui-ux-designer",
      "marketing-specialist",
    ];

    // Assign chapters to tracks based on their order
    // Each track gets chapters in sequence
    const chaptersPerTrack = Math.ceil(chapters.length / careerTracks.length);
    
    const updates = [];
    for (let i = 0; i < chapters.length; i++) {
      const trackIndex = Math.floor(i / chaptersPerTrack);
      const trackId = careerTracks[Math.min(trackIndex, careerTracks.length - 1)];
      const orderInTrack = i % chaptersPerTrack;
      
      updates.push({
        id: chapters[i].id,
        careerTrackId: trackId,
        orderIndex: orderInTrack + 1, // 1-based order within track
      });
    }

    // Update each chapter
    let updated = 0;
    for (const update of updates) {
      const { error } = await adminSupabase
        .from("study_chapters")
        .update({ 
          careerTrackId: update.careerTrackId,
          orderIndex: update.orderIndex,
        })
        .eq("id", update.id);

      if (!error) updated++;
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} chapters with career track assignments`,
      updates,
    });
  } catch (err) {
    console.error("Error seeding study tracks:", err);
    return NextResponse.json(
      { error: "Failed to seed study tracks" },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Show current chapter assignments
  try {
    const { data: chapters, error } = await adminSupabase
      .from("study_chapters")
      .select("id, title, careerTrackId, orderIndex")
      .order("careerTrackId")
      .order("orderIndex");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ chapters });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch chapters" },
      { status: 500 }
    );
  }
}
