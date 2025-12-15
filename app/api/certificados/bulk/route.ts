import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth/utils";
import { generateIdFromEntropySize } from "lucia";
import { put } from "@vercel/blob";
import forge from "node-forge";
import { encryptPassword } from "@/lib/crypto/certificate-password";

interface CertificateUploadResult {
  fileName: string;
  success: boolean;
  certificateId?: string;
  error?: string;
}

/**
 * POST /api/certificados/bulk
 * Upload de múltiplos certificados .pfx com tratamento de erros isolado
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAuth();

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const names = formData.getAll("names") as string[];
    const types = formData.getAll("types") as string[];
    const passwords = formData.getAll("passwords") as string[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Nenhum arquivo fornecido" },
        { status: 400 }
      );
    }

    if (files.length !== names.length || files.length !== types.length || files.length !== passwords.length) {
      return NextResponse.json(
        { error: "Dados inconsistentes. Cada arquivo deve ter nome, tipo e senha correspondentes." },
        { status: 400 }
      );
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN não configurado" },
        { status: 500 }
      );
    }

    const results: CertificateUploadResult[] = [];

    // Processar cada certificado individualmente
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const name = names[i];
      const type = types[i];
      const password = passwords[i];

      try {
        // Validar arquivo
        if (!file) {
          results.push({
            fileName: `Arquivo ${i + 1}`,
            success: false,
            error: "Arquivo não fornecido",
          });
          continue;
        }

        if (!name) {
          results.push({
            fileName: file.name,
            success: false,
            error: "Nome do certificado não fornecido",
          });
          continue;
        }

        if (!type || (type !== "PF" && type !== "PJ")) {
          results.push({
            fileName: file.name,
            success: false,
            error: "Tipo de certificado inválido (deve ser PF ou PJ)",
          });
          continue;
        }

        if (!password) {
          results.push({
            fileName: file.name,
            success: false,
            error: "Senha do certificado não fornecida",
          });
          continue;
        }

        // Validar se é .pfx ou .p12
        if (!file.name.toLowerCase().endsWith(".pfx") && !file.name.toLowerCase().endsWith(".p12")) {
          results.push({
            fileName: file.name,
            success: false,
            error: "Apenas arquivos .pfx ou .p12 são permitidos",
          });
          continue;
        }

        // Validar tamanho (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          results.push({
            fileName: file.name,
            success: false,
            error: "Arquivo muito grande. Tamanho máximo: 5MB",
          });
          continue;
        }

        // Converter arquivo para buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Tentar extrair metadados do certificado
        let certificateData;
        try {
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
          const cpfAttr = subject.getField("2.5.4.5");
          const cnAttr = subject.getField("CN");
          
          if (cpfAttr) {
            cpfCnpj = cpfAttr.value;
          } else if (cnAttr) {
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
          results.push({
            fileName: file.name,
            success: false,
            error: error.message || "Erro ao processar certificado. Verifique se a senha está correta e o arquivo é válido.",
          });
          continue;
        }

        // Upload para Vercel Blob
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

        results.push({
          fileName: file.name,
          success: true,
          certificateId: certificate.id,
        });
      } catch (error: any) {
        // Capturar qualquer erro não tratado anteriormente
        results.push({
          fileName: file.name,
          success: false,
          error: error.message || "Erro desconhecido ao processar certificado",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
      },
    });
  } catch (error: any) {
    console.error("Erro ao processar upload em massa:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao processar upload em massa. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

