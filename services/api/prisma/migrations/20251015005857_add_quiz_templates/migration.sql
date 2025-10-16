-- CreateTable
CREATE TABLE "QuizTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "QuizCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuizCategory_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuizTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuizQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "difficulty" TEXT,
    "points" INTEGER NOT NULL DEFAULT 100,
    "timeLimit" INTEGER NOT NULL DEFAULT 30,
    "explanation" TEXT,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuizQuestion_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuizCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "QuizTemplate_hostId_idx" ON "QuizTemplate"("hostId");

-- CreateIndex
CREATE INDEX "QuizCategory_templateId_idx" ON "QuizCategory"("templateId");

-- CreateIndex
CREATE INDEX "QuizCategory_templateId_displayOrder_idx" ON "QuizCategory"("templateId", "displayOrder");

-- CreateIndex
CREATE INDEX "QuizQuestion_categoryId_idx" ON "QuizQuestion"("categoryId");

-- CreateIndex
CREATE INDEX "QuizQuestion_categoryId_displayOrder_idx" ON "QuizQuestion"("categoryId", "displayOrder");
