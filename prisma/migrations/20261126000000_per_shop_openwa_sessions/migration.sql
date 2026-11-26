-- One isolated OpenWA session per shop. Existing rows get a timestamp so the
-- column can be required without dropping data.
ALTER TABLE "WaSession"
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "openwaSessionId" TEXT,
  ADD COLUMN "apiKeyCiphertext" TEXT,
  ADD COLUMN "apiKeyIv" TEXT,
  ADD COLUMN "apiKeyAuthTag" TEXT,
  ADD COLUMN "webhookId" TEXT,
  ADD COLUMN "webhookTokenHash" TEXT,
  ADD COLUMN "webhookSecretCiphertext" TEXT,
  ADD COLUMN "webhookSecretIv" TEXT,
  ADD COLUMN "webhookSecretAuthTag" TEXT,
  ADD COLUMN "stateCiphertext" TEXT,
  ADD COLUMN "stateIv" TEXT,
  ADD COLUMN "stateAuthTag" TEXT,
  ADD COLUMN "stateFingerprint" TEXT,
  ADD COLUMN "stateUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "openwaStatus" TEXT,
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "restriction" TEXT;

CREATE UNIQUE INDEX "WaSession_openwaSessionId_key" ON "WaSession"("openwaSessionId");
CREATE UNIQUE INDEX "WaSession_webhookTokenHash_key" ON "WaSession"("webhookTokenHash");
CREATE INDEX "WaSession_shopId_status_idx" ON "WaSession"("shopId", "status");
