CREATE TYPE "Role" AS ENUM ('ADMIN', 'MANAGER', 'BARBER');
CREATE TYPE "UserStatus" AS ENUM ('APPROVED', 'SUSPENDED');
CREATE TYPE "OrderStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'MPESA', 'CARD', 'OTHER');

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT NOT NULL UNIQUE,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL,
  "status" "UserStatus" NOT NULL DEFAULT 'APPROVED',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "fullName" TEXT,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Barber" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT UNIQUE,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Barber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Customer" (
  "id" TEXT PRIMARY KEY,
  "managerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
  "totalVisits" INTEGER NOT NULL DEFAULT 0,
  "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Service" (
  "id" TEXT PRIMARY KEY,
  "managerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "price" DECIMAL(12,2) NOT NULL,
  "commissionPct" DECIMAL(5,2),
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Service_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "ServiceOrder" (
  "id" TEXT PRIMARY KEY,
  "managerId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "barberId" TEXT NOT NULL,
  "servicePrice" DECIMAL(12,2) NOT NULL,
  "commissionAmt" DECIMAL(12,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  "status" "OrderStatus" NOT NULL DEFAULT 'ASSIGNED',
  "notes" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "cancelReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ServiceOrder_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceOrder_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ServiceOrder_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE "Transaction" (
  "id" TEXT PRIMARY KEY,
  "orderId" TEXT NOT NULL UNIQUE,
  "managerId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "barberId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "commissionAmount" DECIMAL(12,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Transaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Transaction_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Transaction_barberId_fkey" FOREIGN KEY ("barberId") REFERENCES "Barber"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Transaction_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "Customer_managerId_isActive_idx" ON "Customer"("managerId", "isActive");
CREATE UNIQUE INDEX "Service_managerId_name_key" ON "Service"("managerId", "name");
CREATE INDEX "Service_managerId_isActive_idx" ON "Service"("managerId", "isActive");
CREATE INDEX "ServiceOrder_managerId_status_createdAt_idx" ON "ServiceOrder"("managerId", "status", "createdAt");
CREATE INDEX "ServiceOrder_barberId_status_idx" ON "ServiceOrder"("barberId", "status");
CREATE INDEX "Transaction_managerId_createdAt_idx" ON "Transaction"("managerId", "createdAt");

-- Prevent concurrent allocation of more than one active order per barber.
CREATE UNIQUE INDEX "one_active_order_per_barber"
ON "ServiceOrder" ("barberId")
WHERE "status" IN ('ASSIGNED', 'IN_PROGRESS');
