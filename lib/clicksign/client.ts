/**
 * Cliente para integração com a API Clicksign v3
 * Abstrai os conceitos da Clicksign (envelope, document_key, signer_key, etc)
 * 
 * IMPORTANTE: A API Clicksign v3 NÃO aceita relationships no body para adicionar documentos.
 * O envelope é definido pelo path da URL: POST /envelopes/{envelopeId}/documents
 */

// Em produção, usar a URL de produção da Clicksign
const CLICKSIGN_API_BASE = process.env.CLICKSIGN_API_BASE || 
  (process.env.NODE_ENV === 'production' 
    ? "https://app.clicksign.com/api/v3" 
    : "https://sandbox.clicksign.com/api/v3");
const CLICKSIGN_ACCESS_TOKEN = process.env.CLICKSIGN_ACCESS_TOKEN;

if (!CLICKSIGN_ACCESS_TOKEN) {
  if (process.env.NODE_ENV === 'production') {
    console.error("❌ CLICKSIGN_ACCESS_TOKEN não configurado. A integração com Clicksign não funcionará.");
  } else {
    console.warn("⚠️ CLICKSIGN_ACCESS_TOKEN não configurado. A integração com Clicksign não funcionará.");
  }
}

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Atributos completos para criar um envelope
 */
export interface ClicksignEnvelopeAttributes {
  name?: string;
  locale?: string; // Ex: "pt-BR"
  auto_close?: boolean;
  remind_interval?: number; // Intervalo em dias para lembrar
  block_after_refusal?: boolean;
  deadline_at?: string; // ISO 8601 format
}

/**
 * Resposta da API para envelope
 */
interface ClicksignEnvelope {
  data: {
    id: string;
    type: "envelopes";
    attributes: {
      name?: string;
      status: string;
      locale?: string;
      auto_close?: boolean;
      remind_interval?: number;
      block_after_refusal?: boolean;
      deadline_at?: string;
      created_at: string;
      updated_at: string;
    };
  };
}

/**
 * Atributos para criar um documento
 */
export interface ClicksignDocumentAttributes {
  filename: string;
  content_base64?: string;
  template?: {
    key: string;
    data?: Record<string, any>;
    metadata?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}

/**
 * Resposta da API para documento
 */
interface ClicksignDocument {
  data: {
    id: string;
    type: "documents";
    links?: {
      self?: string;
      files?: {
        original?: string;
        signed?: string;
        ziped?: string;
      };
    };
    attributes: {
      filename: string;
      status: string;
      uploaded_at?: string;
      created?: string;
      modified?: string;
      finished_at?: string;
      template?: any;
      metadata?: Record<string, any>;
      migrated?: boolean;
      // Campo downloads pode existir em algumas versões, mas não é o padrão
      downloads?: {
        original_file_url?: string;
        signed_file_url?: string;
      };
    };
  };
}

/**
 * Atributos completos para criar um signatário
 */
export interface ClicksignSignerAttributes {
  name: string;
  email: string;
  birthday?: string; // Formato: "YYYY-MM-DD"
  phone_number?: string | null;
  has_documentation?: boolean;
  refusable?: boolean;
  group?: number;
  communicate_events?: {
    document_signed?: "email" | "sms" | "whatsapp" | "none";
    signature_request?: "email" | "sms" | "whatsapp" | "none";
    signature_reminder?: "email" | "sms" | "whatsapp" | "none";
  };
}

/**
 * Resposta da API para signatário
 */
interface ClicksignSigner {
  data: {
    id: string;
    type: "signers";
    attributes: {
      name: string;
      email: string;
      status?: string;
      birthday?: string;
      phone_number?: string | null;
      has_documentation?: boolean;
      refusable?: boolean;
      group?: number;
    };
  };
}

/**
 * Atributos para requisito de qualificação (assinatura)
 */
export interface ClicksignQualificationRequirementAttributes {
  action: "agree";
  role: "sign";
}

/**
 * Atributos para requisito de autenticação
 */
export interface ClicksignAuthRequirementAttributes {
  action: "provide_evidence";
  auth: "email" | "icp_brasil" | "sms";
}

/**
 * Resposta da API para requisito
 */
interface ClicksignRequirement {
  id: string;
  type: "requirements";
  links?: {
    self?: string;
  };
  attributes: {
    action: string;
    role?: string;
    auth?: string;
    rubric_pages?: string | null;
    created?: string;
    modified?: string;
  };
  relationships?: {
    document?: {
      data: {
        type: "documents";
        id: string;
      };
    };
    signer?: {
      data: {
        type: "signers";
        id: string;
      };
    };
  };
}

/**
 * Lista de requisitos
 */
interface ClicksignRequirementsList {
  data: Array<{
    id: string;
    type: "requirements";
    attributes: {
      action: string;
      role?: string;
      auth?: string;
    };
    relationships?: {
      document?: {
        data: {
          type: "documents";
          id: string;
        };
      };
      signer?: {
        data: {
          type: "signers";
          id: string;
        };
      };
    };
  }>;
}

/**
 * Operação em massa de requisitos
 */
export interface ClicksignBulkRequirementOperation {
  op: "add" | "remove" | "update";
  ref?: {
    type: "requirements";
    id: string;
  };
  data?: {
    type: "requirements";
    attributes: ClicksignQualificationRequirementAttributes | ClicksignAuthRequirementAttributes;
    relationships: {
      document: {
        data: {
          type: "documents";
          id: string;
        };
      };
      signer: {
        data: {
          type: "signers";
          id: string;
        };
      };
    };
  };
}

/**
 * Evento de documento ou envelope
 */
export interface ClicksignEvent {
  id: string;
  type: string;
  attributes: {
    name: string;
    created_at: string;
    metadata?: Record<string, any>;
  };
}

/**
 * Lista de eventos
 */
interface ClicksignEventsList {
  data: ClicksignEvent[];
}

/**
 * Body correto para criar um documento na Clicksign v3
 * NÃO inclui relationships - o envelope já é definido pelo path da URL
 */
interface ClicksignCreateDocumentBody {
  data: {
    type: "documents";
    attributes: ClicksignDocumentAttributes;
  };
}

/**
 * Atributos para atualizar envelope
 */
export interface ClicksignUpdateEnvelopeAttributes {
  status?: "draft" | "running" | "active" | "closed";
  deadline_at?: string; // ISO 8601 format
  name?: string;
  locale?: string;
  auto_close?: boolean;
  remind_interval?: number;
  block_after_refusal?: boolean;
}

/**
 * Atributos para notificação
 */
export interface ClicksignNotificationAttributes {
  message?: string;
}

interface ClicksignError {
  errors: Array<{
    title?: string;
    detail?: string;
    code?: string;
    status?: string;
    source?: {
      pointer?: string;
      parameter?: string;
    };
  }>;
}

// ============================================================================
// CLASSE CLIENTE
// ============================================================================

class ClicksignClient {
  private baseUrl: string;
  private accessToken: string | undefined;

