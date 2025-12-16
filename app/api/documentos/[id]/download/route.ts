import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { clicksignClient } from "@/lib/clicksign/client";
import { requireAuth } from "@/lib/auth/utils";
import { handleError } from "@/lib/utils/error-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ClicksignDoc = any;

function pickAttributes(doc: ClicksignDoc) {
  // compatível com client que retorna { attributes } ou JSON:API { data: { attributes } }
  return doc?.attributes ?? doc?.data?.attributes ?? doc?.data?.data?.attributes;
}

function pickId(doc: ClicksignDoc) {
  return doc?.id ?? doc?.data?.id ?? doc?.data?.data?.id;
}

function pickSignedFileUrl(doc: ClicksignDoc): string | null {
  // URLs podem estar em links.files.signed (padrão) ou attributes.downloads.signed_file_url (legado)
  const linksFiles = doc?.links?.files ?? doc?.data?.links?.files ?? doc?.data?.data?.links?.files;
  const attributesDownloads = doc?.attributes?.downloads ?? doc?.data?.attributes?.downloads ?? doc?.data?.data?.attributes?.downloads;
  
  return linksFiles?.signed ?? attributesDownloads?.signed_file_url ?? null;
}

function safeBaseName(name: string) {
  const n = (name || "documento.pdf").trim();
  const withoutExt = n.toLowerCase().endsWith(".pdf") ? n.slice(0, -4) : n;
  // sanitização básica para header
  return withoutExt.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, " ").trim() || "documento";
}

function contentDisposition(filename: string) {
  const fallback = filename.replace(/[^\x20-\x7E]+/g, "_"); // ASCII fallback
  const utf8 = encodeURIComponent(filename);
  return `attachment; filename="${fallback}.pdf"; filename*=UTF-8''${utf8}.pdf`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function getSignedUrlWithRetry(envelopeKey: string, documentKey: string) {
  let lastDoc: ClicksignDoc | null = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) await sleep(1500);

    lastDoc = await clicksignClient.getDocument(envelopeKey, documentKey);
    const attrs = pickAttributes(lastDoc);

    const status = attrs?.status;
    if (status && status !== "closed") {
      return { signedUrl: null, status, clicksignDoc: lastDoc };
    }

    // Buscar URL em links.files.signed (padrão) ou attributes.downloads.signed_file_url (legado)
    const signedUrl = pickSignedFileUrl(lastDoc);
    if (signedUrl) {
      return { signedUrl, status: status ?? "closed", clicksignDoc: lastDoc };
    }
  }

  return { signedUrl: null, status: pickAttributes(lastDoc)?.status, clicksignDoc: lastDoc };
}

async function proxyPdfFromUrl(url: string, downloadName: string) {
  const res = await fetch(url, { redirect: "follow", cache: "no-store" });

  if (!res.ok || !res.body) {
    return { ok: false as const, status: res.status, statusText: res.statusText };
  }

  const headers = new Headers();
  headers.set("Content-Type", res.headers.get("content-type") || "application/pdf");
  headers.set("Content-Disposition", contentDisposition(downloadName));
  // opcional: repassar content-length se existir
  const len = res.headers.get("content-length");
  if (len) headers.set("Content-Length", len);

  return { ok: true as const, response: new NextResponse(res.body, { headers }) };
}

/**
 * GET /api/documentos/[id]/download
 * Baixa o documento assinado da Clicksign
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAuth();
    const { id } = await params;

    const document = await db.document.findUnique({ where: { id } });

    if (!document) {
      return NextResponse.json({ error: "Documento não encontrado" }, { status: 404 });
    }

    // Verificar permissão
    if (document.userId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Sem permissão para baixar este documento" }, { status: 403 });
    }

    if (!document.clicksignDocumentKey) {
      return NextResponse.json({ error: "Documento não está configurado na Clicksign" }, { status: 400 });
    }

    if (!document.clicksignEnvelopeKey) {
      return NextResponse.json({ error: "Documento não tem envelope configurado na Clicksign" }, { status: 400 });
    }

    // 1) obter signed_file_url (com retry)
    let signedUrl: string | null = null;
    let status: string | undefined;
    let clicksignDoc: ClicksignDoc | null = null;

    try {
      const out = await getSignedUrlWithRetry(document.clicksignEnvelopeKey, document.clicksignDocumentKey);
      signedUrl = out.signedUrl;
      status = out.status;
      clicksignDoc = out.clicksignDoc;
    } catch (err: any) {
      return NextResponse.json(
        { error: `Erro ao buscar documento na Clicksign: ${err?.message || "erro desconhecido"}` },
        { status: 400 }
      );
    }

    // 2) status precisa ser closed
    if (status && status !== "closed") {
      return NextResponse.json(
        { error: `Documento ainda não está pronto para download. Status atual: ${status}.` },
        { status: 400 }
      );
    }

    if (!signedUrl) {
      return NextResponse.json(
        { error: "URL de download ainda não está disponível. Tente novamente em alguns instantes." },
        { status: 409 }
      );
    }

    const downloadName = `${safeBaseName(document.fileName)}_assinado`;

    // 3) tentar baixar; se falhar, renovar URL 1 vez e tentar novamente
    const first = await proxyPdfFromUrl(signedUrl, downloadName);
    if (first.ok) return first.response;

    // Renova URL e tenta mais uma vez
    try {
      const refreshed = await clicksignClient.getDocument(document.clicksignEnvelopeKey, document.clicksignDocumentKey);
      const refreshedUrl = pickSignedFileUrl(refreshed);

      if (!refreshedUrl) {
        return NextResponse.json(
          { error: "Falha ao baixar e não foi possível obter nova URL de download. Tente novamente." },
          { status: 409 }
        );
      }

      const second = await proxyPdfFromUrl(refreshedUrl, downloadName);
      if (second.ok) return second.response;

      return NextResponse.json(
        { error: `Erro ao baixar arquivo: ${second.status} ${second.statusText}` },
        { status: 502 }
      );
    } catch (err: any) {
      return NextResponse.json(
        { error: `Erro ao renovar URL de download: ${err?.message || "erro desconhecido"}` },
        { status: 502 }
      );
    }
  } catch (error: any) {
    return handleError(error, { route: "GET /api/documentos/[id]/download", userId: error.user?.id });
  }
}
