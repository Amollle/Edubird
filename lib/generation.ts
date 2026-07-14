import { z } from 'zod';
import { agnesChat, agnesGenerateImage } from '@/lib/agnes';
import { buildFallbackPassage, buildQuestions } from '@/lib/mock-data';
import { gradeLevelLabel, slugify } from '@/lib/utils';
import { type ArticleSource, type GradeLevel, type PassageLength, type ReadingPassage, type ReadingQuestion } from '@/lib/types';

const QUESTION_TYPES = ['main_idea', 'detail', 'vocabulary', 'inference', 'purpose'] as const;

const GenerationSchema = z.object({
  title: z.string(),
  summary: z.string(),
  passage: z.string(),
  // Deliberately allows an empty array (not .min(1)): a missing/short
  // "questions" array should never invalidate an otherwise-good passage.
  // generateReadingPackage tops up any shortfall separately.
  questions: z.array(
    z.object({
      type: z.enum(QUESTION_TYPES),
      question: z.string(),
      answer: z.string(),
      options: z.array(z.string()).min(2),
      explanation: z.string().optional()
    })
  )
});

/**
 * Maps loose/alternate wording models sometimes use for a question "type"
 * onto our fixed five-value enum, instead of rejecting the whole response
 * over a wording mismatch.
 */
const QUESTION_TYPE_ALIASES: Record<string, (typeof QUESTION_TYPES)[number]> = {
  main_idea: 'main_idea',
  mainidea: 'main_idea',
  'main idea': 'main_idea',
  theme: 'main_idea',
  gist: 'main_idea',
  summary: 'main_idea',
  detail: 'detail',
  details: 'detail',
  comprehension: 'detail',
  factual: 'detail',
  fact: 'detail',
  'supporting detail': 'detail',
  vocabulary: 'vocabulary',
  vocab: 'vocabulary',
  definition: 'vocabulary',
  'word meaning': 'vocabulary',
  meaning: 'vocabulary',
  inference: 'inference',
  inferential: 'inference',
  analysis: 'inference',
  reasoning: 'inference',
  purpose: 'purpose',
  "author's purpose": 'purpose',
  'authors purpose': 'purpose',
  intent: 'purpose',
  tone: 'purpose'
};

/**
 * Normalizes a raw (parsed but unvalidated) AI response into the exact
 * shape GenerationSchema expects, before validation. Models frequently drift
 * from exact instructions in small, predictable ways — using "pass" instead
 * of "passage", or free-text question type labels instead of our fixed enum
 * — and rejecting the whole generation over that is wasteful when the intent
 * is obvious.
 */
function normalizeGenerationPayload(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null) {
    return raw;
  }

  const obj = raw as Record<string, unknown>;

  const passage = obj.passage ?? obj.pass ?? obj.body ?? obj.content ?? obj.article ?? obj.text;

  const questionsRaw = Array.isArray(obj.questions)
    ? obj.questions
    : Array.isArray(obj.quiz)
      ? obj.quiz
      : [];

  const questions = questionsRaw
    .map((question) => {
      if (typeof question !== 'object' || question === null) {
        return null;
      }

      const q = question as Record<string, unknown>;
      const rawType = String(q.type ?? '')
        .toLowerCase()
        .trim();
      const isDirectMatch = (QUESTION_TYPES as readonly string[]).includes(rawType);
      const mappedType = QUESTION_TYPE_ALIASES[rawType] ?? (isDirectMatch ? (rawType as (typeof QUESTION_TYPES)[number]) : undefined);

      const questionText = q.question ?? q.prompt;
      const answer = q.answer ?? q.correctAnswer ?? q.correct_answer;
      const options = q.options ?? q.choices;

      // Drop individually malformed questions instead of letting one bad
      // item invalidate the entire array (and, transitively, the passage
      // that was otherwise fine).
      if (typeof questionText !== 'string' || typeof answer !== 'string' || !Array.isArray(options) || options.length < 2) {
        return null;
      }

      return {
        ...q,
        type: mappedType ?? 'detail',
        question: questionText,
        answer,
        options
      };
    })
    .filter((question): question is NonNullable<typeof question> => question !== null);

  return {
    ...obj,
    passage,
    questions
  };
}

