import { create } from "zustand";
import { getValidityStatus } from "@/lib/utils/date";

export type CertificateType = "PF" | "PJ";

export type CertificateStatus = "active" | "inactive";

export type CertificateValidityStatus = "valid" | "expiring_soon" | "expired";

export interface Certificate {
  id: string;
  name: string;
  type: CertificateType;
  cpfCnpj: string;
  issuedBy: string;
  serialNumber: string;
  validFrom: Date | string;
  validTo: Date | string;
  status: CertificateStatus;
  validityStatus?: CertificateValidityStatus;
  createdAt: Date | string;
  hasPassword?: boolean;
}

interface CertificateStore {
  certificates: Certificate[];
  isLoading: boolean;
  fetchCertificates: () => Promise<void>;
  fetchCertificate: (id: string) => Promise<Certificate | null>;
  addCertificate: (certificate: Omit<Certificate, "id" | "createdAt">) => Promise<string>;
  removeCertificate: (id: string) => Promise<void>;
  updateCertificate: (id: string, updates: Partial<Certificate>) => Promise<void>;
  getCertificate: (id: string) => Certificate | undefined;
}

export const useCertificateStore = create<CertificateStore>((set, get) => ({
  certificates: [],
  isLoading: false,

  fetchCertificates: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch("/api/certificados");
      if (!response.ok) {
        throw new Error("Erro ao buscar certificados");
      }
      const data = await response.json();
      
      // Converter strings de data para Date e calcular validityStatus
      const certificates: Certificate[] = data.certificates.map((cert: any) => {
        const validTo = new Date(cert.validTo);
        return {
          ...cert,
          validFrom: new Date(cert.validFrom),
          validTo,
          createdAt: new Date(cert.createdAt),
          validityStatus: getValidityStatus(validTo),
          hasPassword: cert.hasPassword || false,
        };
      });

      set({ certificates, isLoading: false });
    } catch (error) {
      console.error("Erro ao buscar certificados:", error);
      set({ isLoading: false });
    }
  },

  fetchCertificate: async (id: string) => {
    try {
      const response = await fetch(`/api/certificados/${id}`);
      if (!response.ok) {
        throw new Error("Certificado não encontrado");
      }
      const data = await response.json();
      
      const validTo = new Date(data.validTo);
      const certificate: Certificate = {
        ...data,
        validFrom: new Date(data.validFrom),
        validTo,
        createdAt: new Date(data.createdAt),
        validityStatus: getValidityStatus(validTo),
      };

      // Atualizar no store
      set((state) => {
        const existingIndex = state.certificates.findIndex((c) => c.id === id);
        if (existingIndex >= 0) {
          const updated = [...state.certificates];
          updated[existingIndex] = certificate;
          return { certificates: updated };
        }
        return { certificates: [...state.certificates, certificate] };
      });

      return certificate;
    } catch (error) {
      console.error("Erro ao buscar certificado:", error);
      return null;
    }
  },

  addCertificate: async (certificate) => {
    // Esta função não é mais usada diretamente
    // O upload é feito via API na página de novo certificado
    throw new Error("Use a API diretamente para upload");
  },

  removeCertificate: async (id: string) => {
    try {
      const response = await fetch(`/api/certificados/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir certificado");
      }

      // Remover do store localmente
      set((state) => ({
        certificates: state.certificates.filter((c) => c.id !== id),
      }));
    } catch (error: any) {
      console.error("Erro ao excluir certificado:", error);
      throw error;
    }
  },

  updateCertificate: async (id: string, updates: Partial<Certificate>) => {
    try {
      const response = await fetch(`/api/certificados/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar certificado");
      }

      const updated = await response.json();

      // Atualizar no store
      set((state) => ({
        certificates: state.certificates.map((c) =>
          c.id === id ? { ...c, ...updated } : c
        ),
      }));
    } catch (error: any) {
      console.error("Erro ao atualizar certificado:", error);
      throw error;
    }
  },

  getCertificate: (id: string) => {
    return get().certificates.find((c) => c.id === id);
  },
}));

