import { NextResponse } from "next/server";
import { adminSupabase } from "@/lib/supabase/server";

const ACHIEVEMENTS = [
  { slug: "first_lesson", title: "First Steps", description: "Complete your first lesson", icon: "📚", points: 10, category: "STUDY", requirementType: "count", requirementField: "lessons_completed", requirementValue: 1 },
  { slug: "book_worm", title: "Book Worm", description: "Complete all Study Room chapters", icon: "🎓", points: 200, category: "STUDY", requirementType: "count", requirementField: "chapters_completed", requirementValue: 7 },
  { slug: "quiz_master", title: "Quiz Master", description: "Score 100% on 5 quizzes", icon: "🧠", points: 100, category: "STUDY", requirementType: "count", requirementField: "perfect_quizzes", requirementValue: 5 },
  { slug: "first_practice", title: "Practice Makes Perfect", description: "Complete your first training session", icon: "🎯", points: 10, category: "TRAINING", requirementType: "count", requirementField: "training_sessions", requirementValue: 1 },
  { slug: "star_student", title: "STAR Student", description: "Complete 10 training sessions", icon: "⭐", points: 50, category: "TRAINING", requirementType: "count", requirementField: "training_sessions", requirementValue: 10 },
  { slug: "interview_master", title: "Interview Master", description: "Score 90+ on 5 training sessions", icon: "👑", points: 150, category: "TRAINING", requirementType: "count", requirementField: "high_score_sessions", requirementValue: 5 },
  { slug: "voice_pro", title: "Voice Pro", description: "Complete 20 voice-based sessions", icon: "🎤", points: 75, category: "TRAINING", requirementType: "count", requirementField: "voice_sessions", requirementValue: 20 },
  { slug: "streak_7", title: "Week Warrior", description: "Practice 7 days in a row", icon: "🔥", points: 50, category: "MILESTONE", requirementType: "streak", requirementField: "current_streak", requirementValue: 7 },
  { slug: "streak_30", title: "Monthly Champion", description: "Practice 30 days in a row", icon: "🏆", points: 200, category: "MILESTONE", requirementType: "streak", requirementField: "current_streak", requirementValue: 30 },
  { slug: "storyteller", title: "Storyteller", description: "Share your success story", icon: "📖", points: 100, category: "COMMUNITY", requirementType: "count", requirementField: "stories_submitted", requirementValue: 1 },
  { slug: "first_application", title: "Taking Action", description: "Submit your first job application", icon: "🚀", points: 25, category: "MILESTONE", requirementType: "count", requirementField: "applications_submitted", requirementValue: 1 },
  { slug: "application_streak", title: "Application Machine", description: "Submit 10 job applications", icon: "💼", points: 75, category: "MILESTONE", requirementType: "count", requirementField: "applications_submitted", requirementValue: 10 },
  { slug: "first_offer", title: "Dream Achieved", description: "Receive your first job offer", icon: "🎉", points: 500, category: "MILESTONE", requirementType: "count", requirementField: "offers_received", requirementValue: 1, isSecret: true },
];

export async function POST() {
  try {
    for (const achievement of ACHIEVEMENTS) {
      const { error } = await adminSupabase.from("achievements").upsert(
        {
          slug: achievement.slug,
          title: achievement.title,
          description: achievement.description,
          icon: achievement.icon,
          category: achievement.category,
          points: achievement.points,
          requirementType: achievement.requirementType,
          requirementField: achievement.requirementField,
          requirementValue: achievement.requirementValue,
          isSecret: (achievement as any).isSecret || false,
        },
        { onConflict: "slug" }
      );
      
      if (error) {
        console.error("Error upserting achievement:", achievement.slug, error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }
    }
    
    return NextResponse.json({ success: true, message: "Achievements seeded successfully", count: ACHIEVEMENTS.length });
  } catch (error) {
    console.error("Error seeding achievements:", error);
    return NextResponse.json({ success: false, error: "Failed to seed achievements" }, { status: 500 });
  }
}
