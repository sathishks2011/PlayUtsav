-- CreateTable
CREATE TABLE "ScoringConfiguration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hostId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SessionScoring" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SessionScoring_configId_fkey" FOREIGN KEY ("configId") REFERENCES "ScoringConfiguration" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScoringHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionScoringId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answerTime" INTEGER NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "breakdown" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoringHistory_sessionScoringId_fkey" FOREIGN KEY ("sessionScoringId") REFERENCES "SessionScoring" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlayerScoringStats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionScoringId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "totalAnswers" INTEGER NOT NULL DEFAULT 0,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "incorrectAnswers" INTEGER NOT NULL DEFAULT 0,
    "averageAnswerTime" INTEGER NOT NULL DEFAULT 0,
    "fastestAnswerTime" INTEGER,
    "lastAnswerCorrect" BOOLEAN,
    "lastAnswerTime" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerScoringStats_sessionScoringId_fkey" FOREIGN KEY ("sessionScoringId") REFERENCES "SessionScoring" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "ScoringConfiguration_hostId_idx" ON "ScoringConfiguration"("hostId");

-- CreateIndex
CREATE INDEX "ScoringConfiguration_hostId_isDefault_idx" ON "ScoringConfiguration"("hostId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "SessionScoring_sessionId_key" ON "SessionScoring"("sessionId");

-- CreateIndex
CREATE INDEX "SessionScoring_sessionId_idx" ON "SessionScoring"("sessionId");

-- CreateIndex
CREATE INDEX "ScoringHistory_sessionScoringId_idx" ON "ScoringHistory"("sessionScoringId");

-- CreateIndex
CREATE INDEX "ScoringHistory_sessionScoringId_playerId_idx" ON "ScoringHistory"("sessionScoringId", "playerId");

-- CreateIndex
CREATE INDEX "ScoringHistory_sessionScoringId_questionId_idx" ON "ScoringHistory"("sessionScoringId", "questionId");

-- CreateIndex
CREATE INDEX "PlayerScoringStats_sessionScoringId_idx" ON "PlayerScoringStats"("sessionScoringId");

-- CreateIndex
CREATE INDEX "PlayerScoringStats_playerId_idx" ON "PlayerScoringStats"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerScoringStats_sessionScoringId_playerId_key" ON "PlayerScoringStats"("sessionScoringId", "playerId");
