import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicksignClient } from "@/lib/clicksign/client";
import { requireAuth } from "@/lib/auth/utils";

/**
 * POST /api/documentos/batch-delete
 * Deleta múltiplos documentos de uma vez
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();
    const body = await request.json();
    const { documentIds } = body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json(
        { error: "Lista de IDs de documentos é obrigatória" },
        { status: 400 }
      );
    }

    // Buscar todos os documentos
    const documents = await db.document.findMany({
      where: {
        id: { in: documentIds },
        userId: user.role !== "admin" ? user.id : undefined,
      },
    });

    if (documents.length === 0) {
      return NextResponse.json(
        { error: "Nenhum documento encontrado para exclusão" },
        { status: 404 }
      );
    }

    // Verificar permissões
    const unauthorizedDocs = documents.filter(
      (doc) => doc.userId !== user.id && user.role !== "admin"
    );
    if (unauthorizedDocs.length > 0) {
      return NextResponse.json(
        { error: "Sem permissão para excluir alguns documentos" },
        { status: 403 }
      );
    }

    const results = {
      success: [] as string[],
      failed: [] as Array<{ id: string; error: string }>,
    };

    // Agrupar documentos por envelope para otimizar verificação
    const envelopeToDocuments = new Map<string, typeof documents>();
    documents.forEach((doc) => {
      if (doc.clicksignEnvelopeKey) {
        const existing = envelopeToDocuments.get(doc.clicksignEnvelopeKey) || [];
        existing.push(doc);
        envelopeToDocuments.set(doc.clicksignEnvelopeKey, existing);
      }
    });

    // Deletar cada documento
    for (const document of documents) {
      try {
        // Deletar na Clicksign se tiver keys configuradas
        if (document.clicksignEnvelopeKey && document.clicksignDocumentKey) {
          try {
            // Primeiro deletar o documento
            await clicksignClient.deleteDocument(
              document.clicksignEnvelopeKey,
              document.clicksignDocumentKey
            );
            console.log(`[DEBUG] Documento ${document.id} deletado na Clicksign`);

            // Verificar se há outros documentos no mesmo envelope (incluindo os que estão sendo deletados)
            const documentsInSameEnvelope = envelopeToDocuments.get(document.clicksignEnvelopeKey) || [];
            const otherDocumentsInEnvelope = await db.document.findFirst({
              where: {
                clicksignEnvelopeKey: document.clicksignEnvelopeKey,
                id: { not: { in: documents.map((d) => d.id) } },
              },
            });

            // Só deletar o envelope se não houver outros documentos (nem no batch atual nem no banco)
            const shouldDeleteEnvelope = documentsInSameEnvelope.length === 1 && !otherDocumentsInEnvelope;
            
            if (shouldDeleteEnvelope) {
              try {
                await clicksignClient.deleteEnvelope(document.clicksignEnvelopeKey);
                console.log(`[DEBUG] Envelope ${document.clicksignEnvelopeKey} deletado na Clicksign`);
              } catch (error: any) {
                // Se falhar ao deletar envelope, continua
                console.warn(`[DEBUG] Erro ao deletar envelope:`, error.message);
              }
            } else {
              console.log(`[DEBUG] Envelope mantido (há outros documentos no envelope)`);
            }
          } catch (error: any) {
            console.error(`[DEBUG] Erro ao deletar documento ${document.id} na Clicksign:`, error);
            // Continua com a exclusão local mesmo se falhar na Clicksign
          }
        }

        // Excluir do banco de dados
        await db.document.delete({
          where: { id: document.id },
        });

        results.success.push(document.id);
      } catch (error: any) {
        console.error(`[DEBUG] Erro ao deletar documento ${document.id}:`, error);
        results.failed.push({
          id: document.id,
          error: error.message || "Erro desconhecido",
        });
      }
    }

    return NextResponse.json({
      success: true,
      deleted: results.success.length,
      failed: results.failed.length,
      results,
      message: `${results.success.length} documento(s) excluído(s) com sucesso${results.failed.length > 0 ? `. ${results.failed.length} falha(s).` : "."}`,
    });
  } catch (error: any) {
    console.error("Erro ao deletar documentos em lote:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao deletar documentos. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

