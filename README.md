# 🧠 AI-Email

> 一个专为 AI 设计的加密邮箱系统 - 让 AI 自主处理邮件，人类只需转发

![AI-Email](https://img.shields.io/badge/AI-Email-blue?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge)

## 🎯 核心特性

### 🔐 端到端加密
- **混合加密架构**：X25519（密钥交换）+ ChaCha20-Poly1305（内容加密）
- **AI 生成密钥对**：公钥公开，私钥仅 AI 持有
- **零知识存储**：服务器永远看不到明文内容

### 🤖 AI 原生设计
- 自动解密、阅读、回复邮件
- 执行邮件中的指令
- 智能摘要和分类
- 通过即时通讯软件通知

### ⚡ 极简配置
- **人类只需 1 步**：复制公钥到邮箱转发设置
- **AI 自动工作**：解密、阅读、执行、通知
- **完全自主**：AI 可以独立处理，无需人类干预

## 🚀 快速开始

### 1分钟配置

```bash
# 克隆并安装
git clone https://github.com/yourusername/ai-email.git
cd ai-email
npm install

# 生成密钥对
npm run keygen

# 复制公钥到邮箱转发设置
# 格式：your-public-key-base64
```

### 配置邮箱转发

在你的常用邮箱中设置：
- **转发到**：`ai@your-domain.com`
- **公钥**：粘贴生成的公钥
- **完成！**

## 📖 设计理念

### 问题

传统邮箱系统设计给人类阅读，不适合 AI：
- 需要人类授权每次操作
- OAuth 流程复杂
- 实时推送需要复杂基础设施
- 权限控制粒度太粗

### 解决方案

**AI-Email 采用"加密转发"模式：**
```
人类邮箱 → (转发) → AI邮箱(加密存储) → AI解密 → 处理 → 通知
```

**优势：**
- ✅ 无需复杂 OAuth 授权
- ✅ 只需一次公钥配置
- ✅ 服务器零知识，更安全
- ✅ AI 完全自主工作

## 🏗️ 系统架构

```
┌─────────────────┐    转发    ┌──────────────────┐
│  人类常用邮箱    │ ──────────→ │  AI-Email 服务器  │
│ (Gmail/Outlook) │            │  (加密存储邮件)   │
└─────────────────┘            └──────────────────┘
                                          │
                                          ↓
                                   ┌──────────────────┐
                                   │  AI 助手 (你)     │
                                   │  - 解密邮件       │
                                   │  - 理解内容       │
                                   │  - 执行指令       │
                                   │  - 通知人类       │
                                   └──────────────────┘
                                          ↑
                                          ↓
                                   ┌──────────────────┐
                                   │  即时通讯通知      │
                                   │ (微信/Telegram)   │
                                   └──────────────────┘
```

## 🔐 安全模型

### 加密流程

```
1. 邮件到达
2. 使用 AI 公钥加密
3. 存储加密内容
4. AI 下载邮件
5. 使用私钥解密
6. 处理邮件内容
```

### 密钥安全

- **私钥生成**：本地生成，永不上传
- **私钥存储**：本地加密存储
- **公钥分发**：可公开分享
- **加密标准**：现代加密算法

## 📁 项目结构

```
ai-email/
├── src/
│   ├── keygen.js          # 密钥生成
│   ├── encrypt.js         # 加密模块
│   ├── decrypt.js         # 解密模块
│   ├── email.js           # 邮件处理
│   ├── server.js          # API 服务器
│   └── notify.js          # 通知模块
├── examples/
│   └── basic.js           # 使用示例
├── docs/
│   ├── DESIGN.md          # 详细设计
│   └── API.md             # API 文档
├── tests/
│   └── crypto.test.js     # 加密测试
├── package.json
├── README.md
└── LICENSE
```

## 🛠️ 技术栈

- **Node.js 18+** - 运行时
- **noble-cryptography** - 现代加密库
- **imap-simple** - 邮件接收
- **nodemailer** - 邮件发送
- **OpenClaw SDK** - AI 集成

## 📚 文档

- [设计文档](docs/DESIGN.md) - 详细系统设计
- [API 文档](docs/API.md) - 接口说明
- [示例代码](examples/) - 使用示例

## 🚀 部署

### 本地开发

```bash
npm install
npm run dev
```

### Docker 部署

```bash
docker build -t ai-email .
docker run -p 3000:3000 ai-email
```

### 云函数

支持部署到：
- Vercel Functions
- AWS Lambda
- Cloudflare Workers

## 🤝 贡献

欢迎贡献代码！请阅读 [贡献指南](CONTRIBUTING.md)。

## 📝 许可证

MIT License - 见 [LICENSE](LICENSE)

## 🙏 致谢

- [noble-cryptography](https://github.com/paulmillr/noble-cryptography) - 现代加密库
- [OpenClaw](https://openclaw.ai/) - AI 助手框架

---

**🎉 让 AI 真正自主工作，从邮件开始！**
