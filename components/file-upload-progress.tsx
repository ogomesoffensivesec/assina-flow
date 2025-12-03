"use client";

import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface FileUploadProgressProps {
  progress: number; // 0-100
  className?: string;
}

export function FileUploadProgress({
  progress,
  className,
}: FileUploadProgressProps) {
  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Enviando arquivo...</span>
        <span className="font-medium">{Math.round(progress)}%</span>
      </div>
      <Progress value={progress} />
    </div>
  );
}

