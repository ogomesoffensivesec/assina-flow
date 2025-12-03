import { create } from "zustand";

export type DocumentStatus =
  | "pending_config"
  | "pending_signature"
  | "signed"
  | "error";

export type SignerStatus = "pending" | "signed" | "error";

export interface Signer {
  id: string;
  name: string;
  email: string;
  signatureType: "digital_a1" | "electronic";
  order: number;
  status: SignerStatus;
  signedAt?: Date;
  certificateId?: string;
}

export interface Document {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  status: DocumentStatus;
  uploadedAt: Date;
  signedAt?: Date;
  signers: Signer[];
  hash?: string;
  signedHash?: string;
}

interface DocumentStore {
  documents: Document[];
  addDocument: (document: Omit<Document, "id" | "uploadedAt">) => void;
  removeDocument: (id: string) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  getDocument: (id: string) => Document | undefined;
  addSigner: (documentId: string, signer: Omit<Signer, "id">) => void;
  removeSigner: (documentId: string, signerId: string) => void;
  updateSigner: (
    documentId: string,
    signerId: string,
    updates: Partial<Signer>
  ) => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [
    // Mock data inicial
    {
      id: "1",
      name: "Contrato de Prestação de Serviços",
      fileName: "contrato-servicos.pdf",
      fileSize: 245678,
      pageCount: 5,
      status: "pending_signature",
      uploadedAt: new Date("2024-12-01"),
      signers: [
        {
          id: "1",
          name: "João Silva",
          email: "joao@example.com",
          signatureType: "digital_a1",
          order: 1,
          status: "pending",
        },
      ],
      hash: "a1b2c3d4e5f6...",
    },
  ],
  addDocument: (document) => {
    const newDocument: Document = {
      ...document,
      id: Date.now().toString(),
      uploadedAt: new Date(),
    };
    set((state) => ({
      documents: [...state.documents, newDocument],
    }));
  },
  removeDocument: (id) => {
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    }));
  },
  updateDocument: (id, updates) => {
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    }));
  },
  getDocument: (id) => {
    return get().documents.find((d) => d.id === id);
  },
  addSigner: (documentId, signer) => {
    set((state) => ({
      documents: state.documents.map((d) => {
        if (d.id === documentId) {
          const newSigner: Signer = {
            ...signer,
            id: Date.now().toString(),
          };
          return {
            ...d,
            signers: [...d.signers, newSigner],
          };
        }
        return d;
      }),
    }));
  },
  removeSigner: (documentId, signerId) => {
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
  },
  updateSigner: (documentId, signerId, updates) => {
    set((state) => ({
      documents: state.documents.map((d) => {
        if (d.id === documentId) {
          return {
            ...d,
            signers: d.signers.map((s) =>
              s.id === signerId ? { ...s, ...updates } : s
            ),
          };
        }
        return d;
      }),
    }));
  },
}));

