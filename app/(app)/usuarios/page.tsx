"use client";

import { useState, useEffect } from "react";
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
import { UserTable, User } from "@/components/users/user-table";
import { EmptyState } from "@/components/empty-state";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { useRole } from "@/lib/hooks/use-role";
import { Plus, Users, Search } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function UsersPage() {
  const router = useRouter();
  const { isAdmin } = useRole();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  useEffect(() => {
    if (!isAdmin) {
      toast.error("Acesso negado. Apenas administradores podem acessar esta página.");
      router.push("/dashboard");
      return;
    }

    fetchUsers();
  }, [isAdmin, router]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append("query", searchQuery);
      }

      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Erro ao carregar usuários");
      }

      const data = await response.json();
      let filteredUsers = data.users || [];

      // Filtrar por role no cliente
      if (roleFilter !== "all") {
        filteredUsers = filteredUsers.filter((user: User) => {
          const userRole = user.role || "user";
          return userRole === roleFilter;
        });
      }

      setUsers(filteredUsers);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar usuários");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = (userId: string) => {
    setUserToDelete(userId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/users?userId=${userToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Erro ao excluir usuário");
      }

      toast.success("Usuário excluído com sucesso");
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir usuário");
    }
  };

  const handleEdit = (user: User) => {
    router.push(`/usuarios/${user.id}`);
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários"
        description="Gerencie os usuários do sistema"
        actions={
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/usuarios/novo">
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Link>
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                fetchUsers();
              }
            }}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="role-filter">Role:</Label>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger id="role-filter" className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={fetchUsers} variant="outline">
          Buscar
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando usuários...
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum usuário encontrado"
          description="Comece criando o primeiro usuário do sistema"
          actionLabel="Novo Usuário"
          onAction={() => router.push("/usuarios/novo")}
        />
      ) : (
        <UserTable users={users} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Excluir Usuário"
        description="Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  );
}

