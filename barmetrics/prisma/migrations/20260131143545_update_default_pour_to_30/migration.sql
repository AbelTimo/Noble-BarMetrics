-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MeasurementSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "location" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "mode" TEXT NOT NULL DEFAULT 'standard',
    "sourceSessionId" TEXT,
    "defaultPourMl" REAL DEFAULT 30,
    "hasAnomalies" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MeasurementSession_sourceSessionId_fkey" FOREIGN KEY ("sourceSessionId") REFERENCES "MeasurementSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_MeasurementSession" ("completedAt", "defaultPourMl", "hasAnomalies", "id", "location", "mode", "name", "sourceSessionId", "startedAt") SELECT "completedAt", "defaultPourMl", "hasAnomalies", "id", "location", "mode", "name", "sourceSessionId", "startedAt" FROM "MeasurementSession";
DROP TABLE "MeasurementSession";
ALTER TABLE "new_MeasurementSession" RENAME TO "MeasurementSession";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
