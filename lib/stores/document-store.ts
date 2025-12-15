import { create } from "zustand";

export type DocumentStatus =
  | "pending"
  | "waiting_signers"
  | "signing"
  | "signed"
  | "completed";

export type SignerStatus = "pending" | "signed" | "error";

export interface Signer {
  id: string;
  name: string;
  email: string;
  documentNumber: string; // CPF ou CNPJ (obrigatório)
  documentType: "PF" | "PJ"; // PF ou PJ
  phoneNumber?: string;
  identification?: string;
  signatureType: "digital_a1" | "electronic";
  order: number;
  status: SignerStatus;
  signedAt?: Date | string;
  certificateId?: string;
}

export interface Document {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  status: DocumentStatus;
  uploadedAt: Date | string;
  signedAt?: Date | string;
  signers: Signer[];
  hash?: string;
  signedHash?: string;
}

interface DocumentStore {
  documents: Document[];
  isLoading: boolean;
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<Document | null>;
  addDocument: (document: Omit<Document, "id" | "uploadedAt">) => Promise<string>;
  removeDocument: (id: string) => Promise<void>;
  updateDocument: (id: string, updates: Partial<Document>) => Promise<void>;
  getDocument: (id: string) => Document | undefined;
  addSigner: (documentId: string, signer: Omit<Signer, "id">) => Promise<void>;
  removeSigner: (documentId: string, signerId: string) => Promise<void>;
  updateSigner: (
    documentId: string,
    signerId: string,
    updates: Partial<Signer>
  ) => Promise<void>;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  isLoading: false,
  
  fetchDocuments: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch("/api/documentos");
      if (!response.ok) {
        throw new Error("Erro ao buscar documentos");
      }
      const data = await response.json();
      // Converter strings de data para Date
      const documents: Document[] = data.documents.map((doc: any) => ({
        ...doc,
        uploadedAt: new Date(doc.uploadedAt),
        signedAt: doc.signedAt ? new Date(doc.signedAt) : undefined,
        signers: (doc.signers || []).map((s: any) => ({
          ...s,
          signedAt: s.signedAt ? new Date(s.signedAt) : undefined,
        })),
      }));

      set({ documents, isLoading: false });
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      set({ isLoading: false });
    }
  },

  fetchDocument: async (id: string) => {
    try {
      const response = await fetch(`/api/documentos/${id}`);
      if (!response.ok) {
        throw new Error("Documento não encontrado");
      }
      const data = await response.json();
      
      // Converter strings de data para Date
      const document: Document = {
        ...data,
        uploadedAt: new Date(data.uploadedAt),
        signedAt: data.signedAt ? new Date(data.signedAt) : undefined,
        signers: (data.signers || []).map((s: any) => ({
          ...s,
          signedAt: s.signedAt ? new Date(s.signedAt) : undefined,
        })),
      };

      // Atualizar no store
      set((state) => {
        const existingIndex = state.documents.findIndex((d) => d.id === id);
        if (existingIndex >= 0) {
          const updated = [...state.documents];
          updated[existingIndex] = document;
          return { documents: updated };
        }
        return { documents: [...state.documents, document] };
      });

      return document;
    } catch (error) {
      console.error("Erro ao buscar documento:", error);
      return null;
    }
  },

  addDocument: async (document) => {
    // Esta função não é mais usada diretamente
    // O upload é feito via API na página de novo documento
    throw new Error("Use a API diretamente para upload");
  },

  removeDocument: async (id: string) => {
    try {
      const response = await fetch(`/api/documentos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir documento");
      }

      // Remover do store localmente
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
    } catch (error: any) {
      console.error("Erro ao excluir documento:", error);
      throw error;
    }
  },

  updateDocument: async (id: string, updates: Partial<Document>) => {
    // Atualizar localmente (otimistic update)
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
  },

  getDocument: (id: string) => {
    return get().documents.find((d) => d.id === id);
  },

  addSigner: async (documentId: string, signer: Omit<Signer, "id">) => {
    try {
      const response = await fetch(`/api/documentos/${documentId}/signatarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: signer.name,
          email: signer.email,
          documentNumber: signer.documentNumber,
          documentType: signer.documentType,
          phoneNumber: signer.phoneNumber,
          identification: signer.identification,
          signatureType: signer.signatureType,
          order: signer.order,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao adicionar signatário");
      }

      const newSigner = await response.json();

      // Atualizar documento localmente
      set((state) => ({
        documents: state.documents.map((d) => {
          if (d.id === documentId) {
            return {
              ...d,
              signers: [...d.signers, { ...newSigner, signatureType: signer.signatureType }],
              status: "waiting_signers" as DocumentStatus,
            };
          }
          return d;
        }),
      }));
    } catch (error: any) {
      console.error("Erro ao adicionar signatário:", error);
      throw error;
    }
  },

  removeSigner: async (documentId: string, signerId: string) => {
    try {
      const response = await fetch(`/api/documentos/${documentId}/signatarios/${signerId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao remover signatário");
      }

      // Atualizar documento localmente
      set((state) => ({
        documents: state.documents.map((d) => {
          if (d.id === documentId) {
            return {
              ...d,
              signers: d.signers.filter((s) => s.id !== signerId),
            };
          }
          return d;
        }),
      }));
    } catch (error: any) {
      console.error("Erro ao remover signatário:", error);
      throw error;
    }
  },

  updateSigner: async (documentId: string, signerId: string, updates: Partial<Signer>) => {
    try {
      const response = await fetch(`/api/documentos/${documentId}/signatarios/${signerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: updates.name,
          email: updates.email,
          documentNumber: updates.documentNumber,
          documentType: updates.documentType,
          phoneNumber: updates.phoneNumber,
          identification: updates.identification,
          signatureType: updates.signatureType,
          order: updates.order,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao atualizar signatário");
      }

      const updatedSigner = await response.json();

      // Atualizar documento localmente
      set((state) => ({
        documents: state.documents.map((d) => {
          if (d.id === documentId) {
            return {
              ...d,
              signers: d.signers.map((s) =>
                s.id === signerId ? { ...s, ...updatedSigner } : s
              ),
            };
          }
          return d;
        }),
      }));
    } catch (error: any) {
      console.error("Erro ao atualizar signatário:", error);
      throw error;
    }
  },
}));

