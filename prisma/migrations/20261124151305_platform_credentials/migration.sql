-- CreateTable
CREATE TABLE "PlatformCredential" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "authTag" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformCredential_key_key" ON "PlatformCredential"("key");
