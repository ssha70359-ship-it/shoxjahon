-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('KUTILMOQDA', 'TOLANGAN');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'KUTILMOQDA',
ADD COLUMN     "telegramChargeId" TEXT,
ADD COLUMN     "providerChargeId" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3);
