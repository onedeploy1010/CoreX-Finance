import { db } from "./db";
import { members, orders, rewards, withdrawals, LEVEL_CONFIG, EQUAL_LEVEL_BONUS, type Member, type InsertMember, type Order, type InsertOrder, type Reward, type Withdrawal } from "@shared/schema";
import { eq, desc, and, sql, lte } from "drizzle-orm";

export interface IStorage {
  getMember(walletAddress: string): Promise<Member | undefined>;
  createMember(data: InsertMember): Promise<Member>;
  getAllMembers(): Promise<Member[]>;
  getDirectReferrals(walletAddress: string): Promise<Member[]>;
  getIndirectReferrals(walletAddress: string): Promise<Member[]>;
  getTeamTree(walletAddress: string): Promise<any[]>;
  getTeamStats(walletAddress: string): Promise<{ totalAccounts: number; totalStaking: string; directCount: number; indirectCount: number }>;
  updateMemberLevel(walletAddress: string, level: number, lifetimeLock: boolean): Promise<void>;

  createOrder(data: InsertOrder): Promise<Order>;
  getOrderByTxHash(txHash: string): Promise<Order | undefined>;
  getOrdersByWallet(walletAddress: string): Promise<Order[]>;
  getActiveOrders(): Promise<Order[]>;
  updateOrderEarnings(orderId: number, earned: string, lastDate: Date): Promise<void>;
  completeOrder(orderId: number): Promise<void>;

  createReward(walletAddress: string, type: string, amount: string, fromAddress?: string, fromOrderId?: number, description?: string): Promise<Reward>;
  getRewardsByWallet(walletAddress: string): Promise<Reward[]>;
  getTotalEarnings(walletAddress: string): Promise<string>;
  getTotalRewards(walletAddress: string, type?: string): Promise<string>;

  getSubLevelCount(walletAddress: string, level: number): Promise<number>;
  getTeamStakingAmount(walletAddress: string): Promise<number>;
  getTeamAccountCount(walletAddress: string): Promise<number>;
  getMemberStaking(walletAddress: string): Promise<number>;
  checkAndUpgradeLevel(walletAddress: string): Promise<void>;

  getAvailableBalance(walletAddress: string): Promise<number>;
  createWithdrawal(walletAddress: string, amount: number, fee: number): Promise<Withdrawal>;
  getWithdrawalsByWallet(walletAddress: string): Promise<Withdrawal[]>;
  getTotalWithdrawn(walletAddress: string): Promise<string>;

