-- CreateTable
CREATE TABLE "PastPaperQuestion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT,
    "pastPaperId" TEXT,
    "type" "QuestionType" NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'DRAFT',
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "marks" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    "questionText" TEXT NOT NULL,
    "modelAnswer" TEXT,
    "explanation" TEXT,
    "hintText" TEXT,
    "mcqOptions" JSONB,
    "fillBlanks" JSONB,
    "tableData" JSONB,
    "year" INTEGER,
    "session" TEXT,
    "paperNumber" INTEGER,
    "questionNumber" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PastPaperQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PastPaperQuestion_lessonId_idx" ON "PastPaperQuestion"("lessonId");

-- CreateIndex
CREATE INDEX "PastPaperQuestion_pastPaperId_idx" ON "PastPaperQuestion"("pastPaperId");

-- CreateIndex
CREATE INDEX "PastPaperQuestion_createdById_idx" ON "PastPaperQuestion"("createdById");

-- AddForeignKey
ALTER TABLE "PastPaperQuestion" ADD CONSTRAINT "PastPaperQuestion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestion" ADD CONSTRAINT "PastPaperQuestion_pastPaperId_fkey" FOREIGN KEY ("pastPaperId") REFERENCES "PastPaper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PastPaperQuestion" ADD CONSTRAINT "PastPaperQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
