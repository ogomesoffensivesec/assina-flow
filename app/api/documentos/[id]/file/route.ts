import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicksignClient } from "@/lib/clicksign/client";
import { requireAuth } from "@/lib/auth/utils";

/**
 * GET /api/documentos/[id]/file
 * Retorna o PDF original do documento
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    const document = await db.document.findUnique({
      where: { id },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissão
    if (document.userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para acessar este documento" },
        { status: 403 }
      );
    }

    // Se temos a chave do documento na Clicksign, tentar baixar de lá
    if (document.clicksignDocumentKey) {
      try {
        const status = await clicksignClient.getDocumentStatus(
          document.clicksignDocumentKey,
          document.clicksignEnvelopeKey || undefined
        );

        // Se já está assinado, retornar o assinado
        if (status.signed_file_url) {
          const pdfBuffer = await clicksignClient.downloadSignedDocument(
            status.signed_file_url
          );
          return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${document.fileName}"`,
            },
          });
        }

        // Se não está assinado, tentar baixar o original
        // A Clicksign pode ter uma URL para o original também
        if (status.original_file_url) {
          const pdfBuffer = await clicksignClient.downloadSignedDocument(
            status.original_file_url
          );
          return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `inline; filename="${document.fileName}"`,
            },
          });
        }
      } catch (error) {
        console.error("Erro ao baixar da Clicksign:", error);
        // Continua para retornar erro
      }
    }

    // Se não conseguiu da Clicksign, retornar erro
    // TODO: Em produção, armazenar o PDF original no Vercel Blob durante upload
    return NextResponse.json(
      { error: "PDF não disponível. O documento pode não ter sido processado ainda ou ainda não foi assinado." },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Erro ao buscar PDF:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao buscar PDF. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

