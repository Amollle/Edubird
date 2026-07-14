import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getGuestProfile } from '@/lib/auth';
import { uploadPassageToStorage } from '@/lib/storage';
import { normalizeGradeLevel } from '@/lib/utils';
import type { HistoryEntry, ReadingPassage, ReadingQuestion, UserProfile } from '@/lib/types';

export async function readProfile(userId: string): Promise<UserProfile> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id,email,display_name,grade_level,avatar_url,is_guest')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('readProfile query failed:', error.message);
    }

    if (data) {
      return {
        id: data.id,
        email: data.email ?? '',
        displayName: data.display_name ?? 'Learner',
        gradeLevel: normalizeGradeLevel(data.grade_level),
        avatarUrl: data.avatar_url ?? undefined,
        isGuest: data.is_guest ?? false
      };
    }
  } catch {
    return getGuestProfile();
  }

  return getGuestProfile();
}

export async function listHistory(userId: string, limit = 8): Promise<HistoryEntry[]> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from('generation_history')
      .select('id,title,topic,source,grade_level,length,word_count,created_at,passage_id,image_url,score_percent')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('listHistory query failed:', error.message);
      return [];
    }

    return (data ?? []).map((entry) => ({
      id: entry.id,
      title: entry.title,
      topic: entry.topic,
      source: entry.source,
      gradeLevel: normalizeGradeLevel(entry.grade_level),
      length: entry.length,
      wordCount: entry.word_count ?? 0,
      createdAt: entry.created_at,
      passageId: entry.passage_id,
      imageUrl: entry.image_url ?? undefined,
      scorePercent: entry.score_percent ?? null
    }));
  } catch {
    return [];
  }
}

export async function getPassageById(passageId: string): Promise<{ passage: ReadingPassage; questions: ReadingQuestion[] } | null> {
  try {
    const admin = createSupabaseAdminClient();
    const { data: passageRow, error: passageError } = await admin
      .from('reading_passages')
      .select('*')
      .eq('id', passageId)
      .maybeSingle();

    if (passageError) {
      console.error('getPassageById passage query failed:', passageError.message);
    }

    if (!passageRow) {
      return null;
    }

    const { data: questionRows, error: questionsError } = await admin
      .from('reading_questions')
      .select('*')
      .eq('passage_id', passageId)
      .order('sort_order', { ascending: true });

    if (questionsError) {
      console.error('getPassageById questions query failed:', questionsError.message);
    }

    return {
      passage: {
        id: passageRow.id,
        title: passageRow.title,
        topic: passageRow.topic,
        gradeLevel: normalizeGradeLevel(passageRow.grade_level),
        length: passageRow.length,
        source: passageRow.source,
        summary: passageRow.summary,
        text: passageRow.text,
        imageUrl: passageRow.image_url ?? undefined,
        wordCount: passageRow.word_count ?? 0,
        createdAt: passageRow.created_at
      },
      questions: (questionRows ?? []).map((row) => ({
        type: row.type,
        question: row.question,
        answer: row.answer,
        options: Array.isArray(row.options) ? row.options : [],
        explanation: row.explanation ?? undefined
      }))
    };
  } catch {
    return null;
  }
}

export async function createReadingRecord(args: {
  userId: string;
  passage: ReadingPassage;
  questions: ReadingQuestion[];
}) {
  const admin = createSupabaseAdminClient();

  const { data: passageRow, error: passageError } = await admin
    .from('reading_passages')
    .insert({
      id: args.passage.id,
      user_id: args.userId,
      title: args.passage.title,
      topic: args.passage.topic,
      grade_level: args.passage.gradeLevel,
      length: args.passage.length,
      source: args.passage.source,
      summary: args.passage.summary,
      text: args.passage.text,
      image_url: args.passage.imageUrl ?? null,
      word_count: args.passage.wordCount
    })
    .select('*')
    .single();

  if (passageError) {
    throw passageError;
  }

  const questionRows = args.questions.map((question, index) => ({
    passage_id: args.passage.id,
    sort_order: index,
    type: question.type,
    question: question.question,
    answer: question.answer,
    options: question.options,
    explanation: question.explanation ?? null
  }));

  const { error: questionError } = await admin.from('reading_questions').insert(questionRows);

  if (questionError) {
    throw questionError;
  }

  const { error: historyError } = await admin.from('generation_history').insert({
    user_id: args.userId,
    passage_id: args.passage.id,
    title: args.passage.title,
    topic: args.passage.topic,
    source: args.passage.source,
    grade_level: args.passage.gradeLevel,
    length: args.passage.length,
    word_count: args.passage.wordCount,
    image_url: args.passage.imageUrl ?? null
  });

  if (historyError) {
    throw historyError;
  }

  // Best-effort: also save a JSON copy of the passage + questions to Supabase
  // Storage. This never blocks or fails the request since the DB rows above
  // are already the source of truth.
  await uploadPassageToStorage(args.passage, args.questions, args.userId);

  return passageRow;
}

export async function recordQuizScore(args: { userId: string; passageId: string; scorePercent: number }) {
  const admin = createSupabaseAdminClient();
  const scorePercent = Math.max(0, Math.min(100, Math.round(args.scorePercent)));

  const { error } = await admin
    .from('generation_history')
    .update({ score_percent: scorePercent })
    .eq('user_id', args.userId)
    .eq('passage_id', args.passageId);

  if (error) {
    throw error;
  }

  return scorePercent;
}
