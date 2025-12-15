"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Field({ className, ...props }: FieldProps) {
  return <div className={cn("space-y-2", className)} {...props} />
}

export interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {}

export function FieldGroup({ className, ...props }: FieldGroupProps) {
  return <div className={cn("space-y-4", className)} {...props} />
}

export interface FieldLabelProps extends React.ComponentProps<typeof Label> {}

export function FieldLabel({ className, ...props }: FieldLabelProps) {
  return <Label className={className} {...props} />
}

export interface FieldDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export function FieldDescription({ className, ...props }: FieldDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export interface FieldSetProps extends React.HTMLAttributes<HTMLDivElement> {}

export function FieldSet({ className, ...props }: FieldSetProps) {
  return <div className={cn("space-y-2", className)} {...props} />
}

export interface FieldErrorProps extends React.HTMLAttributes<HTMLParagraphElement> {
  message?: string
}

export function FieldError({ className, message, ...props }: FieldErrorProps) {
  if (!message) return null
  
  return (
    <p
      className={cn("text-sm text-destructive", className)}
      {...props}
    >
      {message}
    </p>
  )
}

