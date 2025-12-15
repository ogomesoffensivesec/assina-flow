"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CertificateDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateId: string;
  certificateName: string;
  hasPassword?: boolean;
}

export function CertificateDownloadDialog({
  open,
  onOpenChange,
  certificateId,
  certificateName,
  hasPassword = false,
}: CertificateDownloadDialogProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [savePassword, setSavePassword] = useState(false);

  // Reset form quando o dialog fecha
  useEffect(() => {
    if (!open) {
      setPassword("");
      setShowPassword(false);
      setIsDownloading(false);
      setSavePassword(false);
    }
  }, [open]);

  // Se tem senha salva, tentar download automático quando o dialog abre
  useEffect(() => {
    if (open && hasPassword && !password && !isDownloading) {
      // Usar setTimeout para evitar problemas de dependências
      const timer = setTimeout(() => {
        handleDownload(true); // Download automático
      }, 100);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hasPassword]);

  const handleDownload = async (autoDownload = false) => {
    // Se não tem senha salva e não foi fornecida manualmente, exigir
    if (!hasPassword && !password.trim()) {
      toast.error("Por favor, digite a senha do certificado");
      return;
    }

    setIsDownloading(true);

    try {
      // Fazer POST para validar senha e baixar
      // Se tem senha salva, não enviar password (API usará automaticamente)
      // Se não tem senha salva mas foi fornecida, enviar e opcionalmente salvar
      const body: { password?: string; savePassword?: boolean } = {};
      
      if (!hasPassword && password.trim()) {
        body.password = password;
        body.savePassword = savePassword;
      }

      const response = await fetch(`/api/certificados/${certificateId}/file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // Tentar ler erro como JSON, se não conseguir, usar status text
        let errorMessage = "Erro ao baixar certificado";
        try {
          const error = await response.json();
          errorMessage = error.error || errorMessage;
        } catch {
          errorMessage = response.statusText || `Erro ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      // Se a resposta for um blob, criar download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${certificateName}.pfx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Certificado baixado com sucesso");
      
      // Se salvou a senha, mostrar mensagem
      if (savePassword && !hasPassword) {
        toast.success("Senha salva com sucesso para uso futuro");
      }
      
      setPassword("");
      setSavePassword(false);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Erro ao baixar certificado:", error);
      toast.error(error.message || "Erro ao baixar certificado. Verifique se a senha está correta.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPassword("");
      setShowPassword(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-6">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="text-xl">Baixar Certificado</DialogTitle>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            {hasPassword ? (
              <p>O certificado possui senha salva. O download será iniciado automaticamente.</p>
            ) : (
              <p>Para baixar o certificado, digite a senha do certificado para confirmar.</p>
            )}
            <p className="font-medium text-foreground">Certificado: {certificateName}</p>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {hasPassword ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <p className="text-sm text-green-800">
                Senha salva encontrada. Iniciando download...
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Senha do Certificado
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Digite a senha do certificado"
                    disabled={isDownloading}
                    className="pr-10"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isDownloading && password.trim()) {
                        handleDownload();
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isDownloading}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="save-password"
                  checked={savePassword}
                  onChange={(e) => setSavePassword(e.target.checked)}
                  disabled={isDownloading}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="save-password" className="text-sm font-normal cursor-pointer">
                  Salvar senha para uso futuro
                </Label>
              </div>
            </>
          )}
        </div>
        <DialogFooter className="pt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isDownloading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          {!hasPassword && (
            <Button 
              onClick={() => handleDownload(false)} 
              disabled={isDownloading || !password.trim()}
              className="w-full sm:w-auto"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Baixando...
                </>
              ) : (
                "Baixar Certificado"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

