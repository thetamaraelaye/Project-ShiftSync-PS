-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT,
    "extension" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);
