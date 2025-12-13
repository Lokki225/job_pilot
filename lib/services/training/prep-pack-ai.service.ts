import { aiService } from '../ai';

// ===========================================================
// TYPES
// ===========================================================

export interface JobPostInput {
  companyName: string;
  jobTitle: string;
  jobPostText?: string;
  jobPostUrl?: string;
  companyWebsite?: string;
}

export interface ExtractedJobData {
  responsibilities: string[];
  requiredSkills: { skill: string; category: 'technical' | 'soft' | 'domain'; importance: 'required' | 'preferred' }[];
  niceToHaveSkills: string[];
  techStack: string[];
  seniorityLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  keywords: string[];
  companyValues: string[];
  teamInfo: string | null;
  interviewHints: string[];
  salary: string | null;
  location: string | null;
  jobType: string | null;
}

export interface PrepPlanStep {
  id: string;
  type: 'study' | 'practice' | 'prepare' | 'research';
  title: string;
  description: string;
  estimatedMinutes: number;
  priority: 'high' | 'medium' | 'low';
  resources?: { title: string; url?: string }[];
}

export interface PrepPlanSession {
  id: string;
  sessionType: 'QUICK' | 'TARGETED' | 'FULL_MOCK';
  title: string;
  description: string;
  focusAreas: string[];
  questionCount: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  estimatedMinutes: number;
}

export interface STARStory {
  id: string;
  skillTargeted: string;
  promptQuestion: string;
  situationHint: string;
  taskHint: string;
  actionHint: string;
  resultHint: string;
}

export interface GeneratedPrepPlan {
  overview: {
    totalSteps: number;
    estimatedTotalMinutes: number;
    readinessScore: number;
    keyFocusAreas: string[];
  };
  checklist: PrepPlanStep[];
  studyTopics: PrepPlanStep[];
  practiceSessions: PrepPlanSession[];
  questionBank: {
    behavioral: string[];
    technical: string[];
    situational: string[];
    companySpecific: string[];
  };
  starStories: STARStory[];
  interviewTips: string[];
}

// ===========================================================
// JOB POST EXTRACTION
// ===========================================================

export async function extractJobPostData(input: JobPostInput): Promise<ExtractedJobData> {
  if (!aiService.isConfigured()) {
    throw new Error('AI service not configured. Please add OPENROUTER_API_KEY to your environment.');
  }

  if (!input.jobPostText || input.jobPostText.trim().length < 50) {
    throw new Error('Job post text is too short or missing. Please provide the full job description.');
  }

  const systemPrompt = `You are an expert job analyst and career coach. Extract structured information from job postings.

Analyze the following job posting and extract key information.

Company: ${input.companyName}
Job Title: ${input.jobTitle}
${input.companyWebsite ? `Company Website: ${input.companyWebsite}` : ''}

Job Posting:
${input.jobPostText}

Extract the following in JSON format:
{
  "responsibilities": ["responsibility 1", "responsibility 2", ...],
  "requiredSkills": [
    { "skill": "skill name", "category": "technical|soft|domain", "importance": "required|preferred" }
  ],
  "niceToHaveSkills": ["skill 1", "skill 2"],
  "techStack": ["technology 1", "technology 2"],
  "seniorityLevel": "entry|mid|senior|lead|executive",
  "keywords": ["keyword for ATS", "another keyword"],
  "companyValues": ["value 1", "value 2"],
  "teamInfo": "description of team or null",
  "interviewHints": ["any hints about interview process found in posting"],
  "salary": "salary range or null",
  "location": "location or null",
  "jobType": "full-time|part-time|contract|remote|hybrid or null"
}

Be thorough but only include information that is actually present or can be reasonably inferred.
Return ONLY valid JSON.`;

  try {
    const response = await aiService.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Extract the job posting data.' },
      ],
      temperature: 0.3,
      maxTokens: 2000,
      responseFormat: 'json',
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    return JSON.parse(jsonMatch[0]) as ExtractedJobData;
  } catch (error) {
    console.error('Error extracting job post data:', error);
    throw new Error('Failed to extract job post data. Please try again.');
  }
}

