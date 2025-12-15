"use client";

import { useState } from "react";
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
import { Eye, EyeOff, Copy, Loader2, Key } from "lucide-react";
import { toast } from "sonner";

interface CertificatePasswordDisplayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificateId: string;
  certificateName: string;
  hasPassword: boolean;
}

export function CertificatePasswordDisplay({
  open,
  onOpenChange,
  certificateId,
  certificateName,
  hasPassword,
}: CertificatePasswordDisplayProps) {
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Reset quando o dialog fecha
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPassword("");
      setShowPassword(false);
      setIsCopied(false);
    }
    onOpenChange(newOpen);
  };

  // Buscar senha quando solicitado
  const handleFetchPassword = async () => {
    if (!hasPassword) {
      toast.error("Este certificado não possui senha salva");
      return;
    }

    setIsLoading(true);
    setPassword("");
    setIsCopied(false);

    try {
      const response = await fetch(`/api/certificados/${certificateId}/password`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar senha");
      }

      const data = await response.json();
      setPassword(data.password);
    } catch (error: any) {
      console.error("Erro ao buscar senha:", error);
      toast.error(error.message || "Erro ao buscar senha do certificado");
    } finally {
      setIsLoading(false);
    }
  };

  // Copiar senha para clipboard
  const handleCopyPassword = async () => {
    if (!password) {
      toast.error("Nenhuma senha para copiar");
      return;
    }

    try {
      await navigator.clipboard.writeText(password);
      setIsCopied(true);
      toast.success("Senha copiada para a área de transferência");
      
      // Resetar estado após 2 segundos
      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Erro ao copiar senha:", error);
      toast.error("Erro ao copiar senha");
    }
  };


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-6">
        <DialogHeader className="space-y-3 pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Key className="h-5 w-5" />
            Senha do Certificado
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {hasPassword ? (
              <>
                Senha salva para o certificado{" "}
                <span className="font-medium text-foreground">{certificateName}</span>
              </>
            ) : (
              <>
                Este certificado não possui senha salva. Você precisará fornecer a senha
                manualmente ao usar o certificado.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {hasPassword ? (
            <>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Carregando senha...
                  </span>
                </div>
              ) : password ? (
                <div className="space-y-2">
                  <Label htmlFor="password-display" className="text-sm font-medium">
                    Senha do Certificado
                  </Label>
                  <div className="relative">
                    <Input
                      id="password-display"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      readOnly
                      className="pr-20 font-mono"
                    />
                    <div className="absolute right-0 top-0 h-full flex items-center gap-1 px-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                        title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleCopyPassword}
                        title="Copiar senha"
                      >
                        {isCopied ? (
                          <span className="text-xs text-green-600">✓</span>
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clique no ícone de copiar para copiar a senha para a área de transferência
                  </p>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">Clique em "Buscar Senha" para exibir</p>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
              Este certificado não possui senha salva. Você precisará fornecer a senha
              manualmente ao baixar ou usar o certificado.
            </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-4 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Fechar
          </Button>
          {hasPassword && !password && !isLoading && (
            <Button
              onClick={handleFetchPassword}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Carregando...
                </>
              ) : (
                "Buscar Senha"
              )}
            </Button>
          )}
          {password && (
            <Button
              onClick={handleCopyPassword}
              variant="default"
              className="w-full sm:w-auto"
            >
              <Copy className="mr-2 h-4 w-4" />
              {isCopied ? "Copiado!" : "Copiar Senha"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

