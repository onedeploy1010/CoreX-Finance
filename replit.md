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

## 核心功能

### 1. 首页 - 质押产品展示
6款理财质押产品：
- 芯未来 (CX Peak 01): 30天, 0.3%/日, 最低200 USDT
- 芯未来1号 (CX Flash 01): 120天, 0.41%/日, 最低500 USDT
- 芯未来2号 (CX Career 01): 180天, 0.5%/日, 最低1000 USDT
- 芯未来3号 (CX Pro 01): 240天, 0.63%/日, 最低2000 USDT
- 芯未来4号 (CX Elite 01): 360天, 0.72%/日, 最低3000 USDT

每个产品支持点击投资弹窗，输入金额后显示预估收益。

### 2. 订单页面
- 累计收益 / 可提现收益统计卡
- 我的订单列表（含状态、本金、收益、剩余天数）
- 奖励明细（直推/间推/团队奖励）
- 提现记录 / 立即提现功能

### 3. 邀请页面
- 推荐链接复制
- 直推/间推人数统计
- 直推奖励: 被推荐人每日利息 × 10%
- 间推奖励: 被推荐人每日利息 × 5%
- 直推会员列表（地址、等级）
- 7级会员等级体系（V1-V7）

### 4. 我的页面
- 钱包连接状态
- 账户统计（直推人数、累计收益、活跃订单）
- 设置菜单

## 会员等级体系

| 等级 | 有效账户 | 团队业绩 | 团队奖励 | 下级要求 |
|------|---------|---------|---------|---------|
| V1   | 1个     | 500 U   | 0.5%    | -        |
| V2   | 3个     | 2,000 U | 1%      | 1个V1   |
| V3   | 10个    | 10,000 U| 1.5%    | 2个V2   |
| V4   | 30个    | 50,000 U| 2%      | 2个V3   |
| V5   | 80个    | 150,000 U| 2.5%   | 2个V4   |
| V6   | 200个   | 500,000 U| 3%     | 2个V5   |
| V7   | 500个   | 2,000,000 U| 5%   | 2个V6   |

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
    ├── Home.tsx              - 首页（产品列表）
    ├── Orders.tsx            - 订单页面
    ├── Invite.tsx            - 邀请页面
    └── Profile.tsx           - 个人中心
```

## 主题设计

- 背景: 极深黑色 (#0c0a08)
- 卡片: 深棕黑 (#1a1510 ~ #110e0a)
- 主色: 金色 (#C9A227 ~ #E8C547)
- 文字: 暖白 (#f5e6b8)
- 底部导航: 深色 + 金色边框

## 已安装依赖

- thirdweb: Web3 SDK，支持BSC链和多种钱包
- framer-motion: 动画效果
- lucide-react: 图标库
- react-icons: 品牌图标

## 运行命令

```bash
npm run dev
```
