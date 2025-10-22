/*
  Warnings:

  - You are about to drop the column `buzzerState` on the `BioscopeSession` table. All the data in the column will be lost.
  - You are about to drop the column `playerEngagementType` on the `BioscopeSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Score" ADD COLUMN "gameId" TEXT;
ALTER TABLE "Score" ADD COLUMN "gameType" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BioscopeSession" (
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
    CONSTRAINT "BioscopeSession_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BioscopeSession_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "BioscopeTemplate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_BioscopeSession" ("createdAt", "currentImageId", "currentRoundId", "id", "revealedImages", "sessionId", "status", "templateId", "timerDuration", "timerStartedAt", "updatedAt") SELECT "createdAt", "currentImageId", "currentRoundId", "id", "revealedImages", "sessionId", "status", "templateId", "timerDuration", "timerStartedAt", "updatedAt" FROM "BioscopeSession";
DROP TABLE "BioscopeSession";
ALTER TABLE "new_BioscopeSession" RENAME TO "BioscopeSession";
CREATE UNIQUE INDEX "BioscopeSession_sessionId_key" ON "BioscopeSession"("sessionId");
CREATE INDEX "BioscopeSession_sessionId_idx" ON "BioscopeSession"("sessionId");
CREATE INDEX "BioscopeSession_templateId_idx" ON "BioscopeSession"("templateId");
CREATE TABLE "new_UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSession" ("createdAt", "expiresAt", "id", "ipAddress", "refreshToken", "userAgent", "userId") SELECT "createdAt", "expiresAt", "id", "ipAddress", "refreshToken", "userAgent", "userId" FROM "UserSession";
DROP TABLE "UserSession";
ALTER TABLE "new_UserSession" RENAME TO "UserSession";
CREATE UNIQUE INDEX "UserSession_refreshToken_key" ON "UserSession"("refreshToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Score_sessionId_gameType_idx" ON "Score"("sessionId", "gameType");
