import type { Question } from './question';

export type { Question, QuestionType, Difficulty, QuestionStatus, AttemptResponse, McqOptionsData } from './question';

export type Role = 'STUDENT' | 'PARENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  profileId: string;
  avatarUrl?: string | null;
  isVerified?: boolean;
  isApproved?: boolean;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  subjectId?: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface ExamBoard {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  country: string;
  categories?: Category[];
  _count?: { categories: number };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  order: number;
  examBoardId?: string;
  examBoard?: ExamBoard;
  grades?: Grade[];
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  color?: string | null;
  iconUrl?: string | null;
  comingSoon?: boolean;
  gradeId?: string;
  grade?: Grade;
  /** @deprecated use grade */
  grades?: Grade[];
  examBoard?: ExamBoard;
  pricing?: SubjectPricing | null;
  units?: Unit[];
}

export interface SubjectPricing {
  id: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
}

export interface Grade {
  id: string;
  name: string;
  slug: string;
  order: number;
  categoryId?: string;
  category?: Category;
  subjects?: Subject[];
  /** @deprecated use subjects */
  subject?: Subject;
  /** @deprecated units live on Subject */
  units?: Unit[];
  _count?: { subjects: number; units?: number };
}

export interface Unit {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  order: number;
  subjectId?: string;
  subject?: Subject;
  /** @deprecated use subject */
  grade?: Grade;
  lessonLinks?: { lesson: LessonSummary }[];
  _count?: { lessonLinks: number };
}

export interface LessonSummary {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  estimatedMinutes: number;
  learningObjectives?: string[];
  visualStatus: string;
  status?: string;
}

export interface Lesson extends LessonSummary {
  notesHtml?: string | null;
  notesRawText?: string | null;
  visualHtml?: string | null;
  visualScript?: string | null;
  visualStatus: string;
  learningObjectives: string[];
  practiceQuestions?: Question[];
  paperQuestionLinks?: { paperQuestion: PaperQuestion & { pastPaper: { id: string; title: string; year: number } } }[];
  unitLinks?: {
    unit: Unit & {
      subject?: Subject & {
        grade?: Grade & { category?: Category & { examBoard?: ExamBoard } };
      };
    };
  }[];
}

export interface PaperQuestion {
  id: string;
  questionNumber: string;
  marks: number;
  questionText: string;
  modelAnswer?: string | null;
}

export type PaperType = 'EXAM_PAPER' | 'MARK_SCHEME' | 'SPECIMEN';

export interface PastPaper {
  id: string;
  subjectId: string;
  title: string;
  year: number;
  month: string | null;
  paperNumber: number | null;
  type: PaperType;
  status: string;
  pdfUrl: string;
  pdfSizeBytes: number | null;
  createdAt: string;
  updatedAt: string;
  subject: Subject;
}

export interface LessonProgress {
  id: string;
  lessonId: string;
  isComplete: boolean;
  totalTimeSeconds: number;
  visualWatched: boolean;
  bestScore?: number | null;
  latestScore?: number | null;
  lastAccessedAt?: string | null;
  completedAt?: string | null;
  lesson?: LessonSummary & {
    unitLinks?: {
      unit: {
        subjectId: string;
        subject: { id: string; name: string };
      };
    }[];
  };
}

export interface RecentProgressItem {
  id: string;
  lessonTitle: string;
  subjectName: string;
  latestScore: number | null;
  lastAccessedAt: string | null;
  completedAt: string | null;
  isComplete: boolean;
}

export interface ProgressStats {
  lessonsCompleted: number;
  averageScore: number;
  timeStudiedSeconds: number;
  streakDays: number;
}

export interface Subscription {
  id: string;
  status: string;
  interval: string;
  subject: Subject;
}
