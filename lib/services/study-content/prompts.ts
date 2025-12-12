/**
 * AI Prompts for Study Content Generation
 * Carefully crafted prompts for consistent, high-quality output
 */

import { CareerTrackId, CAREER_TRACKS } from './types'

// ===========================================================
// STYLE GUIDE (included in all prompts)
// ===========================================================

export const STYLE_GUIDE = `
## Content Style Guide

### Voice & Tone
- Coach-like: supportive, confident, actionable
- Professional but approachable
- Use "you" to address the reader directly
- Be thorough and educational - this is a learning platform
- No fake citations or made-up statistics

### Markdown Formatting
- Use proper heading hierarchy (## for main sections, ### for subsections)
- Use bullet lists for multiple points (minimum 4-6 items per list)
- Use **bold** for key terms and emphasis
- Use tables when comparing options or listing structured data
- Use > blockquotes for important tips, pro tips, or expert insights
- Use --- horizontal rules to separate major sections
- Use numbered lists for step-by-step processes
- Include code blocks with \`\`\` for any technical examples

### Content Depth Requirements
- Each section MUST be 300-500 words minimum
- Include real-world scenarios and concrete examples
- Provide step-by-step actionable guidance
- Add "Pro Tips" using blockquotes for insider advice
- Include common mistakes to avoid
- Add industry-specific context and insights

### Structure
- Start with a compelling intro explaining why this matters (2-3 sentences)
- Break content into 4-6 substantial sections
- Each section should teach ONE clear concept thoroughly
- Include at least 2 practical examples per teaching section
- Add a "Common Mistakes" or "What to Avoid" subsection
- End with a comprehensive summary and clear next steps

### Avoid
- Placeholder text like [Your Name]
- Generic advice without specifics
- Surface-level explanations
- Passive voice
- Jargon without explanation
- Short, thin sections that don't teach anything
`

// ===========================================================
// LESSON GENERATION PROMPT
// ===========================================================

export function buildLessonPrompt(options: {
  trackId: CareerTrackId
  chapterTitle: string
  chapterIndex: number
  lessonTitle: string
  lessonIndex: number
  learningObjectives: string[]
  keyTerms: string[]
  previousLessonsSummary?: string
}): string {
  const track = CAREER_TRACKS[options.trackId]
  
  return `You are an expert career coach creating educational content for job seekers.

## Task
Generate a complete lesson for the Study Room feature of a job preparation platform.

## Context
- **Career Track**: ${track.name}
- **Target Audience**: ${track.targetAudience.join(', ')}
- **Chapter ${options.chapterIndex}**: ${options.chapterTitle}
- **Lesson ${options.lessonIndex}**: ${options.lessonTitle}

## Learning Objectives
${options.learningObjectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

## Key Terms to Cover
${options.keyTerms.join(', ')}

${options.previousLessonsSummary ? `## Previous Lessons Context\n${options.previousLessonsSummary}\n` : ''}

${STYLE_GUIDE}

## Output Format
Return a JSON object with this exact structure:
{
  "title": "${options.lessonTitle}",
  "description": "A compelling 2-3 sentence description of what the learner will master",
  "estimatedMinutes": 20,
  "contentType": "TEXT",
  "content": {
    "sections": [
      {
        "type": "text",
        "data": {
          "title": "Section Title",
          "body": "Comprehensive markdown content (300-500 words)...",
          "highlights": ["Key insight 1", "Key insight 2", "Key insight 3", "Key insight 4"],
          "examples": [
            {"title": "Real-World Example", "content": "Detailed example with context (50-100 words)"}
          ]
        }
      }
    ]
  }
}

## CRITICAL Requirements for High-Quality Content
1. Create exactly 5 substantial text sections:
   - Section 1: Introduction & Why This Matters (explain the importance)
   - Section 2: Core Concepts (main teaching, use tables/lists)
   - Section 3: Practical Application (step-by-step guidance)
   - Section 4: Common Mistakes & How to Avoid Them
   - Section 5: Summary & Action Items

2. Each section body MUST be 300-500 words of rich, well-formatted markdown:
   - Use ## and ### headings within the body
   - Include bullet lists with 4-6 items minimum
   - Add tables for comparisons when relevant
   - Use > blockquotes for "Pro Tips" and expert insights
   - Include numbered steps for processes

3. Include 4 highlights per section (specific, actionable takeaways)

4. Include 2-3 detailed examples per main teaching section:
   - Each example should be 50-100 words
   - Include context, the scenario, and the outcome
   - Make examples specific to ${track.name} interviews

5. Content MUST be specific to ${track.name} role with:
   - Industry-specific terminology
   - Role-relevant scenarios
   - Skills that ${track.name}s need

6. The content should feel like a comprehensive course lesson, NOT a blog post

7. Return ONLY valid JSON, no explanations before or after`
}

// ===========================================================
// QUIZ GENERATION PROMPT
// ===========================================================

export function buildQuizPrompt(options: {
  trackId: CareerTrackId
  chapterTitle: string
  lessonTitles: string[]
  keyTerms: string[]
  questionCount: number
  difficulty: 'easy' | 'medium' | 'hard'
}): string {
  const track = CAREER_TRACKS[options.trackId]
  
  const difficultyGuide = {
    easy: 'Focus on recall and basic understanding. Questions should be straightforward.',
    medium: 'Include application questions. Some questions require combining concepts.',
    hard: 'Include scenario-based questions requiring analysis and judgment.',
  }
  
  return `You are an expert career coach creating quiz content for job seekers.

## Task
Generate a quiz to test understanding of the chapter content.

## Context
- **Career Track**: ${track.name}
- **Chapter**: ${options.chapterTitle}
- **Lessons Covered**: ${options.lessonTitles.join(', ')}
- **Key Terms**: ${options.keyTerms.join(', ')}
- **Difficulty**: ${options.difficulty} - ${difficultyGuide[options.difficulty]}

## Output Format
Return a JSON object with this exact structure:
{
  "title": "Chapter ${options.chapterTitle} Quiz",
  "description": "Test your knowledge from this chapter",
  "passingScore": 70,
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "Clear question text?",
      "options": [
        {"id": "a", "text": "Option A"},
        {"id": "b", "text": "Option B"},
        {"id": "c", "text": "Option C"},
        {"id": "d", "text": "Option D"}
      ],
      "correctAnswers": ["b"],
      "explanation": "Explanation of why this answer is correct and others are wrong.",
      "points": 1
    }
  ]
}

