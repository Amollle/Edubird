import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import type { ReadingPassage, ReadingQuestion } from '@/lib/types';

export const PASSAGES_BUCKET = 'passages';

/**
 * Uploads the generated passage (plus its questions) as a JSON file to the
 * Supabase Storage bucket defined by PASSAGES_BUCKET. This is best-effort:
 * failures are swallowed so a storage outage never blocks passage generation,
 * since the passage/questions are already persisted in the database tables.
 */
export async function uploadPassageToStorage(
  passage: ReadingPassage,
  questions: ReadingQuestion[],
  userId?: string
): Promise<string | null> {
  try {
    const admin = createSupabaseAdminClient();

    const filePath = userId ? `${userId}/${passage.id}.json` : `guest/${passage.id}.json`;

    const body = JSON.stringify(
      {
        passage,
        questions,
        savedAt: new Date().toISOString()
      },
      null,
      2
    );

    const { error } = await admin.storage.from(PASSAGES_BUCKET).upload(filePath, body, {
      contentType: 'application/json',
      upsert: true
    });

    if (error) {
      console.error('Failed to upload passage to storage:', error.message);
      return null;
    }

    return filePath;
  } catch (error) {
    console.error('Failed to upload passage to storage:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Returns a time-limited signed URL for a stored passage file, since the
 * bucket is private.
 */
export async function getPassageFileSignedUrl(filePath: string, expiresInSeconds = 3600) {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.storage
      .from(PASSAGES_BUCKET)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error) {
      console.error('Failed to sign passage file URL:', error.message);
      return null;
    }

    return data?.signedUrl ?? null;
  } catch (error) {
    console.error('Failed to sign passage file URL:', error instanceof Error ? error.message : error);
    return null;
  }
}
