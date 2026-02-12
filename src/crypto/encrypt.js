/**
 * AI-Email 加密模块
 * 
 * 使用 X25519 + ChaCha20-Poly1305 实现端到端加密
 * 
 * 加密流程：
 * 1. 生成临时的 Ephemeral Key Pair
 * 2. 使用 Ephemeral Private Key + AI Public Key 计算共享密钥
 * 3. 使用 ChaCha20-Poly1305 加密邮件内容
 * 4. 存储：(Salt) + (Ephemeral Public Key) + (Ciphertext)
 */

import { x25519 } from '@noble/curves/ed25519';
import crypto from 'crypto';

/**
 * Base64 编码
 */
function base64Encode(data) {
  return Buffer.from(data).toString('base64');
}

/**
 * Base64 解码
 */
function base64Decode(str) {
  return Buffer.from(str, 'base64');
}

/**
 * 使用 AI 公钥加密数据
 * 
 * @param {string} publicKeyBase64 - AI 的公钥 (base64 编码)
 * @param {string|Uint8Array} plaintext - 明文数据
 * @returns {Object} 加密结果
 */
export function encrypt(publicKeyBase64, plaintext) {
  // 1. 将公钥从 base64 解码
  const publicKey = base64Decode(publicKeyBase64);
  
  // 2. 生成临时的密钥对
  const ephemeralPrivateKey = x25519.utils.randomPrivateKey();
  const ephemeralPublicKey = x25519.getPublicKey(ephemeralPrivateKey);
  
  // 3. 计算共享密钥 (ECDH)
  const sharedKey = x25519.getSharedSecret(ephemeralPrivateKey, publicKey);
  
  // 4. 加密数据
  const plaintextBytes = plaintext instanceof Uint8Array 
    ? plaintext 
    : new TextEncoder().encode(plaintext);
  
  // 使用 ChaCha20-Poly1305 加密
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('chacha20-poly1305', sharedKey, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(plaintextBytes),
    cipher.final(),
    cipher.getAuthTag()
  ]);
  
  // 5. 返回加密结果
  return {
    // 用于标识使用了哪个公钥加密
    keyId: base64Encode(publicKey.slice(0, 8)),
    
    // 临时的公钥（发送方）
    ephemeralPublicKey: base64Encode(ephemeralPublicKey),
    
    // 随机数
    nonce: base64Encode(nonce),
    
    // 密文
    ciphertext: base64Encode(ciphertext),
    
    // 加密时间戳
    timestamp: Date.now()
  };
}

/**
 * 使用私钥解密数据
 * 
 * @param {string} privateKeyBase64 - AI 的私钥 (base64 编码)
 * @param {Object} encryptedData - 加密数据对象
 * @returns {string} 解密后的明文
 */
export function decrypt(privateKeyBase64, encryptedData) {
  // 1. 解码私钥
  const privateKey = base64Decode(privateKeyBase64);
  
  // 2. 解码 Ephemeral Public Key
  const ephemeralPublicKey = base64Decode(encryptedData.ephemeralPublicKey);
  
  // 3. 计算共享密钥
  const sharedKey = x25519.getSharedSecret(privateKey, ephemeralPublicKey);
  
  // 4. 解密数据
  const nonce = base64Decode(encryptedData.nonce);
  const ciphertext = base64Decode(encryptedData.ciphertext);
  
  const decipher = crypto.createDecipheriv('chacha20-poly1305', sharedKey, nonce);
  decipher.setAuthTag(ciphertext.slice(-16));
  const plaintextBytes = decipher.update(ciphertext.slice(0, -16));
  
  // 5. 返回明文
  return new TextDecoder().decode(plaintextBytes);
}

/**
 * 批量加密多封邮件
 * 
 * @param {string} publicKeyBase64 - AI 公钥
 * @param {Array} emails - 邮件数组
 * @returns {Array} 加密后的邮件数组
 */
export function encryptBatch(publicKeyBase64, emails) {
  return emails.map(email => ({
    ...email,
    encrypted: true,
    encryption: encrypt(publicKeyBase64, JSON.stringify(email))
  }));
}

/**
 * 批量解密多封邮件
 * 
 * @param {string} privateKeyBase64 - AI 私钥
 * @param {Array} encryptedEmails - 加密邮件数组
 * @returns {Array} 解密后的邮件数组
 */
export function decryptBatch(privateKeyBase64, encryptedEmails) {
  return encryptedEmails.map(email => {
    if (!email.encrypted || !email.encryption) {
      return email;
    }
    
    try {
      const decryptedContent = decrypt(privateKeyBase64, email.encryption);
      const parsed = JSON.parse(decryptedContent);
      
      return {
        ...email,
        ...parsed,
        encrypted: false,
        decryptedAt: Date.now()
      };
    } catch (error) {
      console.error('解密失败:', error.message);
      return {
        ...email,
        error: '解密失败',
        errorMessage: error.message
      };
    }
  });
}

/**
 * 验证加密数据完整性
 * 
 * @param {Object} encryptedData - 加密数据对象
 * @returns {boolean} 是否有效
 */
export function validateEncryptedData(encryptedData) {
  const required = ['ephemeralPublicKey', 'nonce', 'ciphertext'];
  
  for (const field of required) {
    if (!encryptedData[field]) {
      return false;
    }
    
    // 验证是否为有效的 base64
    try {
      const decoded = base64Decode(encryptedData[field]);
      if (decoded.length === 0) {
        return false;
      }
    } catch {
      return false;
    }
  }
  
  return true;
}

/**
 * 生成邮件加密标识
 * 
 * @param {string} publicKeyBase64 - 公钥
 * @returns {string} 加密标识符
 */
export function generateEncryptionHeader(publicKeyBase64) {
  const shortKey = publicKeyBase64.substring(0, 16);
  const timestamp = Date.now().toString(36);
  return `AI-EMAIL v1; ${shortKey}...${timestamp}`;
}

export default {
  encrypt,
  decrypt,
  encryptBatch,
  decryptBatch,
  validateEncryptedData,
  generateEncryptionHeader
};