  processDaily(): Promise<void>;
  processWalletOrders(walletAddress: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getMember(walletAddress: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.walletAddress, walletAddress.toLowerCase()));
    return member;
  }

  async createMember(data: InsertMember): Promise<Member> {
    const [member] = await db.insert(members).values({
      walletAddress: data.walletAddress.toLowerCase(),
      referrerAddress: data.referrerAddress?.toLowerCase() || null,
    }).returning();
    return member;
  }

  async getAllMembers(): Promise<Member[]> {
    return db.select().from(members);
  }

  async getDirectReferrals(walletAddress: string): Promise<Member[]> {
    return db.select().from(members).where(eq(members.referrerAddress, walletAddress.toLowerCase())).orderBy(desc(members.createdAt));
  }

  async getIndirectReferrals(walletAddress: string): Promise<Member[]> {
    const directs = await this.getDirectReferrals(walletAddress);
    const indirects: Member[] = [];
    for (const d of directs) {
      const subs = await db.select().from(members).where(eq(members.referrerAddress, d.walletAddress));
      indirects.push(...subs);
    }
    return indirects;
  }

  async getTeamTree(walletAddress: string): Promise<any[]> {
    const directs = await this.getDirectReferrals(walletAddress);
    const result = [];
    for (const d of directs) {
      const stakingAmt = await this.getMemberStaking(d.walletAddress);
      const teamStats = await this.getTeamStats(d.walletAddress);
      const children = await this.getDirectReferrals(d.walletAddress);
      result.push({
        ...d,
        stakingAmount: stakingAmt,
        directCount: teamStats.directCount,
        teamPerformance: parseFloat(teamStats.totalStaking),
        teamAccounts: teamStats.totalAccounts,
        hasChildren: children.length > 0,
        childrenCount: children.length,
      });
    }
    return result;
  }

  async getMemberStaking(walletAddress: string): Promise<number> {
    const activeOrders = await db.select().from(orders)
      .where(and(eq(orders.walletAddress, walletAddress.toLowerCase()), eq(orders.status, "active")));
    return activeOrders.reduce((sum, o) => sum + parseFloat(o.amount), 0);
  }

  async getTeamStats(walletAddress: string): Promise<{ totalAccounts: number; totalStaking: string; directCount: number; indirectCount: number }> {
    const directs = await this.getDirectReferrals(walletAddress);
    let totalAccounts = 0;
    let totalStaking = 0;

    const countTeam = async (addr: string): Promise<void> => {
      const subs = await db.select().from(members).where(eq(members.referrerAddress, addr.toLowerCase()));
      for (const s of subs) {
        const staking = await this.getMemberStaking(s.walletAddress);
        if (staking > 0) totalAccounts++;
        totalStaking += staking;
        await countTeam(s.walletAddress);
      }
    };

    for (const d of directs) {
      const staking = await this.getMemberStaking(d.walletAddress);
      if (staking > 0) totalAccounts++;
      totalStaking += staking;
      await countTeam(d.walletAddress);
    }

    const indirects = await this.getIndirectReferrals(walletAddress);

    return {
      totalAccounts,
      totalStaking: totalStaking.toFixed(6),
      directCount: directs.length,
      indirectCount: indirects.length,
    };
  }

  async updateMemberLevel(walletAddress: string, level: number, lifetimeLock: boolean): Promise<void> {
    await db.update(members).set({ level, lifetimeLock }).where(eq(members.walletAddress, walletAddress.toLowerCase()));
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const [order] = await db.insert(orders).values({
      ...data,
      walletAddress: data.walletAddress.toLowerCase(),
    }).returning();
    return order;
  }

  async getOrderByTxHash(txHash: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.txHash, txHash));
    return order;
  }

  async getOrdersByWallet(walletAddress: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.walletAddress, walletAddress.toLowerCase())).orderBy(desc(orders.startDate));
  }

  async getActiveOrders(): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.status, "active"));
  }

  async updateOrderEarnings(orderId: number, earned: string, lastDate: Date): Promise<void> {
    await db.update(orders).set({ totalEarned: earned, lastEarningDate: lastDate }).where(eq(orders.id, orderId));
  }

  async completeOrder(orderId: number): Promise<void> {
    await db.update(orders).set({ status: "completed" }).where(eq(orders.id, orderId));
  }

  async createReward(walletAddress: string, type: string, amount: string, fromAddress?: string, fromOrderId?: number, description?: string): Promise<Reward> {
    const [reward] = await db.insert(rewards).values({
      walletAddress: walletAddress.toLowerCase(),
      type,
      amount,
      fromAddress: fromAddress?.toLowerCase(),
      fromOrderId,
      description,
    }).returning();
    return reward;
  }

  async getRewardsByWallet(walletAddress: string): Promise<Reward[]> {
    return db.select().from(rewards).where(eq(rewards.walletAddress, walletAddress.toLowerCase())).orderBy(desc(rewards.createdAt));
  }

  async getTotalEarnings(walletAddress: string): Promise<string> {
    const result = await db.select({
      total: sql<string>`COALESCE(SUM(${orders.totalEarned}::numeric), 0)::text`
    }).from(orders).where(eq(orders.walletAddress, walletAddress.toLowerCase()));
    return result[0]?.total || "0";
  }

  async getTotalRewards(walletAddress: string, type?: string): Promise<string> {
    let query;
    if (type) {
      query = db.select({
        total: sql<string>`COALESCE(SUM(${rewards.amount}::numeric), 0)::text`
      }).from(rewards).where(and(eq(rewards.walletAddress, walletAddress.toLowerCase()), eq(rewards.type, type)));
    } else {
      query = db.select({
        total: sql<string>`COALESCE(SUM(${rewards.amount}::numeric), 0)::text`
      }).from(rewards).where(eq(rewards.walletAddress, walletAddress.toLowerCase()));
    }
    const result = await query;
    return result[0]?.total || "0";
  }

  async getSubLevelCount(walletAddress: string, level: number): Promise<number> {
    const directs = await this.getDirectReferrals(walletAddress);
    let count = 0;

    const check = async (addr: string) => {
      const subs = await db.select().from(members).where(eq(members.referrerAddress, addr.toLowerCase()));
      for (const s of subs) {
        if (s.level >= level) count++;
        await check(s.walletAddress);
      }
    };

    for (const d of directs) {
      if (d.level >= level) count++;
      await check(d.walletAddress);
    }

    return count;
  }

  async getTeamStakingAmount(walletAddress: string): Promise<number> {
    const stats = await this.getTeamStats(walletAddress);
    return parseFloat(stats.totalStaking);
  }

  async getTeamAccountCount(walletAddress: string): Promise<number> {
    const stats = await this.getTeamStats(walletAddress);
    return stats.totalAccounts;
  }

  async checkAndUpgradeLevel(walletAddress: string): Promise<void> {
    const member = await this.getMember(walletAddress);
    if (!member) return;

    if (member.lifetimeLock) return;

    const teamAccounts = await this.getTeamAccountCount(walletAddress);
    const teamStaking = await this.getTeamStakingAmount(walletAddress);

    let newLevel = 0;
    for (let i = LEVEL_CONFIG.length - 1; i >= 1; i--) {
      const cfg = LEVEL_CONFIG[i];
      if (teamAccounts >= cfg.people && teamStaking >= cfg.amount) {
        if (cfg.subCount > 0) {
          const subCount = await this.getSubLevelCount(walletAddress, cfg.subLevel);
          if (subCount >= cfg.subCount) {
            newLevel = cfg.level;
            break;
          }
        } else {
          newLevel = cfg.level;
          break;
        }
      }
    }

    if (newLevel > member.level) {
      const cfg = LEVEL_CONFIG[newLevel];
      await this.updateMemberLevel(walletAddress, newLevel, cfg.lifetimeLock);
    }
  }

  async getAvailableBalance(walletAddress: string): Promise<number> {
    const addr = walletAddress.toLowerCase();
    const earningsResult = await db.select({
      total: sql<string>`COALESCE(SUM(${orders.totalEarned}::numeric), 0)::text`
    }).from(orders).where(eq(orders.walletAddress, addr));
    const totalEarnings = parseFloat(earningsResult[0]?.total || "0");

    const rewardsResult = await db.select({
      total: sql<string>`COALESCE(SUM(${rewards.amount}::numeric), 0)::text`
    }).from(rewards).where(eq(rewards.walletAddress, addr));
    const totalRewards = parseFloat(rewardsResult[0]?.total || "0");

    const withdrawnResult = await db.select({
      total: sql<string>`COALESCE(SUM(${withdrawals.amount}::numeric), 0)::text`
    }).from(withdrawals).where(and(eq(withdrawals.walletAddress, addr), sql`${withdrawals.status} != 'rejected'`));
    const totalWithdrawn = parseFloat(withdrawnResult[0]?.total || "0");

    return totalEarnings + totalRewards - totalWithdrawn;
  }

  async createWithdrawal(walletAddress: string, amount: number, fee: number): Promise<Withdrawal> {
    const actualAmount = amount - fee;
    const [withdrawal] = await db.insert(withdrawals).values({
      walletAddress: walletAddress.toLowerCase(),
      amount: amount.toString(),
      fee: fee.toString(),
      actualAmount: actualAmount.toString(),
    }).returning();
    return withdrawal;
  }

  async getWithdrawalsByWallet(walletAddress: string): Promise<Withdrawal[]> {
    return db.select().from(withdrawals).where(eq(withdrawals.walletAddress, walletAddress.toLowerCase())).orderBy(desc(withdrawals.createdAt));
  }

  async getTotalWithdrawn(walletAddress: string): Promise<string> {
    const result = await db.select({
      total: sql<string>`COALESCE(SUM(${withdrawals.amount}::numeric), 0)::text`
    }).from(withdrawals).where(and(eq(withdrawals.walletAddress, walletAddress.toLowerCase()), sql`${withdrawals.status} != 'rejected'`));
    return result[0]?.total || "0";
  }

  private async settleOrder(order: Order): Promise<boolean> {
    const now = new Date();
    const lastDate = order.lastEarningDate ? new Date(order.lastEarningDate) : new Date(order.startDate);
    const endDate = new Date(order.endDate);
    const effectiveNow = now > endDate ? endDate : now;

    const diffMs = effectiveNow.getTime() - lastDate.getTime();
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    const wholeDays = Math.floor(diffMs / ONE_DAY_MS);
    if (wholeDays < 1) {
      if (now >= endDate) {
        await this.completeOrder(order.id);
      }
      return false;
    }

    const dailyEarning = parseFloat(order.amount) * parseFloat(order.dailyRate) / 100;
    const totalNewEarning = dailyEarning * wholeDays;
    const newTotal = (parseFloat(order.totalEarned) + totalNewEarning).toFixed(6);

    const settleDate = new Date(lastDate.getTime() + wholeDays * ONE_DAY_MS);
    await this.updateOrderEarnings(order.id, newTotal, settleDate);

    if (now >= endDate) {
      await this.completeOrder(order.id);
    }

    const description = `${order.productName} daily earnings x${wholeDays} day${wholeDays > 1 ? "s" : ""}`;

    await this.createReward(
      order.walletAddress, "daily",
      totalNewEarning.toFixed(6),
      undefined, order.id,
      description
    );

    const member = await this.getMember(order.walletAddress);
    if (member?.referrerAddress) {
      const directReward = (totalNewEarning * 0.10).toFixed(6);
      if (parseFloat(directReward) > 0) {
        await this.createReward(
          member.referrerAddress, "direct_referral",
          directReward,
          order.walletAddress, order.id,
          `Direct referral reward from ${order.walletAddress.slice(0, 6)}...`
        );
      }

      const referrer = await this.getMember(member.referrerAddress);
      if (referrer?.referrerAddress) {
        const indirectReward = (totalNewEarning * 0.05).toFixed(6);
        if (parseFloat(indirectReward) > 0) {
          await this.createReward(
            referrer.referrerAddress, "indirect_referral",
            indirectReward,
            order.walletAddress, order.id,
            `Indirect referral reward from ${order.walletAddress.slice(0, 6)}...`
          );
        }
      }
    }

    await this.processTeamAndEqualBonus(order, totalNewEarning);
    return true;
  }

  async processWalletOrders(walletAddress: string): Promise<void> {
    const walletOrders = await db.select().from(orders).where(
      and(eq(orders.walletAddress, walletAddress.toLowerCase()), eq(orders.status, "active"))
    );

    let settled = false;
    for (const order of walletOrders) {
      const didSettle = await this.settleOrder(order);
      if (didSettle) settled = true;
    }

    if (settled) {
      await this.checkAndUpgradeLevel(walletAddress);
    }
  }

  async processDaily(): Promise<void> {
    const activeOrds = await this.getActiveOrders();

    for (const order of activeOrds) {
      await this.settleOrder(order);
    }

    const allMembers = await this.getAllMembers();
    for (const m of allMembers) {
      await this.checkAndUpgradeLevel(m.walletAddress);
    }
  }

  private async processTeamAndEqualBonus(order: Order, totalNewEarning: number): Promise<void> {
    let current = await this.getMember(order.walletAddress);
    let prevLevel = -1;

    while (current?.referrerAddress) {
      const leader = await this.getMember(current.referrerAddress);
      if (!leader || leader.level < 1) {
        current = leader;
        continue;
      }

      const cfg = LEVEL_CONFIG[leader.level];
      let bonusRate = cfg.bonus;

      if (prevLevel >= 0 && prevLevel >= leader.level) {
        bonusRate = LEVEL_CONFIG[0].bonus;
      }

      if (bonusRate > 0) {
        const teamReward = (totalNewEarning * bonusRate / 100).toFixed(6);
        if (parseFloat(teamReward) > 0) {
          await this.createReward(
            leader.walletAddress, "team_bonus",
            teamReward,
            order.walletAddress, order.id,
            `V${leader.level} team bonus ${bonusRate}%`
          );
        }
      }

      if (prevLevel >= 1 && leader.level === prevLevel) {
        const equalBonus = (totalNewEarning * EQUAL_LEVEL_BONUS / 100).toFixed(6);
        if (parseFloat(equalBonus) > 0) {
          await this.createReward(
            leader.walletAddress, "team_bonus",
            equalBonus,
            order.walletAddress, order.id,
            `V${leader.level} equal-level bonus ${EQUAL_LEVEL_BONUS}%`
          );
        }
      }

      if (leader.level > prevLevel) {
        prevLevel = leader.level;
      }
      current = leader;
    }
  }

  private async isInTeam(leaderAddress: string, memberAddress: string): Promise<boolean> {
    if (leaderAddress.toLowerCase() === memberAddress.toLowerCase()) return false;

    let current = await this.getMember(memberAddress);
    while (current?.referrerAddress) {
      if (current.referrerAddress.toLowerCase() === leaderAddress.toLowerCase()) return true;
      current = await this.getMember(current.referrerAddress);
    }
    return false;
  }
}

export const storage = new DatabaseStorage();
