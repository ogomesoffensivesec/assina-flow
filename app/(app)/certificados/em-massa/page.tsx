"use client";

import { PageHeader } from "@/components/page-header";
import { BulkCertificateUpload } from "@/components/bulk-certificate-upload";
import { useCertificateStore } from "@/lib/stores/certificate-store";
import { toast } from "sonner";

export default function BulkCertificatesPage() {
  const { fetchCertificates } = useCertificateStore();

  const handleUploadComplete = async () => {
    await fetchCertificates();
    toast.success("Upload em massa concluído!");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Upload em Massa de Certificados"
        description="Envie múltiplos certificados A1 (.pfx) simultaneamente. Cada certificado requer sua senha individual."
        breadcrumbs={[
          { label: "Certificados", href: "/certificados" },
          { label: "Upload em Massa" },
        ]}
      />

      <BulkCertificateUpload onUploadComplete={handleUploadComplete} />
    </div>
  );
}

