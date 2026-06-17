-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "examBoardId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- AlterTable Grade
ALTER TABLE "Grade" DROP CONSTRAINT IF EXISTS "Grade_subjectId_fkey";
DROP INDEX IF EXISTS "Grade_subjectId_idx";
DROP INDEX IF EXISTS "Grade_subjectId_slug_key";
ALTER TABLE "Grade" DROP COLUMN IF EXISTS "subjectId";
ALTER TABLE "Grade" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
CREATE INDEX IF NOT EXISTS "Grade_categoryId_idx" ON "Grade"("categoryId");
CREATE UNIQUE INDEX IF NOT EXISTS "Grade_categoryId_slug_key" ON "Grade"("categoryId", "slug");
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Subject
ALTER TABLE "Subject" DROP CONSTRAINT IF EXISTS "Subject_examBoardId_fkey";
DROP INDEX IF EXISTS "Subject_examBoardId_idx";
DROP INDEX IF EXISTS "Subject_examBoardId_slug_key";
ALTER TABLE "Subject" DROP COLUMN IF EXISTS "examBoardId";
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "comingSoon" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "gradeId" TEXT;
CREATE INDEX IF NOT EXISTS "Subject_gradeId_idx" ON "Subject"("gradeId");
CREATE UNIQUE INDEX IF NOT EXISTS "Subject_gradeId_slug_key" ON "Subject"("gradeId", "slug");
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Unit
ALTER TABLE "Unit" DROP CONSTRAINT IF EXISTS "Unit_gradeId_fkey";
DROP INDEX IF EXISTS "Unit_gradeId_idx";
DROP INDEX IF EXISTS "Unit_gradeId_slug_key";
ALTER TABLE "Unit" DROP COLUMN IF EXISTS "gradeId";
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
CREATE INDEX IF NOT EXISTS "Unit_subjectId_idx" ON "Unit"("subjectId");
CREATE UNIQUE INDEX IF NOT EXISTS "Unit_subjectId_slug_key" ON "Unit"("subjectId", "slug");
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex Category
CREATE UNIQUE INDEX IF NOT EXISTS "Category_examBoardId_slug_key" ON "Category"("examBoardId", "slug");
CREATE INDEX IF NOT EXISTS "Category_examBoardId_idx" ON "Category"("examBoardId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_examBoardId_fkey" FOREIGN KEY ("examBoardId") REFERENCES "ExamBoard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
