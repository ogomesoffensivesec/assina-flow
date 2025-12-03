"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserForm, UserFormData } from "@/components/users/user-form";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useRole } from "@/lib/hooks/use-role";
import { User } from "@/components/users/user-table";
import { formatDate } from "@/lib/utils/date";
import { Trash2, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { isAdmin } = useRole();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      router.push("/dashboard");
      return;
    }

    fetchUser();
  }, [isAdmin, router, resolvedParams.id]);

  const fetchUser = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users?query=${resolvedParams.id}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar usuário");
      }

      const data = await response.json();
      const foundUser = data.users?.find((u: User) => u.id === resolvedParams.id);

      if (!foundUser) {
        toast.error("Usuário não encontrado");
        router.push("/usuarios");
        return;
      }

      setUser(foundUser);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar usuário");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (data: UserFormData) => {
    if (!user) return;

    setIsSaving(true);

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar usuário");
      }

      toast.success("Usuário atualizado com sucesso!");
      fetchUser();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar usuário");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/users?userId=${user.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir usuário");
      }

      toast.success("Usuário excluído com sucesso");
      router.push("/usuarios");
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir usuário");
    }
  };

  const handleToggleBan = async () => {
    if (!user) return;

    // TODO: Implementar ban/unban via Clerk API
    toast.info("Funcionalidade de banir/desbanir em desenvolvimento");
  };

  if (!isAdmin || isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Carregando..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Usuário não encontrado" />
      </div>
    );
  }

  const getUserName = () => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email || "Sem nome";
  };

  const getUserEmail = () => {
    return user.email || "-";
  };

  const getUserRole = () => {
    return user.role || "user";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={getUserName()}
        description="Detalhes e edição do usuário"
        breadcrumbs={[
          { label: "Usuários", href: "/usuarios" },
          { label: getUserName() },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isSaving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informações do Usuário</CardTitle>
            <CardDescription>Dados principais do usuário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Nome Completo</p>
              <p className="text-sm font-medium">{getUserName()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{getUserEmail()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <p className="text-sm font-medium">
                {getUserRole() === "admin" ? "Administrador" : "Usuário"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-sm font-medium">
                {user.emailVerified ? "Verificado" : "Não verificado"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Data de Criação</p>
              <p className="text-sm font-medium">
                {formatDate(new Date(user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt)))}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editar Usuário</CardTitle>
            <CardDescription>Atualize as informações do usuário</CardDescription>
          </CardHeader>
          <CardContent>
            <UserForm
              onSubmit={handleSubmit}
              defaultValues={{
                firstName: user.firstName || "",
                lastName: user.lastName || "",
                emailAddress: user.email,
                role: user.role as "admin" | "user",
              }}
              isLoading={isSaving}
              submitLabel="Salvar Alterações"
            />
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Usuário"
        description="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}

