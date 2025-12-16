import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/utils";
import { generateIdFromEntropySize } from "lucia";
import { put } from "@vercel/blob";
import forge from "node-forge";
import { encryptPassword } from "@/lib/crypto/certificate-password";
import { handleError } from "@/lib/utils/error-handler";

/**
 * Bloquear cache e reexecução automática
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/certificados
 * Lista todos os certificados do usuário
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const certificates = await db.certificate.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        validTo: "asc", // Ordenar por data de validade: do mais perto de vencer para o mais distante
      },
    });

    return NextResponse.json({
      certificates: certificates.map((cert) => ({
        id: cert.id,
        name: cert.name,
        type: cert.type,
        cpfCnpj: cert.cpfCnpj,
        issuedBy: cert.issuedBy,
        serialNumber: cert.serialNumber,
        validFrom: cert.validFrom,
        validTo: cert.validTo,
        status: cert.status,
        createdAt: cert.createdAt,
        hasPassword: !!cert.encryptedPassword,
      })),
    });
  } catch (error: any) {
    return handleError(error, { route: "GET /api/certificados", userId: error.user?.id });
  }
}

/**
 * POST /api/certificados
 * Upload de certificado .pfx e extração de metadados
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const type = formData.get("type") as string;
    const password = formData.get("password") as string;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo não fornecido" },
        { status: 400 }
      );
    }

    if (!name) {
      return NextResponse.json(
        { error: "Nome do certificado não fornecido" },
        { status: 400 }
      );
    }

    if (!type || (type !== "PF" && type !== "PJ")) {
      return NextResponse.json(
        { error: "Tipo de certificado inválido (deve ser PF ou PJ)" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Senha do certificado não fornecida" },
        { status: 400 }
      );
    }

    // Validar se é .pfx
    if (!file.name.toLowerCase().endsWith(".pfx") && !file.name.toLowerCase().endsWith(".p12")) {
      return NextResponse.json(
        { error: "Apenas arquivos .pfx ou .p12 são permitidos" },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Tamanho máximo: 5MB" },
        { status: 400 }
      );
    }

    // Converter arquivo para buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Tentar extrair metadados do certificado
    let certificateData;
    try {
      // Converter buffer para formato que node-forge entende
      // node-forge espera um ArrayBuffer ou string binary
      const p12Der = buffer.toString("binary");
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, password);

      // Extrair certificado
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBagArray = certBags?.[forge.pki.oids.certBag];
      if (!certBagArray || certBagArray.length === 0) {
        throw new Error("Certificado não encontrado no arquivo .pfx");
      }

      const cert = certBagArray[0]?.cert;
      if (!cert) {
        throw new Error("Não foi possível extrair o certificado");
      }

      // Extrair informações do certificado
      const subject = cert.subject;
      const issuer = cert.issuer;
      const serialNumber = cert.serialNumber;
      const validFrom = cert.validity.notBefore;
      const validTo = cert.validity.notAfter;

      // Extrair CPF/CNPJ do subject
      let cpfCnpj = "";
      const cpfAttr = subject.getField("2.5.4.5"); // SerialNumber (pode conter CPF/CNPJ)
      const cnAttr = subject.getField("CN");
      
      if (cpfAttr) {
        cpfCnpj = cpfAttr.value;
      } else if (cnAttr) {
        // Tentar extrair CPF/CNPJ do Common Name
        const cnMatch = cnAttr.value.match(/\d{11,14}/);
        if (cnMatch) {
          cpfCnpj = cnMatch[0];
        }
      }

      certificateData = {
        issuedBy: issuer.getField("CN")?.value || "Desconhecido",
        serialNumber: serialNumber || `SN${Date.now()}`,
        validFrom: new Date(validFrom.getTime()),
        validTo: new Date(validTo.getTime()),
        cpfCnpj: cpfCnpj || (type === "PF" ? "000.000.000-00" : "00.000.000/0000-00"),
      };
    } catch (error: any) {
      console.error("Erro ao extrair metadados do certificado:", error);
      return NextResponse.json(
        { 
          error: error.message || "Erro ao processar certificado. Verifique se a senha está correta e o arquivo é válido." 
        },
        { status: 400 }
      );
    }

    // Upload para Vercel Blob
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN não configurado" },
        { status: 500 }
      );
    }

    const blob = await put(`certificates/${user.id}/${Date.now()}-${file.name}`, buffer, {
      access: "public",
      addRandomSuffix: true,
      token: blobToken,
    });

    // Criptografar senha antes de salvar
    const encryptedPassword = encryptPassword(password);

    // Salvar no banco de dados
    const certificateId = generateIdFromEntropySize(10);
    const certificate = await db.certificate.create({
      data: {
        id: certificateId,
        name,
        type,
        cpfCnpj: certificateData.cpfCnpj,
        issuedBy: certificateData.issuedBy,
        serialNumber: certificateData.serialNumber,
        validFrom: certificateData.validFrom,
        validTo: certificateData.validTo,
        status: "active",
        blobUrl: blob.url,
        encryptedPassword,
        userId: user.id,
      },
    });

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
    });
  } catch (error: any) {
    return handleError(error, { route: "POST /api/certificados", userId: error.user?.id });
  }
}

