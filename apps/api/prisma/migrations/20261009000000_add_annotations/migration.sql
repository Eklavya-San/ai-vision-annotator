-- CreateTable
CREATE TABLE "Annotation" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "bbox" JSONB,
    "polygon" JSONB,
    "isCorrected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Annotation_imageId_label_idx" ON "Annotation"("imageId", "label");

-- AddForeignKey
ALTER TABLE "Annotation" ADD CONSTRAINT "Annotation_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE CASCADE ON UPDATE CASCADE;