  constructor() {
    this.baseUrl = CLICKSIGN_API_BASE;
    // IMPORTANTE: A Clicksign exige apenas o token, NÃO "Bearer {token}"
    // Remover "Bearer " se estiver presente
    this.accessToken = CLICKSIGN_ACCESS_TOKEN?.replace(/^Bearer\s+/i, "");
  }

  /**
   * Método privado para fazer requisições à API Clicksign
   * 
   * CORREÇÕES APLICADAS:
   * - Authorization header usa apenas o token (sem "Bearer")
   * - Loga x-request-id quando disponível
   * - Tratamento melhorado de erros com statusCode, title e detail
   * - Erros >= 500 retornam erro estruturado sem quebrar o servidor
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.accessToken) {
      throw new Error("CLICKSIGN_ACCESS_TOKEN não configurado");
    }

    const url = `${this.baseUrl}${endpoint}`;
    const method = options.method || "GET";
    
    console.log("[DEBUG Clicksign] Fazendo requisição:", {
      method,
      url,
      hasBody: !!options.body,
      bodyLength: options.body ? String(options.body).length : 0,
    });

    const response = await fetch(url, {
      ...options,
      headers: {
        // IMPORTANTE: A Clicksign exige apenas o token, NÃO "Bearer {token}"
        "Authorization": this.accessToken,
        "Content-Type": "application/vnd.api+json",
        "Accept": "application/vnd.api+json",
        ...options.headers,
      },
    });

    // Logar x-request-id se disponível (útil para suporte da Clicksign)
    const requestId = response.headers.get("x-request-id");
    if (requestId) {
      console.log("[DEBUG Clicksign] x-request-id:", requestId);
    }

    console.log("[DEBUG Clicksign] Resposta recebida:", {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      requestId,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Clicksign API error: ${response.status} ${response.statusText}`;
      let errorDetails: ClicksignError["errors"] = [];
      
      console.error("[DEBUG Clicksign] ===== ERRO DA API CLICKSIGN =====");
      console.error("[DEBUG Clicksign] Status:", response.status, response.statusText);
      console.error("[DEBUG Clicksign] Error text (raw):", errorText);
      console.error("[DEBUG Clicksign] Error text length:", errorText.length);
      
      try {
        const errorJson: ClicksignError = JSON.parse(errorText);
        console.error("[DEBUG Clicksign] Erro JSON parseado:", JSON.stringify(errorJson, null, 2));
        
        if (errorJson.errors && errorJson.errors.length > 0) {
          errorDetails = errorJson.errors;
          console.error("[DEBUG Clicksign] Número de erros:", errorJson.errors.length);
          
          errorJson.errors.forEach((e, index) => {
            console.error(`[DEBUG Clicksign] Erro ${index + 1}:`, {
              title: e.title,
              detail: e.detail,
              code: e.code,
              source: e.source,
              status: e.status,
            });
          });
          
          const details = errorJson.errors.map((e) => {
            const parts: string[] = [];
            if (e.title && typeof e.title === "string") parts.push(`title: ${e.title}`);
            if (e.detail && typeof e.detail === "string") parts.push(`detail: ${e.detail}`);
            if (e.code && typeof e.code === "string") parts.push(`code: ${e.code}`);
            if (e.source && typeof e.source === "object") {
              const sourceParts: string[] = [];
              if (e.source.pointer) sourceParts.push(`pointer: ${e.source.pointer}`);
              if (e.source.parameter) sourceParts.push(`parameter: ${e.source.parameter}`);
              if (sourceParts.length > 0) parts.push(`source: ${sourceParts.join(", ")}`);
            }
            return parts.join(", ");
          }).filter((d) => d.length > 0); // Remover strings vazias
          errorMessage = details.length > 0 ? details.join(" | ") : errorMessage;
        }
      } catch (parseError) {
        // Se não conseguir fazer parse, usar o texto completo
        console.error("[DEBUG Clicksign] Erro ao fazer parse do JSON:", parseError);
        errorMessage += ` - ${errorText.substring(0, 500)}`;
        console.error("[DEBUG Clicksign] Erro (texto):", errorText.substring(0, 1000));
      }

      // Para erros >= 500, retornar erro estruturado sem quebrar o servidor
      if (response.status >= 500) {
        console.error(`[DEBUG Clicksign] Erro do servidor [${response.status}]:`, errorMessage);
        console.error("[DEBUG Clicksign] Response body completo:", errorText.substring(0, 2000));
        console.error("[DEBUG Clicksign] x-request-id:", requestId || "não disponível");
        
        // Criar erro estruturado com todas as informações
        const structuredError = new Error(errorMessage);
        (structuredError as any).statusCode = response.status;
        (structuredError as any).title = errorDetails[0]?.title || "Erro interno do servidor";
        (structuredError as any).detail = errorDetails[0]?.detail || errorMessage;
        (structuredError as any).requestId = requestId;
        (structuredError as any).errors = errorDetails;
        
        throw structuredError;
      }

      console.error(`[DEBUG Clicksign] Erro na API [${response.status}]:`, errorMessage);
      console.error("[DEBUG Clicksign] Response body completo:", errorText.substring(0, 2000));
      
      // Criar erro estruturado com statusCode para todos os erros (não apenas >= 500)
      const structuredError = new Error(errorMessage);
      (structuredError as any).statusCode = response.status;
      (structuredError as any).title = errorDetails[0]?.title ? String(errorDetails[0].title) : undefined;
      (structuredError as any).detail = errorDetails[0]?.detail ? String(errorDetails[0].detail) : errorMessage;
      (structuredError as any).requestId = requestId;
      (structuredError as any).errors = errorDetails;
      
      // Garantir que a mensagem do erro seja sempre uma string válida
      if (!structuredError.message || typeof structuredError.message !== "string") {
        structuredError.message = errorMessage;
      }
      
      throw structuredError;
    }

    const responseData = await response.json();
    console.log("[DEBUG Clicksign] Resposta parseada com sucesso");
    return responseData;
  }

  /**
   * Cria um novo envelope na Clicksign com atributos completos
   */
  async createEnvelope(attributes?: ClicksignEnvelopeAttributes): Promise<string> {
    console.log("[DEBUG Clicksign] Criando envelope...", attributes);
    
    const requestBody = {
      data: {
        type: "envelopes",
        attributes: attributes || {},
      },
    };

    console.log("[DEBUG Clicksign] Request body:", JSON.stringify(requestBody, null, 2));

    const response = await this.request<ClicksignEnvelope>("/envelopes", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    console.log("[DEBUG Clicksign] Envelope criado:", { envelopeId: response.data.id });
    return response.data.id;
  }

  /**
   * Atualiza um envelope existente
   */
  async updateEnvelope(
    envelopeId: string,
    attributes: ClicksignUpdateEnvelopeAttributes
  ): Promise<void> {
    console.log("[DEBUG Clicksign] Atualizando envelope...", { envelopeId, attributes });

    const requestBody = {
      data: {
        id: envelopeId,
        type: "envelopes",
        attributes,
      },
    };

    console.log("[DEBUG Clicksign] Request body:", JSON.stringify(requestBody, null, 2));

    await this.request<ClicksignEnvelope>(`/envelopes/${envelopeId}`, {
      method: "PATCH",
      body: JSON.stringify(requestBody),
    });

    console.log("[DEBUG Clicksign] Envelope atualizado com sucesso");
  }

  /**
   * Notifica signatários de um envelope
   */
  async notifyEnvelope(
    envelopeId: string,
    attributes: ClicksignNotificationAttributes = {}
  ): Promise<void> {
    console.log("[DEBUG Clicksign] Notificando envelope...", { envelopeId, attributes });

    const requestBody = {
      data: {
        type: "notifications",
        attributes,
      },
    };

    console.log("[DEBUG Clicksign] Request body:", JSON.stringify(requestBody, null, 2));

    await this.request(`/envelopes/${envelopeId}/notifications`, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    console.log("[DEBUG Clicksign] Notificação enviada com sucesso");
  }

  /**
   * Adiciona um documento PDF a um envelope (com suporte a content_base64 ou template)
   * 
   * CORREÇÃO CRÍTICA: Removido relationships do body.
   * A API Clicksign v3 NÃO aceita relationships para adicionar documentos.
   * O envelope já é definido pelo path da URL: POST /envelopes/{envelopeId}/documents
   */
  async addDocumentToEnvelope(
    envelopeId: string,
    attributes: ClicksignDocumentAttributes
  ): Promise<string> {
    console.log("[DEBUG Clicksign] Adicionando documento ao envelope...", {
      envelopeId,
      filename: attributes.filename,
      hasContentBase64: !!attributes.content_base64,
      hasTemplate: !!attributes.template,
      hasMetadata: !!attributes.metadata,
    });

    // CORREÇÃO: Body correto SEM relationships
    // O envelope é definido pelo path da URL, não pelo body
    const requestBody: ClicksignCreateDocumentBody = {
      data: {
        type: "documents",
        attributes,
      },
    };

    // Log do body sem o conteúdo completo (muito grande)
    const logBody = {
      ...requestBody,
      data: {
        ...requestBody.data,
        attributes: {
          ...requestBody.data.attributes,
          ...(requestBody.data.attributes.content_base64 && {
            content_base64: `${requestBody.data.attributes.content_base64.substring(0, 50)}... (${requestBody.data.attributes.content_base64.length} chars)`,
          }),
        },
      },
    };
    console.log("[DEBUG Clicksign] Request body (SEM relationships):", JSON.stringify(logBody, null, 2));

    const response = await this.request<ClicksignDocument>(
      `/envelopes/${envelopeId}/documents`,
      {
        method: "POST",
        body: JSON.stringify(requestBody),
      }
    );

    console.log("[DEBUG Clicksign] Documento adicionado:", { documentId: response.data.id });
    return response.data.id;
  }

  /**
   * Adiciona um signatário a um envelope com atributos completos
   * 
   * CORREÇÃO: Removido relationships do body.
   * A API Clicksign v3 define o envelope pelo path da URL: POST /envelopes/{envelopeId}/signers
   */
  async addSignerToEnvelope(
    envelopeId: string,
    attributes: ClicksignSignerAttributes
  ): Promise<string> {
    // DEBUG: Log completo do nome recebido
    console.log("[DEBUG Clicksign] ===== INÍCIO addSignerToEnvelope =====");
    console.log("[DEBUG Clicksign] Nome recebido (raw):", {
      value: attributes.name,
      type: typeof attributes.name,
      isString: typeof attributes.name === "string",
      length: attributes.name?.length,
      isEmpty: !attributes.name || attributes.name.length === 0,
      charCodes: attributes.name ? attributes.name.split("").map((c, i) => ({ char: c, code: c.charCodeAt(0), index: i })) : [],
      json: JSON.stringify(attributes.name),
    });
    
    // Validar que nome existe e é string
    if (!attributes.name) {
      throw new Error("Nome do signatário é obrigatório");
    }
    
    if (typeof attributes.name !== "string") {
      console.error("[DEBUG Clicksign] Nome não é string:", typeof attributes.name);
      throw new Error(`Nome do signatário deve ser uma string, recebido: ${typeof attributes.name}`);
    }
    
    // Simplificar: apenas trim básico primeiro para identificar problema
    let cleanedName = String(attributes.name).trim();
    
    console.log("[DEBUG Clicksign] Nome após trim:", {
      value: cleanedName,
      length: cleanedName.length,
      isEmpty: cleanedName.length === 0,
    });
    
    // Validação mínima: apenas comprimento
    if (cleanedName.length < 2) {
      throw new Error("Nome do signatário deve ter pelo menos 2 caracteres");
    }
    
    if (cleanedName.length > 255) {
      cleanedName = cleanedName.substring(0, 255).trim();
      console.warn("[DEBUG Clicksign] Nome truncado para 255 caracteres");
    }
    
    // Remover apenas caracteres de controle realmente problemáticos
    cleanedName = cleanedName
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove caracteres de controle
      .replace(/[\r\n\t]/g, " ") // Substitui quebras de linha e tabs por espaço
      .replace(/\s+/g, " ") // Normaliza espaços múltiplos
      .trim();
    
    console.log("[DEBUG Clicksign] Nome após limpeza básica:", {
      value: cleanedName,
      length: cleanedName.length,
      isEmpty: cleanedName.length === 0,
    });
    
    if (cleanedName.length < 2) {
      throw new Error("Nome do signatário deve ter pelo menos 2 caracteres válidos");
    }
    
    // Log do nome final antes de enviar
    console.log("[DEBUG Clicksign] Nome final que será enviado:", {
      final: cleanedName,
      length: cleanedName.length,
      charCodes: cleanedName.split("").map((c) => c.charCodeAt(0)),
      json: JSON.stringify(cleanedName),
    });

    // Validar email
    const cleanedEmail = attributes.email?.trim() || "";
    if (!cleanedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
      throw new Error("Email do signatário é obrigatório e deve ser válido");
    }

    console.log("[DEBUG Clicksign] Adicionando signatário ao envelope...", {
      envelopeId,
      name: cleanedName,
      email: cleanedEmail,
      attributes,
    });

    // Garantir que o nome é uma string válida e não está vazio
    if (typeof cleanedName !== "string" || cleanedName.length === 0) {
      throw new Error("Nome do signatário deve ser uma string válida e não pode estar vazio");
    }

    // Preparar atributos com valores limpos
    const signerAttributes: ClicksignSignerAttributes = {
      name: cleanedName,
      email: cleanedEmail,
      ...(attributes.birthday && { birthday: attributes.birthday }),
      ...(attributes.phone_number !== undefined && { phone_number: attributes.phone_number }),
      ...(attributes.has_documentation !== undefined && { has_documentation: attributes.has_documentation }),
      ...(attributes.refusable !== undefined && { refusable: attributes.refusable }),
      ...(attributes.group !== undefined && { group: attributes.group }),
      ...(attributes.communicate_events && { communicate_events: attributes.communicate_events }),
    };

    // CORREÇÃO: Body correto SEM relationships
    // O envelope é definido pelo path da URL, não pelo body
    // Garantir que todos os valores são primitivos válidos
    // IMPORTANTE: Construir objeto de atributos sem undefined/null
    const requestAttributes: Record<string, any> = {
      name: String(cleanedName), // Garantir que é string válida
      email: String(cleanedEmail), // Garantir que é string válida
    };
    
    // Adicionar apenas campos que existem e são válidos (não undefined/null)
    if (signerAttributes.birthday && typeof signerAttributes.birthday === "string") {
      requestAttributes.birthday = String(signerAttributes.birthday);
    }
    
    if (signerAttributes.phone_number !== undefined && signerAttributes.phone_number !== null) {
      requestAttributes.phone_number = signerAttributes.phone_number;
    }
    
    if (signerAttributes.has_documentation !== undefined && typeof signerAttributes.has_documentation === "boolean") {
      requestAttributes.has_documentation = signerAttributes.has_documentation;
    }
    
    if (signerAttributes.refusable !== undefined && typeof signerAttributes.refusable === "boolean") {
      requestAttributes.refusable = signerAttributes.refusable;
    }
    
    if (signerAttributes.group !== undefined && typeof signerAttributes.group === "number") {
      requestAttributes.group = signerAttributes.group;
    }
    
    if (signerAttributes.communicate_events && typeof signerAttributes.communicate_events === "object") {
      requestAttributes.communicate_events = signerAttributes.communicate_events;
    }
    
    const requestBody = {
      data: {
        type: "signers",
        attributes: requestAttributes,
      },
    };

    // Validar que o nome não está vazio após conversão
    if (!requestBody.data.attributes.name || requestBody.data.attributes.name.trim().length === 0) {
      throw new Error("Nome do signatário não pode estar vazio após processamento");
    }

    // Log detalhado do body antes de serializar
    console.log("[DEBUG Clicksign] ===== REQUEST BODY ANTES DE ENVIAR =====");
    console.log("[DEBUG Clicksign] Request body (objeto):", requestBody);
    console.log("[DEBUG Clicksign] Request body (JSON):", JSON.stringify(requestBody, null, 2));
    console.log("[DEBUG Clicksign] Tipo do nome no body:", typeof requestBody.data.attributes.name);
    console.log("[DEBUG Clicksign] Valor do nome no body:", JSON.stringify(requestBody.data.attributes.name));
    console.log("[DEBUG Clicksign] Comprimento do nome:", requestBody.data.attributes.name.length);
    console.log("[DEBUG Clicksign] Nome como array de bytes:", Array.from(new TextEncoder().encode(requestBody.data.attributes.name)));
    
    // Validar que o JSON serializado é válido
    let serializedBody: string;
    try {
      serializedBody = JSON.stringify(requestBody);
      console.log("[DEBUG Clicksign] JSON serializado com sucesso, tamanho:", serializedBody.length);
      
      // Validar que o nome ainda está presente após serialização
      const parsedBack = JSON.parse(serializedBody);
      const nameAfterSerialization = parsedBack?.data?.attributes?.name;
      console.log("[DEBUG Clicksign] Nome após serialização/parse:", {
        value: nameAfterSerialization,
        type: typeof nameAfterSerialization,
        length: nameAfterSerialization?.length,
        isEmpty: !nameAfterSerialization || nameAfterSerialization.length === 0,
      });
      
      if (!nameAfterSerialization || nameAfterSerialization.length === 0) {
        throw new Error("Nome desapareceu após serialização JSON");
      }
      
      // Verificar se há caracteres problemáticos no JSON serializado
      const nameInJson = serializedBody.match(/"name"\s*:\s*"([^"]*)"/);
      if (nameInJson) {
        console.log("[DEBUG Clicksign] Nome extraído do JSON serializado:", {
          value: nameInJson[1],
          length: nameInJson[1].length,
          escaped: JSON.stringify(nameInJson[1]),
        });
      }
    } catch (error) {
      console.error("[DEBUG Clicksign] ERRO ao serializar/validar JSON:", error);
      throw new Error(`Erro ao serializar request body: ${error}`);
    }
    
    // Enviar requisição
    console.log("[DEBUG Clicksign] Enviando requisição para:", `/envelopes/${envelopeId}/signers`);
    console.log("[DEBUG Clicksign] Body que será enviado (primeiros 500 chars):", serializedBody.substring(0, 500));
    
    const response = await this.request<ClicksignSigner>(
      `/envelopes/${envelopeId}/signers`,
      {
        method: "POST",
        body: serializedBody, // Usar o JSON já serializado e validado
      }
    );

    console.log("[DEBUG Clicksign] Signatário adicionado:", { signerId: response.data.id });
    return response.data.id;
  }

  /**
   * Adiciona um requisito de assinatura (vincula signatário ao documento)
   * Com retry automático caso o documento não esteja disponível ainda
   */
  async addSignatureRequirement(
    envelopeId: string,
    documentId: string,
    signerId: string,
    maxRetries: number = 3
  ): Promise<ClicksignRequirement> {
    console.log("[DEBUG Clicksign] Adicionando requisito de assinatura...", {
      envelopeId,
      documentId,
      signerId,
      maxRetries,
    });

    // Verificar se o documento está disponível antes de tentar adicionar requisito
    let documentAvailable = false;
    let attempts = 0;
    
    while (!documentAvailable && attempts < maxRetries) {
      attempts++;
      try {
        console.log(`[DEBUG Clicksign] Verificando disponibilidade do documento (tentativa ${attempts}/${maxRetries})...`);
        const docStatus = await this.getDocumentStatus(documentId, envelopeId);
        console.log(`[DEBUG Clicksign] Status do documento:`, {
          documentId,
          status: docStatus.status,
        });
        
        // Documento está disponível se não estiver em estado de processamento
        if (docStatus.status && docStatus.status !== "processing" && docStatus.status !== "uploading") {
          documentAvailable = true;
        } else {
          console.log(`[DEBUG Clicksign] Documento ainda processando, aguardando 1 segundo...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error: any) {
        console.warn(`[DEBUG Clicksign] Erro ao verificar status do documento (tentativa ${attempts}):`, {
          message: error?.message,
        });
        if (attempts < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    if (!documentAvailable) {
      console.warn(`[DEBUG Clicksign] Documento pode não estar totalmente disponível, mas tentando adicionar requisito mesmo assim...`);
    }

    const requestBody = {
      data: {
        type: "requirements",
        attributes: {
          action: "agree",
          role: "sign",
        },
        relationships: {
          document: {
            data: {
              type: "documents",
              id: documentId,
            },
          },
          signer: {
            data: {
              type: "signers",
              id: signerId,
            },
          },
        },
      },
    };

    console.log("[DEBUG Clicksign] Request body:", JSON.stringify(requestBody, null, 2));

    // Tentar adicionar requisito com retry
    let lastError: any = null;
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const response = await this.request<{ data: ClicksignRequirement }>(
          `/envelopes/${envelopeId}/requirements`,
          {
            method: "POST",
            body: JSON.stringify(requestBody),
          }
        );

        console.log("[DEBUG Clicksign] Requisito de qualificação SIGN adicionado:", { 
          requirementId: response.data.id,
          fullResponse: JSON.stringify(response, null, 2)
        });
        return response.data;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        
        // Se o erro for sobre documento não disponível e ainda temos tentativas, aguardar e tentar novamente
        if (errorMessage.includes("document não está disponível") && retry < maxRetries - 1) {
          console.warn(`[DEBUG Clicksign] Documento não disponível (tentativa ${retry + 1}/${maxRetries}), aguardando 2 segundos...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        
        // Se não for erro de documento não disponível ou esgotaram as tentativas, lançar erro
        throw error;
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error("Erro ao adicionar requisito de assinatura após múltiplas tentativas");
  }

  /**
   * Adiciona um requisito de autenticação (vincula signatário ao documento com autenticação)
   */
  async addAuthRequirement(
    envelopeId: string,
    documentId: string,
    signerId: string,
    auth: "email" | "icp_brasil" | "sms" = "email",
    maxRetries: number = 3
  ): Promise<ClicksignRequirement> {
    console.log("[DEBUG Clicksign] Adicionando requisito de autenticação...", {
      envelopeId,
      documentId,
      signerId,
      auth,
      maxRetries,
    });

    const requestBody = {
      data: {
        type: "requirements",
        attributes: {
          action: "provide_evidence",
          auth,
        },
        relationships: {
          document: {
            data: {
              type: "documents",
              id: documentId,
            },
          },
          signer: {
            data: {
              type: "signers",
              id: signerId,
            },
          },
        },
      },
    };

    console.log("[DEBUG Clicksign] Request body:", JSON.stringify(requestBody, null, 2));

    // Tentar adicionar requisito com retry
    let lastError: any = null;
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const response = await this.request<{ data: ClicksignRequirement }>(
          `/envelopes/${envelopeId}/requirements`,
          {
            method: "POST",
            body: JSON.stringify(requestBody),
          }
        );

        console.log("[DEBUG Clicksign] Requisito de autenticação adicionado:", { 
          requirementId: response.data.id,
          auth,
          fullResponse: JSON.stringify(response, null, 2)
        });
        return response.data;
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        
        // Se o erro for sobre documento não disponível e ainda temos tentativas, aguardar e tentar novamente
        if (errorMessage.includes("document não está disponível") && retry < maxRetries - 1) {
          console.warn(`[DEBUG Clicksign] Documento não disponível (tentativa ${retry + 1}/${maxRetries}), aguardando 2 segundos...`);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
        
        // Se não for erro de documento não disponível ou esgotaram as tentativas, lançar erro
        throw error;
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError || new Error("Erro ao adicionar requisito de autenticação após múltiplas tentativas");
  }

  /**
   * Operações em massa de requisitos (adicionar, remover ou atualizar atomicamente)
   */
  async bulkRequirements(
    envelopeId: string,
    operations: ClicksignBulkRequirementOperation[]
  ): Promise<void> {
    console.log("[DEBUG Clicksign] Executando operações em massa de requisitos...", {
      envelopeId,
      operationsCount: operations.length,
    });

    const requestBody = {
      "atomic:operations": operations,
    };

    console.log("[DEBUG Clicksign] Request body:", JSON.stringify(requestBody, null, 2));

    await this.request(`/envelopes/${envelopeId}/bulk_requirements`, {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    console.log("[DEBUG Clicksign] Operações em massa executadas com sucesso");
  }

  /**
   * Lista todos os requisitos de um envelope
   */
  async getRequirements(envelopeId: string): Promise<ClicksignRequirementsList["data"]> {
    console.log("[DEBUG Clicksign] Listando requisitos do envelope...", { envelopeId });

    const response = await this.request<ClicksignRequirementsList>(
      `/envelopes/${envelopeId}/requirements`
    );

    console.log("[DEBUG Clicksign] Requisitos listados:", { count: response.data.length });
    return response.data;
  }

  /**
   * Ativa um envelope (muda status de draft para running)
   * IMPORTANTE: Todos os signatários devem ter requisitos de assinatura antes de ativar
   */
  async activateEnvelope(envelopeId: string): Promise<void> {
    console.log("[DEBUG Clicksign] Ativando envelope...", { envelopeId });
    
    // Verificar status atual antes de ativar
    try {
      const currentStatus = await this.getEnvelopeStatus(envelopeId);
      console.log("[DEBUG Clicksign] Status atual do envelope:", currentStatus);
      
      if (currentStatus === "active" || currentStatus === "running" || currentStatus === "closed") {
        console.log("[DEBUG Clicksign] Envelope já está ativo ou fechado, não precisa ativar");
        return;
      }
    } catch (error) {
      console.warn("[DEBUG Clicksign] Erro ao verificar status atual (continuando mesmo assim):", error);
    }
    
    // Usar updateEnvelope para manter consistência
    await this.updateEnvelope(envelopeId, {
      status: "running",
    });

    console.log("[DEBUG Clicksign] Envelope ativado com sucesso");
  }

  /**
   * Obtém o status de um documento
   * Tenta primeiro com envelopeId, depois sem (para compatibilidade)
   */
  async getDocumentStatus(
    documentId: string,
    envelopeId?: string
  ): Promise<{
    status: string;
    finished_at?: string;
    signed_file_url?: string;
    original_file_url?: string;
  }> {
    // Tentar primeiro com envelopeId se disponível (endpoint mais específico)
    if (envelopeId) {
      try {
        const response = await this.request<ClicksignDocument>(
          `/envelopes/${envelopeId}/documents/${documentId}`
        );

        // URLs podem estar em links.files ou attributes.downloads
        const signedFileUrl = response.data.links?.files?.signed || response.data.attributes.downloads?.signed_file_url;
        const originalFileUrl = response.data.links?.files?.original || response.data.attributes.downloads?.original_file_url;

        return {
          status: response.data.attributes.status,
          finished_at: response.data.attributes.finished_at || response.data.attributes.modified,
          signed_file_url: signedFileUrl,
          original_file_url: originalFileUrl,
        };
      } catch (error: any) {
        // Se falhar com envelopeId, tentar sem (fallback)
        if (error.statusCode === 404) {
          console.warn("[DEBUG Clicksign] Endpoint com envelopeId retornou 404, tentando endpoint direto...");
        } else {
          throw error;
        }
      }
    }

    // Fallback: tentar endpoint direto
    const response = await this.request<ClicksignDocument>(
      `/documents/${documentId}`
    );

    // URLs podem estar em links.files ou attributes.downloads
    const signedFileUrl = response.data.links?.files?.signed || response.data.attributes.downloads?.signed_file_url;
    const originalFileUrl = response.data.links?.files?.original || response.data.attributes.downloads?.original_file_url;

    return {
      status: response.data.attributes.status,
      finished_at: response.data.attributes.finished_at || response.data.attributes.modified,
      signed_file_url: signedFileUrl,
      original_file_url: originalFileUrl,
    };
  }

  /**
   * Obtém informações completas de um envelope
   */
  async getEnvelope(envelopeId: string): Promise<ClicksignEnvelope["data"]> {
    const response = await this.request<ClicksignEnvelope>(
      `/envelopes/${envelopeId}`
    );

    return response.data;
  }

  /**
   * Obtém o status de um envelope
   */
  async getEnvelopeStatus(envelopeId: string): Promise<string> {
    const envelope = await this.getEnvelope(envelopeId);
    return envelope.attributes.status;
  }

  /**
   * Obtém informações completas de um documento
   */
  async getDocument(envelopeId: string, documentId: string): Promise<ClicksignDocument["data"]> {
    console.log("[DEBUG Clicksign] Buscando documento completo...", { envelopeId, documentId });
    
    const response = await this.request<ClicksignDocument>(
      `/envelopes/${envelopeId}/documents/${documentId}`
    );

    // Extrair URLs de download (podem estar em links.files ou attributes.downloads)
    const signedFileUrl = response.data.links?.files?.signed || response.data.attributes.downloads?.signed_file_url;
    const originalFileUrl = response.data.links?.files?.original || response.data.attributes.downloads?.original_file_url;
    const zipedFileUrl = response.data.links?.files?.ziped;

    console.log("[DEBUG Clicksign] Documento obtido (resumo):", {
      id: response.data.id,
      status: response.data.attributes.status,
      hasLinksFiles: !!response.data.links?.files,
      hasAttributesDownloads: !!response.data.attributes.downloads,
      signedFileUrl: signedFileUrl ? signedFileUrl.substring(0, 100) + "..." : undefined,
      originalFileUrl: originalFileUrl ? originalFileUrl.substring(0, 100) + "..." : undefined,
      finishedAt: response.data.attributes.finished_at || response.data.attributes.modified,
    });

    return response.data;
  }

  /**
   * Lista todos os signatários de um envelope
   */
  async getSigners(envelopeId: string): Promise<ClicksignSigner["data"][]> {
    interface ClicksignSignersList {
      data: ClicksignSigner["data"][];
    }

    const response = await this.request<ClicksignSignersList>(
      `/envelopes/${envelopeId}/signers`
    );

    return response.data;
  }

  /**
   * Obtém eventos de um documento
   */
  async getDocumentEvents(
    envelopeId: string,
    documentId: string
  ): Promise<ClicksignEvent[]> {
    console.log("[DEBUG Clicksign] Obtendo eventos do documento...", { envelopeId, documentId });

    const response = await this.request<ClicksignEventsList>(
      `/envelopes/${envelopeId}/documents/${documentId}/events`
    );

    console.log("[DEBUG Clicksign] Eventos obtidos:", { count: response.data.length });
    return response.data;
  }

  /**
   * Obtém eventos de um envelope
   */
  async getEnvelopeEvents(envelopeId: string): Promise<ClicksignEvent[]> {
    console.log("[DEBUG Clicksign] Obtendo eventos do envelope...", { envelopeId });

    const response = await this.request<ClicksignEventsList>(
      `/envelopes/${envelopeId}/events`
    );

    console.log("[DEBUG Clicksign] Eventos obtidos:", { count: response.data.length });
    return response.data;
  }

  /**
   * Baixa um documento assinado
   */
  async downloadSignedDocument(signedFileUrl: string): Promise<Buffer> {
    // A URL retornada pela Clicksign é relativa, precisa ser convertida para absoluta
    const baseUrl = this.baseUrl.replace("/api/v3", "");
    const fullUrl = signedFileUrl.startsWith("http")
      ? signedFileUrl
      : `${baseUrl}${signedFileUrl}`;

    console.log("[DEBUG Clicksign] Baixando documento de:", fullUrl);

    const response = await fetch(fullUrl, {
      headers: {
        // IMPORTANTE: Apenas o token, sem "Bearer"
        Authorization: this.accessToken!,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error("[DEBUG Clicksign] Erro ao baixar documento:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
        url: fullUrl,
      });
      throw new Error(`Erro ao baixar documento: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log("[DEBUG Clicksign] Documento baixado com sucesso:", {
      size: arrayBuffer.byteLength,
      url: fullUrl,
    });
    return Buffer.from(arrayBuffer);
  }


  /**
   * Deleta um documento de um envelope
   * DELETE /api/v3/envelopes/{envelope_id}/documents/{document_id}
   */
  async deleteDocument(envelopeId: string, documentId: string): Promise<void> {
    console.log("[DEBUG Clicksign] Deletando documento...", { envelopeId, documentId });
    
    await this.request(
      `/envelopes/${envelopeId}/documents/${documentId}`,
      {
        method: "DELETE",
      }
    );

    console.log("[DEBUG Clicksign] Documento deletado com sucesso");
  }

  /**
   * Deleta um envelope completo
   * DELETE /api/v3/envelopes/{envelope_id}
   */
  async deleteEnvelope(envelopeId: string): Promise<void> {
    console.log("[DEBUG Clicksign] Deletando envelope...", { envelopeId });
    
    await this.request(
      `/envelopes/${envelopeId}`,
      {
        method: "DELETE",
      }
    );

    console.log("[DEBUG Clicksign] Envelope deletado com sucesso");
  }
}

export const clicksignClient = new ClicksignClient();
