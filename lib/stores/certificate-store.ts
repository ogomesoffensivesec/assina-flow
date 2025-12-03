import { create } from "zustand";

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
  validFrom: Date;
  validTo: Date;
  status: CertificateStatus;
  validityStatus: CertificateValidityStatus;
  createdAt: Date;
}

interface CertificateStore {
  certificates: Certificate[];
  addCertificate: (certificate: Omit<Certificate, "id" | "createdAt">) => void;
  removeCertificate: (id: string) => void;
  updateCertificate: (id: string, updates: Partial<Certificate>) => void;
  getCertificate: (id: string) => Certificate | undefined;
}

export const useCertificateStore = create<CertificateStore>((set, get) => ({
  certificates: [
    // Mock data inicial
    {
      id: "1",
      name: "Certificado Empresa ABC",
      type: "PJ",
      cpfCnpj: "12.345.678/0001-90",
      issuedBy: "AC Soluti Certificadora Digital",
      serialNumber: "ABC123456789",
      validFrom: new Date("2024-01-01"),
      validTo: new Date("2025-12-31"),
      status: "active",
      validityStatus: "valid",
      createdAt: new Date("2024-01-01"),
    },
  ],
  addCertificate: (certificate) => {
    const newCertificate: Certificate = {
      ...certificate,
      id: Date.now().toString(),
      createdAt: new Date(),
    };
    set((state) => ({
      certificates: [...state.certificates, newCertificate],
    }));
  },
  removeCertificate: (id) => {
    set((state) => ({
      certificates: state.certificates.filter((c) => c.id !== id),
    }));
  },
  updateCertificate: (id, updates) => {
    set((state) => ({
      certificates: state.certificates.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  },
  getCertificate: (id) => {
    return get().certificates.find((c) => c.id === id);
  },
}));

