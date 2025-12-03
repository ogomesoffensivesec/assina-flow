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
    return user.emailAddresses[0]?.emailAddress || "Sem nome";
  };

  const getUserEmail = (user: User) => {
    return user.email || "-";
  };

  const getUserRole = (user: User) => {
    return user.role || "user";
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data de Criação</TableHead>
          <TableHead className="text-right">Ações</TableHead>
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
              <TableCell className="font-medium">{getUserName(user)}</TableCell>
              <TableCell>{getUserEmail(user)}</TableCell>
              <TableCell>
                <UserRoleBadge role={getUserRole(user)} />
              </TableCell>
              <TableCell>
                <Badge variant="default">
                  {user.emailVerified ? "Verificado" : "Não verificado"}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(new Date(user.createdAt))}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(user.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

