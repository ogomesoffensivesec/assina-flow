"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";

interface PDFViewerProps {
  documentUrl?: string;
  documentName?: string;
  className?: string;
}

export function PDFViewer({
  documentUrl,
  documentName,
  className,
}: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Mock: Em produção, isso seria uma URL real do Vercel Blob ou similar
  const mockUrl = documentUrl || "/api/documents/mock-pdf";

  return (
    <Card className={className}>
      <div className="relative w-full h-full min-h-[600px] bg-muted rounded-lg overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar o documento
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {documentName || "Documento"}
            </p>
          </div>
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="w-full h-full" />
              </div>
            )}
            <iframe
              src={mockUrl}
              className="w-full h-full border-0"
              onLoad={() => setLoading(false)}
              onError={() => {
                setError(true);
                setLoading(false);
              }}
              title={documentName || "Visualizador de PDF"}
            />
          </>
        )}
      </div>
    </Card>
  );
}

