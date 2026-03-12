// Pure types and constants - no server dependencies

export interface Member {
  id: number;
  walletAddress: string;
  referrerAddress: string | null;
  level: number;
  lifetimeLock: boolean;
  createdAt: string;
}

export interface Order {
  id: number;
  walletAddress: string;
  productId: number;
  productName: string;
  amount: string;
  dailyRate: string;
  days: number;
  startDate: string;
  endDate: string;
  status: string;
  totalEarned: string;
  lastEarningDate: string | null;
  txHash: string | null;
}

export interface Reward {
  id: number;
  walletAddress: string;
  type: string;
  amount: string;
  fromAddress: string | null;
  fromOrderId: number | null;
  description: string | null;
  createdAt: string;
}

export interface Withdrawal {
  id: number;
  walletAddress: string;
  amount: string;
  fee: string;
  actualAmount: string;
  status: string;
  createdAt: string;
}

export interface Message {
  id: number;
  title: string;
  content: string;
  type: string;
  targetAddress: string | null;
  isPublished: boolean;
  createdAt: string;
}

export const PRODUCTS = [
  { id: 1, name: "芯未来", nameEn: "CoreX Future", days: 30, dailyRate: 0.3, minAmount: 200, description: "入门级稳健理财" },
  { id: 2, name: "芯未来1号", nameEn: "CoreX Future I", days: 120, dailyRate: 0.41, minAmount: 500, description: "进阶稳健增值" },
  { id: 3, name: "芯未来2号", nameEn: "CoreX Future II", days: 180, dailyRate: 0.5, minAmount: 1000, description: "中期复利增长" },
  { id: 4, name: "芯未来3号", nameEn: "CoreX Future III", days: 240, dailyRate: 0.65, minAmount: 2000, description: "高收益专业级" },
  { id: 5, name: "芯未来4号", nameEn: "CoreX Future IV", days: 360, dailyRate: 0.72, minAmount: 3000, description: "顶级年化收益" },
];

export const LEVEL_CONFIG = [
  { level: 0, name: "普通", people: 0, amount: 0, bonus: 0, subLevel: 0, subCount: 0, lifetimeLock: false },
  { level: 1, name: "V1", people: 2, amount: 1000, bonus: 8, subLevel: 0, subCount: 0, lifetimeLock: false },
  { level: 2, name: "V2", people: 6, amount: 20000, bonus: 13, subLevel: 1, subCount: 2, lifetimeLock: false },
  { level: 3, name: "V3", people: 20, amount: 60000, bonus: 18, subLevel: 2, subCount: 2, lifetimeLock: false },
  { level: 4, name: "V4", people: 80, amount: 200000, bonus: 22, subLevel: 3, subCount: 2, lifetimeLock: false },
  { level: 5, name: "V5", people: 200, amount: 800000, bonus: 26, subLevel: 4, subCount: 2, lifetimeLock: false },
  { level: 6, name: "V6", people: 500, amount: 3000000, bonus: 30, subLevel: 5, subCount: 2, lifetimeLock: false },
  { level: 7, name: "V7", people: 1000, amount: 10000000, bonus: 33, subLevel: 6, subCount: 2, lifetimeLock: false },
];


export const WITHDRAW_MIN = 30;
export const WITHDRAW_FEE = 1;
export const WITHDRAW_MULTIPLE = 10;
