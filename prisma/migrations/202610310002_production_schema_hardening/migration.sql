ALTER TABLE "User" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Barber" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Customer" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Service" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Transaction" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "User_role_status_isActive_idx" ON "User"("role", "status", "isActive");
CREATE INDEX "Barber_isActive_name_idx" ON "Barber"("isActive", "name");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");
CREATE INDEX "ServiceOrder_customerId_createdAt_idx" ON "ServiceOrder"("customerId", "createdAt");
CREATE INDEX "Transaction_barberId_createdAt_idx" ON "Transaction"("barberId", "createdAt");

ALTER TABLE "Barber"
  ADD CONSTRAINT "Barber_commissionPct_range" CHECK ("commissionPct" >= 0 AND "commissionPct" <= 100);
ALTER TABLE "Customer"
  ADD CONSTRAINT "Customer_totals_nonnegative" CHECK ("loyaltyPoints" >= 0 AND "totalVisits" >= 0 AND "totalSpent" >= 0);
ALTER TABLE "Service"
  ADD CONSTRAINT "Service_amounts_valid" CHECK ("price" >= 0 AND ("commissionPct" IS NULL OR ("commissionPct" >= 0 AND "commissionPct" <= 100)) AND "durationMinutes" > 0);
ALTER TABLE "ServiceOrder"
  ADD CONSTRAINT "ServiceOrder_amounts_nonnegative" CHECK ("servicePrice" >= 0 AND "commissionAmt" >= 0);
ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_amounts_nonnegative" CHECK ("amount" >= 0 AND "commissionAmount" >= 0);
