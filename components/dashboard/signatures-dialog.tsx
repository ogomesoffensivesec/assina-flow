"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSignature, TrendingUp, Award } from "lucide-react";
import { useDocumentStore } from "@/lib/stores/document-store";
import { cn } from "@/lib/utils";

interface SignaturesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signedCount: number;
}

export function SignaturesDialog({
  open,
  onOpenChange,
  signedCount,
}: SignaturesDialogProps) {
  const { documents } = useDocumentStore();

  // Calcular estatísticas reais
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const signedDocs = documents.filter(
    (d) => d.status === "signed" || d.status === "completed"
  );

  const thisMonth = signedDocs.filter((d) => {
    if (!d.signedAt) return false;
    const signedDate = new Date(d.signedAt);
    return signedDate >= monthStart;
  }).length;

  const lastMonth = signedDocs.filter((d) => {
    if (!d.signedAt) return false;
    const signedDate = new Date(d.signedAt);
    return signedDate >= lastMonthStart && signedDate <= lastMonthEnd;
  }).length;

  const thisWeek = signedDocs.filter((d) => {
    if (!d.signedAt) return false;
    const signedDate = new Date(d.signedAt);
    return signedDate >= weekStart;
  }).length;

  const today = signedDocs.filter((d) => {
    if (!d.signedAt) return false;
    const signedDate = new Date(d.signedAt);
    return signedDate >= todayStart;
  }).length;

  // Calcular tempo médio e mais rápido
  const signedWithTimes = signedDocs
    .filter((d) => d.signedAt && d.uploadedAt)
    .map((d) => {
      const uploaded = new Date(d.uploadedAt);
      const signed = new Date(d.signedAt!);
      const diffMs = signed.getTime() - uploaded.getTime();
      return diffMs;
    });

  const averageTimeMs = signedWithTimes.length > 0
    ? signedWithTimes.reduce((a, b) => a + b, 0) / signedWithTimes.length
    : 0;

  const fastestTimeMs = signedWithTimes.length > 0
    ? Math.min(...signedWithTimes)
    : 0;

  const formatTime = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const averageTime = averageTimeMs > 0 ? formatTime(averageTimeMs) : "N/A";
  const fastestSignature = fastestTimeMs > 0 ? formatTime(fastestTimeMs) : "N/A";

  const growth = lastMonth > 0 
    ? ((thisMonth - lastMonth) / lastMonth) * 100 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[80vw] w-full h-[95vh] sm:h-[85vh] flex flex-col p-0 mx-2 sm:mx-4">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileSignature className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            Estatísticas de Assinaturas
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Análise detalhada das assinaturas realizadas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 sm:space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Este Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold text-primary">{thisMonth}</div>
                {growth !== 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <TrendingUp className={cn(
                      "h-4 w-4",
                      growth > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400 rotate-180"
                    )} />
                    <span className={cn(
                      "text-sm",
                      growth > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {growth > 0 ? "+" : ""}{growth.toFixed(1)}% vs mês anterior
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Esta Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{thisWeek}</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">documentos assinados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{today}</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">assinaturas realizadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 sm:pb-3">
                <CardTitle className="text-xs sm:text-sm font-medium">Tempo Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl sm:text-3xl font-bold">{averageTime}</div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                  desde o upload até assinatura
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Destaques */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Destaques
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Assinatura mais rápida:</span>
                  <span className="font-semibold text-primary">{fastestSignature}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mês anterior:</span>
                  <span className="font-semibold">{lastMonth} documentos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

