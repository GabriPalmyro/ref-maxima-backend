-- CreateTable
CREATE TABLE "generated_profile_photos" (
    "id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "generated_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_profile_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_profile_photos_mentee_id_idx" ON "generated_profile_photos"("mentee_id");

-- AddForeignKey
ALTER TABLE "generated_profile_photos" ADD CONSTRAINT "generated_profile_photos_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "mentees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
