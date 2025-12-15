import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listRequirements } from "@/lib/clicksign/service";
import { requireAuth } from "@/lib/auth/utils";

/**
 * GET /api/documentos/[id]/requisitos
 * Lista todos os requisitos do envelope do documento
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[DEBUG] Listando requisitos do documento...");
  try {
    const { user } = await requireAuth();
    const { id } = await params;
    console.log("[DEBUG] Usuário autenticado:", { userId: user.id, email: user.email });
    console.log("[DEBUG] Documento ID:", id);

    // Buscar documento
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

    // Verificar permissão
    if (document.userId !== user.id && user.role !== "admin") {
      console.error("[DEBUG] Sem permissão para listar requisitos");
      return NextResponse.json(
        { error: "Sem permissão para acessar este documento" },
        { status: 403 }
      );
    }

    if (!document.clicksignEnvelopeKey) {
      console.error("[DEBUG] Documento não tem envelopeKey da Clicksign");
      return NextResponse.json(
        { error: "Documento não está configurado na Clicksign" },
        { status: 400 }
      );
    }

    // Listar requisitos
    console.log("[DEBUG] Listando requisitos do envelope...");
    const requirements = await listRequirements(document.clicksignEnvelopeKey);
    
    console.log("[DEBUG] Requisitos listados:", { count: requirements.length });

    return NextResponse.json({
      requirements: requirements.map((req) => ({
        id: req.id,
        action: req.attributes.action,
        role: req.attributes.role,
        auth: req.attributes.auth,
        documentId: req.relationships?.document?.data?.id,
        signerId: req.relationships?.signer?.data?.id,
      })),
      count: requirements.length,
    });
  } catch (error: any) {
    console.error("[DEBUG] Erro ao listar requisitos:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        error: error.message || "Erro ao listar requisitos. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

