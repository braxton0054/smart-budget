-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('ORDER', 'SUBSCRIPTION');

-- AlterTable
ALTER TABLE "Payment"
  ADD COLUMN "kind" "PaymentKind" NOT NULL DEFAULT 'ORDER',
  ADD COLUMN "shopSubscriptionId" TEXT,
  ADD COLUMN "externalReference" TEXT;

-- CreateIndex
CREATE INDEX "Payment_shopSubscriptionId_idx" ON "Payment"("shopSubscriptionId");
CREATE UNIQUE INDEX "Payment_externalReference_key" ON "Payment"("externalReference");

-- AddForeignKey
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_shopSubscriptionId_fkey"
  FOREIGN KEY ("shopSubscriptionId") REFERENCES "ShopSubscription"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
