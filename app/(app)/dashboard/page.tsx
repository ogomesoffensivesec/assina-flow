"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCertificateStore } from "@/lib/stores/certificate-store";
import { useDocumentStore } from "@/lib/stores/document-store";
import { CertificatesDialog } from "@/components/dashboard/certificates-dialog";
import { DocumentsDialog } from "@/components/dashboard/documents-dialog";
import { SignaturesDialog } from "@/components/dashboard/signatures-dialog";
import { FileText, ShieldCheck, FileSignature, Plus, Upload, TrendingUp, ArrowRight, Activity } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "agora";
  if (diffInSeconds < 3600) return `há ${Math.floor(diffInSeconds / 60)} minutos`;
  if (diffInSeconds < 86400) return `há ${Math.floor(diffInSeconds / 3600)} horas`;
  if (diffInSeconds < 2592000) return `há ${Math.floor(diffInSeconds / 86400)} dias`;
  return formatDate(date);
}

export default function DashboardPage() {
  const { certificates } = useCertificateStore();
  const { documents } = useDocumentStore();
  const [certificatesDialogOpen, setCertificatesDialogOpen] = useState(false);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [signaturesDialogOpen, setSignaturesDialogOpen] = useState(false);

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

  // Atividades recentes (últimos documentos)
  const recentActivities = documents
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 3)
    .map((doc) => ({
      type: doc.status === "completed" || doc.status === "signed" ? "signature" : "upload",
      document: doc.name,
      time: formatRelativeTime(new Date(doc.uploadedAt)),
      user: "Você", // TODO: buscar nome do usuário
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Visão geral do sistema de assinatura digital
        </p>
      </div>

      {/* Cards de Métricas - Interativos */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:scale-[1.02]"
          onClick={() => setCertificatesDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Certificados Cadastrados
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeCertificates}</div>
            <p className="text-xs text-muted-foreground">
              {certificates.length} total
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
              <span>Clique para ver detalhes</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:scale-[1.02]"
          onClick={() => setDocumentsDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Documentos Pendentes
            </CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{pendingDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Aguardando ação
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
              <span>Clique para ver detalhes</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:scale-[1.02]"
          onClick={() => setSignaturesDialogOpen(true)}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assinaturas Concluídas
            </CardTitle>
            <FileSignature className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{signedDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Este mês
            </p>
            <div className="flex items-center gap-1 mt-2 text-xs text-primary">
              <span>Clique para ver detalhes</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid Principal */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Ações Rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesso rápido às funcionalidades principais
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link href="/documentos/novo">
                <Upload className="mr-2 h-4 w-4" />
                Novo Documento
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/certificados/novo">
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar Certificado
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Gráfico Interativo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assinaturas por Mês</CardTitle>
                <CardDescription>
                  Quantidade de documentos assinados nos últimos meses
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">+22% este mês</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-48">
              {monthlySignatures.map((item, index) => {
                const isLatest = index === monthlySignatures.length - 1;
                return (
                  <div
                    key={item.month}
                    className="flex flex-col items-center flex-1 gap-2 group cursor-pointer"
                    title={`${item.count} assinaturas em ${item.month}`}
                  >
                    <div className="relative w-full flex items-end justify-center h-40">
                      <div
                        className={cn(
                          "w-full rounded-t transition-all group-hover:opacity-80",
                          isLatest ? "bg-primary" : "bg-primary/70"
                        )}
                        style={{
                          height: `${(item.count / maxCount) * 100}%`,
                          minHeight: item.count > 0 ? "4px" : "0",
                        }}
                      />
                    </div>
                    <div className="text-xs font-medium">{item.month}</div>
                    <div
                      className={cn(
                        "text-xs transition-colors",
                        isLatest ? "text-primary font-bold" : "text-muted-foreground"
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

        {/* Atividades Recentes */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Atividades Recentes
            </CardTitle>
            <CardDescription>
              Últimas ações realizadas no sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="shrink-0">
                    {activity.type === "signature" && (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <FileSignature className="h-5 w-5 text-primary" />
                      </div>
                    )}
                    {activity.type === "upload" && (
                      <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                        <Upload className="h-5 w-5 text-blue-500" />
                      </div>
                    )}
                    {activity.type === "certificate" && (
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <ShieldCheck className="h-5 w-5 text-green-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {activity.document || activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
