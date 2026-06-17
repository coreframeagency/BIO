export type QuestionType =
  | 'MCQ'
  | 'MULTIPLE_SELECT'
  | 'SHORT_ANSWER'
  | 'LONG_ANSWER'
  | 'TRUE_FALSE'
  | 'FILL_BLANK'
  | 'LABEL_DIAGRAM'
  | 'DATA_ANALYSIS'
  | 'CALCULATION'
  | 'MATCHING';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface McqOptionsData {
  options?: string[];
  correct?: number | number[] | boolean;
  multiSelect?: boolean;
  explanation?: string;
  finalAnswer?: number;
  units?: string;
  tolerance?: number;
}

export interface FillBlanksData {
  blanks?: string[];
  caseSensitive?: boolean;
}

export interface TableDataJson {
  rows: number;
  cols: number;
  hasHeader: boolean;
  data: string[][];
}

export interface Question {
  id: string;
  lessonId?: string | null;
  type: QuestionType;
  status: QuestionStatus;
  difficulty: Difficulty;
  order: number;
  marks: number;
  questionText: string;
  questionHtml?: string | null;
  questionImageUrl?: string | null;
  hintText?: string | null;
  explanation?: string | null;
  modelAnswer?: string | null;
  mcqOptions?: McqOptionsData | null;
  fillBlanks?: FillBlanksData | null;
  tableData?: TableDataJson | null;
  timerSeconds?: number | null;
  tags?: string[];
}

export interface AttemptResponse {
  isCorrect?: boolean | null;
  marksAwarded?: number;
  maxMarks?: number;
  feedback?: string;
  modelAnswer?: string | null;
  explanation?: string;
  result?: 'CORRECT' | 'INCORRECT' | 'PARTIAL' | 'SELF_MARKED';
  blankResults?: { index: number; correct: boolean; expected: string }[];
}
