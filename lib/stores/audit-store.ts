import { create } from "zustand";

export type AuditAction =
  | "upload"
  | "signature"
  | "delete"
  | "failure"
  | "certificate_add"
  | "certificate_remove"
  | "signer_add"
  | "signer_remove";

export interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: AuditAction;
  ip: string;
  documentId?: string;
  documentName?: string;
  details?: string;
}

interface AuditStore {
  logs: AuditLog[];
  addLog: (log: Omit<AuditLog, "id" | "timestamp">) => void;
  getLogs: (filters?: {
    action?: AuditAction;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    documentId?: string;
  }) => AuditLog[];
}

export const useAuditStore = create<AuditStore>((set, get) => ({
  logs: [
    // Mock data inicial
    {
      id: "1",
      timestamp: new Date("2024-12-01T10:00:00"),
      userId: "user1",
      userName: "Admin",
      action: "upload",
      ip: "192.168.1.1",
      documentId: "1",
      documentName: "Contrato de Prestação de Serviços",
    },
    {
      id: "2",
      timestamp: new Date("2024-12-01T11:00:00"),
      userId: "user1",
      userName: "Admin",
      action: "certificate_add",
      ip: "192.168.1.1",
      details: "Certificado Empresa ABC adicionado",
    },
  ],
  addLog: (log) => {
    const newLog: AuditLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    set((state) => ({
      logs: [newLog, ...state.logs],
    }));
  },
  getLogs: (filters) => {
    let logs = get().logs;

    if (filters?.action) {
      logs = logs.filter((log) => log.action === filters.action);
    }

    if (filters?.userId) {
      logs = logs.filter((log) => log.userId === filters.userId);
    }

    if (filters?.documentId) {
      logs = logs.filter((log) => log.documentId === filters.documentId);
    }

    if (filters?.startDate) {
      logs = logs.filter((log) => log.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      logs = logs.filter((log) => log.timestamp <= filters.endDate!);
    }

    return logs;
  },
}));

