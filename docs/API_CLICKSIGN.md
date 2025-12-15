# API de Documentos - Integração Clicksign

Este documento descreve as rotas de API para gerenciamento de documentos e assinaturas digitais, integradas com a Clicksign API v3.

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env.local`:

```env
# Clicksign API
CLICKSIGN_ACCESS_TOKEN=seu_token_aqui
CLICKSIGN_API_BASE=https://sandbox.clicksign.com/api/v3  # Opcional, padrão é sandbox
```

### Migração do Banco de Dados

Execute a migração do Prisma para criar as tabelas necessárias:

```bash
npx prisma migrate dev --name add_documents_and_signers
```

## Rotas da API

### 1. POST /api/documentos

**Descrição:** Faz upload de um PDF e cria automaticamente um envelope na Clicksign.

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `file`: Arquivo PDF (File)
  - `name`: Nome do documento (string)

**Response:**
```json
{
  "documentId": "abc123",
  "name": "Contrato de Serviços",
  "status": "pending"
}
```

**Exemplo:**
```javascript
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('name', 'Contrato de Serviços');

const response = await fetch('/api/documentos', {
  method: 'POST',
  body: formData,
});
```

---

### 2. POST /api/documentos/[id]/signatarios

**Descrição:** Adiciona um signatário ao documento.

**Request:**
```json
{
  "name": "João Silva",
  "email": "joao@example.com",
  "cpf": "123.456.789-00",  // Opcional
  "signatureType": "electronic",  // Opcional: "digital_a1" ou "electronic"
  "order": 1  // Opcional: ordem de assinatura
}
```

**Response:**
```json
{
  "id": "signer123",
  "name": "João Silva",
  "email": "joao@example.com",
  "status": "pending",
  "order": 1
}
```

**Exemplo:**
```javascript
const response = await fetch(`/api/documentos/${documentId}/signatarios`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@example.com',
    cpf: '123.456.789-00',
  }),
});
```

---

### 3. GET /api/documentos/[id]

**Descrição:** Obtém informações do documento e status atualizado da Clicksign.

**Response:**
```json
{
  "id": "abc123",
  "name": "Contrato de Serviços",
  "fileName": "contrato.pdf",
  "fileSize": 245678,
  "pageCount": 5,
  "status": "waiting_signers",  // pending, waiting_signers, signing, signed, completed
  "uploadedAt": "2024-01-15T10:30:00Z",
  "signedAt": null,
  "signers": [
    {
      "id": "signer123",
      "name": "João Silva",
      "email": "joao@example.com",
      "status": "pending",
      "order": 1,
      "signedAt": null
    }
  ]
}
```

**Status possíveis:**
- `pending`: Documento criado, aguardando configuração
- `waiting_signers`: Aguardando signatários serem adicionados
- `signing`: Processo de assinatura em andamento
- `signed`: Documento assinado
- `completed`: Documento finalizado na Clicksign

---

### 4. POST /api/documentos/[id]/assinar

**Descrição:** Inicia o processo de assinatura na Clicksign (ativa o envelope).

**Response:**
```json
{
  "success": true,
  "status": "signing",
  "message": "Processo de assinatura iniciado"
}
```

**Exemplo:**
```javascript
const response = await fetch(`/api/documentos/${documentId}/assinar`, {
  method: 'POST',
});
```

---

### 5. GET /api/documentos/[id]/download

**Descrição:** Baixa o documento assinado da Clicksign.

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="documento_assinado.pdf"`

**Exemplo:**
```javascript
const response = await fetch(`/api/documentos/${documentId}/download`);
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'documento_assinado.pdf';
a.click();
```

---

## Fluxo Completo

### 1. Upload do Documento
```javascript
// 1. Upload do PDF
const formData = new FormData();
formData.append('file', pdfFile);
formData.append('name', 'Contrato de Serviços');

const uploadResponse = await fetch('/api/documentos', {
  method: 'POST',
  body: formData,
});

const { documentId } = await uploadResponse.json();
```

### 2. Adicionar Signatários
```javascript
// 2. Adicionar signatários
await fetch(`/api/documentos/${documentId}/signatarios`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'João Silva',
    email: 'joao@example.com',
    order: 1,
  }),
});

await fetch(`/api/documentos/${documentId}/signatarios`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Maria Santos',
    email: 'maria@example.com',
    order: 2,
  }),
});
```

### 3. Iniciar Assinatura
```javascript
// 3. Iniciar processo de assinatura
await fetch(`/api/documentos/${documentId}/assinar`, {
  method: 'POST',
});
```

### 4. Verificar Status
```javascript
// 4. Verificar status (pode ser feito periodicamente)
const statusResponse = await fetch(`/api/documentos/${documentId}`);
const document = await statusResponse.json();

if (document.status === 'completed') {
  // Documento assinado, pode baixar
}
```

### 5. Baixar Documento Assinado
```javascript
// 5. Baixar documento assinado
const downloadResponse = await fetch(`/api/documentos/${documentId}/download`);
const blob = await downloadResponse.blob();
// ... salvar ou exibir o PDF
```

---

## Abstração da Clicksign

**IMPORTANTE:** O frontend NÃO deve conhecer os conceitos da Clicksign:
- ❌ `envelope_key`
- ❌ `document_key`
- ❌ `signer_key`
- ❌ `signature_request_key`

Todos esses conceitos são abstraídos pelo backend. O frontend trabalha apenas com:
- ✅ `documentId` (ID interno)
- ✅ `status` (status mapeado)
- ✅ `signers` (lista de signatários)

---

## Tratamento de Erros

Todas as rotas retornam erros no formato:

```json
{
  "error": "Mensagem de erro descritiva"
}
```

Status HTTP:
- `400`: Erro de validação (dados inválidos)
- `403`: Sem permissão
- `404`: Recurso não encontrado
- `500`: Erro interno do servidor

---

## Autenticação

Todas as rotas requerem autenticação via sessão (Lucia Auth). O usuário deve estar logado para acessar as rotas.

---

## Notas Importantes

1. **Sandbox vs Produção:** Por padrão, a API usa o ambiente sandbox da Clicksign. Para produção, configure `CLICKSIGN_API_BASE=https://api.clicksign.com/api/v3`

2. **Webhooks:** Em produção, recomenda-se configurar webhooks da Clicksign para atualizar o status automaticamente, em vez de fazer polling.

3. **Limites:** A Clicksign tem limites de requisição. Consulte a documentação oficial para mais detalhes.

4. **Status Mapping:** O backend mapeia os status da Clicksign para status internos mais simples:
   - Clicksign `draft` → `pending`
   - Clicksign `running` → `signing` ou `waiting_signers`
   - Clicksign `closed`/`finalized` → `completed`

