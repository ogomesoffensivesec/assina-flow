import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicksignClient } from "@/lib/clicksign/client";
import { requireAuth } from "@/lib/auth/utils";
import { validateCPF, validateCNPJ } from "@/lib/utils";

/**
 * PATCH /api/documentos/[id]/signatarios/[signerId]
 * Atualiza um signatário
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signerId: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id, signerId } = await params;

    const body = await request.json();
    const { name, email, documentNumber, documentType, phoneNumber, identification, signatureType, order } = body;

    // Buscar documento
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

    // Verificar permissão
    if (document.userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para editar signatários deste documento" },
        { status: 403 }
      );
    }

    // Buscar signatário
    const signer = await db.signer.findUnique({
      where: { id: signerId },
    });

    if (!signer || signer.documentId !== id) {
      return NextResponse.json(
        { error: "Signatário não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o signatário já assinou (não permitir edição)
    if (signer.status === "signed") {
      return NextResponse.json(
        { error: "Não é possível editar um signatário que já assinou" },
        { status: 400 }
      );
    }

    // Validar documento se fornecido
    if (documentNumber !== undefined && documentType !== undefined) {
      const cleanedDocument = String(documentNumber).trim().replace(/\D/g, "");
      if (!cleanedDocument) {
        return NextResponse.json(
          { error: `${documentType === "PF" ? "CPF" : "CNPJ"} é obrigatório` },
          { status: 400 }
        );
      }
      
      const isValid = documentType === "PF" 
        ? validateCPF(cleanedDocument) 
        : validateCNPJ(cleanedDocument);
      
      if (!isValid) {
        return NextResponse.json(
          { error: `${documentType === "PF" ? "CPF" : "CNPJ"} inválido` },
          { status: 400 }
        );
      }
    }

    // Atualizar signatário
    const updatedSigner = await db.signer.update({
      where: { id: signerId },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(documentNumber !== undefined && { documentNumber: String(documentNumber).trim().replace(/\D/g, "") }),
        ...(documentType && { documentType }),
        ...(phoneNumber !== undefined && { phoneNumber: phoneNumber || null }),
        ...(identification !== undefined && { identification: identification || null }),
        ...(signatureType && { signatureType }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json({
      id: updatedSigner.id,
      name: updatedSigner.name,
      email: updatedSigner.email,
      status: updatedSigner.status,
      order: updatedSigner.order,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar signatário:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao atualizar signatário. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documentos/[id]/signatarios/[signerId]
 * Remove um signatário do documento
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; signerId: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id, signerId } = await params;

    // Buscar documento
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
        { error: "Sem permissão para remover signatários deste documento" },
        { status: 403 }
      );
    }

    // Buscar signatário
    const signer = await db.signer.findUnique({
      where: { id: signerId },
    });

    if (!signer || signer.documentId !== id) {
      return NextResponse.json(
        { error: "Signatário não encontrado" },
        { status: 404 }
      );
    }

    // Verificar se o signatário já assinou (não permitir remoção)
    if (signer.status === "signed") {
      return NextResponse.json(
        { error: "Não é possível remover um signatário que já assinou" },
        { status: 400 }
      );
    }

    // Verificar se o envelope está em draft ou running (permitir remoção na Clicksign)
    if (document.clicksignEnvelopeKey && signer.clicksignSignerKey) {
      try {
        const envelopeStatus = await clicksignClient.getEnvelopeStatus(
          document.clicksignEnvelopeKey
        );
        
        // Só permitir remoção se o envelope ainda estiver em draft ou running
        if (envelopeStatus !== "draft" && envelopeStatus !== "running") {
          return NextResponse.json(
            { error: "Não é possível remover signatário de um envelope finalizado" },
            { status: 400 }
          );
        }

        // TODO: Remover signatário da Clicksign via API
        // A Clicksign API v3 pode ter um endpoint para isso
      } catch (error) {
        console.error("Erro ao verificar status do envelope:", error);
        // Continua com a remoção local
      }
    }

    // Remover signatário
    await db.signer.delete({
      where: { id: signerId },
    });

    return NextResponse.json({
      success: true,
      message: "Signatário removido com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao remover signatário:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao remover signatário. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

