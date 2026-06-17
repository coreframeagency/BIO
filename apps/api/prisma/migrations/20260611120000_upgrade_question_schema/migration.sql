-- Upgrade question schema for question builder

DROP TABLE IF EXISTS "QuestionAttempt";
DROP TABLE IF EXISTS "Question";

DROP TYPE IF EXISTS "QuestionType";
CREATE TYPE "QuestionType" AS ENUM (
  'MCQ',
  'MULTIPLE_SELECT',
  'SHORT_ANSWER',
  'LONG_ANSWER',
  'TRUE_FALSE',
  'FILL_BLANK',
  'LABEL_DIAGRAM',
  'DATA_ANALYSIS',
  'CALCULATION',
  'MATCHING'
);

CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT,
    "unitId" TEXT,
    "subjectId" TEXT,
    "type" "QuestionType" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "marks" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "questionText" TEXT NOT NULL,
    "questionHtml" TEXT,
    "questionImageUrl" TEXT,
    "questionImagePublicId" TEXT,
    "hintText" TEXT,
    "explanation" TEXT,
    "explanationHtml" TEXT,
    "modelAnswer" TEXT,
    "modelAnswerHtml" TEXT,
    "timerSeconds" INTEGER,
    "tags" TEXT[],
    "examBoard" TEXT,
    "examYear" INTEGER,
    "paperNumber" INTEGER,
    "mcqOptions" JSONB,
    "matchingPairs" JSONB,
    "fillBlanks" JSONB,
    "tableData" JSONB,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuestionAttempt" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "studentAnswer" TEXT NOT NULL,
    "isCorrect" BOOLEAN,
    "marksAwarded" INTEGER,
    "maxMarks" INTEGER,
    "feedback" TEXT,
    "timeTaken" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Question_lessonId_idx" ON "Question"("lessonId");
CREATE INDEX "Question_subjectId_idx" ON "Question"("subjectId");
CREATE INDEX "Question_type_idx" ON "Question"("type");
CREATE INDEX "QuestionAttempt_userId_idx" ON "QuestionAttempt"("userId");
CREATE INDEX "QuestionAttempt_questionId_idx" ON "QuestionAttempt"("questionId");

ALTER TABLE "Question" ADD CONSTRAINT "Question_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Question" ADD CONSTRAINT "Question_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionAttempt" ADD CONSTRAINT "QuestionAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
