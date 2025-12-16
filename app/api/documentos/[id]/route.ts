import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicksignClient } from "@/lib/clicksign/client";
import { requireAuth } from "@/lib/auth/utils";
import { handleError } from "@/lib/utils/error-handler";

/**
 * Bloquear cache e reexecução automática
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    let finalDocument = document;

    // Sincronizar informações completas com a Clicksign se houver keys
    if (document.clicksignEnvelopeKey && document.clicksignDocumentKey) {
      try {
        const envelope = await clicksignClient.getEnvelope(document.clicksignEnvelopeKey);
        const clicksignDocument = await clicksignClient.getDocument(
          document.clicksignEnvelopeKey,
          document.clicksignDocumentKey
        );
        const clicksignSigners = await clicksignClient.getSigners(document.clicksignEnvelopeKey);
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

        const updateData: any = {
          status: mappedStatus,
        };

        if (clicksignDocument.attributes.finished_at) {
          updateData.signedAt = new Date(clicksignDocument.attributes.finished_at);
        }

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

        /**
         * TRANSAÇÃO: Consolidar todas as queries em uma única conexão
         */
        const updatedDocument = await db.$transaction(async (tx) => {
          const signerUpdates = clicksignSigners
            .map((clicksignSigner) => {
              const existingSigner = document.signers.find(
                (s) => s.clicksignSignerKey === clicksignSigner.id || 
                       s.email.toLowerCase() === clicksignSigner.attributes.email.toLowerCase()
              );

              if (!existingSigner) return null;

              const signerRequirements = requirementsBySignerId.get(clicksignSigner.id) || [];
              const authRequirement = signerRequirements.find((r) => r.attributes.action === "provide_evidence");
              const qualificationRequirement = signerRequirements.find((r) => r.attributes.action === "agree");

              return tx.signer.update({
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
            })
            .filter((update): update is NonNullable<typeof update> => update !== null);

          await Promise.all(signerUpdates);

          await tx.document.update({
            where: { id },
            data: updateData,
          });

          return tx.document.findUnique({
            where: { id },
            include: {
              signers: {
                orderBy: { order: "asc" },
              },
            },
          });
        });

        if (updatedDocument) {
          finalDocument = updatedDocument;
        }
      } catch (error) {
        console.error("Erro ao sincronizar com Clicksign:", error);
      }
    }

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
    return handleError(error, { route: "GET /api/documentos/[id]", userId: error.user?.id });
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
          } catch (error: any) {
            // Se falhar ao deletar envelope, continua
          }
        }
      } catch (error: any) {
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
    return handleError(error, { route: "DELETE /api/documentos/[id]", userId: error.user?.id });
  }
}

