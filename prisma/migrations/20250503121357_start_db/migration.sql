-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('PASSWORD_RECOVER');

-- CreateEnum
CREATE TYPE "AccountProvider" AS ENUM ('GITHUB');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER', 'BILLING');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "provider" "AccountProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "date_birth" TEXT NOT NULL,
    "passport_number" TEXT NOT NULL,
    "passport_expiry_date" TEXT NOT NULL,
    "nationality" TEXT NOT NULL,
    "passport_country_issue" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zip_code" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "other_nationality" TEXT,
    "occupation" TEXT,
    "has_criminal_conviction" BOOLEAN,
    "has_criminal_conviction_last_year" BOOLEAN,
    "crime_has_been_convicted" TEXT,
    "country_crime_has_been_convicted" TEXT,
    "convicted_more_than_one_year" BOOLEAN,
    "has_ever_convicted_more_than_one_year" BOOLEAN,
    "crime_convicted_more_than_one_year" TEXT,
    "country_convicted_more_than_one_year" TEXT,
    "initial_date_convicted_more_than_one_year" TEXT,
    "end_date_convicted_more_than_one_year" TEXT,
    "which_situation_was_involved" TEXT,
    "passport_url" TEXT,
    "profile_photo_url" TEXT,

    CONSTRAINT "solicitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "id_client" TEXT NOT NULL,
    "id_order" TEXT NOT NULL,
    "transaction_amount" DOUBLE PRECISION NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "docType" TEXT NOT NULL DEFAULT 'CPF',
    "doc_number" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payment_type_id" TEXT NOT NULL,
    "qr_code" TEXT,
    "qr_code_base_64" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitation_payment" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "solicitationsId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "solicitation_payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_account_id_key" ON "accounts"("provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_user_id_key" ON "accounts"("provider", "user_id");

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitation_payment" ADD CONSTRAINT "solicitation_payment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitation_payment" ADD CONSTRAINT "solicitation_payment_solicitationsId_fkey" FOREIGN KEY ("solicitationsId") REFERENCES "solicitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
