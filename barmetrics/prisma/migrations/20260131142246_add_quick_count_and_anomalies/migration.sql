-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "abvPercent" REAL NOT NULL,
    "nominalVolumeMl" INTEGER NOT NULL,
    "defaultDensity" REAL NOT NULL DEFAULT 0.95,
    "defaultTareG" REAL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BottleCalibration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "tareWeightG" REAL NOT NULL,
    "fullBottleWeightG" REAL,
    "calibrationMethod" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BottleCalibration_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeasurementSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "location" TEXT,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "mode" TEXT NOT NULL DEFAULT 'standard',
    "sourceSessionId" TEXT,
    "defaultPourMl" REAL DEFAULT 44,
    "hasAnomalies" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "MeasurementSession_sourceSessionId_fkey" FOREIGN KEY ("sourceSessionId") REFERENCES "MeasurementSession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BottleMeasurement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "calibrationId" TEXT,
    "grossWeightG" REAL NOT NULL,
    "tareWeightG" REAL NOT NULL,
    "netMassG" REAL NOT NULL,
    "densityGPerMl" REAL NOT NULL,
    "volumeMl" REAL NOT NULL,
    "volumeL" REAL NOT NULL,
    "percentFull" REAL,
    "poursRemaining" REAL,
    "standardPourMl" REAL,
    "measuredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anomalyFlags" TEXT,
    "previousMeasurementId" TEXT,
    "variancePercent" REAL,
    "isSkipped" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "BottleMeasurement_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "MeasurementSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BottleMeasurement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BottleMeasurement_calibrationId_fkey" FOREIGN KEY ("calibrationId") REFERENCES "BottleCalibration" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BottleMeasurement_previousMeasurementId_fkey" FOREIGN KEY ("previousMeasurementId") REFERENCES "BottleMeasurement" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
