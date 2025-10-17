-- CreateTable
CREATE TABLE "BioscopeTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hostId" TEXT NOT NULL,
    "configuration" TEXT NOT NULL,
    "rounds" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BioscopeSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "currentRoundId" INTEGER NOT NULL DEFAULT 0,
    "currentImageId" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "revealedImages" TEXT NOT NULL DEFAULT '[]',
    "timerStartedAt" DATETIME,
    "timerDuration" INTEGER NOT NULL DEFAULT 30,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BioscopeSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BioscopeTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BioscopeAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bioscopeId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "participantName" TEXT NOT NULL,
    "roundId" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageRevealedAt" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "isManualScore" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BioscopeAnswer_bioscopeId_fkey" FOREIGN KEY ("bioscopeId") REFERENCES "BioscopeSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BioscopeTemplate_hostId_idx" ON "BioscopeTemplate"("hostId");

-- CreateIndex
CREATE INDEX "BioscopeTemplate_hostId_isPublic_idx" ON "BioscopeTemplate"("hostId", "isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "BioscopeSession_sessionId_key" ON "BioscopeSession"("sessionId");

-- CreateIndex
CREATE INDEX "BioscopeSession_sessionId_idx" ON "BioscopeSession"("sessionId");

-- CreateIndex
CREATE INDEX "BioscopeSession_templateId_idx" ON "BioscopeSession"("templateId");

-- CreateIndex
CREATE INDEX "BioscopeAnswer_bioscopeId_idx" ON "BioscopeAnswer"("bioscopeId");

-- CreateIndex
CREATE INDEX "BioscopeAnswer_bioscopeId_roundId_idx" ON "BioscopeAnswer"("bioscopeId", "roundId");

-- CreateIndex
CREATE UNIQUE INDEX "BioscopeAnswer_bioscopeId_participantId_roundId_key" ON "BioscopeAnswer"("bioscopeId", "participantId", "roundId");
