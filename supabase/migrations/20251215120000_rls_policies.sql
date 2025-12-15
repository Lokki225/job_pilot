CREATE OR REPLACE FUNCTION public._ensure_rls_policy(
  p_schema text,
  p_table text,
  p_policy text,
  p_command text,
  p_role text,
  p_using text DEFAULT NULL,
  p_check text DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = p_schema
      AND tablename = p_table
      AND policyname = p_policy
  ) THEN
    EXECUTE
      'CREATE POLICY ' || quote_ident(p_policy) ||
      ' ON ' || quote_ident(p_schema) || '.' || quote_ident(p_table) ||
      ' FOR ' || p_command ||
      ' TO ' || quote_ident(p_role) ||
      CASE WHEN p_using IS NOT NULL THEN ' USING (' || p_using || ')' ELSE '' END ||
      CASE WHEN p_check IS NOT NULL THEN ' WITH CHECK (' || p_check || ')' ELSE '' END;
  END IF;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.users TO authenticated;
SELECT public._ensure_rls_policy('public','users','users_select_own','SELECT','authenticated','auth.uid() = id',NULL);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
SELECT public._ensure_rls_policy('public','profiles','profiles_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','profiles','profiles_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','profiles','profiles_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','profiles','profiles_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
SELECT public._ensure_rls_policy('public','resumes','resumes_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','resumes','resumes_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','resumes','resumes_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','resumes','resumes_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skills TO authenticated;
SELECT public._ensure_rls_policy(
  'public','skills','skills_select_own','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = skills."profileId" AND p."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','skills','skills_insert_own','INSERT','authenticated',
  NULL,
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = skills."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','skills','skills_update_own','UPDATE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = skills."profileId" AND p."userId" = auth.uid())',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = skills."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','skills','skills_delete_own','DELETE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = skills."profileId" AND p."userId" = auth.uid())',
  NULL
);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.experiences TO authenticated;
SELECT public._ensure_rls_policy(
  'public','experiences','experiences_select_own','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = experiences."profileId" AND p."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','experiences','experiences_insert_own','INSERT','authenticated',
  NULL,
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = experiences."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','experiences','experiences_update_own','UPDATE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = experiences."profileId" AND p."userId" = auth.uid())',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = experiences."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','experiences','experiences_delete_own','DELETE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = experiences."profileId" AND p."userId" = auth.uid())',
  NULL
);