export function getTargetWordCount(length: PassageLength) {
  if (length === 'short') {
    return 220;
  }

  if (length === 'long') {
    return 950;
  }

  return 520;
}

function buildSystemPrompt() {
  return [
    'You are Edubird.ai, an educational writer who turns short news blurbs into original, standalone reading passages for students.',
    'You will usually only be given a short headline and a one- or two-sentence summary of a news article, not the full article text. That summary is your INSPIRATION, not your source material to condense.',
    'CRITICAL RULE: The finished "passage" must NEVER be a summary, rewording, or lightly-expanded version of the input summary. If someone compared your passage side-by-side with the input summary, it should be obvious you wrote something much bigger than what you were given, not that you repeated it back.',
    'To do this, your passage must always contain these five parts, written as flowing prose paragraphs (do not print these labels in the output, just write the paragraphs in this order):',
    '1) A short hook paragraph that introduces the news event.',
    '2) A background paragraph explaining context the student would need to understand this topic, that is NOT in the original summary at all (history of the topic, how the underlying technology/system/institution works, or relevant prior events).',
    '3) An explanation paragraph that defines and explains at least one key term or concept from the topic in plain language suited to the grade level.',
    '4) A "why this matters" paragraph describing real-world impact, who is affected, and why someone should care.',
    '5) A closing paragraph raising an open question, a differing perspective, or what might happen next.',
    'Each of those five paragraphs must contain genuinely new sentences you composed yourself, not sentences copied or lightly reworded from the input summary.',
    'You must hit the requested target word count closely (within about 15%) purely through this added substance, never through filler, repetition, or restating the same sentence in different words.',
    'Match vocabulary, sentence length, and complexity to the exact grade level you are given: a 2nd-grade passage should use short sentences and simple words, while a 12th-grade or university passage can use longer sentences, precise vocabulary, and more nuanced ideas.',
    'Return only valid JSON with EXACTLY these top-level keys, spelled exactly this way: "title", "summary", "passage", "questions". Do not rename, abbreviate, or substitute any of these keys (for example, never use "pass" instead of "passage"). Do not include markdown fences or any text outside the JSON object.',
    'Questions must be multiple choice with exactly 4 options each. Each question object must have a "type" field whose value is EXACTLY one of these five strings, with no other wording allowed: "main_idea", "detail", "vocabulary", "inference", "purpose".',
    'For every question, the "answer" field must be an exact, character-for-character copy of one of the strings in that question\'s "options" array. Never write an answer that paraphrases or differs even slightly from its matching option text.'
  ].join(' ');
}

/**
 * Estimates a generous max_tokens budget for the chat completion. Without an
 * explicit limit, some providers default to a small max_tokens value that
 * can silently truncate the JSON response before the "passage" and
 * "questions" fields are finished — which shows up as those two fields
 * failing schema validation while "title"/"summary" (written earlier in the
 * JSON) still pass.
 */
function computeMaxTokens(targetWords: number, questionCount: number) {
  const passageTokens = Math.ceil(targetWords * 2.2);
  const questionsTokens = questionCount * 220;
  const overhead = 800;
  return Math.min(12000, passageTokens + questionsTokens + overhead);
}

/**
 * Parses and validates a raw chat completion response, stripping accidental
 * markdown code fences first (some models wrap JSON in ```json fences
 * despite instructions not to). Logs a preview of the raw content on failure
 * so the actual shape mismatch is visible in server logs instead of being a
 * black box.
 */
function parseGenerationResponse(raw: string) {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');

  try {
    return GenerationSchema.parse(normalizeGenerationPayload(JSON.parse(cleaned)));
  } catch (error) {
    console.error(
      'generateReadingPackage: failed to parse/validate Agnes response. Raw content (truncated):',
      cleaned.slice(0, 1000)
    );
    throw error;
  }
}

