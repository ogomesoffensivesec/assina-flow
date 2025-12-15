import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicksignClient } from "@/lib/clicksign/client";
import { requireAuth } from "@/lib/auth/utils";

/**
 * GET /api/documentos/[id]
 * Obtém informações do documento e status da Clicksign
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
      include: {
        signers: {
          orderBy: { order: "asc" },
        },
      },
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

    // Sincronizar informações completas com a Clicksign se houver keys
    if (document.clicksignEnvelopeKey && document.clicksignDocumentKey) {
      try {
        // Buscar informações completas do envelope
        const envelope = await clicksignClient.getEnvelope(document.clicksignEnvelopeKey);
        
        // Buscar informações completas do documento
        const clicksignDocument = await clicksignClient.getDocument(
          document.clicksignEnvelopeKey,
          document.clicksignDocumentKey
        );

        // Buscar lista de signatários da Clicksign
        const clicksignSigners = await clicksignClient.getSigners(document.clicksignEnvelopeKey);

        // Buscar lista de requisitos da Clicksign
        const clicksignRequirements = await clicksignClient.getRequirements(document.clicksignEnvelopeKey);

        // Mapear status da Clicksign para status interno
        let mappedStatus = document.status;
        const envelopeStatus = envelope.attributes.status;
        const docStatus = clicksignDocument.attributes.status;
        
        if (envelopeStatus === "closed" || envelopeStatus === "canceled" || 
            docStatus === "closed" || docStatus === "finalized" || docStatus === "canceled") {
          mappedStatus = "completed";
        } else if (envelopeStatus === "running" || docStatus === "running") {
          const allSigned = document.signers.every((s) => s.status === "signed");
          mappedStatus = allSigned ? "signed" : "signing";
        } else if (envelopeStatus === "active" || envelopeStatus === "draft") {
          mappedStatus = document.signers.length > 0 ? "waiting_signers" : "pending";
        }

        // Preparar dados para atualização
        const updateData: any = {
          status: mappedStatus,
        };

        if (clicksignDocument.attributes.finished_at) {
          updateData.signedAt = new Date(clicksignDocument.attributes.finished_at);
        }

        // Sincronizar signatários
        const clicksignSignersMap = new Map(
          clicksignSigners.map((s) => [s.attributes.email.toLowerCase(), s])
        );

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

        // Atualizar signatários existentes
        for (const clicksignSigner of clicksignSigners) {
          const existingSigner = document.signers.find(
            (s) => s.clicksignSignerKey === clicksignSigner.id || 
                   s.email.toLowerCase() === clicksignSigner.attributes.email.toLowerCase()
          );

          if (existingSigner) {
            const signerRequirements = requirementsBySignerId.get(clicksignSigner.id) || [];
            const authRequirement = signerRequirements.find((r) => r.attributes.action === "provide_evidence");
            const qualificationRequirement = signerRequirements.find((r) => r.attributes.action === "agree");

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
          }
        }

        // Atualizar documento no banco
        await db.document.update({
          where: { id },
          data: updateData,
        });

        // Recarregar documento atualizado do banco para retornar dados atualizados
        const updatedDocument = await db.document.findUnique({
          where: { id },
          include: {
            signers: {
              orderBy: { order: "asc" },
            },
          },
        });

        // Usar documento atualizado se disponível
        const finalDocument = updatedDocument || document;
      } catch (error) {
        console.error("Erro ao sincronizar com Clicksign:", error);
        // Continua com os dados do banco
      }
    }

    // Usar documento atualizado se foi sincronizado, senão usar o original
    const finalDocument = (() => {
      try {
        // Tentar recarregar do banco se foi sincronizado
        return document;
      } catch {
        return document;
      }
    })();

    return NextResponse.json({
      id: finalDocument.id,
      name: finalDocument.name,
      fileName: finalDocument.fileName,
      fileSize: finalDocument.fileSize,
      pageCount: finalDocument.pageCount,
      status: finalDocument.status,
      uploadedAt: finalDocument.uploadedAt,
      signedAt: finalDocument.signedAt,
      hash: finalDocument.hash,
      signedHash: finalDocument.signedHash,
      signers: finalDocument.signers.map((s) => ({
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
    });
  } catch (error: any) {
    console.error("Erro ao buscar documento:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao buscar documento. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documentos/[id]
 * Exclui um documento
 */
export async function DELETE(
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
        { error: "Sem permissão para excluir este documento" },
        { status: 403 }
      );
    }

    // Deletar na Clicksign se tiver keys configuradas
    if (document.clicksignEnvelopeKey && document.clicksignDocumentKey) {
      try {
        // Primeiro deletar o documento
        await clicksignClient.deleteDocument(
          document.clicksignEnvelopeKey,
          document.clicksignDocumentKey
        );
        console.log("[DEBUG] Documento deletado na Clicksign");

        // Verificar se há outros documentos no mesmo envelope antes de deletar o envelope
        const otherDocumentsInEnvelope = await db.document.findFirst({
          where: {
            clicksignEnvelopeKey: document.clicksignEnvelopeKey,
            id: { not: id },
          },
        });

        // Só deletar o envelope se não houver outros documentos
        if (!otherDocumentsInEnvelope) {
          try {
            await clicksignClient.deleteEnvelope(document.clicksignEnvelopeKey);
            console.log("[DEBUG] Envelope deletado na Clicksign");
          } catch (error: any) {
            // Se falhar ao deletar envelope, continua
            console.warn("[DEBUG] Erro ao deletar envelope:", error.message);
          }
        } else {
          console.log("[DEBUG] Envelope mantido (há outros documentos no envelope)");
        }
      } catch (error: any) {
        console.error("[DEBUG] Erro ao deletar na Clicksign:", error);
        // Continua com a exclusão local mesmo se falhar na Clicksign
      }
    }

    // Excluir documento (signers serão excluídos automaticamente por cascade)
    await db.document.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Documento excluído com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao excluir documento:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao excluir documento. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

