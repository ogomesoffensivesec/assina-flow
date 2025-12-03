"use client";

import { useUser } from "./use-user";

export function useRole() {
  const { user } = useUser();

  const userRole = user?.role || "user";
  const isAdmin = userRole === "admin";
  const isUser = !isAdmin;

  return {
    isAdmin,
    isUser,
    role: userRole,
  };
}

