import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 16 bytes para AES
const SALT_LENGTH = 64; // 64 bytes para o salt
const TAG_LENGTH = 16; // 16 bytes para o auth tag do GCM
const KEY_LENGTH = 32; // 32 bytes para AES-256

/**
 * Obtém a chave de criptografia da variável de ambiente
 * A chave deve ter 32 bytes (256 bits) para AES-256
 */
function getEncryptionKey(): Buffer {
  const key = process.env.CERTIFICATE_PASSWORD_KEY;
  
  if (!key) {
    throw new Error(
      "CERTIFICATE_PASSWORD_KEY não está configurada. " +
      "Configure uma chave de 32 bytes (64 caracteres hexadecimais) na variável de ambiente."
    );
  }

  // Se a chave está em formato hexadecimal, converter para Buffer
  if (key.length === 64) {
    try {
      return Buffer.from(key, "hex");
    } catch (error) {
      throw new Error("CERTIFICATE_PASSWORD_KEY deve ser uma string hexadecimal de 64 caracteres");
    }
  }

  // Se não é hexadecimal, usar diretamente (mas garantir que tem 32 bytes)
  const keyBuffer = Buffer.from(key, "utf8");
  if (keyBuffer.length !== KEY_LENGTH) {
    throw new Error(
      `CERTIFICATE_PASSWORD_KEY deve ter exatamente 32 bytes. ` +
      `Tamanho atual: ${keyBuffer.length} bytes. ` +
      `Use uma chave hexadecimal de 64 caracteres ou uma string UTF-8 de 32 bytes.`
    );
  }

  return keyBuffer;
}

/**
 * Criptografa a senha do certificado usando AES-256-GCM
 * @param password - Senha em texto plano
 * @returns String base64 contendo: salt + iv + encryptedData + authTag
 */
export function encryptPassword(password: string): string {
  if (!password) {
    throw new Error("Senha não pode ser vazia");
  }

  const key = getEncryptionKey();
  
  // Gerar salt aleatório
  const salt = crypto.randomBytes(SALT_LENGTH);
  
  // Gerar IV aleatório
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Criar cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  // Criptografar senha
  let encrypted = cipher.update(password, "utf8", "base64");
  encrypted += cipher.final("base64");
  
  // Obter auth tag (GCM fornece autenticação)
  const authTag = cipher.getAuthTag();
  
  // Combinar: salt + iv + encrypted + authTag
  // Formato: [salt (64 bytes)][iv (16 bytes)][authTag (16 bytes)][encrypted (variável)]
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, "base64"),
  ]);
  
  // Retornar em base64 para fácil armazenamento
  return combined.toString("base64");
}

/**
 * Descriptografa a senha do certificado
 * @param encryptedPassword - String base64 contendo dados criptografados
 * @returns Senha em texto plano
 */
export function decryptPassword(encryptedPassword: string): string {
  if (!encryptedPassword) {
    throw new Error("Senha criptografada não pode ser vazia");
  }

  const key = getEncryptionKey();
  
  try {
    // Decodificar de base64
    const combined = Buffer.from(encryptedPassword, "base64");
    
    // Extrair componentes
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    
    // Criar decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Descriptografar
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error: any) {
    throw new Error(
      `Erro ao descriptografar senha: ${error.message}. ` +
      `Verifique se a chave de criptografia está correta.`
    );
  }
}

