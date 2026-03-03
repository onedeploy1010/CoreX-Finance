import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { PRODUCTS, LEVEL_CONFIG, EQUAL_LEVEL_BONUS } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.post("/api/members/register", async (req, res) => {
    try {
      const { walletAddress, referrerAddress } = req.body;
      if (!walletAddress) {
        return res.status(400).json({ message: "钱包地址必填" });
      }

      const existing = await storage.getMember(walletAddress);
      if (existing) {
        return res.json(existing);
      }

      if (referrerAddress) {
        const referrer = await storage.getMember(referrerAddress);
        if (!referrer) {
          const member = await storage.createMember({ walletAddress, referrerAddress: null });
          return res.json(member);
        }
      }

      const member = await storage.createMember({ walletAddress, referrerAddress: referrerAddress || null });
      return res.json(member);
    } catch (err: any) {
      console.error("Register error:", err);
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/members/:address", async (req, res) => {
    try {
      const member = await storage.getMember(req.params.address);
      if (!member) {
        return res.status(404).json({ message: "会员未找到" });
      }
      return res.json(member);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/members/:address/direct", async (req, res) => {
    try {
      const directs = await storage.getDirectReferrals(req.params.address);
      const result = [];
      for (const d of directs) {
        const staking = await storage.getMemberStaking(d.walletAddress);
        const teamStats = await storage.getTeamStats(d.walletAddress);
        result.push({
          ...d,
          stakingAmount: staking,
          teamPerformance: parseFloat(teamStats.totalStaking),
          teamAccounts: teamStats.totalAccounts,
          directCount: teamStats.directCount,
          indirectCount: teamStats.indirectCount,
        });
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/members/:address/indirect", async (req, res) => {
    try {
      const indirects = await storage.getIndirectReferrals(req.params.address);
      const result = [];
      for (const d of indirects) {
        const staking = await storage.getMemberStaking(d.walletAddress);
        result.push({ ...d, stakingAmount: staking });
      }
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/members/:address/team-stats", async (req, res) => {
    try {
      const stats = await storage.getTeamStats(req.params.address);
      const member = await storage.getMember(req.params.address);
      return res.json({ ...stats, level: member?.level || 0 });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/members/:address/children", async (req, res) => {
    try {
      const tree = await storage.getTeamTree(req.params.address);
      return res.json(tree);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { walletAddress, productId, amount, txHash } = req.body;

      const product = PRODUCTS.find(p => p.id === productId);
      if (!product) {
        return res.status(400).json({ message: "产品不存在" });
      }

      if (parseFloat(amount) < product.minAmount) {
        return res.status(400).json({ message: `最低投入 ${product.minAmount} USDT` });
      }

      const member = await storage.getMember(walletAddress);
      if (!member) {
        return res.status(400).json({ message: "请先注册会员" });
      }

      const endDate = new Date();
      endDate.setDate(endDate.getDate() + product.days);

      const order = await storage.createOrder({
        walletAddress,
        productId: product.id,
        productName: `${product.nameEn} (${product.name})`,
        amount: amount.toString(),
        dailyRate: product.dailyRate.toString(),
        days: product.days,
        endDate,
        txHash: txHash || null,
      });

      await storage.checkAndUpgradeLevel(walletAddress);

      if (member.referrerAddress) {
        await storage.checkAndUpgradeLevel(member.referrerAddress);
        const referrer = await storage.getMember(member.referrerAddress);
        if (referrer?.referrerAddress) {
          await storage.checkAndUpgradeLevel(referrer.referrerAddress);
        }
      }

      return res.json(order);
    } catch (err: any) {
      console.error("Order error:", err);
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/orders/:address", async (req, res) => {
    try {
      const orderList = await storage.getOrdersByWallet(req.params.address);
      return res.json(orderList);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/rewards/:address", async (req, res) => {
    try {
      const rewardList = await storage.getRewardsByWallet(req.params.address);
      return res.json(rewardList);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/earnings/:address", async (req, res) => {
    try {
      const totalEarnings = await storage.getTotalEarnings(req.params.address);
      const totalRewards = await storage.getTotalRewards(req.params.address);
      const directRewards = await storage.getTotalRewards(req.params.address, "direct_referral");
      const indirectRewards = await storage.getTotalRewards(req.params.address, "indirect_referral");
      const teamRewards = await storage.getTotalRewards(req.params.address, "team_bonus");
      const dailyRewards = await storage.getTotalRewards(req.params.address, "daily");
      return res.json({
        totalEarnings,
        totalRewards,
        directRewards,
        indirectRewards,
        teamRewards,
        dailyRewards,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/process-daily", async (req, res) => {
    try {
      const secret = req.headers["x-cron-secret"] || req.body?.secret;
      if (secret !== process.env.SESSION_SECRET) {
        return res.status(403).json({ message: "未授权" });
      }
      await storage.processDaily();
      return res.json({ message: "每日结算完成" });
    } catch (err: any) {
      console.error("Daily process error:", err);
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/products", async (_req, res) => {
    return res.json(PRODUCTS);
  });

  app.get("/api/levels", async (_req, res) => {
    return res.json({ levels: LEVEL_CONFIG, equalLevelBonus: EQUAL_LEVEL_BONUS });
  });

  return httpServer;
}
