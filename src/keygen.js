/**
 * AI-Email 密钥生成器
 * 
 * 生成 X25519 密钥对
 * - 公钥用于加密邮件，可公开分享
 * - 私钥用于解密邮件，本地安全存储
 */

import { x25519 } from '@noble/curves/ed25519';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
 * 生成随机盐
 */
function generateSalt() {
  return crypto.randomBytes(32);
}

/**
 * 使用密码加密私钥
 */
function encryptPrivateKey(privateKey, password) {
  const salt = generateSalt();
  const iv = crypto.randomBytes(16);
  
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha512');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return {
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    encrypted
  };
}

/**
 * 使用密码解密私钥
 */
function decryptPrivateKey(encryptedData, password) {
  const { salt, iv, authTag, encrypted } = encryptedData;
  
  const key = crypto.pbkdf2Sync(
    password, 
    Buffer.from(salt, 'hex'), 
    100000, 
    32, 
    'sha512'
  );
  
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm', 
    key, 
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * 生成密钥对
 */
function generateKeyPair() {
  const privateKeyBytes = x25519.utils.randomPrivateKey();
  const publicKeyBytes = x25519.getPublicKey(privateKeyBytes);
  
  return {
    publicKey: base64Encode(publicKeyBytes),
    privateKey: base64Encode(privateKeyBytes)
  };
}

/**
 * 保存密钥到文件
 */
function saveKeys(keyPair, password, outputDir = './keys') {
  // 创建输出目录
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // 加密私钥
  const encryptedPrivateKey = encryptPrivateKey(keyPair.privateKey, password);
  
  // 保存公钥（明文）
  fs.writeFileSync(
    path.join(outputDir, 'public-key.txt'),
    keyPair.publicKey
  );
  
  // 保存加密私钥
  fs.writeFileSync(
    path.join(outputDir, 'private-key.json'),
    JSON.stringify(encryptedPrivateKey, null, 2)
  );
  
  return {
    publicKeyPath: path.join(outputDir, 'public-key.txt'),
    privateKeyPath: path.join(outputDir, 'private-key.json')
  };
}

/**
 * 从文件加载密钥
 */
function loadKeys(password, keysDir = './keys') {
  // 加载公钥
  const publicKey = fs.readFileSync(
    path.join(keysDir, 'public-key.txt'),
    'utf8'
  ).trim();
  
  // 加载并解密私钥
  const encryptedPrivateKey = JSON.parse(
    fs.readFileSync(
      path.join(keysDir, 'private-key.json'),
      'utf8'
    )
  );
  const privateKey = decryptPrivateKey(encryptedPrivateKey, password);
  
  return {
    publicKey,
    privateKey
  };
}

/**
 * 验证密钥对是否匹配
 */
function verifyKeyPair(publicKey, privateKey) {
  try {
    const privateKeyBytes = base64Decode(privateKey);
    const derivedPublicKey = base64Encode(x25519.getPublicKey(privateKeyBytes));
    return derivedPublicKey === publicKey;
  } catch (error) {
    return false;
  }
}

// CLI 入口点
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'generate';
  
  if (command === 'generate') {
    console.log('🔐 AI-Email 密钥生成器\n');
    
    // 生成密钥对
    const keyPair = generateKeyPair();
    
    console.log('✅ 密钥对生成成功！\n');
    console.log('📋 你的公钥（可公开分享）：');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(keyPair.publicKey);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('⚠️  私钥已加密保存到 ./keys/ 目录\n');
    console.log('📝 下一步：');
    console.log('   1. 复制上面的公钥');
    console.log('   2. 在你的邮箱转发设置中粘贴公钥');
    console.log('   3. 运行 npm start 启动服务\n');
    
    // 生成随机密码并保存
    const password = crypto.randomBytes(32).toString('hex');
    const paths = saveKeys(keyPair, password);
    
    console.log('🔑 加密密码（保管好！）：');
    console.log(password);
    console.log(`\n💾 密钥已保存到：`);
    console.log(`   公钥：${paths.publicKeyPath}`);
    console.log(`   私钥：${paths.privateKeyPath}\n`);
    
    // 保存密码到 .env 文件
    fs.writeFileSync('.env', `ENCRYPTION_PASSWORD=${password}\n`);
    console.log('📄 密码已保存到 .env 文件\n');
    
  } else if (command === 'load') {
    // 加载并验证密钥
    console.log('📂 加载密钥...\n');
    
    const password = process.env.ENCRYPTION_PASSWORD || 
      crypto.randomBytes(16).toString('hex');
    
    const keys = loadKeys(password);
    
    console.log('✅ 密钥加载成功！');
    console.log(`   公钥：${keys.publicKey.substring(0, 32)}...`);
    console.log(`   私钥：${keys.privateKey.substring(0, 32)}...`);
    
  } else {
    console.log('用法：');
    console.log('   npm run keygen           # 生成新密钥对');
    console.log('   node src/keygen.js load  # 加载现有密钥');
  }
}

// 导出模块
export {
  generateKeyPair,
  saveKeys,
  loadKeys,
  verifyKeyPair,
  encryptPrivateKey,
  decryptPrivateKey
};

main().catch(console.error);
