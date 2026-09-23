-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('NAQD', 'CLICK', 'PAYME');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'NAQD';


-- Ilgari yagona karta usuli Payme edi: to'langan eski buyurtmalar Payme orqali o'tgan
UPDATE "Order" SET "paymentMethod" = 'PAYME' WHERE "paymentStatus" = 'TOLANGAN';
