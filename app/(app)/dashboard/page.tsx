"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCertificateStore } from "@/lib/stores/certificate-store";
import { useDocumentStore } from "@/lib/stores/document-store";
import { CertificatesDialog } from "@/components/dashboard/certificates-dialog";
import { DocumentsDialog } from "@/components/dashboard/documents-dialog";
import { SignaturesDialog } from "@/components/dashboard/signatures-dialog";
import { FileText, ShieldCheck, FileSignature, Plus, Upload, TrendingUp, ArrowRight, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const { certificates, fetchCertificates } = useCertificateStore();
  const { documents, fetchDocuments } = useDocumentStore();
  const [certificatesDialogOpen, setCertificatesDialogOpen] = useState(false);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [signaturesDialogOpen, setSignaturesDialogOpen] = useState(false);

  // Carregar dados ao montar o componente
  useEffect(() => {
    fetchCertificates();
    fetchDocuments();
  }, [fetchCertificates, fetchDocuments]);

  const activeCertificates = certificates.filter((c) => c.status === "active").length;
  const pendingDocuments = documents.filter(
    (d) => d.status === "pending" || d.status === "waiting_signers"
  ).length;
  const signingDocuments = documents.filter((d) => d.status === "signing").length;
  const signedDocuments = documents.filter((d) => d.status === "signed" || d.status === "completed").length;

  // Calcular assinaturas por mês (últimos 6 meses)
  const now = new Date();
  const monthlySignatures = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = date.toLocaleDateString("pt-BR", { month: "short" });
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const count = documents.filter((d) => {
      if (!d.signedAt) return false;
      const signedDate = new Date(d.signedAt);
      return signedDate >= monthStart && signedDate <= monthEnd;
    }).length;
    
    return { month: monthName, count };
  }).reverse();

  const maxCount = Math.max(...monthlySignatures.map((m) => m.count), 1);

  // Calcular crescimento percentual do mês atual vs mês anterior
  const currentMonthCount = monthlySignatures[monthlySignatures.length - 1]?.count || 0;
  const previousMonthCount = monthlySignatures[monthlySignatures.length - 2]?.count || 0;
  const growthPercent = previousMonthCount > 0 
    ? ((currentMonthCount - previousMonthCount) / previousMonthCount) * 100 
    : 0;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 sm:mt-2">
            Visão geral do sistema de assinatura digital
          </p>
        </div>
      </div>

      {/* Cards de Métricas Principais - Mantidos */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:scale-[1.02] group"
          onClick={() => setCertificatesDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Certificados Cadastrados
            </CardTitle>
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">{activeCertificates}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
              {certificates.length} total cadastrado{certificates.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <span>Ver detalhes</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:scale-[1.02] group"
          onClick={() => setDocumentsDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Documentos Pendentes
            </CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">{pendingDocuments}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
              Aguardando sua ação
            </p>
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <span>Ver detalhes</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:scale-[1.02] group"
          onClick={() => setSignaturesDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">
              Assinaturas Concluídas
            </CardTitle>
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <FileSignature className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-primary mb-1">{signedDocuments}</div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
              Documentos assinados este mês
            </p>
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <span>Ver detalhes</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid Secundário - Refatorado */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Estatísticas Adicionais */}
        <div className="lg:col-span-1 space-y-3 sm:space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Status dos Documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Em Assinatura</p>
                    <p className="text-xs text-muted-foreground">Aguardando signatários</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-primary">{signingDocuments}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Concluídos</p>
                    <p className="text-xs text-muted-foreground">Total assinados</p>
                  </div>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">{signedDocuments}</span>
              </div>

              {pendingDocuments > 0 && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Pendentes</p>
                      <p className="text-xs text-muted-foreground">Requerem atenção</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{pendingDocuments}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ações Rápidas - Refatorado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Ações Rápidas</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Acesso rápido às funcionalidades principais
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:gap-3">
              <Button asChild className="w-full bg-primary hover:bg-primary/90 h-10 sm:h-11">
                <Link href="/documentos/novo" className="flex items-center justify-center">
                  <Upload className="mr-2 h-4 w-4" />
                  Novo Documento
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full h-10 sm:h-11">
                <Link href="/certificados/novo" className="flex items-center justify-center">
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar Certificado
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico - Refatorado */}
        <div className="lg:col-span-2">
          {/* Gráfico Interativo - Melhorado */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                  <CardTitle className="text-base sm:text-lg">Assinaturas por Mês</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    Evolução de documentos assinados nos últimos 6 meses
                  </CardDescription>
                </div>
                {growthPercent !== 0 && (
                  <div className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg",
                    growthPercent > 0 ? "bg-green-500/10" : "bg-red-500/10"
                  )}>
                    <TrendingUp className={cn(
                      "h-4 w-4",
                      growthPercent > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400 rotate-180"
                    )} />
                    <span className={cn(
                      "text-sm font-semibold",
                      growthPercent > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {growthPercent > 0 ? "+" : ""}{growthPercent.toFixed(1)}% vs mês anterior
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between gap-1.5 sm:gap-2 md:gap-3 h-40 sm:h-48 md:h-56 overflow-x-auto pb-2">
                {monthlySignatures.map((item, index) => {
                  const isLatest = index === monthlySignatures.length - 1;
                  const heightPercent = (item.count / maxCount) * 100;
                  return (
                    <div
                      key={item.month}
                      className="flex flex-col items-center flex-1 min-w-[50px] sm:min-w-0 gap-2 sm:gap-3 group cursor-pointer"
                      title={`${item.count} assinaturas em ${item.month}`}
                    >
                      <div className="relative w-full flex items-end justify-center h-36 sm:h-40 md:h-44">
                        <div
                          className={cn(
                            "w-full rounded-t-md transition-all duration-300 group-hover:opacity-90 group-hover:scale-105",
                            isLatest ? "bg-primary shadow-lg shadow-primary/20" : "bg-primary/60"
                          )}
                          style={{
                            height: `${heightPercent}%`,
                            minHeight: item.count > 0 ? "6px" : "0",
                          }}
                        />
                      </div>
                      <div className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-center">{item.month}</div>
                      <div
                        className={cn(
                          "text-xs sm:text-sm font-bold transition-colors",
                          isLatest ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {item.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Dialogs */}
      <CertificatesDialog
        open={certificatesDialogOpen}
        onOpenChange={setCertificatesDialogOpen}
        certificates={certificates}
      />
      <DocumentsDialog
        open={documentsDialogOpen}
        onOpenChange={setDocumentsDialogOpen}
        documents={documents}
      />
      <SignaturesDialog
        open={signaturesDialogOpen}
        onOpenChange={setSignaturesDialogOpen}
        signedCount={signedDocuments}
      />
    </div>
  );
}