ALTER TABLE public.educations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.educations TO authenticated;
SELECT public._ensure_rls_policy(
  'public','educations','educations_select_own','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = educations."profileId" AND p."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','educations','educations_insert_own','INSERT','authenticated',
  NULL,
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = educations."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','educations','educations_update_own','UPDATE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = educations."profileId" AND p."userId" = auth.uid())',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = educations."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','educations','educations_delete_own','DELETE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = educations."profileId" AND p."userId" = auth.uid())',
  NULL
);

ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.certifications TO authenticated;
SELECT public._ensure_rls_policy(
  'public','certifications','certifications_select_own','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = certifications."profileId" AND p."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','certifications','certifications_insert_own','INSERT','authenticated',
  NULL,
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = certifications."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','certifications','certifications_update_own','UPDATE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = certifications."profileId" AND p."userId" = auth.uid())',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = certifications."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','certifications','certifications_delete_own','DELETE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = certifications."profileId" AND p."userId" = auth.uid())',
  NULL
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
SELECT public._ensure_rls_policy(
  'public','projects','projects_select_own','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = projects."profileId" AND p."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','projects','projects_insert_own','INSERT','authenticated',
  NULL,
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = projects."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','projects','projects_update_own','UPDATE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = projects."profileId" AND p."userId" = auth.uid())',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = projects."profileId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','projects','projects_delete_own','DELETE','authenticated',
  'EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = projects."profileId" AND p."userId" = auth.uid())',
  NULL
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_applications TO authenticated;
SELECT public._ensure_rls_policy('public','job_applications','job_applications_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','job_applications','job_applications_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','job_applications','job_applications_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','job_applications','job_applications_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.job_search_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_search_preferences TO authenticated;
SELECT public._ensure_rls_policy('public','job_search_preferences','job_search_preferences_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','job_search_preferences','job_search_preferences_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','job_search_preferences','job_search_preferences_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','job_search_preferences','job_search_preferences_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.cached_job_recommendations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cached_job_recommendations TO authenticated;
SELECT public._ensure_rls_policy('public','cached_job_recommendations','cached_job_recommendations_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','cached_job_recommendations','cached_job_recommendations_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','cached_job_recommendations','cached_job_recommendations_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','cached_job_recommendations','cached_job_recommendations_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.saved_job_searches ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_job_searches TO authenticated;
SELECT public._ensure_rls_policy('public','saved_job_searches','saved_job_searches_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','saved_job_searches','saved_job_searches_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','saved_job_searches','saved_job_searches_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','saved_job_searches','saved_job_searches_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.ai_generated_content ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generated_content TO authenticated;
SELECT public._ensure_rls_policy('public','ai_generated_content','ai_generated_content_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','ai_generated_content','ai_generated_content_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','ai_generated_content','ai_generated_content_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','ai_generated_content','ai_generated_content_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.cover_letters ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cover_letters TO authenticated;
SELECT public._ensure_rls_policy('public','cover_letters','cover_letters_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','cover_letters','cover_letters_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','cover_letters','cover_letters_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','cover_letters','cover_letters_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.email_applications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_applications TO authenticated;
SELECT public._ensure_rls_policy('public','email_applications','email_applications_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','email_applications','email_applications_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','email_applications','email_applications_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','email_applications','email_applications_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT, UPDATE, DELETE ON public.notifications TO authenticated;
SELECT public._ensure_rls_policy('public','notifications','notifications_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','notifications','notifications_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','notifications','notifications_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
SELECT public._ensure_rls_policy('public','notification_preferences','notification_preferences_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','notification_preferences','notification_preferences_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','notification_preferences','notification_preferences_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','notification_preferences','notification_preferences_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notification_queue TO authenticated;
SELECT public._ensure_rls_policy('public','notification_queue','notification_queue_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.email_queue TO authenticated;
SELECT public._ensure_rls_policy('public','email_queue','email_queue_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.event_logs TO authenticated;
SELECT public._ensure_rls_policy('public','event_logs','event_logs_select_own','SELECT','authenticated','("userId" IS NOT NULL AND auth.uid() = "userId")',NULL);

ALTER TABLE public.study_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_resources ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.study_chapters, public.study_lessons, public.study_quizzes, public.study_resources TO authenticated;
SELECT public._ensure_rls_policy('public','study_chapters','study_chapters_select_all','SELECT','authenticated','true',NULL);
SELECT public._ensure_rls_policy('public','study_lessons','study_lessons_select_all','SELECT','authenticated','true',NULL);
SELECT public._ensure_rls_policy('public','study_quizzes','study_quizzes_select_all','SELECT','authenticated','true',NULL);
SELECT public._ensure_rls_policy('public','study_resources','study_resources_select_all','SELECT','authenticated','true',NULL);

ALTER TABLE public.user_study_progress ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_study_progress TO authenticated;
SELECT public._ensure_rls_policy('public','user_study_progress','user_study_progress_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','user_study_progress','user_study_progress_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','user_study_progress','user_study_progress_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','user_study_progress','user_study_progress_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
SELECT public._ensure_rls_policy('public','training_sessions','training_sessions_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','training_sessions','training_sessions_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','training_sessions','training_sessions_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','training_sessions','training_sessions_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.training_questions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_questions TO authenticated;
SELECT public._ensure_rls_policy(
  'public','training_questions','training_questions_select_own','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = training_questions."sessionId" AND s."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','training_questions','training_questions_insert_own','INSERT','authenticated',
  NULL,
  'EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = training_questions."sessionId" AND s."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','training_questions','training_questions_update_own','UPDATE','authenticated',
  'EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = training_questions."sessionId" AND s."userId" = auth.uid())',
  'EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = training_questions."sessionId" AND s."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','training_questions','training_questions_delete_own','DELETE','authenticated',
  'EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = training_questions."sessionId" AND s."userId" = auth.uid())',
  NULL
);

ALTER TABLE public.user_interview_stats ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_interview_stats TO authenticated;
SELECT public._ensure_rls_policy('public','user_interview_stats','user_interview_stats_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.company_research ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_research TO authenticated;
SELECT public._ensure_rls_policy('public','company_research','company_research_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','company_research','company_research_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','company_research','company_research_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','company_research','company_research_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.peer_practice_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.peer_practice_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.peer_practice_profiles TO authenticated;
SELECT public._ensure_rls_policy('public','peer_practice_profiles','peer_practice_profiles_select_all','SELECT','authenticated','true',NULL);
SELECT public._ensure_rls_policy('public','peer_practice_profiles','peer_practice_profiles_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','peer_practice_profiles','peer_practice_profiles_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','peer_practice_profiles','peer_practice_profiles_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.peer_practice_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.peer_practice_sessions TO authenticated;
SELECT public._ensure_rls_policy('public','peer_practice_sessions','peer_practice_sessions_select_participant','SELECT','authenticated','(auth.uid() = "requesterId" OR auth.uid() = "partnerId")',NULL);
SELECT public._ensure_rls_policy('public','peer_practice_sessions','peer_practice_sessions_insert_requester','INSERT','authenticated',NULL,'auth.uid() = "requesterId"');
SELECT public._ensure_rls_policy('public','peer_practice_sessions','peer_practice_sessions_update_participant','UPDATE','authenticated','(auth.uid() = "requesterId" OR auth.uid() = "partnerId")','(auth.uid() = "requesterId" OR auth.uid() = "partnerId")');
SELECT public._ensure_rls_policy('public','peer_practice_sessions','peer_practice_sessions_delete_participant','DELETE','authenticated','(auth.uid() = "requesterId" OR auth.uid() = "partnerId")',NULL);

ALTER TABLE public.user_calendar_connections ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_calendar_connections TO authenticated;
SELECT public._ensure_rls_policy('public','user_calendar_connections','user_calendar_connections_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','user_calendar_connections','user_calendar_connections_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','user_calendar_connections','user_calendar_connections_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','user_calendar_connections','user_calendar_connections_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.detected_interviews ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.detected_interviews TO authenticated;
SELECT public._ensure_rls_policy('public','detected_interviews','detected_interviews_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','detected_interviews','detected_interviews_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','detected_interviews','detected_interviews_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','detected_interviews','detected_interviews_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.interview_prep_packs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_prep_packs TO authenticated;
SELECT public._ensure_rls_policy('public','interview_prep_packs','interview_prep_packs_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','interview_prep_packs','interview_prep_packs_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','interview_prep_packs','interview_prep_packs_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','interview_prep_packs','interview_prep_packs_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.achievements TO authenticated;
GRANT SELECT ON public.achievements TO anon;
SELECT public._ensure_rls_policy('public','achievements','achievements_select_all','SELECT','authenticated','true',NULL);
SELECT public._ensure_rls_policy('public','achievements','achievements_select_all_anon','SELECT','anon','true',NULL);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_achievements TO authenticated;
SELECT public._ensure_rls_policy('public','user_achievements','user_achievements_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_xp TO authenticated;
SELECT public._ensure_rls_policy('public','user_xp','user_xp_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.xp_transactions TO authenticated;
SELECT public._ensure_rls_policy('public','xp_transactions','xp_transactions_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.cover_letter_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.cover_letter_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cover_letter_templates TO authenticated;
SELECT public._ensure_rls_policy(
  'public','cover_letter_templates','cover_letter_templates_select_visible','SELECT','authenticated',
  '("isSystem" = true AND "isActive" = true) OR ("userId" IS NOT NULL AND auth.uid() = "userId")',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','cover_letter_templates','cover_letter_templates_insert_own','INSERT','authenticated',
  NULL,
  '("isSystem" = false) AND ("userId" IS NOT NULL) AND auth.uid() = "userId"'
);
SELECT public._ensure_rls_policy(
  'public','cover_letter_templates','cover_letter_templates_update_own','UPDATE','authenticated',
  '("isSystem" = false) AND ("userId" IS NOT NULL) AND auth.uid() = "userId"',
  '("isSystem" = false) AND ("userId" IS NOT NULL) AND auth.uid() = "userId"'
);
SELECT public._ensure_rls_policy(
  'public','cover_letter_templates','cover_letter_templates_delete_own','DELETE','authenticated',
  '("isSystem" = false) AND ("userId" IS NOT NULL) AND auth.uid() = "userId"',
  NULL
);

ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.success_stories TO authenticated;
GRANT SELECT ON public.success_stories TO anon;
GRANT INSERT, UPDATE, DELETE ON public.success_stories TO authenticated;
SELECT public._ensure_rls_policy('public','success_stories','success_stories_select_published_anon','SELECT','anon','"isPublished" = true',NULL);
SELECT public._ensure_rls_policy('public','success_stories','success_stories_select_visible','SELECT','authenticated','("isPublished" = true) OR (auth.uid() = "userId")',NULL);
SELECT public._ensure_rls_policy('public','success_stories','success_stories_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','success_stories','success_stories_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','success_stories','success_stories_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.success_story_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.success_story_comments TO authenticated;
GRANT SELECT ON public.success_story_comments TO anon;
SELECT public._ensure_rls_policy(
  'public','success_story_comments','success_story_comments_select_visible_anon','SELECT','anon',
  'EXISTS (SELECT 1 FROM public.success_stories s WHERE s.id = success_story_comments."storyId" AND s."isPublished" = true)',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','success_story_comments','success_story_comments_select_visible','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.success_stories s WHERE s.id = success_story_comments."storyId" AND (s."isPublished" = true OR s."userId" = auth.uid())) OR auth.uid() = success_story_comments."userId"',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','success_story_comments','success_story_comments_insert_visible','INSERT','authenticated',
  NULL,
  'auth.uid() = "userId" AND EXISTS (SELECT 1 FROM public.success_stories s WHERE s.id = success_story_comments."storyId" AND (s."isPublished" = true OR s."userId" = auth.uid()))'
);
SELECT public._ensure_rls_policy('public','success_story_comments','success_story_comments_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','success_story_comments','success_story_comments_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.success_story_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.success_story_likes TO authenticated;
SELECT public._ensure_rls_policy('public','success_story_likes','success_story_likes_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','success_story_likes','success_story_likes_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','success_story_likes','success_story_likes_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.success_story_bookmarks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.success_story_bookmarks TO authenticated;
SELECT public._ensure_rls_policy('public','success_story_bookmarks','success_story_bookmarks_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','success_story_bookmarks','success_story_bookmarks_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','success_story_bookmarks','success_story_bookmarks_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.success_story_hides ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.success_story_hides TO authenticated;
SELECT public._ensure_rls_policy('public','success_story_hides','success_story_hides_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','success_story_hides','success_story_hides_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','success_story_hides','success_story_hides_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.success_story_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.success_story_reports TO authenticated;
SELECT public._ensure_rls_policy('public','success_story_reports','success_story_reports_select_own','SELECT','authenticated','auth.uid() = "reporterId"',NULL);
SELECT public._ensure_rls_policy('public','success_story_reports','success_story_reports_insert_own','INSERT','authenticated',NULL,'auth.uid() = "reporterId"');

ALTER TABLE public.success_story_comment_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.success_story_comment_likes TO authenticated;
SELECT public._ensure_rls_policy('public','success_story_comment_likes','success_story_comment_likes_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','success_story_comment_likes','success_story_comment_likes_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','success_story_comment_likes','success_story_comment_likes_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.community_profiles TO authenticated;
SELECT public._ensure_rls_policy('public','community_profiles','community_profiles_select_all','SELECT','authenticated','true',NULL);
SELECT public._ensure_rls_policy('public','community_profiles','community_profiles_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','community_profiles','community_profiles_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');

ALTER TABLE public.community_badges ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.community_badges TO authenticated;
SELECT public._ensure_rls_policy('public','community_badges','community_badges_select_all','SELECT','authenticated','true',NULL);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
SELECT public._ensure_rls_policy(
  'public','community_posts','community_posts_select_visible','SELECT','authenticated',
  '("moderationStatus" = ''APPROVED'') OR (auth.uid() = "userId")',
  NULL
);
SELECT public._ensure_rls_policy('public','community_posts','community_posts_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','community_posts','community_posts_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','community_posts','community_posts_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.community_post_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_post_comments TO authenticated;
SELECT public._ensure_rls_policy(
  'public','community_post_comments','community_post_comments_select_visible','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = community_post_comments."postId" AND (p."moderationStatus" = ''APPROVED'' OR p."userId" = auth.uid())) OR auth.uid() = community_post_comments."userId"',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','community_post_comments','community_post_comments_insert_visible','INSERT','authenticated',
  NULL,
  'auth.uid() = "userId" AND EXISTS (SELECT 1 FROM public.community_posts p WHERE p.id = community_post_comments."postId" AND p."moderationStatus" = ''APPROVED'')'
);
SELECT public._ensure_rls_policy('public','community_post_comments','community_post_comments_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','community_post_comments','community_post_comments_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
SELECT public._ensure_rls_policy('public','community_post_likes','community_post_likes_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','community_post_likes','community_post_likes_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','community_post_likes','community_post_likes_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.community_post_comment_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.community_post_comment_likes TO authenticated;
SELECT public._ensure_rls_policy('public','community_post_comment_likes','community_post_comment_likes_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','community_post_comment_likes','community_post_comment_likes_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','community_post_comment_likes','community_post_comment_likes_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.community_post_bookmarks ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.community_post_bookmarks TO authenticated;
SELECT public._ensure_rls_policy('public','community_post_bookmarks','community_post_bookmarks_select_own','SELECT','authenticated','auth.uid() = "userId"',NULL);
SELECT public._ensure_rls_policy('public','community_post_bookmarks','community_post_bookmarks_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','community_post_bookmarks','community_post_bookmarks_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.community_post_reports ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT ON public.community_post_reports TO authenticated;
SELECT public._ensure_rls_policy('public','community_post_reports','community_post_reports_select_own','SELECT','authenticated','auth.uid() = "reporterId"',NULL);
SELECT public._ensure_rls_policy('public','community_post_reports','community_post_reports_insert_own','INSERT','authenticated',NULL,'auth.uid() = "reporterId"');

ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.chat_rooms TO authenticated;
SELECT public._ensure_rls_policy('public','chat_rooms','chat_rooms_select_all','SELECT','authenticated','true',NULL);

ALTER TABLE public.chat_room_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_room_members TO authenticated;
SELECT public._ensure_rls_policy(
  'public','chat_room_members','chat_room_members_select_room','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.chat_room_members m WHERE m."roomId" = chat_room_members."roomId" AND m."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy('public','chat_room_members','chat_room_members_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','chat_room_members','chat_room_members_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','chat_room_members','chat_room_members_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
SELECT public._ensure_rls_policy(
  'public','chat_messages','chat_messages_select_room','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.chat_room_members m WHERE m."roomId" = chat_messages."roomId" AND m."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','chat_messages','chat_messages_insert_member','INSERT','authenticated',
  NULL,
  'auth.uid() = "userId" AND EXISTS (SELECT 1 FROM public.chat_room_members m WHERE m."roomId" = chat_messages."roomId" AND m."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy('public','chat_messages','chat_messages_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','chat_messages','chat_messages_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.chat_message_reactions TO authenticated;
SELECT public._ensure_rls_policy(
  'public','chat_message_reactions','chat_message_reactions_select_room','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.chat_messages msg JOIN public.chat_room_members m ON m."roomId" = msg."roomId" WHERE msg.id = chat_message_reactions."messageId" AND m."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','chat_message_reactions','chat_message_reactions_insert_member','INSERT','authenticated',
  NULL,
  'auth.uid() = "userId" AND EXISTS (SELECT 1 FROM public.chat_messages msg JOIN public.chat_room_members m ON m."roomId" = msg."roomId" WHERE msg.id = chat_message_reactions."messageId" AND m."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy('public','chat_message_reactions','chat_message_reactions_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
SELECT public._ensure_rls_policy('public','user_follows','user_follows_select_all','SELECT','authenticated','true',NULL);
SELECT public._ensure_rls_policy('public','user_follows','user_follows_insert_own','INSERT','authenticated',NULL,'auth.uid() = "followerId"');
SELECT public._ensure_rls_policy('public','user_follows','user_follows_delete_own','DELETE','authenticated','auth.uid() = "followerId"',NULL);

ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_profiles TO authenticated;
SELECT public._ensure_rls_policy('public','mentor_profiles','mentor_profiles_select_all','SELECT','authenticated','true',NULL);
SELECT public._ensure_rls_policy('public','mentor_profiles','mentor_profiles_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','mentor_profiles','mentor_profiles_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','mentor_profiles','mentor_profiles_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorships TO authenticated;
SELECT public._ensure_rls_policy(
  'public','mentorships','mentorships_select_participant','SELECT','authenticated',
  '(auth.uid() = "menteeId") OR EXISTS (SELECT 1 FROM public.mentor_profiles mp WHERE mp.id = mentorships."mentorId" AND mp."userId" = auth.uid())',
  NULL
);
SELECT public._ensure_rls_policy('public','mentorships','mentorships_insert_mentee','INSERT','authenticated',NULL,'auth.uid() = "menteeId"');
SELECT public._ensure_rls_policy(
  'public','mentorships','mentorships_update_participant','UPDATE','authenticated',
  '(auth.uid() = "menteeId") OR EXISTS (SELECT 1 FROM public.mentor_profiles mp WHERE mp.id = mentorships."mentorId" AND mp."userId" = auth.uid())',
  '(auth.uid() = "menteeId") OR EXISTS (SELECT 1 FROM public.mentor_profiles mp WHERE mp.id = mentorships."mentorId" AND mp."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','mentorships','mentorships_delete_participant','DELETE','authenticated',
  '(auth.uid() = "menteeId") OR EXISTS (SELECT 1 FROM public.mentor_profiles mp WHERE mp.id = mentorships."mentorId" AND mp."userId" = auth.uid())',
  NULL
);

ALTER TABLE public.custom_study_plans ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_study_plans TO authenticated;
SELECT public._ensure_rls_policy('public','custom_study_plans','custom_study_plans_select_visible','SELECT','authenticated','("isPublic" = true) OR (auth.uid() = "userId")',NULL);
SELECT public._ensure_rls_policy('public','custom_study_plans','custom_study_plans_insert_own','INSERT','authenticated',NULL,'auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','custom_study_plans','custom_study_plans_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','custom_study_plans','custom_study_plans_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.custom_study_plan_likes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, DELETE ON public.custom_study_plan_likes TO authenticated;
SELECT public._ensure_rls_policy(
  'public','custom_study_plan_likes','custom_study_plan_likes_select_visible','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_plans p WHERE p.id = custom_study_plan_likes."planId" AND (p."isPublic" = true OR p."userId" = auth.uid())) OR auth.uid() = custom_study_plan_likes."userId"',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','custom_study_plan_likes','custom_study_plan_likes_insert_own','INSERT','authenticated',
  NULL,
  'auth.uid() = "userId" AND EXISTS (SELECT 1 FROM public.custom_study_plans p WHERE p.id = custom_study_plan_likes."planId" AND (p."isPublic" = true OR p."userId" = auth.uid()))'
);
SELECT public._ensure_rls_policy('public','custom_study_plan_likes','custom_study_plan_likes_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.custom_study_plan_comments ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_study_plan_comments TO authenticated;
SELECT public._ensure_rls_policy(
  'public','custom_study_plan_comments','custom_study_plan_comments_select_visible','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_plans p WHERE p.id = custom_study_plan_comments."planId" AND (p."isPublic" = true OR p."userId" = auth.uid())) OR auth.uid() = custom_study_plan_comments."userId"',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','custom_study_plan_comments','custom_study_plan_comments_insert_visible','INSERT','authenticated',
  NULL,
  'auth.uid() = "userId" AND EXISTS (SELECT 1 FROM public.custom_study_plans p WHERE p.id = custom_study_plan_comments."planId" AND (p."isPublic" = true OR p."userId" = auth.uid()))'
);
SELECT public._ensure_rls_policy('public','custom_study_plan_comments','custom_study_plan_comments_update_own','UPDATE','authenticated','auth.uid() = "userId"','auth.uid() = "userId"');
SELECT public._ensure_rls_policy('public','custom_study_plan_comments','custom_study_plan_comments_delete_own','DELETE','authenticated','auth.uid() = "userId"',NULL);

ALTER TABLE public.custom_study_chapters ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_study_chapters TO authenticated;
SELECT public._ensure_rls_policy(
  'public','custom_study_chapters','custom_study_chapters_select_visible','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_plans p WHERE p.id = custom_study_chapters."planId" AND (p."isPublic" = true OR p."userId" = auth.uid()))',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','custom_study_chapters','custom_study_chapters_insert_own','INSERT','authenticated',
  NULL,
  'EXISTS (SELECT 1 FROM public.custom_study_plans p WHERE p.id = custom_study_chapters."planId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','custom_study_chapters','custom_study_chapters_update_own','UPDATE','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_plans p WHERE p.id = custom_study_chapters."planId" AND p."userId" = auth.uid())',
  'EXISTS (SELECT 1 FROM public.custom_study_plans p WHERE p.id = custom_study_chapters."planId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','custom_study_chapters','custom_study_chapters_delete_own','DELETE','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_plans p WHERE p.id = custom_study_chapters."planId" AND p."userId" = auth.uid())',
  NULL
);

ALTER TABLE public.custom_study_lessons ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_study_lessons TO authenticated;
SELECT public._ensure_rls_policy(
  'public','custom_study_lessons','custom_study_lessons_select_visible','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_chapters c JOIN public.custom_study_plans p ON p.id = c."planId" WHERE c.id = custom_study_lessons."chapterId" AND (p."isPublic" = true OR p."userId" = auth.uid()))',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','custom_study_lessons','custom_study_lessons_insert_own','INSERT','authenticated',
  NULL,
  'EXISTS (SELECT 1 FROM public.custom_study_chapters c JOIN public.custom_study_plans p ON p.id = c."planId" WHERE c.id = custom_study_lessons."chapterId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','custom_study_lessons','custom_study_lessons_update_own','UPDATE','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_chapters c JOIN public.custom_study_plans p ON p.id = c."planId" WHERE c.id = custom_study_lessons."chapterId" AND p."userId" = auth.uid())',
  'EXISTS (SELECT 1 FROM public.custom_study_chapters c JOIN public.custom_study_plans p ON p.id = c."planId" WHERE c.id = custom_study_lessons."chapterId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','custom_study_lessons','custom_study_lessons_delete_own','DELETE','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_chapters c JOIN public.custom_study_plans p ON p.id = c."planId" WHERE c.id = custom_study_lessons."chapterId" AND p."userId" = auth.uid())',
  NULL
);

ALTER TABLE public.custom_study_quizzes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_study_quizzes TO authenticated;
SELECT public._ensure_rls_policy(
  'public','custom_study_quizzes','custom_study_quizzes_select_visible','SELECT','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_lessons l JOIN public.custom_study_chapters c ON c.id = l."chapterId" JOIN public.custom_study_plans p ON p.id = c."planId" WHERE l.id = custom_study_quizzes."lessonId" AND (p."isPublic" = true OR p."userId" = auth.uid()))',
  NULL
);
SELECT public._ensure_rls_policy(
  'public','custom_study_quizzes','custom_study_quizzes_insert_own','INSERT','authenticated',
  NULL,
  'EXISTS (SELECT 1 FROM public.custom_study_lessons l JOIN public.custom_study_chapters c ON c.id = l."chapterId" JOIN public.custom_study_plans p ON p.id = c."planId" WHERE l.id = custom_study_quizzes."lessonId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','custom_study_quizzes','custom_study_quizzes_update_own','UPDATE','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_lessons l JOIN public.custom_study_chapters c ON c.id = l."chapterId" JOIN public.custom_study_plans p ON p.id = c."planId" WHERE l.id = custom_study_quizzes."lessonId" AND p."userId" = auth.uid())',
  'EXISTS (SELECT 1 FROM public.custom_study_lessons l JOIN public.custom_study_chapters c ON c.id = l."chapterId" JOIN public.custom_study_plans p ON p.id = c."planId" WHERE l.id = custom_study_quizzes."lessonId" AND p."userId" = auth.uid())'
);
SELECT public._ensure_rls_policy(
  'public','custom_study_quizzes','custom_study_quizzes_delete_own','DELETE','authenticated',
  'EXISTS (SELECT 1 FROM public.custom_study_lessons l JOIN public.custom_study_chapters c ON c.id = l."chapterId" JOIN public.custom_study_plans p ON p.id = c."planId" WHERE l.id = custom_study_quizzes."lessonId" AND p."userId" = auth.uid())',
  NULL
);
