-- AlterTable
-- Esta migration adiciona a coluna encrypted_password de forma idempotente
-- Verifica se a tabela existe antes de tentar alterá-la (para evitar erros no shadow database)
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'certificate'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'certificate' AND column_name = 'encrypted_password'
    ) THEN
        ALTER TABLE "certificate" ADD COLUMN "encrypted_password" TEXT;
    END IF;
END $$;

