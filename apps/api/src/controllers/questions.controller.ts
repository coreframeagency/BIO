import { Response, Request } from 'express';
import { z } from 'zod';
import { Difficulty, Prisma, QuestionStatus, QuestionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { getParam } from '../lib/params';
import { FillBlanksJson, McqOptionsJson } from '../lib/questionTypes';
import { markShortAnswerWithHaiku } from '../services/claudeMarking.service';
import { uploadImage } from '../services/cloudinary.service';
import { errorResponse, successResponse } from '../types';

const questionTypeEnum = z.enum([
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
]);

const questionBodySchema = z.object({
  lessonId: z.string().optional(),
  unitId: z.string().optional(),
  subjectId: z.string().optional(),
  type: questionTypeEnum,
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  marks: z.number().int().min(1).max(20).optional(),
  order: z.number().int().optional(),
  questionText: z.string().min(1),
  questionHtml: z.string().optional(),
  questionImageUrl: z.string().optional(),
  hintText: z.string().optional(),
  explanation: z.string().optional(),
  explanationHtml: z.string().optional(),
  modelAnswer: z.string().optional(),
  modelAnswerHtml: z.string().optional(),
  timerSeconds: z.number().int().optional(),
  tags: z.array(z.string()).optional(),
  examBoard: z.string().optional(),
  examYear: z.number().int().optional(),
  paperNumber: z.number().int().optional(),
  mcqOptions: z.unknown().optional(),
  matchingPairs: z.unknown().optional(),
  fillBlanks: z.unknown().optional(),
  tableData: z.unknown().optional(),
});

function parseMcqOptions(value: Prisma.JsonValue | null): McqOptionsJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as McqOptionsJson;
}

function parseFillBlanks(value: Prisma.JsonValue | null): FillBlanksJson {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as FillBlanksJson;
}

function buildQuestionWhere(req: Request): Prisma.QuestionWhereInput {
  const lessonId = req.query.lessonId as string | undefined;
  const subjectId = req.query.subjectId as string | undefined;
  const type = req.query.type as QuestionType | undefined;
  const difficulty = req.query.difficulty as Difficulty | undefined;
  const status = req.query.status as QuestionStatus | undefined;

  const where: Prisma.QuestionWhereInput = {
    ...(lessonId ? { lessonId } : {}),
    ...(subjectId ? { subjectId } : {}),
    ...(type ? { type } : {}),
    ...(difficulty ? { difficulty } : {}),
  };

  if (req.user?.role === 'STUDENT') {
    where.status = 'PUBLISHED';
  } else if (status) {
    where.status = status;
  }

  return where;
}

export async function getQuestions(req: Request, res: Response) {
  const questions = await prisma.question.findMany({
    where: buildQuestionWhere(req),
    orderBy: { order: 'asc' },
  });
  res.json(successResponse(questions));
}

export async function getQuestion(req: Request, res: Response) {
  const question = await prisma.question.findUnique({
    where: { id: getParam(req.params.id) },
  });
  if (!question) {
    res.status(404).json(errorResponse('Question not found'));
    return;
  }
  if (req.user?.role === 'STUDENT' && question.status !== 'PUBLISHED') {
    res.status(404).json(errorResponse('Question not found'));
    return;
  }
  res.json(successResponse(question));
}

export async function createQuestion(req: Request, res: Response) {
  try {
    const data = questionBodySchema.parse(req.body);
    const question = await prisma.question.create({
      data: {
        ...data,
        type: data.type as QuestionType,
        status: (data.status as QuestionStatus) ?? 'DRAFT',
        difficulty: (data.difficulty as Difficulty) ?? 'MEDIUM',
        marks: data.marks ?? 1,
        order: data.order ?? 0,
        tags: data.tags ?? [],
        mcqOptions: data.mcqOptions as Prisma.InputJsonValue | undefined,
        matchingPairs: data.matchingPairs as Prisma.InputJsonValue | undefined,
        fillBlanks: data.fillBlanks as Prisma.InputJsonValue | undefined,
        tableData: data.tableData as Prisma.InputJsonValue | undefined,
        createdById: req.user!.userId,
      },
    });
    res.status(201).json(successResponse(question));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create question';
    res.status(400).json(errorResponse(message));
  }
}

