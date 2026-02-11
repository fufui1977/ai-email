/**
 * AI-Email 服务器主入口
 * 
 * 功能：
 * - HTTP API 服务器
 * - WebSocket 实时通知
 * - 邮件轮询和处理
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { encrypt, decrypt } from './crypto/encrypt.js';
import { 
  connectImap, 
  getUnreadEmails, 
  sendEmail,
  imapConfig,
  smtpConfig
} from './email/email.js';

import { loadKeys, generateKeyPair, saveKeys } from './keygen.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 加载环境变量
dotenv.config();

// 创建 Express 应用
const app = express();
const server = http.createServer(app);

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 存储
let emailStore = [];
let keyPair = null;
let imapConnection = null;

// WebSocket 服务器
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('🔌 新 WebSocket 连接');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) {
      console.error('WebSocket 消息解析失败:', e);
    }
  });
});

// 广播消息到所有连接的客户端
function broadcast(data) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  });
}

// ==================== API 路由 ====================

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    emails: emailStore.length
  });
});

// 获取公钥
app.get('/api/key/public', (req, res) => {
  if (!keyPair) {
    return res.status(404).json({ error: '密钥未初始化' });
  }
  
  res.json({ 
    publicKey: keyPair.publicKey,
    keyId: keyPair.publicKey.substring(0, 16) + '...'
  });
});

// 初始化密钥
app.post('/api/key/init', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password || password.length < 16) {
      return res.status(400).json({ 
        error: '密码至少需要 16 个字符' 
      });
    }
    
    // 生成新密钥对
    keyPair = generateKeyPair();
    
    // 保存到文件
    saveKeys(keyPair, password);
    
    res.json({ 
      success: true,
      publicKey: keyPair.publicKey,
      message: '密钥已生成并加密保存'
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取邮件列表
app.get('/api/emails', (req, res) => {
  const { limit = 20, offset = 0, decrypted = false } = req.query;
  
  let emails = [...emailStore];
  
  // 如果需要解密
  if (decrypted === 'true' && keyPair) {
    try {
      const password = process.env.ENCRYPTION_PASSWORD;
      const keys = loadKeys(password);
      emails = emails.map(email => {
        if (email.encrypted && email.encryption) {
          try {
            const decryptedContent = decrypt(keys.privateKey, email.encryption);
            return {
              ...email,
              ...JSON.parse(decryptedContent),
              encrypted: false
            };
          } catch (e) {
            return { ...email, error: '解密失败' };
          }
        }
        return email;
      });
    } catch (e) {
      return res.status(500).json({ error: '加载密钥失败' });
    }
  }
  
  res.json({
    emails: emails.slice(offset, offset + parseInt(limit)),
    total: emails.length
  });
});

// 手动检查邮件
app.post('/api/emails/sync', async (req, res) => {
  try {
    if (!imapConnection) {
      imapConnection = await connectImap(imapConfig);
    }
    
    const newEmails = await getUnreadEmails(imapConnection);
    
    // 加密并存储
    if (keyPair) {
      newEmails.forEach(email => {
        const encrypted = encrypt(keyPair.publicKey, JSON.stringify(email));
        emailStore.unshift({
          ...email,
          encrypted: true,
          encryption: encrypted,
          receivedAt: new Date().toISOString()
        });
      });
    }
    
    // 通知客户端
    broadcast({
      type: 'new_emails',
      count: newEmails.length
    });
    
    res.json({ 
      success: true,
      synced: newEmails.length,
      total: emailStore.length
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 发送邮件
app.post('/api/email/send', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    
    const result = await sendEmail(to, subject, text, html);
    
    res.json({ success: true, ...result });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 解密并处理邮件
app.post('/api/emails/:id/process', async (req, res) => {
  try {
    const { id } = req.params;
    const email = emailStore.find(e => e.id === id || e.messageId === id);
    
    if (!email) {
      return res.status(404).json({ error: '邮件不存在' });
    }
    
    // 解密邮件
    if (keyPair) {
      const password = process.env.ENCRYPTION_PASSWORD;
      const keys = loadKeys(password);
      
      const decryptedContent = decrypt(keys.privateKey, email.encryption);
      const parsedEmail = JSON.parse(decryptedContent);
      
      res.json({
        success: true,
        email: {
          ...email,
          ...parsedEmail,
          encrypted: false
        }
      });
    } else {
      res.status(404).json({ error: '密钥未加载' });
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 获取统计信息
app.get('/api/stats', (req, res) => {
  res.json({
    total: emailStore.length,
    encrypted: emailStore.filter(e => e.encrypted).length,
    decrypted: emailStore.filter(e => !e.encrypted).length,
    lastSync: new Date().toISOString()
  });
});

// ==================== 轮询任务 ====================

let pollInterval = null;

async function startPolling(intervalMs = 60000) {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  console.log(`📧 启动邮件轮询，间隔 ${intervalMs / 1000} 秒`);
  
  pollInterval = setInterval(async () => {
    try {
      if (!imapConnection) {
        imapConnection = await connectImap(imapConfig);
      }
      
      const newEmails = await getUnreadEmails(imapConnection);
      
      if (newEmails.length > 0) {
        console.log(`📬 收到 ${newEmails.length} 封新邮件`);
        
        // 加密并存储
        if (keyPair) {
          newEmails.forEach(email => {
            const encrypted = encrypt(keyPair.publicKey, JSON.stringify(email));
            emailStore.unshift({
              ...email,
              encrypted: true,
              encryption: encrypted,
              receivedAt: new Date().toISOString()
            });
          });
        }
        
        // 通知客户端
        broadcast({
          type: 'new_emails',
          count: newEmails.length,
          emails: newEmails.map(e => ({
            id: e.id,
            subject: e.subject,
            from: e.from
          }))
        });
        
        // 发送确认邮件
        if (process.env.SEND_ACKNOWLEDGMENT === 'true') {
          newEmails.forEach(async (email) => {
            await sendEmail(
              email.from.match(/<(.+)>/)?.[1] || email.from,
              'Re: 邮件已收到',
              `您的邮件 "${email.subject}" 已收到，我会尽快处理。`
            );
          });
        }
      }
    } catch (error) {
      console.error('邮件轮询错误:', error.message);
      
      // 重新连接
      try {
        imapConnection = await connectImap(imapConfig);
      } catch (e) {
        console.error('重新连接失败:', e.message);
      }
    }
  }, intervalMs);
}

// ==================== 启动服务器 ====================

const PORT = process.env.PORT || 3000;

// 加载现有密钥
async function loadExistingKeys() {
  try {
    const password = process.env.ENCRYPTION_PASSWORD;
    if (password) {
      keyPair = loadKeys(password);
      console.log('✅ 现有密钥已加载');
      console.log(`   公钥：${keyPair.publicKey.substring(0, 16)}...`);
    }
  } catch (error) {
    console.log('ℹ️  未找到现有密钥，需要初始化');
  }
}

// 优雅关闭
process.on('SIGTERM', async () => {
  console.log('🛑 收到 SIGTERM，正在关闭...');
  
  if (pollInterval) {
    clearInterval(pollInterval);
  }
  
  if (imapConnection) {
    await imapConnection.end();
  }
  
  server.close(() => {
    console.log('👋 服务器已关闭');
    process.exit(0);
  });
});

// 启动
async function start() {
  await loadExistingKeys();
  
  server.listen(PORT, () => {
    console.log(`🚀 AI-Email 服务器运行在 http://localhost:${PORT}`);
    console.log(`📡 WebSocket 运行在 ws://localhost:${PORT}/ws`);
    console.log('');
    
    if (!keyPair) {
      console.log('⚠️  密钥未初始化！');
      console.log('   请运行：curl -X POST http://localhost:3000/api/key/init -H "Content-Type: application/json" -d \'{"password":"your-secure-password"}\'');
      console.log('');
    }
    
    // 启动邮件轮询
    const pollInterval = parseInt(process.env.POLL_INTERVAL || '60000');
    startPolling(pollInterval);
  });
}

start().catch(console.error);

export { app, server, startPolling };
