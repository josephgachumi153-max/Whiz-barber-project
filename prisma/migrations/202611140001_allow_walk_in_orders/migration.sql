-- Allow orders and completed transactions for customers who do not want to provide a name.
ALTER TABLE "ServiceOrder"
  ALTER COLUMN "customerId" DROP NOT NULL;

ALTER TABLE "Transaction"
  ALTER COLUMN "customerId" DROP NOT NULL;
