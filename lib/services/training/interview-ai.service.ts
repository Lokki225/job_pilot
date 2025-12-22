import { aiService } from '../ai';

// ===========================================================
// TYPES
// ===========================================================

export interface GenerateQuestionParams {
  sessionType: 'QUICK' | 'FULL_MOCK' | 'TARGETED' | 'COMPANY_PREP';
  questionType: 'BEHAVIORAL' | 'TECHNICAL' | 'SITUATIONAL' | 'GENERAL';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  jobTitle?: string;
  companyName?: string;
  language?: string;
  masterSystemPrompt?: string;
  masterAbilities?: Record<string, any>;
  kitContext?: string;
  companyContext?: {
    coreValues?: string[];
    companyCulture?: string;
    recentNews?: { summary: string }[];
  };
  previousQuestions?: string[];
  focusAreas?: string[];
  userWeakAreas?: string[];
}

export interface InterviewQuestion {
  id?: string;
  question: string;
  questionType: string;
  context: string;
  hints: string[];
  expectedElements: string[];
}

export interface AnalyzeAnswerParams {
  question: string;
  questionType: string;
  answer: string;
  jobTitle?: string;
  expectedElements?: string[];
  language?: string;
  masterSystemPrompt?: string;
  masterAbilities?: Record<string, any>;
  kitContext?: string;
}

function languageNameFromLocale(locale?: string): string | null {
  if (!locale) return null;
  const prefix = locale.toLowerCase().split('-')[0];
  if (prefix === 'fr') return 'French';
  if (prefix === 'es') return 'Spanish';
  if (prefix === 'de') return 'German';
  if (prefix === 'pt') return 'Portuguese';
  if (prefix === 'it') return 'Italian';
  if (prefix === 'ja') return 'Japanese';
  if (prefix === 'zh') return 'Chinese';
  if (prefix === 'ko') return 'Korean';
  if (prefix === 'en') return 'English';
  return null;
}

export interface STARAnalysis {
  situation: { present: boolean; quality: 'weak' | 'adequate' | 'strong'; feedback: string };
  task: { present: boolean; quality: 'weak' | 'adequate' | 'strong'; feedback: string };
  action: { present: boolean; quality: 'weak' | 'adequate' | 'strong'; feedback: string };
  result: { present: boolean; quality: 'weak' | 'adequate' | 'strong'; feedback: string };
}

export interface CommunicationScores {
  clarity: number;
  conciseness: number;
  relevance: number;
  specificity: number;
}

export interface AnswerFeedback {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  improvementTips: string[];
  revisedAnswer: string;
  starAnalysis?: STARAnalysis;
  communication: CommunicationScores;
  keywordsUsed: string[];
  keywordsMissing: string[];
}

// ===========================================================
// QUESTION GENERATION
// ===========================================================

