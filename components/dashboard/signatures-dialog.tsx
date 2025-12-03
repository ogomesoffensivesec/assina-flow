"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSignature, TrendingUp, Calendar, Award } from "lucide-react";

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
  // Mock: Estatísticas detalhadas
  const stats = {
    thisMonth: signedCount,
    lastMonth: 18,
    thisWeek: 5,
    today: 2,
    averageTime: "2.5 horas",
    fastestSignature: "15 minutos",
  };

  const growth = ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSignature className="h-5 w-5 text-primary" />
            Estatísticas de Assinaturas
          </DialogTitle>
          <DialogDescription>
            Análise detalhada das assinaturas realizadas
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.thisMonth}</div>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-600 dark:text-green-400">
                    {growth > 0 ? "+" : ""}
                    {growth.toFixed(1)}% vs mês anterior
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.thisWeek}</div>
                <p className="text-sm text-muted-foreground mt-2">documentos assinados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.today}</div>
                <p className="text-sm text-muted-foreground mt-2">assinaturas realizadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.averageTime}</div>
                <p className="text-sm text-muted-foreground mt-2">
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
                  <span className="font-semibold text-primary">{stats.fastestSignature}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Mês anterior:</span>
                  <span className="font-semibold">{stats.lastMonth} documentos</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

