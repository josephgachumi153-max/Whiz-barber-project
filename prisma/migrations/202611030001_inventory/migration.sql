CREATE TYPE "InventoryMovementType" AS ENUM ('RECEIPT', 'ISSUE', 'ADJUSTMENT');

CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "quantity" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reorderLevel" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costPrice" DECIMAL(12,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryItem_managerId_name_key" ON "InventoryItem"("managerId", "name");
CREATE INDEX "InventoryItem_managerId_isActive_idx" ON "InventoryItem"("managerId", "isActive");
CREATE INDEX "InventoryMovement_inventoryId_createdAt_idx" ON "InventoryMovement"("inventoryId", "createdAt");
CREATE INDEX "InventoryMovement_managerId_createdAt_idx" ON "InventoryMovement"("managerId", "createdAt");

ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
