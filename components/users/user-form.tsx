"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

const userSchema = z.object({
  firstName: z.string().min(1, "Nome é obrigatório"),
  lastName: z.string().min(1, "Sobrenome é obrigatório"),
  emailAddress: z.string().email("Email inválido"),
  password: z.string().optional(),
  role: z.enum(["admin", "user"]),
});

export type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  onSubmit: (data: UserFormData) => void | Promise<void>;
  defaultValues?: Partial<UserFormData>;
  isLoading?: boolean;
  submitLabel?: string;
}

export function UserForm({
  onSubmit,
  defaultValues,
  isLoading = false,
  submitLabel = "Salvar",
}: UserFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: "user",
      ...defaultValues,
    },
  });

  const isEditMode = !!defaultValues?.emailAddress;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nome</Label>
          <Input
            id="firstName"
            {...register("firstName")}
            placeholder="João"
            disabled={isLoading}
          />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="lastName">Sobrenome</Label>
          <Input
            id="lastName"
            {...register("lastName")}
            placeholder="Silva"
            disabled={isLoading}
          />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="emailAddress">Email</Label>
        <Input
          id="emailAddress"
          type="email"
          {...register("emailAddress")}
          placeholder="joao@example.com"
          disabled={isLoading || isEditMode}
        />
        {errors.emailAddress && (
          <p className="text-sm text-destructive">{errors.emailAddress.message}</p>
        )}
        {isEditMode && (
          <p className="text-xs text-muted-foreground">
            O email não pode ser alterado
          </p>
        )}
      </div>

      {!isEditMode && (
        <div className="space-y-2">
          <Label htmlFor="password">Senha (opcional)</Label>
          <Input
            id="password"
            type="password"
            {...register("password")}
            placeholder="Deixe em branco para gerar senha temporária"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Se não informada, uma senha temporária será gerada
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          value={watch("role")}
          onValueChange={(value) => setValue("role", value as "admin" | "user")}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="user">Usuário</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90">
          {isLoading ? "Salvando..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