// ===========================================================
// PREP PLAN GENERATION
// ===========================================================

export async function generatePrepPlan(
  input: JobPostInput,
  extractedData: ExtractedJobData
): Promise<GeneratedPrepPlan> {
  if (!aiService.isConfigured()) {
    throw new Error('AI service not configured.');
  }

  const systemPrompt = `You are an expert interview coach creating a comprehensive interview preparation plan.

Company: ${input.companyName}
Role: ${input.jobTitle}

Extracted Job Data:
${JSON.stringify(extractedData, null, 2)}

Create a detailed interview preparation plan. The plan should include:

1. **Checklist** - Things to do before the interview (research company, prepare questions, etc.)
2. **Study Topics** - Technical/domain topics to review based on requirements
3. **Practice Sessions** - Mock interview sessions with specific focus areas
4. **Question Bank** - Likely interview questions categorized by type
5. **STAR Stories** - Stories to prepare for behavioral questions
6. **Interview Tips** - Specific tips for this role/company

Output JSON format:
{
  "overview": {
    "totalSteps": number,
    "estimatedTotalMinutes": number,
    "readinessScore": 0,
    "keyFocusAreas": ["area1", "area2", "area3"]
  },
  "checklist": [
    {
      "id": "check-1",
      "type": "prepare",
      "title": "Step title",
      "description": "What to do",
      "estimatedMinutes": 15,
      "priority": "high|medium|low",
      "resources": [{"title": "Resource name", "url": "optional url"}]
    }
  ],
  "studyTopics": [
    {
      "id": "study-1",
      "type": "study",
      "title": "Topic to study",
      "description": "What to learn and why",
      "estimatedMinutes": 30,
      "priority": "high|medium|low"
    }
  ],
  "practiceSessions": [
    {
      "id": "session-1",
      "sessionType": "TARGETED",
      "title": "Session name",
      "description": "What this session covers",
      "focusAreas": ["BEHAVIORAL", "TECHNICAL"],
      "questionCount": 5,
      "difficulty": "MEDIUM",
      "estimatedMinutes": 20
    }
  ],
  "questionBank": {
    "behavioral": ["Question 1?", "Question 2?"],
    "technical": ["Technical question 1?"],
    "situational": ["Situational question 1?"],
    "companySpecific": ["Why do you want to work at ${input.companyName}?"]
  },
  "starStories": [
    {
      "id": "star-1",
      "skillTargeted": "Leadership",
      "promptQuestion": "Tell me about a time you led a team...",
      "situationHint": "Think of a project where you took charge",
      "taskHint": "What was your specific responsibility?",
      "actionHint": "What steps did you take?",
      "resultHint": "What was the measurable outcome?"
    }
  ],
  "interviewTips": [
    "Tip 1 specific to this role",
    "Tip 2 about the company"
  ]
}

Create 4-6 checklist items, 3-5 study topics, 3-4 practice sessions, 8-12 questions per category, and 3-5 STAR stories.
Return ONLY valid JSON.`;

  try {
    const response = await aiService.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the interview preparation plan.' },
      ],
      temperature: 0.7,
      maxTokens: 4000,
      responseFormat: 'json',
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const plan = JSON.parse(jsonMatch[0]) as GeneratedPrepPlan;
    
    // Calculate total steps
    plan.overview.totalSteps = 
      plan.checklist.length + 
      plan.studyTopics.length + 
      plan.practiceSessions.length +
      plan.starStories.length;

    return plan;
  } catch (error) {
    console.error('Error generating prep plan:', error);
    throw new Error('Failed to generate preparation plan. Please try again.');
  }
}

// ===========================================================
// COMBINED: EXTRACT + GENERATE
// ===========================================================

export async function createFullPrepPack(input: JobPostInput): Promise<{
  extractedData: ExtractedJobData;
  prepPlan: GeneratedPrepPlan;
}> {
  // Step 1: Extract job post data
  const extractedData = await extractJobPostData(input);
  
  // Step 2: Generate prep plan based on extracted data
  const prepPlan = await generatePrepPlan(input, extractedData);
  
  return { extractedData, prepPlan };
}
