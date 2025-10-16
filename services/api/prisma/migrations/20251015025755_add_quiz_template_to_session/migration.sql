-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'LOBBY',
    "hostName" TEXT,
    "hostId" TEXT,
    "quizTemplateId" TEXT,
    "currentCategoryIndex" INTEGER NOT NULL DEFAULT 0,
    "currentQuestionIndex" INTEGER NOT NULL DEFAULT 0,
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "language" TEXT NOT NULL DEFAULT 'en',
    "playerEngagementType" TEXT NOT NULL DEFAULT 'CHOICE_ANSWER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Session_quizTemplateId_fkey" FOREIGN KEY ("quizTemplateId") REFERENCES "QuizTemplate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("code", "createdAt", "hostId", "hostName", "id", "language", "maxPlayers", "playerEngagementType", "status", "updatedAt") SELECT "code", "createdAt", "hostId", "hostName", "id", "language", "maxPlayers", "playerEngagementType", "status", "updatedAt" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE UNIQUE INDEX "Session_code_key" ON "Session"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