export async function updateQuestion(req: Request, res: Response) {
  try {
    const data = questionBodySchema.partial().parse(req.body);
    const updateData: Prisma.QuestionUpdateInput = {};

    if (data.lessonId !== undefined) updateData.lesson = { connect: { id: data.lessonId } };
    if (data.unitId !== undefined) updateData.unit = { connect: { id: data.unitId } };
    if (data.subjectId !== undefined) updateData.subject = { connect: { id: data.subjectId } };
    if (data.type) updateData.type = data.type as QuestionType;
    if (data.status) updateData.status = data.status as QuestionStatus;
    if (data.difficulty) updateData.difficulty = data.difficulty as Difficulty;
    if (data.marks !== undefined) updateData.marks = data.marks;
    if (data.order !== undefined) updateData.order = data.order;
    if (data.questionText !== undefined) updateData.questionText = data.questionText;
    if (data.questionHtml !== undefined) updateData.questionHtml = data.questionHtml;
    if (data.questionImageUrl !== undefined) updateData.questionImageUrl = data.questionImageUrl;
    if (data.hintText !== undefined) updateData.hintText = data.hintText;
    if (data.explanation !== undefined) updateData.explanation = data.explanation;
    if (data.explanationHtml !== undefined) updateData.explanationHtml = data.explanationHtml;
    if (data.modelAnswer !== undefined) updateData.modelAnswer = data.modelAnswer;
    if (data.modelAnswerHtml !== undefined) updateData.modelAnswerHtml = data.modelAnswerHtml;
    if (data.timerSeconds !== undefined) updateData.timerSeconds = data.timerSeconds;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.examBoard !== undefined) updateData.examBoard = data.examBoard;
    if (data.examYear !== undefined) updateData.examYear = data.examYear;
    if (data.paperNumber !== undefined) updateData.paperNumber = data.paperNumber;
    if (data.mcqOptions !== undefined) updateData.mcqOptions = data.mcqOptions as Prisma.InputJsonValue;
    if (data.matchingPairs !== undefined) {
      updateData.matchingPairs = data.matchingPairs as Prisma.InputJsonValue;
    }
    if (data.fillBlanks !== undefined) updateData.fillBlanks = data.fillBlanks as Prisma.InputJsonValue;
    if (data.tableData !== undefined) updateData.tableData = data.tableData as Prisma.InputJsonValue;

    const question = await prisma.question.update({
      where: { id: getParam(req.params.id) },
      data: updateData,
    });
    res.json(successResponse(question));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update question';
    res.status(400).json(errorResponse(message));
  }
}

export async function deleteQuestion(req: Request, res: Response) {
  const question = await prisma.question.update({
    where: { id: getParam(req.params.id) },
    data: { status: 'ARCHIVED' },
  });
  res.json(successResponse(question));
}

export async function uploadQuestionImage(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json(errorResponse('No image file provided'));
    return;
  }

  try {
    const { url, publicId } = await uploadImage(req.file.buffer, 'exam-platform/questions');
    const question = await prisma.question.update({
      where: { id: getParam(req.params.id) },
      data: {
        questionImageUrl: url,
        questionImagePublicId: publicId,
      },
    });
    res.json(successResponse(question));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image upload failed';
    res.status(500).json(errorResponse(message));
  }
}

const attemptSchema = z.object({
  studentAnswer: z.string().min(1),
  timeTaken: z.number().int().optional(),
  selfRating: z.enum(['poor', 'okay', 'good', 'excellent']).optional(),
});

