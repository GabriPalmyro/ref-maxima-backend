-- CreateTable
CREATE TABLE "perception_analyses" (
    "id" TEXT NOT NULL,
    "mentee_id" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "raw_response" TEXT NOT NULL,
    "model_used" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PROCESSING',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "perception_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "perception_analyses_mentee_id_key" ON "perception_analyses"("mentee_id");

-- AddForeignKey
ALTER TABLE "perception_analyses" ADD CONSTRAINT "perception_analyses_mentee_id_fkey" FOREIGN KEY ("mentee_id") REFERENCES "mentees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
