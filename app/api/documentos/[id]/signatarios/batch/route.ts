import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addSigner, verifyAllSignersHaveRequirements } from "@/lib/clicksign/service";
import { requireAuth } from "@/lib/auth/utils";
import { generateIdFromEntropySize } from "lucia";
import { validateCPF, validateCNPJ } from "@/lib/utils";
import { Prisma } from "@prisma/client";

interface SignerData {
  certificateId?: string; // Opcional agora
  name: string;
  email: string;
  documentNumber: string; // CPF ou CNPJ (obrigatório)
  documentType: "PF" | "PJ"; // PF ou PJ
  phoneNumber?: string; // WhatsApp
  identification?: string; // comprador, locador, etc.
  order: number;
}

/**
 * POST /api/documentos/[id]/signatarios/batch
 * Cria múltiplos signatários de uma vez
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[DEBUG] Iniciando criação de signatários em lote...");
  try {
    const { user } = await requireAuth();
    const { id } = await params;
    console.log("[DEBUG] Usuário autenticado:", { userId: user.id, email: user.email });
    console.log("[DEBUG] Documento ID:", id);

    const body = await request.json();
    const { signers } = body as { signers: SignerData[] };
    console.log("[DEBUG] Signatários recebidos:", signers?.length || 0);

    if (!signers || !Array.isArray(signers) || signers.length === 0) {
      console.error("[DEBUG] Lista de signatários inválida ou vazia");
      return NextResponse.json(
        { error: "Lista de signatários é obrigatória e não pode estar vazia" },
        { status: 400 }
      );
    }

    // Validar cada signatário
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      
      if (!signer.name || !signer.email || !signer.documentNumber || !signer.documentType || !signer.phoneNumber || !signer.identification) {
        console.error("[DEBUG] Signatário inválido (campos obrigatórios faltando):", signer);
        return NextResponse.json(
          { error: "Todos os signatários devem ter name, email, documentNumber, documentType, phoneNumber e identification" },
          { status: 400 }
        );
      }

      // Validar formato do documento
      const cleanedDocument = String(signer.documentNumber).trim().replace(/\D/g, "");
      const isValid = signer.documentType === "PF" 
        ? validateCPF(cleanedDocument) 
        : validateCNPJ(cleanedDocument);
      
      if (!isValid) {
        return NextResponse.json(
          { error: `${signer.documentType === "PF" ? "CPF" : "CNPJ"} inválido para o signatário "${signer.name}"` },
          { status: 400 }
        );
      }

      // DEBUG: Log detalhado do signatário recebido
      console.log(`[DEBUG Batch] Validando signatário ${i + 1}:`, {
        name: signer.name,
        nameType: typeof signer.name,
        nameLength: signer.name?.length,
        email: signer.email,
        certificateId: signer.certificateId,
        order: signer.order,
      });
      
      // Validar formato do nome
      if (!signer.name || typeof signer.name !== "string") {
        console.error("[DEBUG] Signatário inválido (nome não é string):", {
          name: signer.name,
          nameType: typeof signer.name,
          signer,
        });
        return NextResponse.json(
          { error: `Nome do signatário deve ser uma string válida` },
          { status: 400 }
        );
      }
      
      const cleanedName = String(signer.name).trim();
      console.log(`[DEBUG Batch] Nome após normalização:`, {
        original: signer.name,
        cleaned: cleanedName,
        length: cleanedName.length,
      });
      
      if (cleanedName.length < 2) {
        console.error("[DEBUG] Signatário inválido (nome muito curto):", {
          original: signer.name,
          cleaned: cleanedName,
          length: cleanedName.length,
        });
        return NextResponse.json(
          { error: `Nome do signatário "${signer.name}" deve ter pelo menos 2 caracteres` },
          { status: 400 }
        );
      }
      
      // IMPORTANTE: Clicksign requer no mínimo nome e sobrenome (pelo menos 2 palavras)
      const nameParts = cleanedName.split(/\s+/).filter(part => part.length > 0);
      if (nameParts.length < 2) {
        console.error("[DEBUG] Signatário inválido (nome deve ter pelo menos nome e sobrenome):", {
          original: signer.name,
          cleaned: cleanedName,
          parts: nameParts,
          partsCount: nameParts.length,
        });
        return NextResponse.json(
          { error: `Nome do signatário "${signer.name}" deve conter pelo menos nome e sobrenome (mínimo 2 palavras)` },
          { status: 400 }
        );
      }

      // Validar formato do email
      const cleanedEmail = String(signer.email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)) {
        console.error("[DEBUG] Signatário inválido (email inválido):", signer);
        return NextResponse.json(
          { error: `Email do signatário "${signer.email}" é inválido` },
          { status: 400 }
        );
      }

      // Normalizar dados antes de usar
      signer.name = cleanedName;
      signer.email = cleanedEmail;
      
      console.log(`[DEBUG Batch] Signatário ${i + 1} validado e normalizado:`, {
        name: signer.name,
        email: signer.email,
      });
    }

    // Buscar documento
    console.log("[DEBUG] Buscando documento no banco...");
    const document = await db.document.findUnique({
      where: { id },
      include: { signers: true },
    });

    if (!document) {
      console.error("[DEBUG] Documento não encontrado:", id);
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    console.log("[DEBUG] Documento encontrado:", {
      id: document.id,
      name: document.name,
      envelopeKey: document.clicksignEnvelopeKey,
      documentKey: document.clicksignDocumentKey,
      existingSignersCount: document.signers.length,
    });

    // Verificar se o usuário tem permissão
    if (document.userId !== user.id && user.role !== "admin") {
      console.error("[DEBUG] Sem permissão para adicionar signatários");
      return NextResponse.json(
        { error: "Sem permissão para adicionar signatários" },
        { status: 403 }
      );
    }

    if (!document.clicksignEnvelopeKey || !document.clicksignDocumentKey) {
      console.error("[DEBUG] Documento não tem keys da Clicksign configuradas");
      return NextResponse.json(
        { error: "Documento não está configurado na Clicksign" },
        { status: 400 }
      );
    }

    /**
     * CORREÇÃO CRÍTICA: Consolidar múltiplas queries em transação
     * 
     * PROBLEMA ORIGINAL:
     * - Loop sequencial com db.signer.create para cada signatário
     * - Depois: db.document.update + db.document.findUnique separados
     * - Múltiplas conexões do pool para operações relacionadas
     * 
     * SOLUÇÃO:
     * - Criar signatários na Clicksign primeiro (operações externas)
     * - Consolidar todas as queries Prisma em uma única transação
     */
    const createdSigners: Prisma.SignerGetPayload<{}>[] = [];
    const errors: Array<{ index: number; name: string; error: string }> = [];
    const signerCreateData: Array<{
      signerId: string;
      cleanedDocument: string;
      signerData: SignerData;
      clicksignResult: Awaited<ReturnType<typeof addSigner>>;
    }> = [];

    // FASE 1: Criar signatários na Clicksign (operações externas, não bloqueiam pool)
    for (let i = 0; i < signers.length; i++) {
      const signerData = signers[i];
      console.log(`[DEBUG] Processando signatário ${i + 1}/${signers.length}:`, {
        name: signerData.name,
        email: signerData.email,
        phoneNumber: signerData.phoneNumber,
        identification: signerData.identification,
        certificateId: signerData.certificateId,
      });

      try {
        // Usar o serviço para adicionar signatário (inclui validação de certificado e criação de requisito)
        const result = await addSigner(
          document.clicksignEnvelopeKey!,
          document.clicksignDocumentKey!,
          signerData,
          user.id
        );

        console.log(`[DEBUG] ✓ Signatário ${i + 1} criado na Clicksign:`, {
          signerId: result.signerId,
          qualificationRequirementId: result.qualificationRequirement?.id,
          authRequirementId: result.authRequirement?.id,
        });

        // Exibir respostas completas formatadas
        console.log(`\n[DEBUG] ===== RESPOSTA COMPLETA - SIGNATÁRIO ${i + 1} - QUALIFICAÇÃO SIGN =====`);
        console.log(JSON.stringify({ data: result.qualificationRequirement }, null, 2));
        console.log(`\n[DEBUG] ===== RESPOSTA COMPLETA - SIGNATÁRIO ${i + 1} - AUTENTICAÇÃO ICP_BRASIL =====`);
        console.log(JSON.stringify({ data: result.authRequirement }, null, 2));
        console.log(`\n[DEBUG] ===== FIM DAS RESPOSTAS - SIGNATÁRIO ${i + 1} =====\n`);

        // Preparar dados para criação no banco (será feito em transação)
        const signerId = generateIdFromEntropySize(10);
        const cleanedDocument = String(signerData.documentNumber).trim().replace(/\D/g, "");
        signerCreateData.push({
          signerId,
          cleanedDocument,
          signerData,
          clicksignResult: result,
        });
      } catch (error: any) {
        console.error(`[DEBUG] ✗ Erro ao criar signatário ${i + 1}:`, {
          message: error?.message,
          detail: error?.detail,
          title: error?.title,
          signerData,
          error,
        });
        
        // Extrair mensagem de erro de forma segura
        let errorMessage = "Erro desconhecido";
        if (typeof error === "string") {
          errorMessage = error;
        } else if (error?.message) {
          errorMessage = String(error.message);
        } else if (error?.detail) {
          errorMessage = String(error.detail);
        } else if (error?.title) {
          errorMessage = String(error.title);
        } else if (error?.toString) {
          errorMessage = error.toString();
        }
        
        errors.push({
          index: i,
          name: String(signerData.name || "Desconhecido"),
          error: errorMessage,
        });
      }
    }

    // Se houver erros, verificar se pelo menos um foi criado
    if (errors.length > 0) {
      console.warn("[DEBUG] Alguns signatários falharam:", errors);
      
      // Se nenhum signatário foi criado, retornar erro
      if (signerCreateData.length === 0) {
        console.error("[DEBUG] Nenhum signatário foi criado, todos falharam");
        return NextResponse.json(
          {
            success: false,
            error: errors.length === 1 
              ? errors[0].error 
              : `Todos os ${errors.length} signatários falharam. Erros: ${errors.map((e: any) => `${e.name}: ${e.error}`).join(", ")}`,
            errors,
            created: 0,
            failed: errors.length,
          },
          { status: 400 }
        );
      }
    }

    // FASE 2: Consolidar todas as queries Prisma em uma única transação
    let updatedDocument;
    if (signerCreateData.length > 0) {
      console.log("[DEBUG] Criando signatários no banco em transação...");
      
      updatedDocument = await db.$transaction(async (tx) => {
        // Criar todos os signatários dentro da transação
        const signerCreates = signerCreateData.map((data) =>
          tx.signer.create({
            data: {
              id: data.signerId,
              name: data.signerData.name,
              email: data.signerData.email,
              documentNumber: data.cleanedDocument,
              documentType: data.signerData.documentType,
              phoneNumber: data.signerData.phoneNumber,
              identification: data.signerData.identification,
              signatureType: "electronic",
              order: data.signerData.order,
              status: "pending",
              certificateId: data.signerData.certificateId || null,
              clicksignSignerKey: data.clicksignResult.signerId,
              clicksignRequirementKey: data.clicksignResult.qualificationRequirement?.id || null,
              documentId: document.id,
            },
          })
        );

        const created = await Promise.all(signerCreates);
        createdSigners.push(...created);

        // Verificar que todos os signatários têm requisitos antes de atualizar status
        console.log("[DEBUG] Verificando que todos os signatários têm requisitos...");
        await verifyAllSignersHaveRequirements(
          document.clicksignEnvelopeKey!,
          created.length
        );

        // Atualizar status do documento dentro da mesma transação
        console.log("[DEBUG] Atualizando status do documento para 'waiting_signers'...");
        await tx.document.update({
          where: { id },
          data: {
            status: "waiting_signers",
          },
        });

        // Retornar documento completo com signatários atualizados
        return tx.document.findUnique({
          where: { id },
          include: {
            signers: {
              orderBy: { order: "asc" },
            },
          },
        });
      });

      console.log("[DEBUG] ✓ Transação concluída:", {
        signersCreated: createdSigners.length,
        documentStatus: updatedDocument?.status,
      });
    }

    // Se houver erros mas alguns foram criados, retornar parcialmente criado
    if (errors.length > 0 && createdSigners.length > 0) {
      return NextResponse.json(
        {
          success: true,
          partial: true,
          created: createdSigners.length,
          failed: errors.length,
          errors,
          signers: createdSigners,
        },
        { status: 207 } // Multi-Status
      );
    }

    // Se não há erros ou todos falharam, buscar documento atualizado se necessário
    if (!updatedDocument) {
      updatedDocument = await db.document.findUnique({
        where: { id },
        include: {
          signers: {
            orderBy: { order: "asc" },
          },
        },
      });
    }

    console.log("[DEBUG] Documento atualizado confirmado:", {
      id: updatedDocument?.id,
      status: updatedDocument?.status,
      signersCount: updatedDocument?.signers.length || 0,
    });

    return NextResponse.json({
      success: true,
      count: createdSigners.length,
      signers: createdSigners.map((s) => ({
        id: s.id,
        name: s.name,
        email: s.email,
        certificateId: s.certificateId,
        order: s.order,
      })),
      documentStatus: updatedDocument?.status,
      totalSigners: updatedDocument?.signers.length || 0,
    });
  } catch (error: any) {
    console.error("[DEBUG] Erro ao criar signatários em lote:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error: error,
      errorType: typeof error,
      errorString: String(error),
    });
    
    const errorMessage = error?.message || error?.toString() || "Erro ao criar signatários. Tente novamente.";
    
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === "development" ? {
          name: error?.name,
          stack: error?.stack,
        } : undefined,
      },
      { status: 500 }
    );
  }
}

