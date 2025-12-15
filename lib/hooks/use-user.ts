"use client";

import { useUser as useClerkUser } from "@clerk/nextjs";

export function useUser() {
  const { user, isLoaded } = useClerkUser();

  return {
    user: user
      ? {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.publicMetadata?.role as string || "user",
          emailVerified: user.emailAddresses[0]?.verification?.status === "verified",
        }
      : null,
    isLoading: !isLoaded,
  };
}