export async function generateInterviewQuestion(
  params: GenerateQuestionParams
): Promise<InterviewQuestion> {
  if (!aiService.isConfigured()) {
    throw new Error('AI service not configured. Please add OPENROUTER_API_KEY to your environment.');
  }

  const sessionTypeDescriptions = {
    QUICK: 'quick 15-minute practice session',
    FULL_MOCK: 'comprehensive full mock interview',
    TARGETED: 'targeted practice focusing on specific skills',
    COMPANY_PREP: 'company-specific interview preparation',
  };

  const languageName = languageNameFromLocale(params.language);
  const languageLine = languageName
    ? `Language: ${languageName}. Write ALL values (question, context, hints, expectedElements) in ${languageName}. Do NOT include English unless it is part of a proper noun.`
    : '';

  const masterPromptLine = params.masterSystemPrompt?.trim()
    ? `\n\nInterviewer Persona (follow strictly):\n${params.masterSystemPrompt.trim()}`
    : '';

  const abilitiesLine = params.masterAbilities
    ? `\n\nInterviewer Abilities/Rules (JSON, follow strictly):\n${JSON.stringify(params.masterAbilities)}`
    : '';

  const kitContextLine = params.kitContext?.trim()
    ? `\n\nInterview Kit Context (for alignment and rubric):\n${params.kitContext.trim()}`
    : '';

  const systemPrompt = `You are an expert interviewer conducting a ${sessionTypeDescriptions[params.sessionType]}.
Role: ${params.jobTitle || 'Professional'}
${params.companyName ? `Company: ${params.companyName}` : ''}
Difficulty: ${params.difficulty}
Question Type: ${params.questionType}
${languageLine}
${params.focusAreas?.length ? `Focus Areas: ${params.focusAreas.join(', ')}` : ''}
${params.userWeakAreas?.length ? `User needs practice with: ${params.userWeakAreas.join(', ')}` : ''}

${params.companyContext ? `Company Context:
- Values: ${params.companyContext.coreValues?.join(', ') || 'N/A'}
- Culture: ${params.companyContext.companyCulture || 'N/A'}
${params.companyContext.recentNews?.[0] ? `- Recent News: ${params.companyContext.recentNews[0].summary}` : ''}
` : ''}

${masterPromptLine}
${abilitiesLine}
${kitContextLine}

Generate ONE realistic interview question that would be asked in this context.

${params.previousQuestions?.length ? `Avoid these already-asked questions:
${params.previousQuestions.join('\n')}` : ''}

Response format (JSON):
{
  "question": "Your interview question",
  "questionType": "${params.questionType}",
  "context": "Brief context for why this question is asked (1-2 sentences)",
  "hints": ["Helpful hint 1", "Helpful hint 2"],
  "expectedElements": ["Key element 1", "Key element 2", "Key element 3"]
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;

  try {
    const response = await aiService.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the next interview question.' },
      ],
      temperature: 0.8,
      maxTokens: 800,
      responseFormat: 'json',
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as InterviewQuestion;
  } catch (error) {
    console.error('Error generating interview question:', error);
    throw new Error('Failed to generate interview question. Please try again.');
  }
}

// ===========================================================
// ANSWER ANALYSIS & FEEDBACK
// ===========================================================

export async function analyzeAnswer(params: AnalyzeAnswerParams): Promise<AnswerFeedback> {
  if (!aiService.isConfigured()) {
    throw new Error('AI service not configured. Please add OPENROUTER_API_KEY to your environment.');
  }

  const isBehavioral = params.questionType === 'BEHAVIORAL';

  const languageName = languageNameFromLocale(params.language);
  const languageLine = languageName
    ? `Language: ${languageName}. Write ALL feedback text fields (strengths, weaknesses, improvementTips, revisedAnswer, and feedback strings) in ${languageName}. Do NOT include English unless it is part of a proper noun.`
    : '';

  const masterPromptLine = params.masterSystemPrompt?.trim()
    ? `\n\nInterviewer Persona (follow strictly):\n${params.masterSystemPrompt.trim()}`
    : '';

  const abilitiesLine = params.masterAbilities
    ? `\n\nInterviewer Abilities/Rules (JSON, follow strictly):\n${JSON.stringify(params.masterAbilities)}`
    : '';

  const kitContextLine = params.kitContext?.trim()
    ? `\n\nInterview Kit Context (for alignment and rubric):\n${params.kitContext.trim()}`
    : '';

  const systemPrompt = `You are an expert interview coach analyzing a candidate's answer.

${languageLine}
${masterPromptLine}
${abilitiesLine}
${kitContextLine}

Question: ${params.question}
Question Type: ${params.questionType}
${params.jobTitle ? `Target Role: ${params.jobTitle}` : ''}
${params.expectedElements?.length ? `Expected Elements: ${params.expectedElements.join(', ')}` : ''}

Evaluate the answer on:
1. Overall effectiveness (0-100 score)
${isBehavioral ? '2. STAR method usage (Situation, Task, Action, Result)' : '2. Structure and completeness'}
3. Communication quality: clarity, conciseness, relevance, specificity (each 0-100)
4. Key strengths (2-3 specific points)
5. Areas for improvement (2-3 specific points)
6. Actionable improvement tips (2-3 concrete suggestions)
7. Provide an improved version of the answer

Be constructive and encouraging while being honest about areas to improve.

Response format (JSON):
{
  "overallScore": 75,
  "strengths": ["Clear structure", "Good example", "Professional tone"],
  "weaknesses": ["Could be more specific", "Missing metrics", "Too long"],
  "improvementTips": ["Add numbers to quantify impact", "Be more concise", "Focus on your specific contribution"],
  "revisedAnswer": "Improved version of the answer...",
  ${isBehavioral ? `"starAnalysis": {
    "situation": { "present": true, "quality": "strong", "feedback": "Clear context provided" },
    "task": { "present": true, "quality": "adequate", "feedback": "Could specify your exact role" },
    "action": { "present": true, "quality": "strong", "feedback": "Detailed steps taken" },
    "result": { "present": false, "quality": "weak", "feedback": "Missing measurable outcome" }
  },` : ''}
  "communication": {
    "clarity": 80,
    "conciseness": 65,
    "relevance": 85,
    "specificity": 70
  },
  "keywordsUsed": ["leadership", "team", "project"],
  "keywordsMissing": ["impact", "metrics", "outcome", "stakeholders"]
}

IMPORTANT: Return ONLY valid JSON, no additional text.`;

  try {
    const response = await aiService.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Candidate's Answer:\n\n${params.answer}` },
      ],
      temperature: 0.3,
      maxTokens: 2000,
      responseFormat: 'json',
    });

    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed as AnswerFeedback;
  } catch (error) {
    console.error('Error analyzing answer:', error);
    throw new Error('Failed to analyze answer. Please try again.');
  }
}

// ===========================================================
// HELPER: Generate Follow-up Question
// ===========================================================

export async function generateFollowUpQuestion(
  originalQuestion: string,
  userAnswer: string,
  feedback: AnswerFeedback
): Promise<string> {
  if (!aiService.isConfigured()) {
    throw new Error('AI service not configured.');
  }

  const systemPrompt = `You are an interviewer asking a follow-up question based on the candidate's answer.

Original Question: ${originalQuestion}
Candidate's Answer: ${userAnswer}
Answer Score: ${feedback.overallScore}/100

Generate ONE natural follow-up question that:
1. Probes deeper into their answer
2. Addresses any weaknesses identified
3. Feels conversational and realistic

Return ONLY the follow-up question text, nothing else.`;

  try {
    const response = await aiService.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the follow-up question.' },
      ],
      temperature: 0.7,
      maxTokens: 200,
    });

    return response.content.trim();
  } catch (error) {
    console.error('Error generating follow-up question:', error);
    return "Can you tell me more about the specific impact of your actions?";
  }
}