function buildUserPrompt(article: ArticleSource, gradeLevel: GradeLevel, length: PassageLength, questionCount: number) {
  const targetWords = getTargetWordCount(length);
  return JSON.stringify({
    title: article.title,
    source: article.source,
    topicHint: article.category || article.title,
    gradeLevel,
    length,
    targetWords,
    questionCount,
    articleSummary: article.summary,
    articleLink: article.link || ''
  });
}

/**
 * Rejects a generated passage that is too short or is essentially just the
 * input summary restated. This is the hard enforcement backing the "never a
 * summary" rule — prompting alone isn't reliable enough on its own.
 */
function isPassageInsufficient(passageText: string, articleSummary: string, targetWords: number) {
  const wordCount = passageText.split(/\s+/).filter(Boolean).length;
  if (wordCount < targetWords * 0.6) {
    return true;
  }

  const normalizedPassage = passageText.trim().toLowerCase();
  const normalizedSummary = articleSummary.trim().toLowerCase();
  if (normalizedSummary.length > 20 && normalizedPassage.includes(normalizedSummary)) {
    return true;
  }

  return false;
}

/**
 * Ensures every question's `answer` is guaranteed to be an exact match for
 * one of its `options`, even if the model didn't follow instructions
 * perfectly. Without this, the reader UI can never determine which option is
 * correct.
 */
function reconcileAnswerWithOptions(question: ReadingQuestion): ReadingQuestion {
  if (question.options.includes(question.answer)) {
    return question;
  }

  // Try a loose match (case/whitespace-insensitive) before giving up.
  const normalizedAnswer = question.answer.trim().toLowerCase();
  const looseMatchIndex = question.options.findIndex((option) => option.trim().toLowerCase() === normalizedAnswer);

  if (looseMatchIndex !== -1) {
    return { ...question, answer: question.options[looseMatchIndex] };
  }

  // No match at all: force the intended answer text into the option list so
  // the reader UI always has a valid option to mark as correct.
  const options = [question.answer, ...question.options.filter((option) => option !== question.answer)].slice(0, 4);
  return { ...question, options };
}

/**
 * Randomizes the order of a question's options. Without this, the correct
 * answer tends to land in the same position every time (e.g. always first),
 * both for canned fallback questions and after reconcileAnswerWithOptions
 * forces a match into place.
 */
