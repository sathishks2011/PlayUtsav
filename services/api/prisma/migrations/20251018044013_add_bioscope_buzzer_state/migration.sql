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
    "playerEngagementType" TEXT,
    "buzzerState" TEXT,
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
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
