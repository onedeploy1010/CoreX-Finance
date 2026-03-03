import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const members = pgTable("members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  walletAddress: text("wallet_address").notNull().unique(),
  referrerAddress: text("referrer_address"),
  level: integer("level").notNull().default(0),
  lifetimeLock: boolean("lifetime_lock").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  walletAddress: text("wallet_address").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  dailyRate: decimal("daily_rate", { precision: 10, scale: 4 }).notNull(),
  days: integer("days").notNull(),
  startDate: timestamp("start_date").notNull().defaultNow(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("active"),
  totalEarned: decimal("total_earned", { precision: 18, scale: 6 }).notNull().default("0"),
  lastEarningDate: timestamp("last_earning_date"),
  txHash: text("tx_hash"),
});

export const rewards = pgTable("rewards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  walletAddress: text("wallet_address").notNull(),
  type: text("type").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  fromAddress: text("from_address"),
  fromOrderId: integer("from_order_id"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  walletAddress: text("wallet_address").notNull(),
  amount: decimal("amount", { precision: 18, scale: 6 }).notNull(),
  fee: decimal("fee", { precision: 18, scale: 6 }).notNull().default("1"),
  actualAmount: decimal("actual_amount", { precision: 18, scale: 6 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMemberSchema = createInsertSchema(members).pick({
  walletAddress: true,
  referrerAddress: true,
});

export const insertOrderSchema = createInsertSchema(orders).pick({
  walletAddress: true,
  productId: true,
  productName: true,
  amount: true,
  dailyRate: true,
  days: true,
  endDate: true,
  txHash: true,
});

export type Member = typeof members.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Reward = typeof rewards.$inferSelect;
export type Withdrawal = typeof withdrawals.$inferSelect;

export const PRODUCTS = [
  { id: 1, name: "芯未来", nameEn: "CX Peak 01", days: 30, dailyRate: 0.3, minAmount: 200, description: "入门级稳健理财" },
  { id: 2, name: "芯未来1号", nameEn: "CX Flash 01", days: 120, dailyRate: 0.41, minAmount: 500, description: "进阶稳健增值" },
  { id: 3, name: "芯未来2号", nameEn: "CX Career 01", days: 180, dailyRate: 0.5, minAmount: 1000, description: "中期复利增长" },
  { id: 4, name: "芯未来3号", nameEn: "CX Pro 01", days: 240, dailyRate: 0.63, minAmount: 2000, description: "高收益专业级" },
  { id: 5, name: "芯未来4号", nameEn: "CX Elite 01", days: 360, dailyRate: 0.72, minAmount: 3000, description: "顶级年化收益" },
];

export const LEVEL_CONFIG = [
  { level: 0, name: "普通", people: 0, amount: 0, bonus: 0, subLevel: 0, subCount: 0, lifetimeLock: false },
  { level: 1, name: "V1", people: 2, amount: 1000, bonus: 8, subLevel: 0, subCount: 0, lifetimeLock: false },
  { level: 2, name: "V2", people: 6, amount: 20000, bonus: 13, subLevel: 1, subCount: 2, lifetimeLock: false },
  { level: 3, name: "V3", people: 20, amount: 60000, bonus: 18, subLevel: 2, subCount: 2, lifetimeLock: false },
  { level: 4, name: "V4", people: 80, amount: 200000, bonus: 22, subLevel: 3, subCount: 2, lifetimeLock: false },
  { level: 5, name: "V5", people: 200, amount: 800000, bonus: 26, subLevel: 4, subCount: 2, lifetimeLock: false },
  { level: 6, name: "V6", people: 500, amount: 3000000, bonus: 30, subLevel: 5, subCount: 2, lifetimeLock: true },
  { level: 7, name: "V7", people: 1000, amount: 10000000, bonus: 33, subLevel: 6, subCount: 2, lifetimeLock: true },
];

export const EQUAL_LEVEL_BONUS = 10;

export const WITHDRAW_MIN = 50;
export const WITHDRAW_FEE = 1;
