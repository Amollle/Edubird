import type { GradeLevel } from '@/lib/types';

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDate(value: string | number | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

export function formatTime(value: string | number | Date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Normalizes a grade level value that may have come from the database or
 * user metadata before grades were split into individual 1-12 values (back
 * when the only options were "elementary" / "middle" / "high" / "university").
 * Anything unrecognized falls back to "9".
 */
export function normalizeGradeLevel(value: string | null | undefined): GradeLevel {
  if (!value) {
    return '9';
  }

  if (value === 'university') {
    return 'university';
  }

  if (/^(?:[1-9]|1[0-2])$/.test(value)) {
    return value as GradeLevel;
  }

  if (value === 'elementary') {
    return '3';
  }

  if (value === 'middle') {
    return '7';
  }

  if (value === 'high') {
    return '9';
  }

  return '9';
}

function ordinalSuffix(n: number) {
  const remainderTen = n % 10;
  const remainderHundred = n % 100;

  if (remainderTen === 1 && remainderHundred !== 11) {
    return 'st';
  }

  if (remainderTen === 2 && remainderHundred !== 12) {
    return 'nd';
  }

  if (remainderTen === 3 && remainderHundred !== 13) {
    return 'rd';
  }

  return 'th';
}

/**
 * Human-readable label for a grade level value, e.g. "1" -> "1st Grade",
 * "12" -> "12th Grade", "university" -> "University / Adult".
 */
export function gradeLevelLabel(gradeLevel: string) {
  if (gradeLevel === 'university') {
    return 'University / Adult';
  }

  const num = Number(gradeLevel);
  if (Number.isFinite(num) && num > 0) {
    return `${num}${ordinalSuffix(num)} Grade`;
  }

  return gradeLevel;
}

/**
 * Buckets a fine-grained grade level into a broader reading-level tier, used
 * where content needs a coarser tone/complexity setting rather than a exact
 * per-grade distinction.
 */
export function gradeLevelBucket(gradeLevel: string): 'elementary' | 'middle' | 'high' | 'university' {
  if (gradeLevel === 'university') {
    return 'university';
  }

  const num = Number(gradeLevel);
  if (Number.isFinite(num)) {
    if (num <= 5) {
      return 'elementary';
    }
    if (num <= 8) {
      return 'middle';
    }
  }

  return 'high';
}
