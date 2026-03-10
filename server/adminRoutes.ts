import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { pool } from "./db";
import { adminUsers, members, orders, rewards, withdrawals, messages } from "@shared/schema";
import { eq, desc, sql, and, count } from "drizzle-orm";

const PgSession = connectPg(session);

declare module "express-session" {
  interface SessionData {
    adminId?: number;
    adminUsername?: string;
  }
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.adminId) {
    return res.status(401).json({ message: "未登录" });
  }
  next();
}

export function registerAdminRoutes(app: Express) {
  app.use(
    session({
      store: new PgSession({ pool: pool as any, tableName: "admin_sessions", createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "corex-admin-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: "lax" },
    })
  );

  initDefaultAdmin();

  app.post("/api/admin/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "请输入用户名和密码" });
      }
      const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.username, username));
      if (!admin) {
        return res.status(401).json({ message: "用户名或密码错误" });
      }
      const valid = await bcrypt.compare(password, admin.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "用户名或密码错误" });
      }
      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      return res.json({ id: admin.id, username: admin.username });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => {});
    return res.json({ message: "已退出" });
  });

  app.get("/api/admin/me", requireAdmin, (req, res) => {
    return res.json({ id: req.session.adminId, username: req.session.adminUsername });
  });

  app.get("/api/admin/dashboard", requireAdmin, async (_req, res) => {
    try {
      const [memberCount] = await db.select({ count: sql<number>`count(*)::int` }).from(members);
      const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders);
      const [activeOrderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.status, "active"));
      const [withdrawalCount] = await db.select({ count: sql<number>`count(*)::int` }).from(withdrawals);

      const [totalStaking] = await db.select({
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
      }).from(orders).where(eq(orders.status, "active"));

      const [totalEarned] = await db.select({
        total: sql<string>`COALESCE(SUM(total_earned::numeric), 0)::text`
      }).from(orders);

      const [totalWithdrawn] = await db.select({
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
      }).from(withdrawals).where(sql`${withdrawals.status} != 'rejected'`);

      const [totalRewards] = await db.select({
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
      }).from(rewards);

      const [pendingWithdrawals] = await db.select({
        count: sql<number>`count(*)::int`,
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
      }).from(withdrawals).where(eq(withdrawals.status, "pending"));

      const [completedOrderAmount] = await db.select({
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
      }).from(orders).where(eq(orders.status, "completed"));

      const recentMembers = await db.select().from(members).orderBy(desc(members.createdAt)).limit(7);
      const dailyMemberCounts = await db.select({
        date: sql<string>`to_char(created_at, 'MM-DD')`,
        count: sql<number>`count(*)::int`
      }).from(members).groupBy(sql`to_char(created_at, 'MM-DD')`).orderBy(sql`to_char(created_at, 'MM-DD')`).limit(30);

      const dailyOrderAmounts = await db.select({
        date: sql<string>`to_char(start_date, 'MM-DD')`,
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
      }).from(orders).groupBy(sql`to_char(start_date, 'MM-DD')`).orderBy(sql`to_char(start_date, 'MM-DD')`).limit(30);

      const levelDistribution = await db.select({
        level: members.level,
        count: sql<number>`count(*)::int`
      }).from(members).groupBy(members.level).orderBy(members.level);

      return res.json({
        memberCount: memberCount.count,
        orderCount: orderCount.count,
        activeOrderCount: activeOrderCount.count,
        withdrawalCount: withdrawalCount.count,
        totalStaking: totalStaking.total,
        totalEarned: totalEarned.total,
        totalWithdrawn: totalWithdrawn.total,
        totalRewards: totalRewards.total,
        pendingWithdrawals: { count: pendingWithdrawals.count, total: pendingWithdrawals.total },
        completedOrderAmount: completedOrderAmount.total,
        recentMembers,
        dailyMemberCounts,
        dailyOrderAmounts,
        levelDistribution,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/members", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const search = (req.query.search as string) || "";

      let whereClause;
      if (search) {
        whereClause = sql`${members.walletAddress} ILIKE ${'%' + search + '%'}`;
      }

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(members).where(whereClause);
      const memberList = await db.select().from(members).where(whereClause).orderBy(desc(members.createdAt)).limit(limit).offset(offset);

      const enriched = [];
      for (const m of memberList) {
        const [staking] = await db.select({
          total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
        }).from(orders).where(and(eq(orders.walletAddress, m.walletAddress), eq(orders.status, "active")));

        const [earned] = await db.select({
          total: sql<string>`COALESCE(SUM(total_earned::numeric), 0)::text`
        }).from(orders).where(eq(orders.walletAddress, m.walletAddress));

        const [directCount] = await db.select({ count: sql<number>`count(*)::int` }).from(members).where(eq(members.referrerAddress, m.walletAddress));

        enriched.push({
          ...m,
          stakingAmount: staking.total,
          totalEarned: earned.total,
          directCount: directCount.count,
        });
      }

      return res.json({ members: enriched, total: totalResult.count, page, limit });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/members/:address", requireAdmin, async (req, res) => {
    try {
      const addr = req.params.address.toLowerCase();
      const [member] = await db.select().from(members).where(eq(members.walletAddress, addr));
      if (!member) return res.status(404).json({ message: "会员不存在" });

      const memberOrders = await db.select().from(orders).where(eq(orders.walletAddress, addr)).orderBy(desc(orders.startDate));
      const memberRewards = await db.select().from(rewards).where(eq(rewards.walletAddress, addr)).orderBy(desc(rewards.createdAt));
      const memberWithdrawals = await db.select().from(withdrawals).where(eq(withdrawals.walletAddress, addr)).orderBy(desc(withdrawals.createdAt));
      const directs = await db.select().from(members).where(eq(members.referrerAddress, addr));

      return res.json({ member, orders: memberOrders, rewards: memberRewards, withdrawals: memberWithdrawals, directReferrals: directs });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/members/:address/team-tree", requireAdmin, async (req, res) => {
    try {
      const addr = req.params.address.toLowerCase();
      const directs = await db.select().from(members).where(eq(members.referrerAddress, addr)).orderBy(desc(members.createdAt));

      const result = [];
      for (const d of directs) {
        const activeOrders = await db.select().from(orders).where(and(eq(orders.walletAddress, d.walletAddress), eq(orders.status, "active")));
        const stakingAmount = activeOrders.reduce((sum, o) => sum + parseFloat(o.amount), 0);
        const children = await db.select().from(members).where(eq(members.referrerAddress, d.walletAddress));

        result.push({
          ...d,
          stakingAmount,
          childrenCount: children.length,
          hasChildren: children.length > 0,
        });
      }

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  // 推荐管理 - 获取全局推荐树（根节点 = 无推荐人的会员）
  app.get("/api/admin/referrals/tree", requireAdmin, async (req, res) => {
    try {
      const search = (req.query.search as string) || "";
      const parentAddr = (req.query.parent as string) || "";

      // If parent specified, return children of that parent
      if (parentAddr) {
        const children = await db.select().from(members)
          .where(eq(members.referrerAddress, parentAddr.toLowerCase()))
          .orderBy(desc(members.createdAt));

        const enriched = [];
        for (const m of children) {
          const [staking] = await db.select({
            total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
          }).from(orders).where(and(eq(orders.walletAddress, m.walletAddress), eq(orders.status, "active")));
          const [childCount] = await db.select({ count: sql<number>`count(*)::int` })
            .from(members).where(eq(members.referrerAddress, m.walletAddress));
          // recursive team count
          const [teamCount] = await db.select({ count: sql<number>`count(*)::int` })
            .from(members).where(sql`wallet_address IN (
              WITH RECURSIVE team AS (
                SELECT wallet_address FROM members WHERE referrer_address = ${m.walletAddress}
                UNION ALL
                SELECT m2.wallet_address FROM members m2 INNER JOIN team t ON m2.referrer_address = t.wallet_address
              ) SELECT wallet_address FROM team
            )`);
          enriched.push({
            ...m,
            stakingAmount: staking.total,
            directCount: childCount.count,
            teamCount: teamCount.count,
            hasChildren: childCount.count > 0,
          });
        }
        return res.json({ members: enriched });
      }

      // Root members (no referrer) or search
      let rootMembers;
      if (search) {
        // Search across all members
        rootMembers = await db.select().from(members)
          .where(sql`${members.walletAddress} ILIKE ${'%' + search + '%'}`)
          .orderBy(desc(members.createdAt)).limit(50);
      } else {
        rootMembers = await db.select().from(members)
          .where(sql`${members.referrerAddress} IS NULL`)
          .orderBy(desc(members.createdAt));
      }

      const enriched = [];
      for (const m of rootMembers) {
        const [staking] = await db.select({
          total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
        }).from(orders).where(and(eq(orders.walletAddress, m.walletAddress), eq(orders.status, "active")));
        const [childCount] = await db.select({ count: sql<number>`count(*)::int` })
          .from(members).where(eq(members.referrerAddress, m.walletAddress));
        const [teamCount] = await db.select({ count: sql<number>`count(*)::int` })
          .from(members).where(sql`wallet_address IN (
            WITH RECURSIVE team AS (
              SELECT wallet_address FROM members WHERE referrer_address = ${m.walletAddress}
              UNION ALL
              SELECT m2.wallet_address FROM members m2 INNER JOIN team t ON m2.referrer_address = t.wallet_address
            ) SELECT wallet_address FROM team
          )`);
        enriched.push({
          ...m,
          stakingAmount: staking.total,
          directCount: childCount.count,
          teamCount: teamCount.count,
          hasChildren: childCount.count > 0,
        });
      }

      // Stats
      const [totalMembers] = await db.select({ count: sql<number>`count(*)::int` }).from(members);
      const [withReferrer] = await db.select({ count: sql<number>`count(*)::int` })
        .from(members).where(sql`${members.referrerAddress} IS NOT NULL`);
      const [rootCount] = await db.select({ count: sql<number>`count(*)::int` })
        .from(members).where(sql`${members.referrerAddress} IS NULL`);
      // Max depth via recursive CTE
      const maxDepthResult = await db.execute(sql`
        WITH RECURSIVE tree AS (
          SELECT wallet_address, 0 as depth FROM members WHERE referrer_address IS NULL
          UNION ALL
          SELECT m.wallet_address, t.depth + 1 FROM members m INNER JOIN tree t ON m.referrer_address = t.wallet_address
        ) SELECT COALESCE(MAX(depth), 0) as max_depth FROM tree
      `);
      const maxDepth = (maxDepthResult as any).rows?.[0]?.max_depth || 0;

      return res.json({
        members: enriched,
        stats: {
          totalMembers: totalMembers.count,
          withReferrer: withReferrer.count,
          rootCount: rootCount.count,
          maxDepth: Number(maxDepth),
        }
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let whereClause;
      if (status && status !== "all") {
        whereClause = eq(orders.status, status);
      }

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(whereClause);
      const orderList = await db.select().from(orders).where(whereClause).orderBy(desc(orders.startDate)).limit(limit).offset(offset);

      const enriched = orderList.map(o => {
        const dailyEarning = parseFloat(o.amount) * parseFloat(o.dailyRate) / 100;
        const totalDays = o.days;
        const startDate = new Date(o.startDate);
        const now = new Date();
        const endDate = new Date(o.endDate);
        const elapsed = Math.min(Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)), totalDays);

        return {
          ...o,
          dailyEarning: dailyEarning.toFixed(6),
          elapsedDays: elapsed,
          remainingDays: Math.max(totalDays - elapsed, 0),
        };
      });

      return res.json({ orders: enriched, total: totalResult.count, page, limit });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
      if (!order) return res.status(404).json({ message: "订单不存在" });

      const dailyEarning = parseFloat(order.amount) * parseFloat(order.dailyRate) / 100;
      const startDate = new Date(order.startDate);
      const now = new Date();
      const endDate = new Date(order.endDate);
      const elapsed = Math.min(Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)), order.days);

      const orderRewards = await db.select().from(rewards).where(eq(rewards.fromOrderId, orderId)).orderBy(desc(rewards.createdAt));

      const [withdrawn] = await db.select({
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
      }).from(withdrawals).where(and(eq(withdrawals.walletAddress, order.walletAddress), sql`${withdrawals.status} != 'rejected'`));

      return res.json({
        ...order,
        dailyEarning: dailyEarning.toFixed(6),
        elapsedDays: elapsed,
        remainingDays: Math.max(order.days - elapsed, 0),
        rewards: orderRewards,
        totalWithdrawn: withdrawn.total,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/withdrawals", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      const status = req.query.status as string;

      let whereClause;
      if (status && status !== "all") {
        whereClause = eq(withdrawals.status, status);
      }

      const [totalResult] = await db.select({ count: sql<number>`count(*)::int` }).from(withdrawals).where(whereClause);
      const list = await db.select().from(withdrawals).where(whereClause).orderBy(desc(withdrawals.createdAt)).limit(limit).offset(offset);

      return res.json({ withdrawals: list, total: totalResult.count, page, limit });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/withdrawals/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "状态无效" });
      }
      const [updated] = await db.update(withdrawals).set({ status }).where(eq(withdrawals.id, id)).returning();
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/messages", requireAdmin, async (_req, res) => {
    try {
      const list = await db.select().from(messages).orderBy(desc(messages.createdAt));
      return res.json(list);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/admin/messages", requireAdmin, async (req, res) => {
    try {
      const { title, content, type, targetAddress, isPublished } = req.body;
      if (!title || !content) {
        return res.status(400).json({ message: "标题和内容必填" });
      }
      const [msg] = await db.insert(messages).values({
        title,
        content,
        type: type || "system",
        targetAddress: targetAddress?.toLowerCase() || null,
        isPublished: isPublished ?? false,
      }).returning();
      return res.json(msg);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/admin/messages/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, content, type, targetAddress, isPublished } = req.body;
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (type !== undefined) updates.type = type;
      if (targetAddress !== undefined) updates.targetAddress = targetAddress?.toLowerCase() || null;
      if (isPublished !== undefined) updates.isPublished = isPublished;
      const [updated] = await db.update(messages).set(updates).where(eq(messages.id, id)).returning();
      return res.json(updated);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/admin/messages/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(messages).where(eq(messages.id, id));
      return res.json({ message: "已删除" });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/finance", requireAdmin, async (_req, res) => {
    try {
      const [totalDeposits] = await db.select({
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`,
        count: sql<number>`count(*)::int`
      }).from(orders);

      const [totalWithdrawnResult] = await db.select({
        total: sql<string>`COALESCE(SUM(actual_amount::numeric), 0)::text`,
        count: sql<number>`count(*)::int`
      }).from(withdrawals).where(sql`${withdrawals.status} != 'rejected'`);

      const [totalFees] = await db.select({
        total: sql<string>`COALESCE(SUM(fee::numeric), 0)::text`
      }).from(withdrawals).where(sql`${withdrawals.status} != 'rejected'`);

      const [totalEarnedResult] = await db.select({
        total: sql<string>`COALESCE(SUM(total_earned::numeric), 0)::text`
      }).from(orders);

      const [totalRewardsResult] = await db.select({
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
      }).from(rewards);

      const [activeStaking] = await db.select({
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`
      }).from(orders).where(eq(orders.status, "active"));

      const depositsByDate = await db.select({
        date: sql<string>`to_char(start_date, 'YYYY-MM-DD')`,
        total: sql<string>`COALESCE(SUM(amount::numeric), 0)::text`,
        count: sql<number>`count(*)::int`
      }).from(orders).groupBy(sql`to_char(start_date, 'YYYY-MM-DD')`).orderBy(sql`to_char(start_date, 'YYYY-MM-DD') DESC`).limit(30);

      const withdrawalsByDate = await db.select({
        date: sql<string>`to_char(created_at, 'YYYY-MM-DD')`,
        total: sql<string>`COALESCE(SUM(actual_amount::numeric), 0)::text`,
        count: sql<number>`count(*)::int`
      }).from(withdrawals).where(sql`${withdrawals.status} != 'rejected'`).groupBy(sql`to_char(created_at, 'YYYY-MM-DD')`).orderBy(sql`to_char(created_at, 'YYYY-MM-DD') DESC`).limit(30);

      return res.json({
        totalDeposits: totalDeposits.total,
        totalDepositCount: totalDeposits.count,
        totalWithdrawn: totalWithdrawnResult.total,
        totalWithdrawnCount: totalWithdrawnResult.count,
        totalFees: totalFees.total,
        totalEarned: totalEarnedResult.total,
        totalRewards: totalRewardsResult.total,
        activeStaking: activeStaking.total,
        netBalance: (parseFloat(totalDeposits.total) - parseFloat(totalWithdrawnResult.total)).toFixed(6),
        depositsByDate: depositsByDate.reverse(),
        withdrawalsByDate: withdrawalsByDate.reverse(),
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/messages/public", async (_req, res) => {
    try {
      const list = await db.select().from(messages)
        .where(and(eq(messages.isPublished, true), sql`${messages.targetAddress} IS NULL`))
        .orderBy(desc(messages.createdAt)).limit(20);
      return res.json(list);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/messages/:address", async (req, res) => {
    try {
      const addr = req.params.address.toLowerCase();
      const list = await db.select().from(messages)
        .where(and(
          eq(messages.isPublished, true),
          sql`(${messages.targetAddress} IS NULL OR ${messages.targetAddress} = ${addr})`
        ))
        .orderBy(desc(messages.createdAt)).limit(20);
      return res.json(list);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  });
}

async function initDefaultAdmin() {
  try {
    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.username, "admin"));
    if (!existing) {
      const hash = await bcrypt.hash("admin123", 10);
      await db.insert(adminUsers).values({ username: "admin", passwordHash: hash });
      console.log("Default admin created: admin / admin123");
    }
  } catch (err) {
    console.error("Init admin error:", err);
  }
}
