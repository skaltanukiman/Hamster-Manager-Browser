CREATE TABLE "app_settings" (
    "id" TEXT NOT NULL,
    "dashboardBoardCount" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "dashboard_hamsters" (
    "id" TEXT NOT NULL,
    "settingId" TEXT NOT NULL,
    "hamsterId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dashboard_hamsters_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "dashboard_hamsters_settingId_hamsterId_key" ON "dashboard_hamsters"("settingId", "hamsterId");

CREATE INDEX "dashboard_hamsters_hamsterId_idx" ON "dashboard_hamsters"("hamsterId");

ALTER TABLE "dashboard_hamsters" ADD CONSTRAINT "dashboard_hamsters_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "app_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dashboard_hamsters" ADD CONSTRAINT "dashboard_hamsters_hamsterId_fkey" FOREIGN KEY ("hamsterId") REFERENCES "hamsters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