function shuffleOptions(question: ReadingQuestion): ReadingQuestion {
  const options = [...question.options];
  for (let i = options.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { ...question, options };
}

/**
 * Tops up a question list to the exact requested count using questions
 * derived from the real (already-generated) passage text, instead of either
 * shortchanging the user on question count or discarding an otherwise-good
 * AI passage just because the AI under-delivered on questions.
 */
function ensureQuestionCount(
  existing: ReadingQuestion[],
  count: number,
  title: string,
  topic: string,
  passageText: string
): ReadingQuestion[] {
  if (existing.length >= count) {
    return existing.slice(0, count);
  }

  if (existing.length === 0) {
    return buildQuestions(title, topic, passageText, count);
  }

  const filler = buildQuestions(title, topic, passageText, count).slice(existing.length);
  return [...existing, ...filler];
}

export async function generateReadingPackage(args: {
  article: ArticleSource;
  gradeLevel: GradeLevel;
  length: PassageLength;
  questionCount: number;
}) {
  const { article, gradeLevel, length, questionCount } = args;
  const targetWords = getTargetWordCount(length);

  let title = article.title;
  let summary = article.summary;
  let passage = `${article.summary}\n\n${article.summary} ${article.summary}`.trim();
  let questions: ReadingQuestion[] = buildQuestions(article.title, article.category || article.title, passage, questionCount);

  try {
    if (process.env.AGNES_API_KEY) {
      const userMessage = [
        `Create an original educational passage for ${gradeLevelLabel(gradeLevel)} students, using the article data below only as a starting point.`,
        `Length target: about ${targetWords} words. This must be a real passage of that length, not a short summary padded with repetition.`,
        `Question count: ${questionCount}.`,
        `Use this article data: ${buildUserPrompt(article, gradeLevel, length, questionCount)}`
      ].join('\n');

      const maxTokens = computeMaxTokens(targetWords, questionCount);

      const raw = await agnesChat({
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.35,
        maxTokens
      });

      let parsed = parseGenerationResponse(raw);

      if (isPassageInsufficient(parsed.passage, article.summary, targetWords)) {
        // The model produced something too short or too close to the input
        // summary. Give it one more chance with an explicit correction
        // before giving up on the AI path entirely.
        const retryRaw = await agnesChat({
          messages: [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: userMessage },
            { role: 'assistant', content: raw },
            {
              role: 'user',
              content:
                'That passage was too short or too close to a restatement of the input summary. Rewrite it completely following the five-paragraph structure (hook, background, key term explanation, why it matters, closing question), reach the target word count through genuinely new content, and make sure it does not resemble the input summary. Return the full corrected JSON object.'
            }
          ],
          temperature: 0.5,
          maxTokens
        });

        const retryParsed = parseGenerationResponse(retryRaw);
        if (!isPassageInsufficient(retryParsed.passage, article.summary, targetWords)) {
          parsed = retryParsed;
        } else {
          // Still insufficient after a retry: don't ship a disguised summary.
          // Fall through to the fallback passage below via the catch block.
          throw new Error('Generated passage failed the anti-summary check after retry.');
        }
      }

      title = parsed.title || title;
      summary = parsed.summary || summary;
      passage = parsed.passage || passage;

      const aiQuestions = parsed.questions.map((question) => ({
        ...question,
        explanation:
          question.explanation || `This question checks comprehension of "${title}" for ${gradeLevelLabel(gradeLevel)} readers.`
      }));

      if (aiQuestions.length < questionCount) {
        // "questions" is the last key in our requested JSON shape, so the
        // end of the raw response (not the start) is what actually shows
        // what the model did with it — log the tail, not the head.
        console.error(
          `generateReadingPackage: AI returned ${aiQuestions.length}/${questionCount} questions, topping up from the passage. End of raw response (truncated):`,
          raw.length > 2500 ? `...${raw.slice(-2500)}` : raw
        );
      }

      questions = ensureQuestionCount(aiQuestions, questionCount, title, article.category || article.title, passage).map(
        (question) => shuffleOptions(reconcileAnswerWithOptions(question))
      );
    } else {
      console.error('generateReadingPackage: AGNES_API_KEY is not set, using fallback passage.');
      const fallback = buildFallbackPassage(article, gradeLevel, targetWords);
      title = fallback.title;
      summary = fallback.summary;
      passage = fallback.text;
      questions = buildQuestions(title, article.category || article.title, passage, questionCount).map((question) =>
        shuffleOptions(reconcileAnswerWithOptions(question))
      );
    }
  } catch (error) {
    console.error(
      'generateReadingPackage: AI generation failed, using fallback passage. Reason:',
      error instanceof Error ? error.message : error
    );
    const fallback = buildFallbackPassage(article, gradeLevel, targetWords);
    title = fallback.title;
    summary = fallback.summary;
    passage = fallback.text;
    questions = buildQuestions(title, article.category || article.title, passage, questionCount).map((question) =>
      shuffleOptions(reconcileAnswerWithOptions(question))
    );
  }

  let imageUrl = article.imageUrl;
  if (!imageUrl && process.env.AGNES_API_KEY) {
    try {
      imageUrl = await agnesGenerateImage({
        prompt: `Editorial illustration for an Edubird.ai passage about ${article.title}. Clean academic magazine style, blue and gold accents.`,
        size: '1024x1024'
      });
    } catch {
      imageUrl = undefined;
    }
  }

  const passageRecord: ReadingPassage = {
    id: slugify(`${article.title}-${Date.now()}`),
    title,
    topic: article.category || article.title,
    gradeLevel,
    length,
    source: article.source,
    summary,
    text: passage,
    imageUrl,
    wordCount: passage.split(/\s+/).filter(Boolean).length,
    createdAt: new Date().toISOString()
  };

  return {
    passage: passageRecord,
    questions
  };
}
