# CoreX - BSC链USDT理财质押DApp

## 项目概述

CoreX是基于BSC（Binance Smart Chain）链的USDT理财质押去中心化应用（DApp），使用thirdweb作为Web3提供商，支持TokenPocket、MetaMask等主流钱包连接。

## 技术架构

- **前端框架**: React + TypeScript + Vite
- **样式**: Tailwind CSS + shadcn/ui
- **Web3集成**: thirdweb (ThirdwebProvider + ConnectButton)
- **链**: BSC（BNB Smart Chain）
- **路由**: wouter
- **状态管理**: TanStack Query
- **后端**: Express.js
- **数据库**: PostgreSQL (Drizzle ORM + @neondatabase/serverless)

## 核心功能

### 1. 首页 - 质押产品展示
5款理财质押产品：
- 芯未来 (CX Peak 01): 30天, 0.3%/日, 最低200 USDT
- 芯未来1号 (CX Flash 01): 120天, 0.41%/日, 最低500 USDT
- 芯未来2号 (CX Career 01): 180天, 0.5%/日, 最低1000 USDT
- 芯未来3号 (CX Pro 01): 240天, 0.63%/日, 最低2000 USDT
- 芯未来4号 (CX Elite 01): 360天, 0.72%/日, 最低3000 USDT

每个产品支持点击投资弹窗，输入金额后显示预估收益。投资通过POST /api/orders创建订单。

### 2. 订单页面
- 累计收益 / 总奖励收入统计卡
- 直推/间推/团队奖励分项统计
- 我的订单列表（含状态、本金、收益、剩余天数）
- 奖励明细tab（按类型显示所有奖励记录）
- 提现记录 / 立即提现功能

### 3. 邀请页面 (2 tabs)
**推荐 tab:**
- 推荐链接复制
- 直推/间推人数统计 + 当前等级
- 团队有效账户数 + 团队质押业绩
- 奖励规则说明（直推10%，间推5%，平级奖10%）
- 直推会员列表 + 间推会员列表
- 7级等级说明卡片

**直推会员 tab:**
- 面包屑导航 + 层级钻入
- 逐层查看下线团队（每人显示质押额、团队业绩、有效账户）
- 返回按钮 + 面包屑点击跳转

### 4. 我的页面
- 钱包连接状态
- 账户统计（直推人数、累计收益、活跃订单）
- 当前等级显示
- 设置菜单

## 会员等级体系

| 等级 | 有效账户 | 团队业绩 | 团队奖励 | 下级要求 | 保级 |
|------|---------|---------|---------|---------|------|
| V1   | 2人     | 1,000 U   | 8%    | -        | 否 |
| V2   | 6人     | 20,000 U | 13%    | 2个V1   | 否 |
| V3   | 20人    | 60,000 U| 18%    | 2个V2   | 否 |
| V4   | 80人    | 200,000 U| 22%   | 2个V3   | 否 |
| V5   | 200人   | 800,000 U| 26%   | 2个V4   | 否 |
| V6   | 500人   | 3,000,000 U| 30% | 2个V5   | 终身 |
| V7   | 1000人  | 10,000,000 U| 33%| 2个V6   | 终身 |

平级奖: V1-V7 拿团队收益 10%

## 推荐奖励
- 直推奖励: 被推荐人每日利息 × 10%
- 间推奖励: 被推荐人每日利息 × 5%
- 团队奖励: V1-V7 拿伞下收益对应百分比

## 提现规则
- 不可提前赎回本金，到期自动返还
- 日利润和奖励可随时提现
- 最低提现金额: 50 USDT
- 手续费: 每笔 1 USDT
- 实际到账 = 提现金额 - 1 USDT

## 数据库表

- **members**: walletAddress(unique), referrerAddress, level, lifetimeLock, createdAt
- **orders**: walletAddress, productId, productName, amount, dailyRate, days, startDate, endDate, status, totalEarned, lastEarningDate, txHash
- **rewards**: walletAddress, type(daily/direct_referral/indirect_referral/team_bonus), amount, fromAddress, fromOrderId, description, createdAt
- **withdrawals**: walletAddress, amount, fee(default 1), actualAmount, status(pending/completed/rejected), createdAt

## API端点

- POST /api/members/register - 注册/获取会员（自动绑定推荐人）
- GET /api/members/:address - 获取会员信息
- GET /api/members/:address/direct - 直推会员列表
- GET /api/members/:address/indirect - 间推会员列表
- GET /api/members/:address/team-stats - 团队统计
- GET /api/members/:address/children - 钻入查看下线
- POST /api/orders - 创建质押订单
- GET /api/orders/:address - 获取订单列表
- GET /api/rewards/:address - 获取奖励记录
- GET /api/earnings/:address - 获取收益汇总
- POST /api/withdrawals - 提现申请（最低50U，手续费1U）
- GET /api/withdrawals/:address - 提现记录
- POST /api/process-daily - 每日结算（需定时调用）
- GET /api/products - 产品列表
- GET /api/levels - 等级配置

## 文件结构

```
client/src/
├── App.tsx                    - 主应用，ThirdwebProvider包装
├── index.css                  - 暗金主题样式
├── lib/
│   ├── thirdweb.ts           - thirdweb客户端配置，BSC链，钱包列表
│   └── queryClient.ts        - TanStack Query配置
├── components/
│   └── Layout.tsx            - 应用布局（Header + BottomNav）
└── pages/
    ├── Home.tsx              - 首页（产品列表 + 投资弹窗）
    ├── Orders.tsx            - 订单页面（订单 + 奖励明细）
    ├── Invite.tsx            - 邀请页面（推荐 + 直推会员钻入）
    └── Profile.tsx           - 个人中心

shared/
└── schema.ts                 - 数据模型 + PRODUCTS + LEVEL_CONFIG

server/
├── db.ts                     - 数据库连接（neon serverless）
├── storage.ts                - IStorage接口 + DatabaseStorage实现
├── routes.ts                 - API路由
└── index.ts                  - Express服务器启动
```

## 主题设计

- 背景: 极深黑色 (#0c0a08)
- 卡片: 深棕黑 (#1a1510 ~ #110e0a)
- 主色: 金色 (#C9A227 ~ #E8C547)
- 文字: 暖白 (#f5e6b8)
- 底部导航: 深色 + 金色边框

## thirdweb配置
- clientId: 55c901cbfcccbc3592ae2157f8c7c3b5
- TokenPocket wallet ID: pro.tokenpocket
- 支持钱包: MetaMask, TokenPocket, WalletConnect, Trust Wallet, Rabby, OKX

## 已安装依赖

- thirdweb: Web3 SDK，支持BSC链和多种钱包
- @neondatabase/serverless: PostgreSQL连接
- ws: WebSocket支持
- drizzle-orm + drizzle-zod: ORM + 验证
- framer-motion: 动画效果
- lucide-react: 图标库
- react-icons: 品牌图标

## 运行命令

```bash
npm run dev
```
