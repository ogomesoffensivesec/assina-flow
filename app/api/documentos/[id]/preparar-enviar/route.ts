import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activateEnvelope, verifyAllSignersHaveRequirements, notifyEnvelope } from "@/lib/clicksign/service";
import { requireAuth } from "@/lib/auth/utils";
import { handleError } from "@/lib/utils/error-handler";

/**
 * POST /api/documentos/[id]/preparar-enviar
 * Prepara o documento e envia notificação para os signatários
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[DEBUG] Iniciando preparação e envio para assinatura...");
  try {
    const { user } = await requireAuth();
    const { id } = await params;
    console.log("[DEBUG] Usuário autenticado:", { userId: user.id, email: user.email });
    console.log("[DEBUG] Documento ID:", id);

    // Buscar documento com signatários
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

    // Verificar se o usuário tem permissão
    if (document.userId !== user.id && user.role !== "admin") {
      console.error("[DEBUG] Sem permissão para preparar documento");
      return NextResponse.json(
        { error: "Sem permissão para preparar documento" },
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

    if (document.signers.length === 0) {
      console.error("[DEBUG] Documento não tem signatários");
      return NextResponse.json(
        { error: "Adicione pelo menos um signatário antes de preparar o documento" },
        { status: 400 }
      );
    }

    // Verificar que todos os signatários têm requisitos criados
    console.log("[DEBUG] Verificando requisitos dos signatários...");
    const requirementsVerified = await verifyAllSignersHaveRequirements(
      document.clicksignEnvelopeKey,
      document.signers.length
    );
    
    if (!requirementsVerified) {
      console.warn("[DEBUG] ⚠ Alguns requisitos podem estar faltando, mas continuando...");
    }
    
    console.log("[DEBUG] ✓ Verificação de requisitos concluída");

    // Ativar envelope na Clicksign (muda status de draft para running)
    console.log("[DEBUG] Ativando envelope...");
    const activationResult = await activateEnvelope(document.clicksignEnvelopeKey);
    
    if (!activationResult.verified) {
      throw new Error("Envelope não foi ativado corretamente");
    }
    
    console.log("[DEBUG] ✓ Envelope ativado");

    // Criar notificação para todos os signatários
    console.log("[DEBUG] Criando notificação para os signatários...");
    try {
      await notifyEnvelope(document.clicksignEnvelopeKey, {
        message: `Documento "${document.name}" está pronto para assinatura. Por favor, acesse o link enviado por email ou WhatsApp.`,
      });
      console.log("[DEBUG] ✓ Notificação enviada");
    } catch (error: any) {
      console.warn("[DEBUG] ⚠ Erro ao notificar (não crítico):", error.message);
      // Não falhar o processo se a notificação falhar
    }

    // Atualizar status do documento para "signing" (aguardando assinaturas)
    console.log("[DEBUG] Atualizando status do documento para 'signing'...");
    await db.document.update({
      where: { id },
      data: {
        status: "signing",
      },
    });
    console.log("[DEBUG] ✓ Status atualizado para 'signing'");

    console.log("[DEBUG] Documento preparado e notificação enviada com sucesso");
    return NextResponse.json({
      success: true,
      message: "Documento preparado e notificação enviada para os signatários",
      status: "signing",
    });
  } catch (error: any) {
    return handleError(error, { route: "POST /api/documentos/[id]/preparar-enviar", userId: error.user?.id });
  }
}

