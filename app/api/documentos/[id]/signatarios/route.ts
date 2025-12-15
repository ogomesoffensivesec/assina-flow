import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicksignClient } from "@/lib/clicksign/client";
import type { ClicksignSignerAttributes } from "@/lib/clicksign/client";
import { requireAuth } from "@/lib/auth/utils";
import { generateIdFromEntropySize } from "lucia";
import { validateCPF, validateCNPJ } from "@/lib/utils";

/**
 * POST /api/documentos/[id]/signatarios
 * Adiciona um signatário ao documento
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("[DEBUG] Iniciando adição de signatário...");
  try {
    const { user } = await requireAuth();
    const { id } = await params;
    console.log("[DEBUG] Usuário autenticado:", { userId: user.id, email: user.email });
    console.log("[DEBUG] Documento ID:", id);

    const body = await request.json();
    let { name, email, documentNumber, documentType, phoneNumber, identification, signatureType, order } = body;
    
    // Validar e normalizar nome antes de processar
    if (name) {
      // Garantir que é string
      name = String(name).trim();
      
      // Validar que não está vazio após trim
      if (!name || name.length < 2) {
        console.error("[DEBUG] Nome inválido após normalização:", { original: body.name, normalized: name });
        return NextResponse.json(
          { error: "Nome do signatário é obrigatório e deve ter pelo menos 2 caracteres" },
          { status: 400 }
        );
      }
    }
    
    // Validar e normalizar email
    if (email) {
      email = String(email).trim();
    }
    
    // Validar e normalizar phoneNumber (obrigatório)
    if (!phoneNumber) {
      return NextResponse.json(
        { error: "WhatsApp é obrigatório" },
        { status: 400 }
      );
    }
    phoneNumber = String(phoneNumber).trim();
    
    // Validar e normalizar identification (obrigatório)
    if (!identification) {
      return NextResponse.json(
        { error: "Identificação é obrigatória" },
        { status: 400 }
      );
    }
    identification = String(identification).trim();
    
    // Validar e normalizar documentNumber
    if (documentNumber) {
      documentNumber = String(documentNumber).trim().replace(/\D/g, ""); // Remove formatação
    }
    
    // Validar documentType
    if (!documentType || (documentType !== "PF" && documentType !== "PJ")) {
      return NextResponse.json(
        { error: "Tipo de documento é obrigatório e deve ser PF ou PJ" },
        { status: 400 }
      );
    }
    
    console.log("[DEBUG] Dados recebidos e normalizados:", { 
      name, 
      nameType: typeof name,
      nameLength: name?.length,
      email, 
      phoneNumber,
      identification,
      documentNumber,
      documentType,
      signatureType, 
      order 
    });

    if (!name || !email) {
      console.error("[DEBUG] Nome ou email não fornecido");
      return NextResponse.json(
        { error: "Nome e email são obrigatórios" },
        { status: 400 }
      );
    }

    // Validar documento (CPF ou CNPJ)
    if (!documentNumber) {
      return NextResponse.json(
        { error: `${documentType === "PF" ? "CPF" : "CNPJ"} é obrigatório` },
        { status: 400 }
      );
    }

    // Validar formato do documento
    const isValid = documentType === "PF" ? validateCPF(documentNumber) : validateCNPJ(documentNumber);
    if (!isValid) {
      return NextResponse.json(
        { error: `${documentType === "PF" ? "CPF" : "CNPJ"} inválido` },
        { status: 400 }
      );
    }

    // Buscar documento
    console.log("[DEBUG] Buscando documento no banco...");
    const doc = await db.document.findUnique({
      where: { id },
      include: { signers: true },
    });

    if (!doc) {
      console.error("[DEBUG] Documento não encontrado:", id);
      return NextResponse.json(
        { error: "Documento não encontrado" },
        { status: 404 }
      );
    }

    console.log("[DEBUG] Documento encontrado:", {
      id: doc.id,
      name: doc.name,
      envelopeKey: doc.clicksignEnvelopeKey,
      documentKey: doc.clicksignDocumentKey,
      signersCount: doc.signers.length,
    });

    // Verificar se o usuário tem permissão
    if (doc.userId !== user.id && user.role !== "admin") {
      console.error("[DEBUG] Sem permissão para adicionar signatário");
      return NextResponse.json(
        { error: "Sem permissão para adicionar signatários" },
        { status: 403 }
      );
    }

    if (!doc.clicksignEnvelopeKey || !doc.clicksignDocumentKey) {
      console.error("[DEBUG] Documento não tem keys da Clicksign configuradas");
      return NextResponse.json(
        { error: "Documento não está configurado na Clicksign" },
        { status: 400 }
      );
    }

    // Adicionar signatário na Clicksign com atributos completos
    console.log("[DEBUG] Adicionando signatário na Clicksign...");
    const signerAttributes: ClicksignSignerAttributes = {
      name,
      email,
      ...(phoneNumber && { phone_number: phoneNumber }),
      has_documentation: true,
      refusable: false,
      group: order || doc.signers.length + 1,
      communicate_events: {
        document_signed: "whatsapp",
        signature_request: "whatsapp",
        signature_reminder: "email",
      },
    };
    
    const signerKey = await clicksignClient.addSignerToEnvelope(
      doc.clicksignEnvelopeKey!,
      signerAttributes
    );
    console.log("[DEBUG] Signatário adicionado na Clicksign:", { signerKey });

    // Aguardar um pouco para garantir que o signatário foi processado
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Adicionar requisito de qualificação SIGN (vincula signatário ao documento)
    console.log("[DEBUG] Adicionando requisito de qualificação SIGN...");
    const qualificationRequirement = await clicksignClient.addSignatureRequirement(
      doc.clicksignEnvelopeKey!,
      doc.clicksignDocumentKey!,
      signerKey
    );
    console.log("[DEBUG] Requisito de qualificação SIGN adicionado:", { requirementId: qualificationRequirement.id });

    // Aguardar um pouco antes de criar o requisito de autenticação
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Adicionar requisito de autenticação ICP_Brasil
    console.log("[DEBUG] Adicionando requisito de autenticação ICP_Brasil...");
    const authRequirement = await clicksignClient.addAuthRequirement(
      doc.clicksignEnvelopeKey!,
      doc.clicksignDocumentKey!,
      signerKey,
      "icp_brasil"
    );
    console.log("[DEBUG] Requisito de autenticação ICP_Brasil adicionado:", { requirementId: authRequirement.id });

    // Salvar no banco de dados
    console.log("[DEBUG] Salvando signatário no banco de dados...");
    const signerId = generateIdFromEntropySize(10);
    const signer = await db.signer.create({
      data: {
        id: signerId,
        name,
        email,
        documentNumber: documentNumber, // CPF ou CNPJ (sem formatação)
        documentType: documentType,
        phoneNumber: phoneNumber,
        identification: identification,
        signatureType: signatureType || "electronic",
        order: order || doc.signers.length + 1,
        status: "pending",
        clicksignSignerKey: signerKey,
        clicksignRequirementKey: qualificationRequirement.id,
        documentId: doc.id,
      },
    });
    console.log("[DEBUG] Signatário salvo no banco:", { signerId: signer.id });

    // Atualizar status do documento
    console.log("[DEBUG] Atualizando status do documento para 'waiting_signers'...");
    await db.document.update({
      where: { id },
      data: {
        status: "waiting_signers",
      },
    });
    console.log("[DEBUG] Status atualizado");

    console.log("[DEBUG] Signatário adicionado com sucesso");
    return NextResponse.json({
      id: signer.id,
      name: signer.name,
      email: signer.email,
      status: signer.status,
      order: signer.order,
    });
  } catch (error: any) {
    console.error("[DEBUG] Erro ao adicionar signatário:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        error: error.message || "Erro ao adicionar signatário. Tente novamente.",
      },
      { status: 500 }
    );
  }
}