function parseNumberAnswer(text: string): number | null {
  const match = text.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function markMcq(mcq: McqOptionsJson, studentAnswer: string, marks: number) {
  const options = mcq.options ?? [];
  const selected = parseInt(studentAnswer, 10);
  const correct = mcq.correct;
  const isCorrect =
    typeof correct === 'number' && !Number.isNaN(selected) && selected === correct;
  return {
    isCorrect,
    marksAwarded: isCorrect ? marks : 0,
    feedback: isCorrect
      ? 'Correct!'
      : `Not quite. The correct answer is ${options[correct as number] ?? 'shown below'}.`,
    explanation: mcq.explanation,
  };
}

function markMultipleSelect(mcq: McqOptionsJson, studentAnswer: string, marks: number) {
  let selected: number[] = [];
  try {
    selected = JSON.parse(studentAnswer) as number[];
  } catch {
    selected = studentAnswer.split(',').map((s) => parseInt(s.trim(), 10));
  }
  const correct = Array.isArray(mcq.correct) ? mcq.correct : [];
  const sortedSelected = [...selected].sort((a, b) => a - b);
  const sortedCorrect = [...correct].sort((a, b) => a - b);
  const isCorrect =
    sortedSelected.length === sortedCorrect.length &&
    sortedSelected.every((v, i) => v === sortedCorrect[i]);
  return {
    isCorrect,
    marksAwarded: isCorrect ? marks : 0,
    feedback: isCorrect ? 'Correct!' : 'Not all correct options were selected.',
    explanation: mcq.explanation,
  };
}

function markTrueFalse(mcq: McqOptionsJson, studentAnswer: string, marks: number) {
  const studentBool = studentAnswer.toLowerCase() === 'true';
  const correctBool = mcq.correct === true;
  const isCorrect = studentBool === correctBool;
  return {
    isCorrect,
    marksAwarded: isCorrect ? marks : 0,
    feedback: isCorrect ? 'Correct!' : 'Incorrect.',
    explanation: mcq.explanation,
  };
}

function markFillBlank(fill: FillBlanksJson, studentAnswer: string, marks: number) {
  let answers: string[] = [];
  try {
    answers = JSON.parse(studentAnswer) as string[];
  } catch {
    answers = [studentAnswer];
  }
  const blanks = fill.blanks ?? [];
  const caseSensitive = fill.caseSensitive ?? false;
  let correctCount = 0;
  blanks.forEach((blank, i) => {
    const given = answers[i] ?? '';
    const match = caseSensitive
      ? given.trim() === blank.trim()
      : given.trim().toLowerCase() === blank.trim().toLowerCase();
    if (match) correctCount += 1;
  });
  const isCorrect = correctCount === blanks.length && blanks.length > 0;
  const marksAwarded =
    blanks.length > 0 ? Math.round((correctCount / blanks.length) * marks) : 0;
  return {
    isCorrect,
    marksAwarded,
    feedback: isCorrect
      ? 'All blanks correct!'
      : `${correctCount} of ${blanks.length} blanks correct.`,
    explanation: undefined,
    blankResults: blanks.map((blank, i) => {
      const given = answers[i] ?? '';
      const match = caseSensitive
        ? given.trim() === blank.trim()
        : given.trim().toLowerCase() === blank.trim().toLowerCase();
      return { index: i, correct: match, expected: blank };
    }),
  };
}

function markCalculation(mcq: McqOptionsJson, studentAnswer: string, marks: number) {
  let parsed: { answer?: string; working?: string } = {};
  try {
    parsed = JSON.parse(studentAnswer) as { answer?: string; working?: string };
  } catch {
    parsed = { answer: studentAnswer };
  }
  const studentNum = parseNumberAnswer(parsed.answer ?? studentAnswer);
  const expected = mcq.finalAnswer ?? null;
  const tolerance = mcq.tolerance ?? 0.001;
  const isCorrect =
    studentNum !== null &&
    expected !== null &&
    expected !== 0
      ? Math.abs(studentNum - expected) / Math.abs(expected) <= tolerance
      : studentNum === expected;
  return {
    isCorrect: !!isCorrect,
    marksAwarded: isCorrect ? marks : 0,
    feedback: isCorrect ? 'Correct!' : 'Check your calculation and units.',
    explanation: mcq.explanation,
  };
}

export async function submitAttempt(req: Request, res: Response) {
  try {
    const { studentAnswer, timeTaken, selfRating } = attemptSchema.parse(req.body);
    const question = await prisma.question.findUnique({
      where: { id: getParam(req.params.id) },
    });

    if (!question || question.status !== 'PUBLISHED') {
      res.status(404).json(errorResponse('Question not found'));
      return;
    }

    const mcq = parseMcqOptions(question.mcqOptions);
    const fill = parseFillBlanks(question.fillBlanks);
    let isCorrect: boolean | null = null;
    let marksAwarded = 0;
    let feedback: string | undefined;
    let explanation: string | undefined = question.explanation ?? mcq.explanation;
    let blankResults: { index: number; correct: boolean; expected: string }[] | undefined;

    switch (question.type) {
      case 'MCQ':
      case 'LABEL_DIAGRAM':
      case 'DATA_ANALYSIS':
      case 'MATCHING': {
        const result = markMcq(mcq, studentAnswer, question.marks);
        isCorrect = result.isCorrect;
        marksAwarded = result.marksAwarded;
        feedback = result.feedback;
        explanation = result.explanation ?? explanation;
        break;
      }
      case 'MULTIPLE_SELECT': {
        const result = markMultipleSelect(mcq, studentAnswer, question.marks);
        isCorrect = result.isCorrect;
        marksAwarded = result.marksAwarded;
        feedback = result.feedback;
        explanation = result.explanation ?? explanation;
        break;
      }
      case 'TRUE_FALSE': {
        const result = markTrueFalse(mcq, studentAnswer, question.marks);
        isCorrect = result.isCorrect;
        marksAwarded = result.marksAwarded;
        feedback = result.feedback;
        explanation = result.explanation ?? explanation;
        break;
      }
      case 'FILL_BLANK': {
        const result = markFillBlank(fill, studentAnswer, question.marks);
        isCorrect = result.isCorrect;
        marksAwarded = result.marksAwarded;
        feedback = result.feedback;
        blankResults = result.blankResults;
        break;
      }
      case 'CALCULATION': {
        const result = markCalculation(mcq, studentAnswer, question.marks);
        isCorrect = result.isCorrect;
        marksAwarded = result.marksAwarded;
        feedback = result.feedback;
        explanation = result.explanation ?? explanation;
        break;
      }
      case 'SHORT_ANSWER': {
        if (question.modelAnswer) {
          const marking = await markShortAnswerWithHaiku(
            question.questionText,
            question.modelAnswer,
            question.explanation ?? '',
            studentAnswer,
            question.marks
          );
          isCorrect = marking.isCorrect;
          marksAwarded = marking.marksAwarded;
          feedback = marking.feedback;
        } else {
          isCorrect = null;
          marksAwarded = 0;
          feedback = 'Answer recorded for review.';
        }
        break;
      }
      case 'LONG_ANSWER': {
        isCorrect = null;
        marksAwarded = 0;
        feedback = selfRating
          ? `Self-rated: ${selfRating}. Compare with the model answer below.`
          : 'Compare your answer with the model answer below.';
        break;
      }
      default:
        isCorrect = null;
        marksAwarded = 0;
        feedback = 'Answer recorded.';
    }

    await prisma.questionAttempt.create({
      data: {
        questionId: question.id,
        userId: req.user!.userId,
        studentAnswer,
        isCorrect,
        marksAwarded,
        maxMarks: question.marks,
        feedback,
        timeTaken,
      },
    });

    res.json(
      successResponse({
        isCorrect,
        marksAwarded,
        maxMarks: question.marks,
        feedback,
        modelAnswer: question.modelAnswer,
        explanation,
        blankResults,
        result:
          isCorrect === true
            ? 'CORRECT'
            : isCorrect === false
              ? 'INCORRECT'
              : marksAwarded > 0 && marksAwarded < question.marks
                ? 'PARTIAL'
                : question.type === 'LONG_ANSWER'
                  ? 'SELF_MARKED'
                  : 'PARTIAL',
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to submit attempt';
    res.status(400).json(errorResponse(message));
  }
}

export async function reorderQuestions(req: Request, res: Response) {
  const { orderedIds } = z.object({ orderedIds: z.array(z.string()) }).parse(req.body);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.question.update({ where: { id }, data: { order: index } })
    )
  );

  res.json(successResponse({ message: 'Questions reordered' }));
}