## Requirements
1. Generate exactly ${options.questionCount} questions
2. Mix question types:
   - 60% multiple-choice (4 options, 1 correct)
   - 20% true-false (2 options)
   - 20% multi-select (4-5 options, 2-3 correct)
3. Each question must have a clear, helpful explanation
4. Questions should test practical knowledge, not trivia
5. Make questions specific to ${track.name} interviews
6. Avoid trick questions or ambiguous wording
7. Use unique IDs (q1, q2, q3...) for questions
8. Use letter IDs (a, b, c, d, e) for options
9. Return ONLY valid JSON, no explanations`
}

// ===========================================================
// CHAPTER BLUEPRINT PROMPT
// ===========================================================

export function buildChapterBlueprintPrompt(options: {
  trackId: CareerTrackId
  chapterIndex: number
  chapterTitle: string
  chapterDescription: string
  lessonCount: number
}): string {
  const track = CAREER_TRACKS[options.trackId]
  
  return `You are an expert career coach designing a curriculum for job seekers.

## Task
Create a detailed lesson blueprint for a chapter in the Study Room.

## Context
- **Career Track**: ${track.name}
- **Target Audience**: ${track.targetAudience.join(', ')}
- **Key Skills to Develop**: ${track.keySkills.join(', ')}
- **Chapter ${options.chapterIndex}**: ${options.chapterTitle}
- **Chapter Description**: ${options.chapterDescription}

## Output Format
Return a JSON object with this exact structure:
{
  "orderIndex": ${options.chapterIndex},
  "title": "${options.chapterTitle}",
  "description": "${options.chapterDescription}",
  "icon": "📚",
  "estimatedMinutes": 90,
  "isPremium": false,
  "lessons": [
    {
      "orderIndex": 1,
      "title": "Lesson Title",
      "description": "Brief lesson description (1-2 sentences)",
      "estimatedMinutes": 15,
      "contentType": "TEXT",
      "isPremium": false,
      "learningObjectives": [
        "Objective 1",
        "Objective 2",
        "Objective 3"
      ],
      "keyTerms": ["term1", "term2", "term3"]
    }
  ]
}

## Requirements
1. Create exactly ${options.lessonCount} lessons
2. Last lesson should be a QUIZ (contentType: "QUIZ")
3. Lessons should build on each other progressively
4. Each lesson needs 2-4 learning objectives
5. Each lesson needs 3-6 key terms
6. Estimated minutes should be realistic (10-25 min per lesson)
7. Make lessons specific to ${track.name} interviews
8. Total chapter time should be ${options.lessonCount * 15}-${options.lessonCount * 20} minutes
9. Return ONLY valid JSON, no explanations`
}

// ===========================================================
// REGENERATION PROMPT (for fixing failed content)
// ===========================================================

export function buildRegenerationPrompt(
  originalPrompt: string,
  previousOutput: string,
  validationError: string
): string {
  return `${originalPrompt}

## IMPORTANT: Previous Generation Failed
The previous output had validation errors. Please fix them.

### Previous Output (with errors):
\`\`\`json
${previousOutput.substring(0, 2000)}${previousOutput.length > 2000 ? '...' : ''}
\`\`\`

### Validation Errors:
${validationError}

### Instructions:
1. Fix ALL validation errors listed above
2. Ensure the JSON is properly formatted
3. Maintain the same content quality
4. Return ONLY the corrected JSON, no explanations`
}
