import { Webhook } from "svix";
import { headers } from "next/headers";
import { WebhookEvent } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Função para enviar email de reset de senha (exemplo - ajuste conforme sua implementação)
async function sendResetPasswordCodeEmail(email: string, code: string) {
  // Implemente sua lógica de envio de email aqui
  console.log(`[WEBHOOK] Enviando código de reset de senha para ${email}: ${code}`);
  // Exemplo: await emailService.sendResetPasswordCode(email, code);
}

// Função para enviar email de second factor (exemplo - ajuste conforme sua implementação)
async function sendSecondFactorCodeEmail(email: string, code: string) {
  // Implemente sua lógica de envio de email aqui
  console.log(`[WEBHOOK] Enviando código de second factor para ${email}: ${code}`);
  // Exemplo: await emailService.sendSecondFactorCode(email, code);
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error(
      "Por favor, adicione CLERK_WEBHOOK_SECRET no arquivo .env"
    );
  }

  // Obter headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // Se não houver headers, retornar erro
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new NextResponse("Erro ao processar webhook", {
      status: 400,
    });
  }

  // Obter body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Criar novo Svix instance com secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verificar payload
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Erro ao verificar webhook:", err);
    return new NextResponse("Erro ao verificar webhook", {
      status: 400,
    });
  }

  // Processar evento
  const eventType = evt.type;
  console.log(`[WEBHOOK] Evento recebido: ${eventType}`);

  // Processar evento email.created
  if (eventType === "email.created") {
    const data = evt.data as any;
    const email = data.email_address || data.emailAddress || data.to_email_address;
    const code = data.code || data.verification_code || data.code_value;
    
    // Extrair informações do evento
    const slug = data.slug || data.template_slug;
    const emailType = data.email_type || data.type || data.emailType;
    const strategy = data.strategy || data.verification_strategy;
    const purpose = data.purpose || data.verification_purpose;

    console.log("[WEBHOOK] Detalhes do email.created:", {
      email,
      code: code ? "***" : undefined,
      slug,
      emailType,
      strategy,
      purpose,
      allData: Object.keys(data),
    });

    if (!email) {
      console.error("[WEBHOOK] Email não encontrado no evento");
      return NextResponse.json({ error: "Email não encontrado" }, { status: 400 });
    }

    if (!code) {
      console.log("[WEBHOOK] Código não encontrado no evento, ignorando");
      return NextResponse.json({ received: true });
    }

    // Determinar tipo de e-mail baseado no contexto
    const isResetPassword =
      slug === "reset_password_code" ||
      slug === "reset_password" ||
      emailType === "reset_password" ||
      emailType === "resetPassword" ||
      emailType === "reset_password_email_code" ||
      purpose === "reset_password" ||
      strategy === "reset_password_email_code" ||
      (code && !(data as any).from_email_address);

    const isSecondFactor =
      slug === "verification_code" ||
      emailType === "verification_code" ||
      emailType === "verificationCode" ||
      emailType === "second_factor" ||
      purpose === "verification" ||
      strategy === "totp" ||
      strategy === "email_code"; // ✅ CORREÇÃO: Adicionar verificação para email_code

    console.log("[WEBHOOK] Tipo identificado no email.created:", {
      isResetPassword,
      isSecondFactor,
      strategy,
      slug,
      emailType,
      purpose,
    });

    // Enviar email apropriado
    if (isSecondFactor) {
      console.log("[WEBHOOK] Enviando e-mail de second factor");
      await sendSecondFactorCodeEmail(email, String(code));
      return NextResponse.json({
        received: true,
        type: "second_factor",
        message: "Código de second factor processado",
      });
    } else if (isResetPassword) {
      console.log("[WEBHOOK] Enviando e-mail de reset de senha");
      await sendResetPasswordCodeEmail(email, String(code));
      return NextResponse.json({
        received: true,
        type: "reset_password",
        message: "Código de reset de senha processado",
      });
    } else if (code) {
      // Fallback: se tem código mas não identificamos o tipo, assumir reset de senha (mais comum)
      console.log(
        "[WEBHOOK] Tipo não identificado, assumindo reset de senha. Enviando código",
        { email, strategy, slug, emailType, purpose }
      );
      await sendResetPasswordCodeEmail(email, String(code));
      return NextResponse.json({
        received: true,
        type: "fallback_reset_password",
        message: "Código processado como reset de senha (fallback)",
      });
    }

    console.log("[WEBHOOK] Email criado mas sem código, ignorando");
    return NextResponse.json({ received: true });
  }

  // Processar outros eventos do Clerk
  if (eventType === "user.created") {
    const { id, email_addresses, first_name, last_name } = evt.data;
    console.log("[WEBHOOK] Usuário criado:", {
      id,
      email: email_addresses?.[0]?.email_address,
      name: `${first_name} ${last_name}`,
    });
    // Implementar lógica de criação de usuário no banco de dados se necessário
  }

  if (eventType === "user.updated") {
    const { id, email_addresses } = evt.data;
    console.log("[WEBHOOK] Usuário atualizado:", {
      id,
      email: email_addresses?.[0]?.email_address,
    });
    // Implementar lógica de atualização de usuário no banco de dados se necessário
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;
    console.log("[WEBHOOK] Usuário deletado:", { id });
    // Implementar lógica de exclusão de usuário no banco de dados se necessário
  }

  return NextResponse.json({ received: true });
}

