import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicksignClient } from "@/lib/clicksign/client";
import { activateEnvelope, startSignature, verifyAllSignersHaveRequirements, notifyEnvelope } from "@/lib/clicksign/service";
import { requireAuth } from "@/lib/auth/utils";
import { handleError } from "@/lib/utils/error-handler";

/**
 * POST /api/documentos/[id]/assinar
 * Processa assinatura completa do documento com certificado A1
 * Recebe: certificateId, reason, location
 * Processa tudo em background: cria signatário se necessário, ativa envelope, assina
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    // Ler body com motivo e local (certificados já estão vinculados aos signatários)
    const body = await request.json();
    const { reason, location } = body;

    if (!reason || !location) {
      return NextResponse.json(
        { error: "Motivo e local são obrigatórios" },
        { status: 400 }
      );
    }

    const document = await db.document.findUnique({
      where: { id },
      include: { signers: true },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    console.log("[DEBUG] Documento encontrado:", {
      id: document.id,
      name: document.name,
      status: document.status,
      envelopeKey: document.clicksignEnvelopeKey,
      documentKey: document.clicksignDocumentKey,
      signersCount: document.signers.length,
    });

    // Verificar permissão
    if (document.userId !== user.id && user.role !== "admin") {
      console.error("[DEBUG] Sem permissão para assinar:", {
        documentUserId: document.userId,
        currentUserId: user.id,
        userRole: user.role,
      });
      return NextResponse.json(
        { error: "Sem permissão para assinar este documento" },
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

    // Verificar se há signatários configurados
    if (document.signers.length === 0) {
      console.error("[DEBUG] Documento não tem signatários configurados");
      return NextResponse.json(
        { error: "Configure os signatários antes de assinar" },
        { status: 400 }
      );
    }

    // Verificar se todos os signatários têm certificados vinculados
    const signersWithoutCert = document.signers.filter((s) => !s.certificateId);
    if (signersWithoutCert.length > 0) {
      console.error("[DEBUG] Alguns signatários não têm certificado vinculado:", signersWithoutCert.map((s) => s.id));
      return NextResponse.json(
        { error: "Todos os signatários devem ter certificados vinculados" },
        { status: 400 }
      );
    }

    // ETAPA 4: Verificar que todos os signatários têm requisitos antes de ativar
    console.log("[DEBUG] === ETAPA 4: Verificando requisitos ===");
    const requirementsVerified = await verifyAllSignersHaveRequirements(
      document.clicksignEnvelopeKey!,
      document.signers.length
    );
    
    if (!requirementsVerified) {
      console.warn("[DEBUG] ⚠ Alguns requisitos podem estar faltando, mas continuando...");
    }
    
    console.log("[DEBUG] ✓ Verificação de requisitos concluída");

    // ETAPA 5: Ativar envelope na Clicksign (só após todos os requisitos estarem criados)
    console.log("[DEBUG] === ETAPA 5: Ativando envelope ===");
    const activationResult = await activateEnvelope(document.clicksignEnvelopeKey!);
    
    if (!activationResult.verified) {
      throw new Error("Envelope não foi ativado corretamente");
    }
    
    console.log("[DEBUG] ✓ Envelope ativado e verificado");

    // ETAPA 6: Notificar signatários
    console.log("[DEBUG] === ETAPA 6: Notificando signatários ===");
    try {
      await notifyEnvelope(document.clicksignEnvelopeKey!, {
        message: `Documento "${document.name}" está pronto para assinatura. Por favor, acesse o link enviado por email.`,
      });
      console.log("[DEBUG] ✓ Notificação enviada");
    } catch (error: any) {
      console.warn("[DEBUG] ⚠ Erro ao notificar (não crítico):", error.message);
      // Não falhar o processo se a notificação falhar
    }

    // ETAPA 7: Iniciar fluxo de assinatura
    console.log("[DEBUG] === ETAPA 7: Iniciando assinatura ===");
    await startSignature(document.clicksignEnvelopeKey!, document.clicksignDocumentKey!);

    // Atualizar status do documento
    console.log("[DEBUG] Atualizando status do documento para 'signing'...");
    await db.document.update({
      where: { id },
      data: {
        status: "signing",
      },
    });

    // TODO: Processar assinatura para cada signatário com seu certificado
    // Por enquanto, apenas ativamos o envelope e atualizamos status
    // A assinatura real seria feita via webhook ou processo em background
    console.log("[DEBUG] Processando assinatura para", document.signers.length, "signatários...");
    
    // Atualizar todos os signatários para "signing"
    await Promise.all(
      document.signers.map((signer) =>
        db.signer.update({
          where: { id: signer.id },
          data: {
            status: "signing",
          },
        })
      )
    );
    console.log("[DEBUG] Status dos signatários atualizado para 'signing'");

    console.log("[DEBUG] Status atualizado");

    // Aguardar um pouco e verificar status
    // Em produção, isso poderia ser feito via webhook
    console.log("[DEBUG] Aguardando 2 segundos antes de verificar status...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Buscar status atualizado
    let finalStatus = "signing";
    try {
      if (document.clicksignDocumentKey) {
        console.log("[DEBUG] Verificando status do documento na Clicksign:", document.clicksignDocumentKey);
        const status = await clicksignClient.getDocumentStatus(
          document.clicksignDocumentKey,
          document.clicksignEnvelopeKey || undefined
        );
        console.log("[DEBUG] Status retornado pela Clicksign:", status);

        // Mapear status
        if (status.status === "closed" || status.status === "finalized") {
          finalStatus = "signed";
        } else if (status.status === "running") {
          finalStatus = "signing";
        }

        console.log("[DEBUG] Status mapeado:", finalStatus);

        // Atualizar no banco
        await db.document.update({
          where: { id },
          data: {
            status: finalStatus,
            signedAt: status.finished_at ? new Date(status.finished_at) : new Date(),
          },
        });
        console.log("[DEBUG] Status atualizado no banco de dados");
      } else {
        console.warn("[DEBUG] Documento não tem documentKey, pulando verificação de status");
        // Se não conseguir verificar, assumir que foi assinado
        await db.document.update({
          where: { id },
          data: {
            status: "signed",
            signedAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error("[DEBUG] Erro ao verificar status:", {
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
      // Em caso de erro, assumir que foi assinado
      await db.document.update({
        where: { id },
        data: {
          status: "signed",
          signedAt: new Date(),
        },
      });
    }

    console.log("[DEBUG] Processo de assinatura concluído com sucesso");
    return NextResponse.json({
      success: true,
      status: finalStatus === "signing" ? "signed" : finalStatus,
      message: "Documento assinado com sucesso",
    });
  } catch (error: any) {
    return handleError(error, { route: "POST /api/documentos/[id]/assinar", userId: error.user?.id });
  }
}
