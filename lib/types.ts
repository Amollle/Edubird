export type GradeLevel =
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | '11'
  | '12'
  | 'university';

export type PassageLength = 'short' | 'medium' | 'long';

export type ArticleSource = {
  title: string;
  link?: string;
  source: string;
  publishedAt?: string;
  summary: string;
  imageUrl?: string;
  category?: string;
};

export type ReadingQuestion = {
  type: 'main_idea' | 'detail' | 'vocabulary' | 'inference' | 'purpose';
  question: string;
  answer: string;
  options: string[];
  explanation?: string;
};

export type ReadingPassage = {
  id: string;
  title: string;
  topic: string;
  gradeLevel: GradeLevel;
  length: PassageLength;
  source: string;
  summary: string;
  text: string;
  imageUrl?: string;
  wordCount: number;
  createdAt: string;
};

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  gradeLevel: GradeLevel;
  avatarUrl?: string;
  isGuest?: boolean;
};

export type HistoryEntry = {
  id: string;
  title: string;
  topic: string;
  source: string;
  gradeLevel: GradeLevel;
  length: PassageLength;
  wordCount: number;
  createdAt: string;
  passageId: string;
  imageUrl?: string;
  scorePercent?: number | null;
};
