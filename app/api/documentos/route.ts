import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createEnvelope, uploadDocument } from "@/lib/clicksign/service";
import { clicksignClient } from "@/lib/clicksign/client";
import { requireAuth } from "@/lib/auth/utils";
import { generateIdFromEntropySize } from "lucia";
import { createHash } from "crypto";
import { PDFDocument } from "pdf-lib";

/**
 * GET /api/documentos
 * Lista todos os documentos do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const documents = await db.document.findMany({
      where: {
        userId: user.id,
      },
      include: {
        signers: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: {
        uploadedAt: "desc",
      },
    });

    // Sincronizar informações completas com a Clicksign para documentos que têm keys configuradas
    // Usar Promise.allSettled para não falhar se algum documento der erro
    const documentsWithSyncedStatus = await Promise.allSettled(
      documents.map(async (doc) => {
        // Sincronizar apenas se tiver envelopeKey e documentKey configurados
        if (doc.clicksignEnvelopeKey && doc.clicksignDocumentKey) {
          try {
            // Buscar informações completas do envelope
            const envelope = await clicksignClient.getEnvelope(doc.clicksignEnvelopeKey);
            
            // Buscar informações completas do documento
            const clicksignDocument = await clicksignClient.getDocument(
              doc.clicksignEnvelopeKey,
              doc.clicksignDocumentKey
            );

            // Buscar lista de signatários da Clicksign
            const clicksignSigners = await clicksignClient.getSigners(doc.clicksignEnvelopeKey);

            // Buscar lista de requisitos da Clicksign
            const clicksignRequirements = await clicksignClient.getRequirements(doc.clicksignEnvelopeKey);

            // Mapear status da Clicksign para status interno
            let mappedStatus = doc.status;
            const envelopeStatus = envelope.attributes.status;
            const docStatus = clicksignDocument.attributes.status;
            
            // Status do envelope: draft, active, running, closed, canceled
            // Status do documento: draft, available, ready, running, closed, finalized, canceled
            if (envelopeStatus === "closed" || envelopeStatus === "canceled" || 
                docStatus === "closed" || docStatus === "finalized" || docStatus === "canceled") {
              mappedStatus = "completed";
            } else if (envelopeStatus === "running" || docStatus === "running") {
              // Verificar se todos os signatários assinaram
              const allSigned = doc.signers.length > 0 && doc.signers.every((s) => s.status === "signed");
              mappedStatus = allSigned ? "signed" : "signing";
            } else if (envelopeStatus === "active" || envelopeStatus === "draft") {
              // Se tem signatários, está aguardando assinatura, senão está aguardando signatários
              mappedStatus = doc.signers.length > 0 ? "waiting_signers" : "pending";
            }

            // Preparar dados para atualização
            const updateData: any = {
              status: mappedStatus,
            };

            // Atualizar signedAt se o documento foi finalizado
            if (clicksignDocument.attributes.finished_at) {
              updateData.signedAt = new Date(clicksignDocument.attributes.finished_at);
            }

            // Sincronizar signatários com informações da Clicksign
            // Criar um mapa de signatários da Clicksign por email
            const clicksignSignersMap = new Map(
              clicksignSigners.map((s) => [s.attributes.email.toLowerCase(), s])
            );

            // Criar um mapa de requisitos por signerId
            const requirementsBySignerId = new Map<string, any[]>();
            clicksignRequirements.forEach((req) => {
              const signerId = req.relationships?.signer?.data?.id;
              if (signerId) {
                if (!requirementsBySignerId.has(signerId)) {
                  requirementsBySignerId.set(signerId, []);
                }
                requirementsBySignerId.get(signerId)!.push(req);
              }
            });

            // Atualizar signatários existentes e criar novos se necessário
            for (const clicksignSigner of clicksignSigners) {
              const existingSigner = doc.signers.find(
                (s) => s.clicksignSignerKey === clicksignSigner.id || 
                       s.email.toLowerCase() === clicksignSigner.attributes.email.toLowerCase()
              );

              const signerRequirements = requirementsBySignerId.get(clicksignSigner.id) || [];
              const authRequirement = signerRequirements.find((r) => r.attributes.action === "provide_evidence");
              const qualificationRequirement = signerRequirements.find((r) => r.attributes.action === "agree");

              if (existingSigner) {
                // Atualizar signatário existente
                await db.signer.update({
                  where: { id: existingSigner.id },
                  data: {
                    name: clicksignSigner.attributes.name,
                    email: clicksignSigner.attributes.email,
                    phoneNumber: clicksignSigner.attributes.phone_number || existingSigner.phoneNumber,
                    status: clicksignSigner.attributes.status === "signed" ? "signed" : 
                           clicksignSigner.attributes.status === "error" ? "error" : "pending",
                    clicksignSignerKey: clicksignSigner.id,
                    clicksignRequirementKey: authRequirement?.id || qualificationRequirement?.id || existingSigner.clicksignRequirementKey,
                  },
                });
              } else {
                // Criar novo signatário se não existir (pode ter sido criado diretamente na Clicksign)
                // Não criamos automaticamente para evitar duplicatas, apenas sincronizamos os existentes
              }
            }

            // Atualizar documento no banco
            await db.document.update({
              where: { id: doc.id },
              data: updateData,
            });

            // Recarregar signatários atualizados do banco
            const updatedSigners = await db.signer.findMany({
              where: { documentId: doc.id },
              orderBy: { order: "asc" },
            });

            // Atualizar objeto local
            doc.status = mappedStatus;
            if (updateData.signedAt) {
              doc.signedAt = updateData.signedAt;
            }
            doc.signers = updatedSigners;
          } catch (error) {
            console.error(`Erro ao sincronizar documento ${doc.id}:`, error);
            // Continua com os dados do banco em caso de erro
          }
        }

        return {
          id: doc.id,
          name: doc.name,
          fileName: doc.fileName,
          fileSize: doc.fileSize,
          pageCount: doc.pageCount,
          status: doc.status,
          uploadedAt: doc.uploadedAt,
          signedAt: doc.signedAt,
          signers: doc.signers.map((s) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            documentNumber: s.documentNumber,
            documentType: s.documentType,
            phoneNumber: s.phoneNumber,
            identification: s.identification,
            signatureType: s.signatureType,
            status: s.status,
            order: s.order,
            signedAt: s.signedAt,
            certificateId: s.certificateId,
          })),
        };
      })
    );

    // Extrair documentos dos resultados (Promise.allSettled retorna {status, value})
    const finalDocuments = documentsWithSyncedStatus.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        console.error(`Erro ao processar documento ${documents[index]?.id}:`, result.reason);
        // Retornar documento original em caso de erro
        const originalDoc = documents[index];
        return {
          id: originalDoc.id,
          name: originalDoc.name,
          fileName: originalDoc.fileName,
          fileSize: originalDoc.fileSize,
          pageCount: originalDoc.pageCount,
          status: originalDoc.status,
          uploadedAt: originalDoc.uploadedAt,
          signedAt: originalDoc.signedAt,
          signers: originalDoc.signers.map((s) => ({
            id: s.id,
            name: s.name,
            email: s.email,
            documentNumber: s.documentNumber,
            documentType: s.documentType,
            phoneNumber: s.phoneNumber,
            identification: s.identification,
            signatureType: s.signatureType,
            status: s.status,
            order: s.order,
            signedAt: s.signedAt,
            certificateId: s.certificateId,
          })),
        };
      }
    });

    return NextResponse.json({
      documents: finalDocuments,
    });
  } catch (error: any) {
    console.error("Erro ao listar documentos:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao listar documentos. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/documentos
 * Upload de PDF e criação de envelope na Clicksign
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file) {
      console.error("[DEBUG] Arquivo não fornecido");
      return NextResponse.json(
        { error: "Arquivo não fornecido" },
        { status: 400 }
      );
    }

    if (!name) {
      console.error("[DEBUG] Nome do documento não fornecido");
      return NextResponse.json(
        { error: "Nome do documento não fornecido" },
        { status: 400 }
      );
    }

    // Validar se é PDF
    if (file.type !== "application/pdf") {
      console.error("[DEBUG] Tipo de arquivo inválido:", file.type);
      return NextResponse.json(
        { error: "Apenas arquivos PDF são permitidos" },
        { status: 400 }
      );
    }

    // Validar tamanho do arquivo (limite de 10MB para evitar problemas)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      console.error("[DEBUG] Arquivo muito grande:", { size: file.size, maxSize: MAX_FILE_SIZE });
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    console.log("[DEBUG] Convertendo arquivo para base64...");
    console.log("[DEBUG] Tamanho do arquivo:", { 
      size: file.size, 
      sizeInMB: (file.size / 1024 / 1024).toFixed(2) 
    });
    
    // Converter arquivo para base64 com MIME type (formato data URI)
    // CORREÇÃO: Conversão correta conforme documentação da Clicksign
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");
    // Formato esperado pela Clicksign: data:application/pdf;base64,{base64}
    const content_base64 = `data:application/pdf;base64,${base64}`;
    
    console.log("[DEBUG] Arquivo convertido:", {
      bufferSize: buffer.length,
      base64Length: base64.length,
      contentBase64Length: content_base64.length,
      contentBase64Prefix: content_base64.substring(0, 50) + "...",
      estimatedRequestSize: (content_base64.length / 1024).toFixed(2) + " KB",
    });

    // Calcular número de páginas do PDF
    let pageCount = 0;
    try {
      console.log("[DEBUG] Calculando número de páginas do PDF...");
      const pdfDoc = await PDFDocument.load(buffer);
      pageCount = pdfDoc.getPageCount();
      console.log("[DEBUG] Número de páginas:", pageCount);
    } catch (error) {
      console.warn("[DEBUG] Erro ao calcular número de páginas do PDF:", error);
      // Continua com pageCount = 0 se não conseguir calcular
    }

    // ETAPA 1: Criar envelope na Clicksign
    console.log("[DEBUG] === ETAPA 1: Criando envelope ===");
    const { envelopeId: envelopeKey } = await createEnvelope({ name, locale: "pt-BR" });
    console.log("[DEBUG] ✓ Envelope criado:", { envelopeKey });

    // ETAPA 2: Upload de documento e aguardar confirmação
    console.log("[DEBUG] === ETAPA 2: Upload de documento ===");
    const { documentId: documentKey, verified } = await uploadDocument(
      envelopeKey,
      file.name,
      content_base64
    );
    
    if (!verified) {
      throw new Error("Documento não foi processado corretamente pela Clicksign");
    }
    
    console.log("[DEBUG] ✓ Documento enviado e verificado:", { documentKey });

    // Calcular hash do arquivo
    console.log("[DEBUG] Calculando hash do arquivo...");
    const hash = createHash("sha256").update(buffer).digest("hex");
    console.log("[DEBUG] Hash calculado:", hash.substring(0, 20) + "...");

    // Salvar no banco de dados
    console.log("[DEBUG] Salvando documento no banco de dados...");
    const documentId = generateIdFromEntropySize(10);
    const document = await db.document.create({
      data: {
        id: documentId,
        name,
        fileName: file.name,
        fileSize: file.size,
        pageCount,
        status: "pending",
        hash,
        clicksignEnvelopeKey: envelopeKey,
        clicksignDocumentKey: documentKey,
        userId: user.id,
      },
    });
    console.log("[DEBUG] Documento salvo no banco com sucesso:", { documentId: document.id });

    return NextResponse.json({
      documentId: document.id,
      name: document.name,
      status: "pending",
    });
  } catch (error: any) {
    console.error("[DEBUG] Erro ao criar documento:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        error: error.message || "Erro ao criar documento. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

