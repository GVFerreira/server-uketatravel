/*
  Warnings:

  - Changed the type of `buy_quote` on the `dolar_quote` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sell_quote` on the `dolar_quote` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "dolar_quote" DROP COLUMN "buy_quote",
ADD COLUMN     "buy_quote" DOUBLE PRECISION NOT NULL,
DROP COLUMN "sell_quote",
ADD COLUMN     "sell_quote" DOUBLE PRECISION NOT NULL;
