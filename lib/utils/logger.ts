/**
 * Utilitário de logging que só loga em desenvolvimento
 * Em produção, os logs são silenciados para evitar exposição de informações sensíveis
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Erros sempre são logados, mas sem informações sensíveis em produção
    if (isDevelopment) {
      console.error(...args);
    } else {
      // Em produção, logar apenas mensagens genéricas
      console.error('[ERROR]', args[0]);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  debug: (...args: any[]) => {
    // Debug nunca loga em produção
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
};
