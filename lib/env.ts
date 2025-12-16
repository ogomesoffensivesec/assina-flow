/**
 * Validação centralizada de variáveis de ambiente
 * Garante que todas as variáveis obrigatórias estão configuradas antes de iniciar a aplicação
 */

const requiredEnvVars = {
  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  
  // Database
  AF_PRISMA_DATABASE_URL: process.env.AF_PRISMA_DATABASE_URL,
  
  // Clicksign
  CLICKSIGN_ACCESS_TOKEN: process.env.CLICKSIGN_ACCESS_TOKEN,
  CLICKSIGN_API_BASE: process.env.CLICKSIGN_API_BASE || "https://sandbox.clicksign.com/api/v3",
  
  // Vercel Blob (opcional, mas recomendado para produção)
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
  
  // Crypto (para senhas de certificados)
  CERTIFICATE_PASSWORD_SECRET: process.env.CERTIFICATE_PASSWORD_SECRET || process.env.NEXTAUTH_SECRET,
} as const;

const optionalEnvVars = {
  NODE_ENV: process.env.NODE_ENV || 'development',
} as const;

/**
 * Valida se todas as variáveis de ambiente obrigatórias estão configuradas
 * Lança erro se alguma estiver faltando
 */
export function validateEnv() {
  const missing: string[] = [];
  
  // Verificar variáveis obrigatórias
  if (!requiredEnvVars.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    missing.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
  }
  
  if (!requiredEnvVars.CLERK_SECRET_KEY) {
    missing.push('CLERK_SECRET_KEY');
  }
  
  if (!requiredEnvVars.CLERK_WEBHOOK_SECRET) {
    missing.push('CLERK_WEBHOOK_SECRET');
  }
  
  if (!requiredEnvVars.AF_PRISMA_DATABASE_URL) {
    missing.push('AF_PRISMA_DATABASE_URL');
  }
  
  if (!requiredEnvVars.CLICKSIGN_ACCESS_TOKEN) {
    missing.push('CLICKSIGN_ACCESS_TOKEN');
  }
  
  // Em produção, BLOB_READ_WRITE_TOKEN é obrigatório
  if (process.env.NODE_ENV === 'production' && !requiredEnvVars.BLOB_READ_WRITE_TOKEN) {
    missing.push('BLOB_READ_WRITE_TOKEN');
  }
  
  // CERTIFICATE_PASSWORD_SECRET é obrigatório em produção
  if (process.env.NODE_ENV === 'production' && !requiredEnvVars.CERTIFICATE_PASSWORD_SECRET) {
    missing.push('CERTIFICATE_PASSWORD_SECRET ou NEXTAUTH_SECRET');
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}\n` +
      `Por favor, configure essas variáveis antes de iniciar a aplicação em produção.`
    );
  }
  
  return true;
}

/**
 * Retorna variáveis de ambiente validadas
 */
export function getEnv() {
  return {
    ...requiredEnvVars,
    ...optionalEnvVars,
  };
}

// Validar automaticamente ao importar este módulo (apenas em produção)
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnv();
  } catch (error) {
    console.error('[ENV] Erro na validação de variáveis de ambiente:', error);
    // Em produção, não permitir iniciar sem variáveis obrigatórias
    throw error;
  }
}
