import { NextResponse } from "next/server";

/**
 * Tipos de erros conhecidos
 */
export enum ErrorType {
  DATABASE_TIMEOUT = "DATABASE_TIMEOUT",
  DATABASE_CONNECTION = "DATABASE_CONNECTION",
  CLICKSIGN_ERROR = "CLICKSIGN_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

/**
 * Classe de erro customizada para a aplicação
 */
export class AppError extends Error {
  constructor(
    public type: ErrorType,
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Identifica o tipo de erro baseado no erro original
 */
function identifyErrorType(error: any): ErrorType {
  // Erros de timeout do banco
  if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
    return ErrorType.DATABASE_TIMEOUT;
  }
  
  // Erros de conexão do banco
  if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "P1001") {
    return ErrorType.DATABASE_CONNECTION;
  }
  
  // Erros da Clicksign
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return ErrorType.CLICKSIGN_ERROR;
  }
  
  // Erros de validação (400)
  if (error.statusCode === 400 || error.message?.includes("inválido") || error.message?.includes("obrigatório")) {
    return ErrorType.VALIDATION_ERROR;
  }
  
  // Erros de autenticação (401)
  if (error.statusCode === 401 || error.message === "Unauthorized") {
    return ErrorType.AUTHENTICATION_ERROR;
  }
  
  // Erros de autorização (403)
  if (error.statusCode === 403 || error.message?.includes("permissão")) {
    return ErrorType.AUTHORIZATION_ERROR;
  }
  
  // Erros de não encontrado (404)
  if (error.statusCode === 404 || error.message?.includes("não encontrado")) {
    return ErrorType.NOT_FOUND;
  }
  
  return ErrorType.INTERNAL_ERROR;
}

/**
 * Obtém mensagem de erro amigável para o usuário
 */
function getUserFriendlyMessage(errorType: ErrorType, originalMessage?: string): string {
  switch (errorType) {
    case ErrorType.DATABASE_TIMEOUT:
      return "Timeout ao conectar com o banco de dados. Tente novamente em alguns instantes.";
    
    case ErrorType.DATABASE_CONNECTION:
      return "Não foi possível conectar ao banco de dados. Verifique se o servidor está disponível.";
    
    case ErrorType.CLICKSIGN_ERROR:
      return originalMessage || "Erro ao processar na plataforma de assinatura. Tente novamente.";
    
    case ErrorType.VALIDATION_ERROR:
      return originalMessage || "Dados inválidos. Verifique as informações fornecidas.";
    
    case ErrorType.AUTHENTICATION_ERROR:
      return "Você precisa estar autenticado para realizar esta ação.";
    
    case ErrorType.AUTHORIZATION_ERROR:
      return "Você não tem permissão para realizar esta ação.";
    
    case ErrorType.NOT_FOUND:
      return originalMessage || "Recurso não encontrado.";
    
    case ErrorType.INTERNAL_ERROR:
    default:
      return process.env.NODE_ENV === "production"
        ? "Erro interno do servidor. Tente novamente mais tarde."
        : originalMessage || "Erro interno do servidor.";
  }
}

/**
 * Obtém código de status HTTP apropriado
 */
function getStatusCode(errorType: ErrorType, originalStatusCode?: number): number {
  if (originalStatusCode && originalStatusCode >= 400 && originalStatusCode < 600) {
    return originalStatusCode;
  }
  
  switch (errorType) {
    case ErrorType.DATABASE_TIMEOUT:
    case ErrorType.DATABASE_CONNECTION:
      return 503; // Service Unavailable
    
    case ErrorType.VALIDATION_ERROR:
      return 400; // Bad Request
    
    case ErrorType.AUTHENTICATION_ERROR:
      return 401; // Unauthorized
    
    case ErrorType.AUTHORIZATION_ERROR:
      return 403; // Forbidden
    
    case ErrorType.NOT_FOUND:
      return 404; // Not Found
    
    case ErrorType.INTERNAL_ERROR:
    default:
      return 500; // Internal Server Error
  }
}

/**
 * Trata erros e retorna resposta HTTP apropriada
 * 
 * @param error - Erro a ser tratado
 * @param context - Contexto adicional para logs (opcional)
 * @returns NextResponse com erro formatado
 */
export function handleError(error: any, context?: { route?: string; userId?: string }): NextResponse {
  // Se já é um AppError, usar diretamente
  if (error instanceof AppError) {
    const message = getUserFriendlyMessage(error.type, error.message);
    const statusCode = error.statusCode || getStatusCode(error.type);
    
    // Log em desenvolvimento, log genérico em produção
    if (process.env.NODE_ENV === "development") {
      console.error(`[ERROR HANDLER] ${context?.route || "Unknown route"}:`, {
        type: error.type,
        message: error.message,
        statusCode,
        details: error.details,
        userId: context?.userId,
      });
    } else {
      console.error(`[ERROR] ${error.type}`, {
        route: context?.route,
        statusCode,
      });
    }
    
    return NextResponse.json(
      {
        error: message,
        ...(process.env.NODE_ENV === "development" && {
          type: error.type,
          details: error.details,
        }),
      },
      { status: statusCode }
    );
  }
  
  // Identificar tipo de erro
  const errorType = identifyErrorType(error);
  const message = getUserFriendlyMessage(errorType, error.message);
  const statusCode = getStatusCode(errorType, error.statusCode);
  
  // Log detalhado em desenvolvimento, log genérico em produção
  if (process.env.NODE_ENV === "development") {
    console.error(`[ERROR HANDLER] ${context?.route || "Unknown route"}:`, {
      type: errorType,
      message: error.message,
      statusCode,
      stack: error.stack,
      code: error.code,
      userId: context?.userId,
    });
  } else {
    console.error(`[ERROR] ${errorType}`, {
      route: context?.route,
      statusCode,
    });
  }
  
  return NextResponse.json(
    {
      error: message,
      ...(process.env.NODE_ENV === "development" && {
        type: errorType,
        originalMessage: error.message,
      }),
    },
    { status: statusCode }
  );
}

/**
 * Wrapper para rotas API que trata erros automaticamente
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>,
  routeName?: string
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error: any) {
      // Extrair userId do contexto se disponível (primeiro arg geralmente é request)
      const request = args[0];
      let userId: string | undefined;
      
      try {
        // Tentar extrair userId do request se for NextRequest e tiver auth
        if (request && typeof request === "object" && "headers" in request) {
          // Não tentar fazer await aqui para não bloquear
          // O userId será undefined se não conseguir extrair
        }
      } catch {
        // Ignorar erros ao extrair userId
      }
      
      return handleError(error, {
        route: routeName || handler.name,
        userId,
      });
    }
  };
}
