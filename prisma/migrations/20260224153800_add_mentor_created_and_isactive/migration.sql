-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE', 'APPLE', 'MENTOR_CREATED');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'PHASE_1', 'PHASE_2', 'PHASE_3', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('PERSONA_ICP', 'POSICIONAMENTO', 'MENSAGEM_CLARA');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "MessageCardType" AS ENUM ('DESEJO', 'PROBLEMA', 'GUIA', 'PLANO', 'CONVITE', 'SUCESSO', 'FRACASSO');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('ACTIVE', 'USED', 'EXPIRED');

-- CreateTable
CREATE TABLE "mentors" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "auth_provider" "AuthProvider" NOT NULL DEFAULT 'EMAIL',
    "google_id" TEXT,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "phone" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_codes" (
    "id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'ACTIVE',
    "mentee_name" TEXT,
    "mentee_email" TEXT,
    "used_by_mentee_id" TEXT,
    "used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mentees" (
    "id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "auth_provider" "AuthProvider" NOT NULL,
    "social_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "phone" TEXT,
    "instagram" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "onboarding_status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mentees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generated_reports" (
    "id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PROCESSING',
    "title" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "raw_response" TEXT,
    "structured_content" JSONB,
    "rendered_html" TEXT,
    "error_message" TEXT,
    "model_used" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_cards" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "card_type" "MessageCardType" NOT NULL,
    "sort_order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body_text" TEXT NOT NULL,
    "bullet_points" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mentors_email_key" ON "mentors"("email");

-- CreateIndex
CREATE UNIQUE INDEX "mentors_google_id_key" ON "mentors"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_code_key" ON "invite_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "invite_codes_used_by_mentee_id_key" ON "invite_codes"("used_by_mentee_id");

-- CreateIndex
CREATE INDEX "invite_codes_mentor_id_idx" ON "invite_codes"("mentor_id");

-- CreateIndex
CREATE INDEX "mentees_mentor_id_idx" ON "mentees"("mentor_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentees_auth_provider_social_id_key" ON "mentees"("auth_provider", "social_id");

-- CreateIndex
CREATE UNIQUE INDEX "mentees_mentor_id_email_key" ON "mentees"("mentor_id", "email");

-- CreateIndex
CREATE INDEX "generated_reports_mentee_id_idx" ON "generated_reports"("mentee_id");

-- CreateIndex
CREATE UNIQUE INDEX "generated_reports_mentee_id_type_key" ON "generated_reports"("mentee_id", "type");

-- CreateIndex
CREATE INDEX "message_cards_mentee_id_idx" ON "message_cards"("mentee_id");

-- CreateIndex
CREATE INDEX "message_cards_report_id_idx" ON "message_cards"("report_id");

-- CreateIndex
CREATE UNIQUE INDEX "message_cards_report_id_card_type_key" ON "message_cards"("report_id", "card_type");

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_used_by_mentee_id_fkey" FOREIGN KEY ("used_by_mentee_id") REFERENCES "mentees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mentees" ADD CONSTRAINT "mentees_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "mentors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "mentees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_cards" ADD CONSTRAINT "message_cards_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "generated_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_cards" ADD CONSTRAINT "message_cards_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "mentees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
