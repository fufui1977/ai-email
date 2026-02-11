/**
 * AI-Email 邮件处理模块
 * 
 * 功能：
 * - IMAP 接收邮件
 * - SMTP 发送邮件
 * - 邮件解析和格式化
 */

import imapSimple from 'imap-simple';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * 邮件接收配置
 */
export const imapConfig = {
  imap: {
    user: process.env.IMAP_USER,
    password: process.env.IMAP_PASSWORD,
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: 993,
    tls: true,
    authTimeout: 3000,
    tlsOptions: { rejectUnauthorized: false }
  }
};

/**
 * 邮件发送配置
 */
export const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
};

/**
 * 连接 IMAP 服务器
 */
export async function connectImap(config = imapConfig) {
  const connection = await imapSimple.connect(config);
  await connection.openBox('INBOX');
  return connection;
}

/**
 * 获取未读邮件
 */
export async function getUnreadEmails(connection, limit = 10) {
  const searchCriteria = ['UNSEEN'];
  const fetchOptions = {
    bodies: ['HEADER', 'TEXT', ''],
    markSeen: false
  };
  
  const messages = await connection.search(searchCriteria, fetchOptions);
  
  // 限制数量
  const recentMessages = messages.slice(-limit);
  
  // 解析邮件
  const emails = await Promise.all(
    recentMessages.map(async (message) => {
      const header = message.parts.find(part => part.which === 'HEADER');
      const body = message.parts.find(part => part.which === '');
      
      let parsedBody = {};
      if (body) {
        try {
          const parsed = await simpleParser(body.body);
          parsedBody = {
            html: parsed.html,
            text: parsed.text,
            attachments: parsed.attachments.map(a => ({
              filename: a.filename,
              contentType: a.contentType,
              size: a.size
            }))
          };
        } catch (e) {
          console.error('邮件解析失败:', e.message);
        }
      }
      
      return {
        id: message.attributes.uid,
        messageId: message.attributes.uid,
        subject: header?.body?.subject?.[0] || '(无主题)',
        from: header?.body?.from?.[0] || '(未知)',
        to: header?.body?.to?.[0] || '(未知)',
        date: header?.body?.date?.[0] || new Date().toISOString(),
        cc: header?.body?.cc || [],
        replyTo: header?.body?.['reply-to'] || [],
        body: parsedBody.text || '',
        html: parsedBody.html || '',
        attachments: parsedBody.attachments || [],
        raw: message
      };
    })
  );
  
  return emails;
}

/**
 * 发送邮件
 */
export async function sendEmail(to, subject, text, html = null, config = smtpConfig) {
  const transporter = nodemailer.createTransport(config);
  
  const mailOptions = {
    from: `"AI Email" <${config.auth.user}>`,
    to,
    subject,
    text
  };
  
  if (html) {
    mailOptions.html = html;
  }
  
  const result = await transporter.sendMail(mailOptions);
  
  return {
    messageId: result.messageId,
    accepted: result.accepted,
    rejected: result.rejected
  };
}

/**
 * 发送回复邮件
 */
export async function sendReply(originalEmail, replyText, config = smtpConfig) {
  // 提取原始发件人
  const fromMatch = originalEmail.from.match(/<(.+)>/);
  const to = fromMatch ? fromMatch[1] : originalEmail.from;
  
  // 添加引用主题
  const subject = originalEmail.subject.startsWith('Re:') 
    ? originalEmail.subject 
    : `Re: ${originalEmail.subject}`;
  
  return sendEmail(to, subject, replyText, null, config);
}

/**
 * 邮件模板
 */
export const templates = {
  /**
   * 通知邮件已收到
   */
  acknowledgment: (email) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1976d2;">📧 邮件已收到</h2>
      <p>您的邮件已安全加密存储，我会尽快处理。</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>主题：</strong> ${email.subject}</p>
        <p><strong>发件人：</strong> ${email.from}</p>
        <p><strong>时间：</strong> ${new Date(email.date).toLocaleString('zh-CN')}</p>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        此邮件由 AI-Email 自动发送，使用端到端加密保护。
      </p>
    </div>
  `,
  
  /**
   * AI 处理完成通知
   */
  processed: (email, result) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4caf50;">✅ 邮件已处理</h2>
      <p>您的邮件已完成处理，结果如下：</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p><strong>原邮件：</strong> ${email.subject}</p>
        <p><strong>处理结果：</strong> ${result}</p>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        如有疑问，请直接回复此邮件。
      </p>
    </div>
  `
};

/**
 * 获取邮件统计
 */
export async function getEmailStats(connection) {
  const inbox = await connection.openBox('INBOX');
  
  return {
    total: inbox.messages.total,
    unread: inbox.messages.newRecent,
    lastSync: new Date().toISOString()
  };
}

export default {
  imapConfig,
  smtpConfig,
  connectImap,
  getUnreadEmails,
  sendEmail,
  sendReply,
  templates,
  getEmailStats
};
