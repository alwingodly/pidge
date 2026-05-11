CREATE TABLE "PlatformLoginContent" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "eyebrow" TEXT NOT NULL DEFAULT 'SaaS operating console',
  "headline" TEXT NOT NULL DEFAULT 'Serious operations, surprisingly human.',
  "description" TEXT NOT NULL DEFAULT 'A calm command center for tenant growth, clinic workflows, bookings, and access control.',
  "panelLabel" TEXT NOT NULL DEFAULT 'Today',
  "statusLabel" TEXT NOT NULL DEFAULT 'Healthy',
  "metricOneLabel" TEXT NOT NULL DEFAULT 'Tenants',
  "metricOneValue" TEXT NOT NULL DEFAULT '28',
  "metricTwoLabel" TEXT NOT NULL DEFAULT 'Bookings',
  "metricTwoValue" TEXT NOT NULL DEFAULT '846',
  "metricThreeLabel" TEXT NOT NULL DEFAULT 'Pending',
  "metricThreeValue" TEXT NOT NULL DEFAULT '12',
  "footerNote" TEXT NOT NULL DEFAULT 'Protected console access for super admins and clinic teams.',
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PlatformLoginContent_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PlatformLoginContent" (
  "id",
  "updatedAt"
) VALUES (
  'default',
  CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;
