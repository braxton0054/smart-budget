-- Keep the id of the session-scoped OpenWA key so it can be revoked on disconnect.
ALTER TABLE "WaSession" ADD COLUMN "apiKeyId" TEXT;
