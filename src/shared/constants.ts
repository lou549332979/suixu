import type { Connector, Idea, ModelCapabilities } from './types'

export const DEFAULT_CAPABILITIES: ModelCapabilities = {
  text: true,
  tools: false,
  vision: false,
  transcription: false,
  speech: false,
  imageGeneration: false
}

export const SEED_IDEAS: Idea[] = [
  {
    id: 'daily-brief',
    eyebrow: '今日节奏',
    title: '帮你梳理今天真正要紧的事',
    description: '结合你的目标和安排，找出需要优先推进的三件事，并直接开始第一件。',
    prompt: '查看我今天的安排和未完成目标，整理出最重要的三件事，并帮我开始第一件。',
    accent: 'blue',
    icon: 'sunrise'
  },
  {
    id: 'project-sort',
    eyebrow: '整理一下',
    title: '把散落的文件变成清晰的项目',
    description: '读取指定文件夹，归类文档、生成索引，并在改动前逐项征求你的同意。',
    prompt: '帮我整理最近项目文件。先只做分析，给我一个整理方案，不要改动原文件。',
    accent: 'teal',
    icon: 'folders'
  },
  {
    id: 'compare-buy',
    eyebrow: '比你更会找',
    title: '追踪价格，等到合适再提醒',
    description: '跨网站比较参数和价格，记录历史，并在达到目标价时通知你。',
    prompt: '帮我研究一款降噪耳机，比较价格、评价和退货政策，生成对比表，但不要下单。',
    accent: 'orange',
    icon: 'scan-search'
  },
  {
    id: 'meeting-prep',
    eyebrow: '少一点忙乱',
    title: '为下一场谈话准备好上下文',
    description: '汇总日历、邮件和已有笔记，写出议程、问题清单与跟进事项。',
    prompt: '帮我准备下一场工作会议，整理议程、关键问题和会后跟进清单。',
    accent: 'violet',
    icon: 'sparkles'
  }
]

export const DEFAULT_CONNECTORS: Connector[] = [
  {
    id: 'apple-calendar',
    name: '日历',
    description: '读取并创建 macOS 日历活动',
    status: 'available',
    capabilities: ['读取活动', '创建活动', '修改活动'],
    scopes: ['calendar.read', 'calendar.write'],
    accountLabel: null,
    icon: 'calendar',
    updatedAt: new Date(0).toISOString()
  },
  {
    id: 'apple-reminders',
    name: '提醒事项',
    description: '读取并创建系统提醒',
    status: 'available',
    capabilities: ['读取提醒', '创建提醒'],
    scopes: ['reminders.read', 'reminders.write'],
    accountLabel: null,
    icon: 'list-checks',
    updatedAt: new Date(0).toISOString()
  },
  {
    id: 'apple-mail',
    name: '邮件',
    description: '读取邮件并准备草稿',
    status: 'needs_setup',
    capabilities: ['读取邮件', '创建草稿'],
    scopes: ['mail.read', 'mail.draft'],
    accountLabel: null,
    icon: 'mail',
    updatedAt: new Date(0).toISOString()
  },
  {
    id: 'files',
    name: '文件与文件夹',
    description: '在你授权的范围内读取与整理文件',
    status: 'connected',
    capabilities: ['读取文件', '新建产物', '修改文件'],
    scopes: ['files.read', 'files.workspace_write'],
    accountLabel: '随序工作区',
    icon: 'folder',
    updatedAt: new Date(0).toISOString()
  },
  {
    id: 'agent-browser',
    name: '随序浏览器',
    description: '独立 Chrome 环境中的网页研究与表单准备',
    status: 'connected',
    capabilities: ['网页读取', '网页操作', '价格监控'],
    scopes: ['browser.read', 'browser.prepare'],
    accountLabel: '隔离 Profile',
    icon: 'globe',
    updatedAt: new Date(0).toISOString()
  },
  {
    id: 'google-workspace',
    name: 'Google',
    description: 'Gmail、Google 日历与 Drive',
    status: 'needs_setup',
    capabilities: ['邮件', '日历', '云盘'],
    scopes: ['gmail', 'calendar', 'drive'],
    accountLabel: null,
    icon: 'mail-check',
    updatedAt: new Date(0).toISOString()
  },
  {
    id: 'meta-business',
    name: 'Meta Business',
    description: 'Instagram、Facebook 页面与广告账户',
    status: 'needs_setup',
    capabilities: ['内容分析', '受众洞察', '广告账户'],
    scopes: ['instagram_basic', 'pages_read', 'ads_read'],
    accountLabel: null,
    icon: 'chart-no-axes-combined',
    updatedAt: new Date(0).toISOString()
  },
  {
    id: 'health-import',
    name: '健康数据',
    description: '导入 Apple Health 导出文件',
    status: 'available',
    capabilities: ['活动数据', '睡眠', '训练'],
    scopes: ['health.import'],
    accountLabel: null,
    icon: 'heart-pulse',
    updatedAt: new Date(0).toISOString()
  },
  {
    id: 'finance-import',
    name: '账单分析',
    description: '从 CSV 或 PDF 账单识别消费与订阅',
    status: 'available',
    capabilities: ['消费分析', '订阅识别', '预算'],
    scopes: ['finance.import'],
    accountLabel: null,
    icon: 'wallet-cards',
    updatedAt: new Date(0).toISOString()
  }
]
