# 📡 AI-Email API 文档

## 概述

AI-Email 提供 RESTful API 和 WebSocket 接口，用于：
- 密钥管理
- 邮件加密/解密
- 邮件同步
- 实时通知

## 基础信息

| 项目 | 值 |
|------|------|
| 基础路径 | `/api` |
| WebSocket | `ws://host:3000/ws` |
| 认证 | 无（本地运行） |

## API 端点

### 健康检查

```http
GET /health
```

**响应：**
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T10:00:00.000Z",
  "emails": 5
}
```

---

### 密钥管理

#### 获取公钥

```http
GET /api/key/public
```

**响应：**
```json
{
  "publicKey": "MCowBQYDK2VuAyEA...",
  "keyId": "MCowBQYDK2VuAy..."
}
```

#### 初始化密钥

```http
POST /api/key/init
Content-Type: application/json

{
  "password": "your-32-char-password"
}
```

**响应：**
```json
{
  "success": true,
  "publicKey": "MCowBQYDK2VuAyEA...",
  "message": "密钥已生成并加密保存"
}
```

**错误响应：**
```json
{
  "error": "密码至少需要 16 个字符"
}
```

---

### 邮件管理

#### 获取邮件列表

```http
GET /api/emails?limit=20&offset=0&decrypted=false
```

**参数：**
| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| limit | number | 20 | 返回数量 |
| offset | number | 0 | 偏移量 |
| decrypted | boolean | false | 是否解密 |

**响应：**
```json
{
  "emails": [
    {
      "id": "msg_123",
      "subject": "测试邮件",
      "from": "user@example.com",
      "to": "ai@yourdomain.com",
      "date": "2026-02-11T10:00:00.000Z",
      "encrypted": true,
      "encryption": {
        "keyId": "MCowBQYDK2VuAy...",
        "ephemeralPublicKey": "MCowBQYDK...",
        "nonce": "YWJjZGVmZ...",
        "ciphertext": "aGVsbG8gd29ybGQ..."
      },
      "receivedAt": "2026-02-11T10:00:01.000Z"
    }
  ],
  "total": 5
}
```

#### 手动同步邮件

```http
POST /api/emails/sync
```

**响应：**
```json
{
  "success": true,
  "synced": 3,
  "total": 8
}
```

#### 获取单封邮件（解密）

```http
POST /api/emails/:id/process
```

**响应：**
```json
{
  "success": true,
  "email": {
    "id": "msg_123",
    "subject": "测试邮件",
    "from": "user@example.com",
    "body": "邮件内容...",
    "encrypted": false,
    "decryptedAt": "2026-02-11T10:00:02.000Z"
  }
}
```

---

### 邮件操作

#### 发送邮件

```http
POST /api/email/send
Content-Type: application/json

{
  "to": "recipient@example.com",
  "subject": "测试邮件",
  "text": "邮件正文",
  "html": "<p>HTML 格式正文</p>"
}
```

**响应：**
```json
{
  "success": true,
  "messageId": "<abc123@email>",
  "accepted": ["recipient@example.com"],
  "rejected": []
}
```

---

### 统计信息

```http
GET /api/stats
```

**响应：**
```json
{
  "total": 10,
  "encrypted": 8,
  "decrypted": 2,
  "lastSync": "2026-02-11T10:00:00.000Z"
}
```

---

## WebSocket

### 连接

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');
```

### 消息格式

#### 客户端 → 服务器

```json
{
  "type": "ping"
}
```

#### 服务器 → 客户端

**新邮件通知：**
```json
{
  "type": "new_emails",
  "count": 2,
  "emails": [
    {
      "id": "msg_123",
      "subject": "新邮件",
      "from": "user@example.com"
    }
  ]
}
```

**心跳响应：**
```json
{
  "type": "pong"
}
```

---

## 加密数据格式

### 加密邮件

```json
{
  "encrypted": true,
  "encryption": {
    "keyId": "MCowBQYDK2VuAy...",
    "ephemeralPublicKey": "MCowBQYDK2VuAy...",
    "nonce": "YWJjZGVmZ2hpamtsbW5v...",
    "ciphertext": "aGVsbG8gd29ybGQgaGVsbG8gd29ybGQ...",
    "timestamp": 1707638400000
  }
}
```

### 字段说明

| 字段 | 说明 |
|------|------|
| keyId | 使用的公钥标识（前8字节） |
| ephemeralPublicKey | 临时的公钥（X25519） |
| nonce | 随机数（12字节） |
| ciphertext | ChaCha20-Poly1305 加密的密文 |
| timestamp | 加密时间戳 |

---

## 错误处理

所有错误响应格式：

```json
{
  "error": "错误描述"
}
```

HTTP 状态码：

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器错误 |

---

## 示例代码

### JavaScript/Node.js

```javascript
// 获取公钥
const response = await fetch('http://localhost:3000/api/key/public');
const { publicKey } = await response.json();

// 发送邮件
await fetch('http://localhost:3000/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'recipient@example.com',
    subject: '测试',
    text: 'Hello!'
  })
});

// WebSocket 连接
const ws = new WebSocket('ws://localhost:3000/ws');
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'new_emails') {
    console.log(`收到 ${data.count} 封新邮件`);
  }
};
```

### cURL

```bash
# 健康检查
curl http://localhost:3000/health

# 获取公钥
curl http://localhost:3000/api/key/public

# 同步邮件
curl -X POST http://localhost:3000/api/emails/sync

# 发送邮件
curl -X POST http://localhost:3000/api/email/send \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"测试","text":"内容"}'
```
