/**
 * AI-Email 使用示例
 * 
 * 演示如何使用加密、解密和邮件功能
 */

import { encrypt, decrypt } from './src/crypto/encrypt.js';
import { loadKeys, generateKeyPair } from './src/keygen.js';
import { sendEmail, getUnreadEmails } from './src/email/email.js';

// 示例 1：生成密钥对
async function example1GenerateKeys() {
  console.log('示例 1：生成密钥对\n');
  
  const keyPair = generateKeyPair();
  
  console.log('✅ 密钥对生成成功！\n');
  console.log('📋 公钥（可分享给任何人）：');
  console.log(keyPair.publicKey);
  console.log('\n🔒 私钥（仅自己保管）：');
  console.log(keyPair.privateKey);
  console.log('');
}

// 示例 2：加密和解密
async function example2EncryptDecrypt() {
  console.log('示例 2：加密和解密\n');
  
  // 假设这是 AI 的密钥对
  const keyPair = generateKeyPair();
  
  // 用户要发送的邮件内容
  const originalContent = {
    subject: '紧急任务',
    from: 'boss@company.com',
    body: '请在今天下午3点前完成报告并发送给我。',
    timestamp: new Date().toISOString()
  };
  
  console.log('📝 原始邮件：');
  console.log(JSON.stringify(originalContent, null, 2));
  console.log('');
  
  // 加密
  const encrypted = encrypt(keyPair.publicKey, JSON.stringify(originalContent));
  
  console.log('🔐 加密后的数据：');
  console.log(`   Key ID: ${encrypted.keyId}`);
  console.log(`   Ephemeral Public Key: ${encrypted.ephemeralPublicKey.substring(0, 16)}...`);
  console.log(`   Nonce: ${encrypted.nonce.substring(0, 16)}...`);
  console.log(`   Ciphertext: ${encrypted.ciphertext.substring(0, 32)}...`);
  console.log('');
  
  // 解密（AI 端）
  const decrypted = decrypt(keyPair.privateKey, encrypted);
  const parsedDecrypted = JSON.parse(decrypted);
  
  console.log('🔓 解密后的邮件：');
  console.log(JSON.stringify(parsedDecrypted, null, 2));
  console.log('');
}

// 示例 3：处理收到的邮件
async function example3ProcessEmail() {
  console.log('示例 3：处理收到的邮件\n');
  
  const keyPair = generateKeyPair();
  
  // 模拟收到的加密邮件
  const mockEmail = {
    id: 'msg_123',
    subject: '项目更新',
    from: 'team@startup.io',
    body: '新版本已发布，请测试并反馈。'
  };
  
  const encryptedEmail = encrypt(
    keyPair.publicKey,
    JSON.stringify(mockEmail)
  );
  
  // AI 收到邮件后
  console.log('📬 收到加密邮件：');
  console.log(`   ID: ${mockEmail.id}`);
  console.log(`   已加密: ${encryptedEmail ? '是' : '否'}`);
  console.log('');
  
  // 解密并处理
  const decrypted = decrypt(keyPair.privateKey, encryptedEmail);
  const email = JSON.parse(decrypted);
  
  console.log('🧠 AI 分析邮件：');
  console.log(`   主题: ${email.subject}`);
  console.log(`   发件人: ${email.from}`);
  console.log(`   内容: ${email.body}`);
  console.log('');
  
  // AI 决策并执行
  console.log('⚡ AI 执行操作：');
  console.log('   → 标记为重要');
  console.log('   → 添加到待办事项');
  console.log('   → 设置提醒');
  console.log('');
}

// 示例 4：发送回复
async function example4SendReply() {
  console.log('示例 4：发送自动回复\n');
  
  const keyPair = generateKeyPair();
  
  // 原始邮件
  const originalEmail = {
    subject: '问题咨询',
    from: 'user@example.com',
    body: '你们的 AI 邮箱什么时候发布？'
  };
  
  // AI 生成回复
  const reply = {
    subject: 'Re: 问题咨询',
    body: `您好！

感谢您的关注。AI-Email 正在积极开发中，预计将在下个月发布 Beta 版本。

如果您感兴趣，可以关注我们的 GitHub 仓库获取最新动态：
https://github.com/yourusername/ai-email

祝好，
AI-Email 团队`
  };
  
  console.log('📨 原始邮件：');
  console.log(`   主题: ${originalEmail.subject}`);
  console.log(`   发件人: ${originalEmail.from}`);
  console.log('');
  
  console.log('✉️  发送回复：');
  console.log(`   主题: ${reply.subject}`);
  console.log(`   内容: ${reply.body.substring(0, 50)}...`);
   // 实际发送（需要配置 console.log('');
  
 SMTP）
  // await sendEmail('user@example.com', reply.subject, reply.body);
  
  console.log('✅ 回复已发送！');
}

// 主函数
async function main() {
  console.log('='.repeat(60));
  console.log('  AI-Email 使用示例');
  console.log('='.repeat(60));
  console.log('');
  
  await example1GenerateKeys();
  console.log('-'.repeat(60));
  await example2EncryptDecrypt();
  console.log('-'.repeat(60));
  await example3ProcessEmail();
  console.log('-'.repeat(60));
  await example4SendReply();
  
  console.log('');
  console.log('='.repeat(60));
  console.log('  所有示例运行完成！');
  console.log('='.repeat(60));
}

main().catch(console.error);
