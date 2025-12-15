# Configuração de Senhas de Certificados

Este documento descreve como configurar o armazenamento seguro de senhas de certificados.

## Variável de Ambiente

Para criptografar e armazenar senhas de certificados, você precisa configurar a variável de ambiente `CERTIFICATE_PASSWORD_KEY`.

### Gerando a Chave

A chave deve ter exatamente 32 bytes (256 bits) para AES-256. Você pode gerá-la de duas formas:

#### Opção 1: Usando Node.js

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Isso gerará uma string hexadecimal de 64 caracteres.

#### Opção 2: Usando OpenSSL

```bash
openssl rand -hex 32
```

### Configurando no .env

Adicione a chave gerada ao seu arquivo `.env`:

```env
CERTIFICATE_PASSWORD_KEY=sua_chave_hexadecimal_de_64_caracteres_aqui
```

**Importante:**
- A chave deve ter exatamente 64 caracteres hexadecimais (32 bytes)
- Nunca compartilhe ou commite esta chave no repositório
- Mantenha backups seguros da chave
- Se a chave for perdida, todas as senhas criptografadas se tornarão irrecuperáveis

## Funcionalidades

### Upload de Certificados

Quando você faz upload de um certificado, a senha é automaticamente criptografada e salva no banco de dados.

### Download de Certificados

- **Com senha salva**: O download é iniciado automaticamente sem solicitar a senha
- **Sem senha salva**: O sistema solicita a senha e oferece a opção de salvá-la para uso futuro

### Consulta de Senha

Você pode consultar a senha de um certificado através do botão de chave (🔑) na lista de certificados. A senha será descriptografada e exibida com opção de copiar.

## Segurança

- Senhas são criptografadas usando AES-256-GCM
- A criptografia inclui autenticação (GCM) para garantir integridade
- Cada senha usa um IV (Initialization Vector) único
- A chave de criptografia nunca é armazenada no código ou banco de dados
- Apenas o dono do certificado ou administradores podem acessar a senha

## Migração de Certificados Existentes

Certificados que foram cadastrados antes da implementação desta funcionalidade não terão senha salva. Quando você tentar baixar ou usar esses certificados:

1. O sistema solicitará a senha manualmente
2. Após validar a senha, você terá a opção de salvá-la
3. Uma vez salva, a senha será usada automaticamente em operações futuras

