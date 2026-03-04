-- AlterTable
ALTER TABLE "instagram_profiles" ADD COLUMN     "data_hash" TEXT;

-- CreateTable
CREATE TABLE "instagram_drafts" (
    "id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "biography" TEXT,
    "profile_pic_url" TEXT,
    "external_url" TEXT,
    "posts" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instagram_drafts_mentee_id_key" ON "instagram_drafts"("mentee_id");

-- AddForeignKey
ALTER TABLE "instagram_drafts" ADD CONSTRAINT "instagram_drafts_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "mentees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
