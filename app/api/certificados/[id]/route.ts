import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/utils";

/**
 * GET /api/certificados/[id]
 * Obtém detalhes de um certificado
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    const certificate = await db.certificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificado não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissão
    if (certificate.userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para acessar este certificado" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: certificate.id,
      name: certificate.name,
      type: certificate.type,
      cpfCnpj: certificate.cpfCnpj,
      issuedBy: certificate.issuedBy,
      serialNumber: certificate.serialNumber,
      validFrom: certificate.validFrom,
      validTo: certificate.validTo,
      status: certificate.status,
      createdAt: certificate.createdAt,
    });
  } catch (error: any) {
    console.error("Erro ao buscar certificado:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao buscar certificado. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/certificados/[id]
 * Atualiza um certificado
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const { name, status } = body;

    const certificate = await db.certificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificado não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissão
    if (certificate.userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para editar este certificado" },
        { status: 403 }
      );
    }

    // Atualizar certificado
    const updated = await db.certificate.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(status && { status }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      status: updated.status,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar certificado:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao atualizar certificado. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/certificados/[id]
 * Exclui um certificado
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    const certificate = await db.certificate.findUnique({
      where: { id },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificado não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissão
    if (certificate.userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para excluir este certificado" },
        { status: 403 }
      );
    }

    // TODO: Deletar arquivo do Vercel Blob também
    // await del(certificate.blobUrl, { token: process.env.BLOB_READ_WRITE_TOKEN });

    // Excluir certificado
    await db.certificate.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Certificado excluído com sucesso",
    });
  } catch (error: any) {
    console.error("Erro ao excluir certificado:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao excluir certificado. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

