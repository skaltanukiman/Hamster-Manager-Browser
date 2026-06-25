CREATE TABLE "hamsters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hamsters_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cleaning_records" (
    "id" TEXT NOT NULL,
    "hamsterId" TEXT NOT NULL,
    "recordDate" DATE NOT NULL,
    "toiletCleaned" BOOLEAN NOT NULL DEFAULT false,
    "bathCleaned" BOOLEAN NOT NULL DEFAULT false,
    "flooringPartCleaned" BOOLEAN NOT NULL DEFAULT false,
    "flooringAllCleaned" BOOLEAN NOT NULL DEFAULT false,
    "houseCleaned" BOOLEAN NOT NULL DEFAULT false,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cleaning_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "weight_records" (
    "id" TEXT NOT NULL,
    "hamsterId" TEXT NOT NULL,
    "recordDate" DATE NOT NULL,
    "weightG" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weight_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "hamsters_name_key" ON "hamsters"("name");
CREATE INDEX "cleaning_records_recordDate_idx" ON "cleaning_records"("recordDate");
CREATE UNIQUE INDEX "cleaning_records_hamsterId_recordDate_key" ON "cleaning_records"("hamsterId", "recordDate");
CREATE INDEX "weight_records_recordDate_idx" ON "weight_records"("recordDate");
CREATE UNIQUE INDEX "weight_records_hamsterId_recordDate_key" ON "weight_records"("hamsterId", "recordDate");

ALTER TABLE "cleaning_records"
ADD CONSTRAINT "cleaning_records_hamsterId_fkey"
FOREIGN KEY ("hamsterId") REFERENCES "hamsters"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "weight_records"
ADD CONSTRAINT "weight_records_hamsterId_fkey"
FOREIGN KEY ("hamsterId") REFERENCES "hamsters"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

