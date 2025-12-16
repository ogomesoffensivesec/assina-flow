/**
 * Utilitário de logging otimizado para produção
 * Em produção, apenas erros críticos são logados com informações mínimas
 * Em desenvolvimento, todos os logs são exibidos
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Remove informações sensíveis dos logs
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'authorization', 'cookie', 'session'];
  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = sensitiveKeys.some(sk => lowerKey.includes(sk));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export const logger = {
  /**
   * Log de informações gerais (apenas em desenvolvimento)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  /**
   * Log de erros (sempre logado, mas sanitizado em produção)
   */
  error: (message: string, error?: any, context?: Record<string, any>) => {
    if (isProduction) {
      // Em produção, logar apenas informações essenciais e sanitizadas
      const sanitizedContext = context ? sanitizeLogData(context) : undefined;
      const errorInfo = error instanceof Error 
        ? { 
            name: error.name, 
            message: error.message,
            ...((error as any).code && { code: (error as any).code }),
          }
        : undefined;
      
      console.error('[ERROR]', {
        message,
        ...(errorInfo && { error: errorInfo }),
        ...(sanitizedContext && { context: sanitizedContext }),
        timestamp: new Date().toISOString(),
      });
    } else {
      // Em desenvolvimento, logar tudo
      console.error('[ERROR]', message, error, context);
    }
  },
  
  /**
   * Log de avisos (apenas em desenvolvimento)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('[WARN]', ...args);
    }
  },
  
  /**
   * Log de debug (nunca em produção)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
  
  /**
   * Log de informações de API (sanitizado em produção)
   */
  api: (method: string, route: string, statusCode: number, duration?: number, context?: Record<string, any>) => {
    if (isProduction) {
      // Em produção, logar apenas informações essenciais
      console.log('[API]', {
        method,
        route,
        statusCode,
        ...(duration && { duration: `${duration}ms` }),
        timestamp: new Date().toISOString(),
      });
    } else {
      // Em desenvolvimento, logar tudo
      console.log('[API]', method, route, statusCode, duration ? `${duration}ms` : '', context);
    }
  },
};
