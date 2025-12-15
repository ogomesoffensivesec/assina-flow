import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/utils";
import { decryptPassword } from "@/lib/crypto/certificate-password";

/**
 * GET /api/certificados/[id]/password
 * Retorna a senha descriptografada do certificado
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
      select: {
        id: true,
        name: true,
        encryptedPassword: true,
        userId: true,
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificado não encontrado" },
        { status: 404 }
      );
    }

    // Verificar permissão (apenas dono ou admin)
    if (certificate.userId !== user.id && user.role !== "admin") {
      return NextResponse.json(
        { error: "Sem permissão para acessar este certificado" },
        { status: 403 }
      );
    }

    // Verificar se tem senha salva
    if (!certificate.encryptedPassword) {
      return NextResponse.json(
        { error: "Este certificado não possui senha salva" },
        { status: 404 }
      );
    }

    // Descriptografar senha
    try {
      const password = decryptPassword(certificate.encryptedPassword);

      // Log de auditoria (opcional, mas recomendado)
      console.log(`[AUDIT] Senha do certificado ${certificate.id} consultada por usuário ${user.id}`);

      return NextResponse.json({
        password,
        certificateId: certificate.id,
        certificateName: certificate.name,
      });
    } catch (error: any) {
      console.error("Erro ao descriptografar senha:", error);
      return NextResponse.json(
        { error: "Erro ao descriptografar senha. Verifique se a chave de criptografia está configurada corretamente." },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Erro ao consultar senha do certificado:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao consultar senha do certificado. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

