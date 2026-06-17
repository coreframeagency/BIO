import { Prisma } from '@prisma/client';

export interface McqOptionsJson {
  options?: string[];
  correct?: number | number[] | boolean;
  multiSelect?: boolean;
  explanation?: string;
  finalAnswer?: number;
  units?: string;
  tolerance?: number;
}

export interface FillBlanksJson {
  blanks?: string[];
  caseSensitive?: boolean;
}

export type QuestionJson = McqOptionsJson | FillBlanksJson | Prisma.JsonValue;

export const QUESTION_TYPES = [
  'MCQ',
  'MULTIPLE_SELECT',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'TRUE_FALSE',
  'FILL_BLANK',
  'LABEL_DIAGRAM',
  'DATA_ANALYSIS',
  'CALCULATION',
  'MATCHING',
] as const;

export type QuestionTypeValue = (typeof QUESTION_TYPES)[number];
