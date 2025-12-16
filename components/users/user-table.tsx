"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UserRoleBadge } from "@/components/users/user-role-badge";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/date";

export interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  role: string;
  emailVerified: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface UserTableProps {
  users: User[];
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
}

export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  const getUserName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ""} ${user.lastName || ""}`.trim();
    }
    return user.email || "Sem nome";
  };

  const getUserEmail = (user: User) => {
    return user.email || "-";
  };

  const getUserRole = (user: User) => {
    return user.role || "user";
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[150px] sm:min-w-[180px]">Nome</TableHead>
              <TableHead className="hidden md:table-cell min-w-[200px]">Email</TableHead>
              <TableHead className="min-w-[100px]">Role</TableHead>
              <TableHead className="hidden lg:table-cell min-w-[120px]">Status</TableHead>
              <TableHead className="hidden xl:table-cell min-w-[140px]">Data de Criação</TableHead>
              <TableHead className="min-w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              Nenhum usuário encontrado
            </TableCell>
          </TableRow>
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">
                <div className="space-y-1">
                  <div className="max-w-[150px] sm:max-w-[180px] truncate" title={getUserName(user)}>
                    {getUserName(user)}
                  </div>
                  <div className="text-xs text-muted-foreground md:hidden truncate max-w-[150px]" title={getUserEmail(user)}>
                    {getUserEmail(user)}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <div className="max-w-[200px] truncate" title={getUserEmail(user)}>
                  {getUserEmail(user)}
                </div>
              </TableCell>
              <TableCell>
                <UserRoleBadge role={getUserRole(user)} />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Badge variant="default">
                  {user.emailVerified ? "Verificado" : "Não verificado"}
                </Badge>
              </TableCell>
              <TableCell className="hidden xl:table-cell">
                {formatDate(new Date(user.createdAt))}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1 sm:gap-2">
                  {onEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(user)}
                      className="h-7 sm:h-8 text-xs px-2 sm:px-3"
                    >
                      <Edit className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDelete(user.id)}
                      className="h-7 sm:h-8 text-xs px-2 sm:px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">Excluir</span>
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          )          )
        )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

