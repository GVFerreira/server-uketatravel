-- CreateTable
CREATE TABLE "dolar_quote" (
    "id" TEXT NOT NULL,
    "buy_quote" TEXT NOT NULL,
    "sell_quote" TEXT NOT NULL,
    "date_time_quote" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dolar_quote_pkey" PRIMARY KEY ("id")
);
