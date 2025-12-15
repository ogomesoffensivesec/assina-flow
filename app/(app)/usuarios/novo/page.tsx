"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UserForm, UserFormData } from "@/components/users/user-form";
import { useRole } from "@/lib/hooks/use-role";
import { toast } from "sonner";

export default function NewUserPage() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Acesso permitido para todos os usuários autenticados
  }, [router]);

  const handleSubmit = async (data: UserFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar usuário");
      }

      toast.success("Usuário criado com sucesso!");
      router.push("/usuarios");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo Usuário"
        description="Crie um novo usuário no sistema"
        breadcrumbs={[
          { label: "Usuários", href: "/usuarios" },
          { label: "Novo" },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>Informações do Usuário</CardTitle>
          <CardDescription>
            Preencha os dados para criar um novo usuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserForm
            onSubmit={handleSubmit}
            isLoading={isLoading}
            submitLabel="Criar Usuário"
          />
        </CardContent>
      </Card>
    </div>
  );
}

