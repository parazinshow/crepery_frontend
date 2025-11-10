/*
  Warnings:

  - Added the required column `dailyNumber` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateKey` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "variationId" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dailyNumber" INTEGER NOT NULL,
    "dateKey" TEXT NOT NULL,
    "email" TEXT,
    "totalAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "squareId" TEXT NOT NULL,
    "squareOrder" TEXT,
    "receiptUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Order" ("createdAt", "currency", "email", "id", "squareId", "status", "totalAmount") SELECT "createdAt", "currency", "email", "id", "squareId", "status", "totalAmount" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_squareId_key" ON "Order"("squareId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
