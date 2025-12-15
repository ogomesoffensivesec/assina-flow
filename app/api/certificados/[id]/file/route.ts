import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/utils";
import forge from "node-forge";
import { decryptPassword, encryptPassword } from "@/lib/crypto/certificate-password";

/**
 * GET /api/certificados/[id]/file
 * Baixa o arquivo .pfx do certificado (método legado - requer senha via POST)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: "Use POST com a senha do certificado para baixar" },
    { status: 405 }
  );
}

/**
 * POST /api/certificados/[id]/file
 * Baixa o arquivo .pfx do certificado após validar a senha
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    const body = await request.json();
    const providedPassword = body.password;
    const savePassword = body.savePassword === true; // Opção para salvar senha se fornecida manualmente

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

    // Determinar qual senha usar
    let password: string;
    let shouldSavePassword = false;

    if (certificate.encryptedPassword) {
      // Se tem senha salva, usar ela
      try {
        password = decryptPassword(certificate.encryptedPassword);
      } catch (error: any) {
        console.error("Erro ao descriptografar senha salva:", error);
        // Se falhar ao descriptografar, pedir senha manualmente
        if (!providedPassword) {
          return NextResponse.json(
            { error: "Erro ao acessar senha salva. Por favor, forneça a senha manualmente." },
            { status: 400 }
          );
        }
        password = providedPassword;
      }
    } else {
      // Se não tem senha salva, exigir senha manualmente
      if (!providedPassword) {
        return NextResponse.json(
          { error: "Senha do certificado é obrigatória. Este certificado não possui senha salva." },
          { status: 400 }
        );
      }
      password = providedPassword;
      // Se o usuário forneceu senha e quer salvar, marcar para salvar
      shouldSavePassword = savePassword;
    }

    // Baixar arquivo do Vercel Blob usando fetch direto na URL
    // Como o blob foi criado com access: "public", podemos fazer fetch direto
    const response = await fetch(certificate.blobUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erro ao baixar arquivo do storage" },
        { status: 500 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validar senha tentando abrir o certificado
    try {
      const p12Der = buffer.toString("binary");
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

      // Tentar extrair certificado para validar senha
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBagArray = certBags?.[forge.pki.oids.certBag];
      if (!certBagArray || certBagArray.length === 0) {
        return NextResponse.json(
          { error: "Senha incorreta ou certificado inválido" },
          { status: 401 }
        );
      }
    } catch (error: any) {
      return NextResponse.json(
        { error: "Senha incorreta ou certificado inválido" },
        { status: 401 }
      );
    }

    // Se a senha está correta e o usuário quer salvar, atualizar no banco
    if (shouldSavePassword && !certificate.encryptedPassword) {
      try {
        const encryptedPassword = encryptPassword(password);
        await db.certificate.update({
          where: { id },
          data: { encryptedPassword },
        });
      } catch (error: any) {
        console.error("Erro ao salvar senha:", error);
        // Não falhar o download se não conseguir salvar a senha
      }
    }

    // Se chegou aqui, a senha está correta - retornar o arquivo
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/x-pkcs12",
        "Content-Disposition": `attachment; filename="${certificate.name}.pfx"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Erro ao baixar certificado:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao baixar certificado. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

