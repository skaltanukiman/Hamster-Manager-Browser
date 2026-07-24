-- CreateEnum
CREATE TYPE "ContactInquiryCategory" AS ENUM ('BUG', 'HOW_TO', 'FEATURE_REQUEST', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "ContactInquiryStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ContactSenderType" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "contact_inquiries" (
    "id" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_id_snapshot" TEXT NOT NULL,
    "user_name_snapshot" TEXT NOT NULL,
    "user_email_snapshot" TEXT,
    "category" "ContactInquiryCategory" NOT NULL,
    "subject" VARCHAR(100) NOT NULL,
    "search_text" TEXT NOT NULL,
    "status" "ContactInquiryStatus" NOT NULL DEFAULT 'OPEN',
    "source_path" VARCHAR(300),
    "error_id" VARCHAR(128),
    "assigned_admin_user_id" TEXT,
    "assigned_admin_name_snapshot" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "contact_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_inquiry_messages" (
    "id" TEXT NOT NULL,
    "inquiry_id" TEXT NOT NULL,
    "sender_type" "ContactSenderType" NOT NULL,
    "sender_user_id" TEXT,
    "sender_user_id_snapshot" TEXT NOT NULL,
    "sender_name_snapshot" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_inquiry_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contact_inquiries_public_id_key" ON "contact_inquiries"("public_id");
CREATE INDEX "contact_inquiries_status_updated_at_id_idx" ON "contact_inquiries"("status", "updated_at", "id");
CREATE INDEX "contact_inquiries_user_id_updated_at_id_idx" ON "contact_inquiries"("user_id", "updated_at", "id");
CREATE INDEX "contact_inquiries_category_updated_at_id_idx" ON "contact_inquiries"("category", "updated_at", "id");
CREATE INDEX "contact_inquiries_assigned_admin_user_id_updated_at_id_idx" ON "contact_inquiries"("assigned_admin_user_id", "updated_at", "id");
CREATE INDEX "contact_inquiries_updated_at_id_idx" ON "contact_inquiries"("updated_at", "id");
CREATE INDEX "contact_inquiry_messages_inquiry_id_created_at_id_idx" ON "contact_inquiry_messages"("inquiry_id", "created_at", "id");
CREATE INDEX "contact_inquiry_messages_sender_user_id_idx" ON "contact_inquiry_messages"("sender_user_id");

-- AddForeignKey
ALTER TABLE "contact_inquiries" ADD CONSTRAINT "contact_inquiries_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_inquiries" ADD CONSTRAINT "contact_inquiries_assigned_admin_user_id_fkey"
FOREIGN KEY ("assigned_admin_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "contact_inquiry_messages" ADD CONSTRAINT "contact_inquiry_messages_inquiry_id_fkey"
FOREIGN KEY ("inquiry_id") REFERENCES "contact_inquiries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contact_inquiry_messages" ADD CONSTRAINT "contact_inquiry_messages_sender_user_id_fkey"
FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
