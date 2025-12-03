import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
}

interface UserStore {
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
}

// Este store agora é usado apenas como fallback/compatibilidade
// A autenticação real é gerenciada pelo Clerk
export const useUserStore = create<UserStore>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
    });
  },
}));

