-- CreateTable
CREATE TABLE "instagram_profiles" (
    "id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT,
    "biography" TEXT,
    "profile_pic_url" TEXT,
    "follower_count" INTEGER NOT NULL DEFAULT 0,
    "following_count" INTEGER NOT NULL DEFAULT 0,
    "post_count" INTEGER NOT NULL DEFAULT 0,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "category" TEXT,
    "external_url" TEXT,
    "posts" JSONB DEFAULT '[]',
    "raw_response" JSONB,
    "scrape_status" TEXT NOT NULL DEFAULT 'success',
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instagram_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "instagram_profiles_mentee_id_key" ON "instagram_profiles"("mentee_id");

-- AddForeignKey
ALTER TABLE "instagram_profiles" ADD CONSTRAINT "instagram_profiles_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "mentees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
