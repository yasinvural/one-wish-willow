-- CreateTable
CREATE TABLE "Wish" (
    "id" TEXT NOT NULL,
    "text" VARCHAR(280) NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "anonymousVisitorHash" TEXT NOT NULL,
    "x" INTEGER NOT NULL,
    "y" INTEGER NOT NULL,
    "clusterCell" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wish_anonymousVisitorHash_key" ON "Wish"("anonymousVisitorHash");

-- CreateIndex
CREATE INDEX "Wish_isHidden_clusterCell_idx" ON "Wish"("isHidden", "clusterCell");

-- CreateIndex
CREATE INDEX "Wish_isHidden_x_y_idx" ON "Wish"("isHidden", "x", "y");
