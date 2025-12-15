import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getDocumentEvents, getEnvelopeEvents } from "@/lib/clicksign/service";
import { requireAuth } from "@/lib/auth/utils";

/**
 * GET /api/documentos/[id]/eventos
 * Lista eventos do documento ou envelope
 * Query params: ?type=document|envelope (padrão: envelope)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[DEBUG] Listando eventos do documento...");
  try {
    const { user } = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "envelope"; // "document" ou "envelope"
    
    console.log("[DEBUG] Usuário autenticado:", { userId: user.id, email: user.email });
    console.log("[DEBUG] Documento ID:", id);
    console.log("[DEBUG] Tipo de eventos:", type);

    // Buscar documento
    const document = await db.document.findUnique({
      where: { id },
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
      console.error("[DEBUG] Sem permissão para listar eventos");
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

    // Listar eventos
    let events;
    if (type === "document") {
      if (!document.clicksignDocumentKey) {
        return NextResponse.json(
          { error: "Documento não tem documentKey da Clicksign" },
          { status: 400 }
        );
      }
      console.log("[DEBUG] Listando eventos do documento...");
      events = await getDocumentEvents(
        document.clicksignEnvelopeKey,
        document.clicksignDocumentKey
      );
    } else {
      console.log("[DEBUG] Listando eventos do envelope...");
      events = await getEnvelopeEvents(document.clicksignEnvelopeKey);
    }
    
    console.log("[DEBUG] Eventos listados:", { count: events.length });

    return NextResponse.json({
      events: events.map((event) => ({
        id: event.id,
        type: event.type,
        name: event.attributes.name,
        createdAt: event.attributes.created_at,
        metadata: event.attributes.metadata,
      })),
      count: events.length,
      type,
    });
  } catch (error: any) {
    console.error("[DEBUG] Erro ao listar eventos:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        error: error.message || "Erro ao listar eventos. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

