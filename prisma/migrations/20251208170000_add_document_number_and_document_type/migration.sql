-- AlterTable
ALTER TABLE "signer" ADD COLUMN "document_number" TEXT;
ALTER TABLE "signer" ADD COLUMN "document_type" TEXT DEFAULT 'PF';

-- Migrar dados existentes: copiar cpf para document_number se existir
UPDATE "signer" SET "document_number" = COALESCE("cpf", '00000000000') WHERE "document_number" IS NULL;
UPDATE "signer" SET "document_type" = 'PF' WHERE "document_type" IS NULL;

-- Tornar campos obrigatórios
ALTER TABLE "signer" ALTER COLUMN "document_number" SET NOT NULL;
ALTER TABLE "signer" ALTER COLUMN "document_type" SET NOT NULL;

-- Remover coluna cpf antiga
ALTER TABLE "signer" DROP COLUMN "cpf";

