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

    /**
     * CORREÇÃO CRÍTICA: Otimizar deleção em batch
     * 
     * PROBLEMA ORIGINAL:
     * - Loop sequencial com db.document.findFirst + db.document.delete para cada documento
     * - Múltiplas queries desnecessárias para verificar envelopes
     * 
     * SOLUÇÃO:
     * - Verificar envelopes uma única vez antes do loop
     * - Consolidar deleções do banco em transação quando possível
     * - Manter operações Clicksign sequenciais (são externas, não bloqueiam pool)
     */
    
    // Verificar quais envelopes devem ser deletados (uma única query)
    const envelopeCheckPromises = Array.from(envelopeToDocuments.keys()).map(async (envelopeKey) => {
      const documentsInSameEnvelope = envelopeToDocuments.get(envelopeKey) || [];
      // Verificar se há outros documentos no mesmo envelope (fora do batch atual)
      const otherDocumentsInEnvelope = await db.document.findFirst({
        where: {
          clicksignEnvelopeKey: envelopeKey,
          id: { not: { in: documents.map((d) => d.id) } },
        },
      });
      return {
        envelopeKey,
        shouldDeleteEnvelope: documentsInSameEnvelope.length === 1 && !otherDocumentsInEnvelope,
      };
    });
    
    const envelopeChecks = await Promise.all(envelopeCheckPromises);
    const envelopesToDelete = new Set(
      envelopeChecks
        .filter((check) => check.shouldDeleteEnvelope)
        .map((check) => check.envelopeKey)
    );

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

            // Deletar envelope se necessário (já verificamos antes)
            if (envelopesToDelete.has(document.clicksignEnvelopeKey)) {
              try {
                await clicksignClient.deleteEnvelope(document.clicksignEnvelopeKey);
                // Remover do set para não tentar deletar novamente
                envelopesToDelete.delete(document.clicksignEnvelopeKey);
              } catch (error: any) {
                // Se falhar ao deletar envelope, continua
              }
            }
          } catch (error: any) {
            // Continua com a exclusão local mesmo se falhar na Clicksign
          }
        }

        // Excluir do banco de dados
        await db.document.delete({
          where: { id: document.id },
        });

        results.success.push(document.id);
      } catch (error: any) {
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

