"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadDropzone } from "@/components/upload-dropzone";
import { SecureInfoAlert } from "@/components/secure-info-alert";
import { FileUploadProgress } from "@/components/file-upload-progress";
import { useCertificateStore } from "@/lib/stores/certificate-store";
import { useAuditStore } from "@/lib/stores/audit-store";
import { useUser } from "@/lib/hooks/use-user";
import { CertificateType } from "@/lib/stores/certificate-store";
import { getValidityStatus } from "@/lib/utils/date";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

const certificateSchema = z.object({
  name: z.string().min(1, "Nome identificador é obrigatório"),
  type: z.enum(["PF", "PJ"]),
  password: z.string().min(1, "Senha do certificado é obrigatória"),
});

type CertificateFormData = z.infer<typeof certificateSchema>;

export default function NewCertificatePage() {
  const router = useRouter();
  const { fetchCertificates } = useCertificateStore();
  const { addLog } = useAuditStore();
  const { user } = useUser();
  const [file, setFile] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CertificateFormData>({
    resolver: zodResolver(certificateSchema),
    defaultValues: {
      type: "PJ",
    },
  });

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    console.log("Arquivo selecionado:", selectedFile.name);
  };

  const onSubmit = async (data: CertificateFormData) => {
    if (!file) {
      toast.error("Por favor, selecione um arquivo .pfx");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      // Criar FormData para upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", data.name);
      formData.append("type", data.type);
      formData.append("password", data.password);

      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Fazer upload via API
      const response = await fetch("/api/certificados", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fazer upload do certificado");
      }

      const certificate = await response.json();

      // Recarregar certificados
      await fetchCertificates();

      addLog({
        userId: user?.id || "unknown",
        userName: user?.firstName && user?.lastName 
          ? `${user.firstName} ${user.lastName}` 
          : user?.firstName || user?.email || "Unknown",
        action: "certificate_add",
        ip: "192.168.1.1",
        details: `Certificado ${data.name} adicionado`,
      });

      toast.success("Certificado cadastrado com sucesso!");
      router.push("/certificados");
    } catch (error: any) {
      console.error("Erro ao fazer upload do certificado:", error);
      toast.error(error.message || "Erro ao fazer upload do certificado");
      setUploadProgress(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cadastrar Certificado A1"
        description="Adicione um novo certificado digital A1 (.pfx) ao sistema"
        breadcrumbs={[
          { label: "Certificados", href: "/certificados" },
          { label: "Novo" },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="file">Arquivo do Certificado (.pfx)</Label>
              <UploadDropzone
                accept=".pfx"
                maxSize={5 * 1024 * 1024} // 5MB
                onFileSelect={handleFileSelect}
              />
              {file && (
                <p className="text-xs text-muted-foreground">
                  Arquivo selecionado: {file.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha do Certificado</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  placeholder="Digite a senha do certificado"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo do Certificado</Label>
              <Select
                value={watch("type")}
                onValueChange={(value) =>
                  setValue("type", value as "PF" | "PJ")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">Pessoa Física</SelectItem>
                  <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                </SelectContent>
              </Select>
              {errors.type && (
                <p className="text-sm text-destructive">{errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome Identificador</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Ex: Certificado Empresa ABC"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <SecureInfoAlert variant="warning" />
          </div>
        </div>

        {uploadProgress > 0 && uploadProgress < 100 && (
          <FileUploadProgress progress={uploadProgress} />
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || !file}>
            {isSubmitting ? "Salvando..." : "Salvar Certificado"}
          </Button>
        </div>
      </form>
    </div>
  );
}

