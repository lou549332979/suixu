# 随序

<img src="build/icon.png" width="112" alt="随序应用图标" />

随序是一款本地优先的 macOS 个人 AI Agent。它把对话、长期目标、定时任务、审批、活动记录和资料库放在同一个桌面工作区中，并通过可审计工具执行真实操作。

它不是单纯的聊天壳：当你要求安排日程、整理资料、搜索网页或准备邮件时，Agent 会选择合适的工具、展示即将执行的操作，并在涉及外部写入时等待批准。

> 当前版本为 `v0.1.0`，面向 Apple Silicon Mac。Google Workspace、Meta Business 和最终付款代办尚未完成真实凭据联调，界面会明确标记为“需要配置”。

## 当前能力

- 中文优先的桌面界面：首页、灵感、目标与任务、资料库、连接、活动记录和设置。
- OpenAI 兼容模型接入：Base URL、模型名称、API Key、流式回复和工具调用。
- 本地数据：SQLite 数据库使用 AES-256-GCM 加密后落盘，数据库密钥与 API Key 由 macOS Keychain/safeStorage 保护。
- Agent 审批闸门：邮件草稿、日历活动、提醒、长期记忆和定时任务进入一次性审批队列。
- macOS 工具：Apple Mail、日历、提醒和联系人；执行时由系统弹出权限请求。
- 研究工具：公开 HTTPS 页面读取、DuckDuckGo 搜索和随序独立 Chrome Profile 截图。
- 文档产物：Markdown、HTML、CSV、TXT、XLSX、DOCX 和 PDF。
- 语音：麦克风录制、语音转写和模型语音朗读。
- 后台运行：关闭主窗口后驻留菜单栏；退出随序会停止后台任务。
- 本地数据工具：CSV 账单分析、Apple Health 导出分析和文件工作区。

演示模式不会调用外部模型或执行工具。要开始真实任务，请在“设置 → 模型”中填写模型配置并关闭演示模式。

## 系统要求

- macOS 14 或更高版本
- Apple Silicon（M 系列）Mac
- 使用真实 Agent 能力时，需要一个支持 OpenAI Chat Completions 和 Function Calling 的模型 API

## 安装

1. 从仓库的 **Releases** 页面下载最新的 `Suixu-*-arm64.dmg`。
2. 打开 DMG，将“随序”拖入 Applications。
3. 从 Applications 打开随序。

本地构建使用 ad-hoc 签名。如果 macOS 首次阻止打开，请在 Finder 中按住 Control 点击“随序”，选择“打开”；不要把系统级“任何来源”设置作为长期方案。

## 首次使用

1. 打开随序，输入你的称呼和 Agent 名称。
2. 填写模型 Base URL、模型名称和 API Key，例如 OpenAI 兼容的 `/v1` 接口。
3. 测试模型连接，然后关闭演示模式。
4. 在“连接”中按需授权文件夹、日历、提醒或邮件。
5. 回到首页，用一句自然语言描述目标。

可以尝试：

```text
查看我未来七天的日程，找出一段 45 分钟的空闲时间，创建专注工作安排，并在开始前提醒我。
```

```text
查看随序工作区里的文件，生成项目索引和一份 Markdown 总结，不要改动原文件。
```

```text
帮我研究三款通勤降噪耳机，比较价格、续航和退货政策，生成对比表；停在购买前，不要下单。
```

## 使用方式

### 对话与任务

首页输入框可以发送普通问题，也可以交给随序一个完整目标。长任务会显示当前阶段，随时可以通过停止按钮取消。

### 审批

右侧审批面板会在日历写入、提醒创建、邮件草稿、长期记忆和定时任务等动作前出现。审批请求包含：

- 要执行的具体动作
- 目标资源与关键参数
- 正文或变更预览
- 风险级别与 30 分钟有效期

审批使用一次性 nonce；请求内容或工具风险变化后必须重新确认。

### 目标、灵感与定时任务

- “灵感”给出可一键执行或个人目标化的建议。
- “目标与任务”管理长期目标以及后台定时任务。
- 定时任务在主窗口关闭后继续驻留菜单栏；退出随序会停止所有后台任务。

### 资料库

资料库汇总聊天附件和 Agent 生成的文档。支持 Markdown、HTML、CSV、TXT、XLSX、DOCX 和 PDF。文件默认位于随序本地工作区，可从资料库或设置页打开。

### 语音

点击输入框旁的麦克风进行录音和转写。模型支持 `/audio/speech` 时，可以从助手回复下方选择“朗读”。

### 本地 macOS 工具

首次执行邮件、日历、提醒或联系人操作时，macOS 会请求系统权限。拒绝权限不会影响聊天和非系统工具。

## 开发

安装依赖：

```bash
pnpm install
```

启动开发环境：

```bash
pnpm dev
```

验证：

```bash
pnpm typecheck
pnpm test
pnpm build
```

只构建应用目录：

```bash
pnpm exec electron-builder --mac dir --arm64
```

生成 Apple Silicon 安装包：

```bash
pnpm dist:mac
```

构建结果位于 `release/`。

## 技术结构

- Electron 负责 macOS 壳、系统权限、托盘和 IPC 边界。
- React + TypeScript 构建桌面界面。
- SQL.js 提供本地 SQLite 引擎，保存前使用 AES-256-GCM 加密整个数据库文件。
- macOS Keychain/safeStorage 保存数据库密钥和模型 API Key。
- Agent 主循环支持流式文本、OpenAI 工具调用、审批暂停和工具结果回填。
- Playwright Core 使用系统 Chrome 的独立 Profile 执行网页查看，不读取用户主浏览器的 Cookie。

## 安全边界

- 渲染进程启用 `sandbox`、`contextIsolation`，禁用 Node.js 集成。
- Agent 工具只在主进程中可用，渲染进程只能调用白名单 IPC。
- Agent 只能读取应用工作区内的文件；其他文件夹需要用户在系统对话框中选择。
- 网页读取拒绝本地、私网和 `file:` 地址，跳转目标会重新校验。
- 外部写入、删除、账户权限和高风险动作必须通过一次性 nonce 审批。
- API Key 不写入聊天、活动日志或渲染进程状态。
- 网页内容被视为不可信数据，不能自行扩大权限或创建审批。

## 连接器说明

Apple 本地连接器和随序浏览器可直接使用。Google Workspace、Meta Business 和银行级财务连接需要各平台的开发者 OAuth 应用；未配置时界面会明确标记为“需要配置”，不会伪造连接状态。当前版本不保存银行卡，也不自动完成最终付款。

模型服务会收到完成当前请求所需的提示词、附件描述和相关上下文。本地加密保证存储和业务数据不进入随序自己的云端，但不等于离线推理。

## 已知限制

- Google Workspace 和 Meta Business 目前只提供连接器状态与扩展位，真实 OAuth 流程需要开发者应用凭据。
- Apple 本地应用的真实读写需要用户在 macOS 中授权，未在自动测试中修改真实个人数据。
- 购物和旅行页面目前以公开网页研究、比较和资料生成为主，不自动提交最终交易。
- `v0.1.0` 只生成本地 Apple Silicon DMG，未提供移动端或多设备同步。

## 参与开发

提交问题或改进前，请先运行：

```bash
pnpm typecheck
pnpm test
pnpm build
```

请勿在 Issue、测试数据或截图中提交真实 API Key、Cookie、邮件地址或其他个人敏感信息。
