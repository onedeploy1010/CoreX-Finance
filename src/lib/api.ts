import { supabase } from "./supabase";
import { WITHDRAW_MIN } from "@shared/schema";

// ============ Products ============

export interface DBProduct {
  id: number;
  name: string;
  nameEn: string;
  days: number;
  dailyRate: number;
  minAmount: number;
  description: string;
  totalShares: number;
  usedShares: number;
  dailyGrowth: number;
  isActive: boolean;
  sortOrder: number;
  // When true, a user can only hold one 'active' order on this product at a
  // time — they must wait for it to mature (or reinvest) before buying again.
  // Enforced server-side by assert_single_active_order().
  singleActiveOrderPerUser: boolean;
  // Real order count from the orders table (admin-only, ground truth — not the
  // marketing-padded used_shares). Populated by getAdminProducts.
  realOrderCount?: number;
}

export async function getProducts(): Promise<DBProduct[]> {
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    nameEn: p.name_en,
    days: p.days,
    dailyRate: parseFloat(p.daily_rate),
    minAmount: parseFloat(p.min_amount),
    description: p.description || "",
    totalShares: p.total_shares,
    usedShares: p.used_shares,
    dailyGrowth: p.daily_growth,
    isActive: p.is_active,
    sortOrder: p.sort_order,
    singleActiveOrderPerUser: !!p.single_active_order_per_user,
  }));
}

export async function getActiveOrderProductIds(walletAddress: string): Promise<number[]> {
  const { data } = await supabase
    .from("orders")
    .select("product_id")
    .eq("wallet_address", walletAddress.toLowerCase())
    .eq("status", "active");
  return Array.from(new Set((data || []).map(o => o.product_id as number)));
}

export async function getAdminProducts(): Promise<DBProduct[]> {
  const [{ data: products }, { data: orderRows }] = await Promise.all([
    supabase.from("products").select("*").order("sort_order", { ascending: true }),
    supabase.from("orders").select("product_id"),
  ]);
  const counts = new Map<number, number>();
  for (const row of orderRows || []) {
    counts.set(row.product_id, (counts.get(row.product_id) || 0) + 1);
  }
  return (products || []).map(p => ({
    id: p.id,
    name: p.name,
    nameEn: p.name_en,
    days: p.days,
    dailyRate: parseFloat(p.daily_rate),
    minAmount: parseFloat(p.min_amount),
    description: p.description || "",
    totalShares: p.total_shares,
    usedShares: p.used_shares,
    dailyGrowth: p.daily_growth,
    isActive: p.is_active,
    sortOrder: p.sort_order,
    singleActiveOrderPerUser: !!p.single_active_order_per_user,
    realOrderCount: counts.get(p.id) ?? 0,
  }));
}

export async function adminCreateProduct(params: {
  name: string; nameEn: string; days: number; dailyRate: number;
  minAmount: number; description: string; totalShares: number;
  usedShares: number; dailyGrowth: number;
  singleActiveOrderPerUser?: boolean;
}) {
  const { data: maxOrder } = await supabase.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sortOrder = maxOrder && maxOrder.length > 0 ? maxOrder[0].sort_order + 1 : 0;
  const { data, error } = await supabase.from("products").insert({
    name: params.name, name_en: params.nameEn, days: params.days,
    daily_rate: params.dailyRate, min_amount: params.minAmount,
    description: params.description, total_shares: params.totalShares,
    used_shares: params.usedShares, daily_growth: params.dailyGrowth,
    single_active_order_per_user: !!params.singleActiveOrderPerUser,
    sort_order: sortOrder,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateProduct(id: number, params: Partial<{
  name: string; nameEn: string; days: number; dailyRate: number;
  minAmount: number; description: string; totalShares: number;
  usedShares: number; dailyGrowth: number; isActive: boolean; sortOrder: number;
  singleActiveOrderPerUser: boolean;
}>) {
  const updates: any = {};
  if (params.name !== undefined) updates.name = params.name;
  if (params.nameEn !== undefined) updates.name_en = params.nameEn;
  if (params.days !== undefined) updates.days = params.days;
  if (params.dailyRate !== undefined) updates.daily_rate = params.dailyRate;
  if (params.minAmount !== undefined) updates.min_amount = params.minAmount;
  if (params.description !== undefined) updates.description = params.description;
  if (params.totalShares !== undefined) updates.total_shares = params.totalShares;
  if (params.usedShares !== undefined) updates.used_shares = params.usedShares;
  if (params.dailyGrowth !== undefined) updates.daily_growth = params.dailyGrowth;
  if (params.isActive !== undefined) updates.is_active = params.isActive;
  if (params.sortOrder !== undefined) updates.sort_order = params.sortOrder;
  if (params.singleActiveOrderPerUser !== undefined) updates.single_active_order_per_user = params.singleActiveOrderPerUser;
  const { error } = await supabase.from("products").update(updates).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function adminDeleteProduct(id: number) {
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function incrementProductShares(productId: number, amount: number) {
  const { error } = await supabase.rpc("increment_product_shares", { p_product_id: productId, p_amount: amount });
  if (error) {
    // Fallback: direct update
    const { data: product } = await supabase.from("products").select("used_shares, total_shares").eq("id", productId).single();
    if (product) {
      const newUsed = Math.min(product.used_shares + amount, product.total_shares);
      await supabase.from("products").update({ used_shares: newUsed }).eq("id", productId);
    }
  }
}

// ============ Members ============

export async function registerMember(walletAddress: string, referrerAddress?: string | null) {
  const addr = walletAddress.toLowerCase();
  const { data: existing } = await supabase
    .from("members")
    .select("*")
    .eq("wallet_address", addr)
    .single();
  if (existing) return existing;

  // Must have a valid referral link to register
  let refAddr = referrerAddress?.toLowerCase() || null;
  if (!refAddr) {
    throw new Error("REFERRAL_REQUIRED");
  }

  // Check referrer exists. The referrer does NOT need to have invested:
  // unactivated users can still hand out referral links. Reward gating
  // (daily / referral / team bonuses) already requires the recipient to
  // have an active order at the database level, so an unactivated upline
  // simply earns nothing until they deposit.
  const { data: referrer } = await supabase
    .from("members")
    .select("id, wallet_address")
    .eq("wallet_address", refAddr)
    .single();
  if (!referrer) {
    throw new Error("REFERRAL_REQUIRED");
  }

  const { data, error } = await supabase
    .from("members")
    .insert({ wallet_address: addr, referrer_address: refAddr })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getMember(walletAddress: string) {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .single();
  if (error) return null;
  return data;
}

export async function getDirectReferrals(walletAddress: string) {
  const addr = walletAddress.toLowerCase();
  const { data: directs } = await supabase
    .from("members")
    .select("*")
    .eq("referrer_address", addr)
    .order("created_at", { ascending: false });

  const result = [];
  for (const d of directs || []) {
    const staking = await getMemberStaking(d.wallet_address);
    const teamStats = await getTeamStats(d.wallet_address);
    const { count: childrenCount } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("referrer_address", d.wallet_address);
    result.push({
      ...d,
      walletAddress: d.wallet_address,
      createdAt: d.created_at,
      level: d.level,
      stakingAmount: staking,
      teamPerformance: parseFloat(teamStats.totalStaking),
      teamAccounts: teamStats.totalAccounts,
      directCount: teamStats.directCount,
      indirectCount: teamStats.indirectCount,
      hasChildren: (childrenCount || 0) > 0,
      childrenCount: childrenCount || 0,
    });
  }
  return result;
}

export async function getIndirectReferrals(walletAddress: string) {
  const directs = await getDirectReferrals(walletAddress);
  const indirects = [];
  for (const d of directs) {
    const { data: subs } = await supabase
      .from("members")
      .select("*")
      .eq("referrer_address", d.wallet_address);
    for (const s of subs || []) {
      const staking = await getMemberStaking(s.wallet_address);
      indirects.push({ ...s, walletAddress: s.wallet_address, createdAt: s.created_at, level: s.level, stakingAmount: staking });
    }
  }
  return indirects;
}

export async function getTeamStats(walletAddress: string) {
  const addr = walletAddress.toLowerCase();
  const { data } = await supabase.rpc("get_team_stats", { root_address: addr });
  if (data) return data;
  // Fallback if RPC not available - only count members with deposits
  const { data: directs } = await supabase
    .from("members")
    .select("wallet_address")
    .eq("referrer_address", addr);
  let depositedCount = 0;
  if (directs) {
    for (const d of directs) {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("wallet_address", d.wallet_address);
      if ((count || 0) > 0) depositedCount++;
    }
  }
  return {
    totalAccounts: depositedCount,
    totalStaking: "0",
    directCount: depositedCount,
    directEffective: 0,
    indirectCount: 0,
  };
}

export async function getTeamTree(walletAddress: string) {
  return getDirectReferrals(walletAddress);
}

async function getMemberStaking(walletAddress: string): Promise<number> {
  const { data } = await supabase
    .from("orders")
    .select("amount")
    .eq("wallet_address", walletAddress.toLowerCase())
    .eq("status", "active");
  return (data || []).reduce((sum, o) => sum + parseFloat(o.amount), 0);
}

// ============ Orders ============

export async function createOrder(params: {
  walletAddress: string;
  productId: number;
  amount: string;
  txHash?: string | null;
  productName: string;
  dailyRate: string;
  days: number;
  endDate: Date;
}) {
  if (params.txHash) {
    // Route through edge function for on-chain tx verification
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const resp = await fetch(`${supabaseUrl}/functions/v1/investment-callback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        walletAddress: params.walletAddress,
        productId: params.productId,
        amount: params.amount,
        txHash: params.txHash,
        productName: params.productName,
        dailyRate: params.dailyRate,
        days: params.days,
      }),
    });
    const result = await resp.json();
    if (!result.success) throw new Error(result.message || "Order creation failed");
    return { id: result.orderId };
  }

  // No txHash = invalid for user-facing orders (must go through contract)
  throw new Error("Transaction hash is required for investment orders");
}

export async function getOrdersByWallet(walletAddress: string) {
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .order("start_date", { ascending: false });
  return (data || []).map(o => ({
    ...o,
    walletAddress: o.wallet_address,
    productId: o.product_id,
    productName: o.product_name,
    dailyRate: o.daily_rate,
    startDate: o.start_date,
    endDate: o.end_date,
    totalEarned: o.total_earned,
    lastEarningDate: o.last_earning_date,
    txHash: o.tx_hash,
    maturedAt: o.matured_at,
    reinvestedFromOrderId: o.reinvested_from_order_id,
  }));
}

export async function redeemMaturedOrder(walletAddress: string, orderId: number) {
  const { data, error } = await supabase.rpc("redeem_matured_order", {
    p_wallet_address: walletAddress.toLowerCase(),
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function reinvestMaturedOrder(walletAddress: string, orderId: number) {
  const { data, error } = await supabase.rpc("reinvest_matured_order", {
    p_wallet_address: walletAddress.toLowerCase(),
    p_order_id: orderId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createOrderWithBalance(params: {
  walletAddress: string;
  productId: number;
  amount: string;
  productName: string;
  dailyRate: string;
  days: number;
}) {
  const { data, error } = await supabase.rpc("create_order_with_balance", {
    p_wallet_address: params.walletAddress.toLowerCase(),
    p_product_id: params.productId,
    p_amount: parseFloat(params.amount),
    p_product_name: params.productName,
    p_daily_rate: parseFloat(params.dailyRate),
    p_days: params.days,
  });
  if (error) throw new Error(error.message);
  return data;
}

// ============ Earnings ============

export async function getEarnings(walletAddress: string) {
  const addr = walletAddress.toLowerCase();

  const { data } = await supabase.rpc("get_earnings", { p_wallet_address: addr });
  if (data) return data;

  // Fallback
  const { data: orderEarnings } = await supabase
    .from("orders")
    .select("total_earned")
    .eq("wallet_address", addr);
  const totalEarnings = (orderEarnings || []).reduce((s, o) => s + parseFloat(o.total_earned || "0"), 0);

  const getRewardSum = async (type?: string) => {
    let q = supabase.from("rewards").select("amount").eq("wallet_address", addr);
    if (type) q = q.eq("type", type);
    const { data: rw } = await q;
    return (rw || []).reduce((s, r) => s + parseFloat(r.amount), 0);
  };

  const directRewards = await getRewardSum("direct_referral");
  const indirectRewards = await getRewardSum("indirect_referral");
  const teamRewards = await getRewardSum("team_bonus");
  const dailyRewards = await getRewardSum("daily");
  const principalReturn = await getRewardSum("principal_return");
  // totalRewards excludes daily to avoid double counting with totalEarnings
  const totalRewards = directRewards + indirectRewards + teamRewards;

  const { data: wData } = await supabase
    .from("withdrawals")
    .select("amount")
    .eq("wallet_address", addr)
    .neq("status", "rejected");
  const totalWithdrawn = (wData || []).reduce((s, w) => s + parseFloat(w.amount), 0);

  // Use dailyRewards (from rewards table) + referral/team rewards + redeemed principal - withdrawn
  const availableBalance = dailyRewards + totalRewards + principalReturn - totalWithdrawn;

  return {
    totalEarnings: totalEarnings.toFixed(6),
    totalRewards: totalRewards.toFixed(6),
    directRewards: directRewards.toFixed(6),
    indirectRewards: indirectRewards.toFixed(6),
    teamRewards: teamRewards.toFixed(6),
    dailyRewards: dailyRewards.toFixed(6),
    principalReturn: principalReturn.toFixed(6),
    availableBalance: availableBalance.toFixed(6),
    totalWithdrawn: totalWithdrawn.toFixed(6),
  };
}

// ============ Rewards ============

// ============ Withdrawals ============

export async function createWithdrawal(walletAddress: string, amount: number, fee: number) {
  if (amount < WITHDRAW_MIN) throw new Error(`Minimum withdrawal is ${WITHDRAW_MIN} USDT`);

  // Check if withdrawal is allowed for this member
  const addr = walletAddress.toLowerCase();
  const { data: member } = await supabase
    .from("members")
    .select("principal_withdrawal_enabled, earnings_withdrawal_enabled")
    .eq("wallet_address", addr)
    .single();
  if (member) {
    if (!member.principal_withdrawal_enabled && !member.earnings_withdrawal_enabled) {
      throw new Error("提现功能已被管理员关闭");
    }
    if (!member.earnings_withdrawal_enabled) {
      throw new Error("收益提现功能已被管理员关闭");
    }
    if (!member.principal_withdrawal_enabled) {
      throw new Error("本金提现功能已被管理员关闭");
    }
  }

  const actualAmount = amount - fee;
  const { data, error } = await supabase
    .from("withdrawals")
    .insert({
      wallet_address: addr,
      amount: amount.toString(),
      fee: fee.toString(),
      actual_amount: actualAmount.toString(),
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getRewardsByWallet(walletAddress: string) {
  const addr = walletAddress.toLowerCase();
  const { data } = await supabase
    .from("rewards")
    .select("*")
    .eq("wallet_address", addr)
    .order("created_at", { ascending: false });

  const orderCache: Record<number, string> = {};
  const orderAmountCache: Record<number, string> = {};
  const memberLevelCache: Record<string, number> = {};
  const enriched = [];
  for (const r of data || []) {
    let productName = "";
    let orderAmount = "";
    let fromLevel = 0;
    if (r.from_order_id) {
      const cacheKey = r.from_order_id;
      if (orderCache[cacheKey] !== undefined) {
        productName = orderCache[cacheKey];
        orderAmount = orderAmountCache[cacheKey];
      } else {
        const { data: order } = await supabase
          .from("orders")
          .select("product_name,amount")
          .eq("id", r.from_order_id)
          .single();
        productName = order?.product_name || "";
        orderAmount = order?.amount || "";
        orderCache[cacheKey] = productName;
        orderAmountCache[cacheKey] = orderAmount;
      }
    }
    if (r.from_address) {
      if (memberLevelCache[r.from_address] !== undefined) {
        fromLevel = memberLevelCache[r.from_address];
      } else {
        const { data: member } = await supabase
          .from("members")
          .select("level")
          .eq("wallet_address", r.from_address)
          .single();
        fromLevel = member?.level ?? 0;
        memberLevelCache[r.from_address] = fromLevel;
      }
    }
    enriched.push({
      id: r.id,
      type: r.type,
      amount: r.amount,
      fromAddress: r.from_address || "",
      fromLevel,
      productName,
      orderAmount,
      description: r.description,
      createdAt: r.created_at,
    });
  }
  return enriched;
}

export async function getWithdrawalsByWallet(walletAddress: string) {
  const { data } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .order("created_at", { ascending: false });
  return (data || []).map(w => ({
    ...w,
    walletAddress: w.wallet_address,
    actualAmount: w.actual_amount,
    createdAt: w.created_at,
    txHash: w.tx_hash,
  }));
}

// ============ Admin ============

export async function adminLogin(username: string, password: string) {
  const { data, error } = await supabase.rpc("admin_login", {
    p_username: username,
    p_password: password,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("用户名或密码错误");

  // Store admin session in localStorage
  const session = { id: data.id, username: data.username, role: data.role, permissions: data.permissions || [], token: data.token, timestamp: Date.now() };
  localStorage.setItem("corex_admin", JSON.stringify(session));
  return session;
}

export async function adminChangePassword(oldPassword: string, newPassword: string) {
  const session = getAdminSession();
  if (!session) throw new Error("未登录");
  const { data, error } = await supabase.rpc("admin_change_password", {
    p_admin_id: session.id,
    p_old_password: oldPassword,
    p_new_password: newPassword,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.message || "修改失败");
  return data;
}

export async function adminResetPassword(targetId: number, newPassword: string) {
  const session = getAdminSession();
  if (!session) throw new Error("未登录");
  const { data, error } = await supabase.rpc("admin_reset_password", {
    p_caller_id: session.id,
    p_target_id: targetId,
    p_new_password: newPassword,
  });
  if (error) throw new Error(error.message);
  if (!data?.success) throw new Error(data?.message || "重置失败");
  return data;
}

export function adminLogout() {
  localStorage.removeItem("corex_admin");
}

export function getAdminSession() {
  try {
    const stored = localStorage.getItem("corex_admin");
    if (!stored) return null;
    const session = JSON.parse(stored);
    // Expire after 24 hours
    if (Date.now() - session.timestamp > 24 * 60 * 60 * 1000) {
      localStorage.removeItem("corex_admin");
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export async function getAdminDashboard() {
  const { data, error } = await supabase.rpc("admin_dashboard");
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminMembers(page: number, limit: number, search: string, levelFilter?: number | null, observedFilter?: boolean | null, dateFrom?: string, dateTo?: string) {
  const offset = (page - 1) * limit;

  let query = supabase.from("members").select("*", { count: "exact" });
  if (search) {
    query = query.or(`wallet_address.ilike.%${search}%,note.ilike.%${search}%`);
  }
  if (levelFilter !== null && levelFilter !== undefined && levelFilter >= 0) {
    query = query.eq("level", levelFilter);
  }
  if (observedFilter === true) {
    query = query.eq("is_observed", true);
  }
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");
  const { data: memberList, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  const enriched = [];
  for (const m of memberList || []) {
    const { data: stakingData } = await supabase
      .from("orders")
      .select("amount")
      .eq("wallet_address", m.wallet_address)
      .eq("status", "active");
    const stakingAmount = (stakingData || []).reduce((s, o) => s + parseFloat(o.amount), 0);

    const { data: earnedData } = await supabase
      .from("orders")
      .select("total_earned")
      .eq("wallet_address", m.wallet_address);
    const totalEarned = (earnedData || []).reduce((s, o) => s + parseFloat(o.total_earned || "0"), 0);

    const { count: directCount } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true })
      .eq("referrer_address", m.wallet_address);

    enriched.push({
      ...m,
      walletAddress: m.wallet_address,
      referrerAddress: m.referrer_address,
      lifetimeLock: m.lifetime_lock,
      createdAt: m.created_at,
      stakingAmount: stakingAmount.toFixed(6),
      totalEarned: totalEarned.toFixed(6),
      directCount: directCount || 0,
      isObserved: m.is_observed || false,
      principalWithdrawalEnabled: m.principal_withdrawal_enabled !== false,
      earningsWithdrawalEnabled: m.earnings_withdrawal_enabled !== false,
      note: m.note || "",
    });
  }

  return { members: enriched, total: count || 0, page, limit };
}

export async function getAdminMemberDetail(address: string) {
  const addr = address.toLowerCase();
  const { data: member } = await supabase.from("members").select("*").eq("wallet_address", addr).single();
  if (!member) throw new Error("会员不存在");

  const { data: memberOrders } = await supabase.from("orders").select("*").eq("wallet_address", addr).order("start_date", { ascending: false });
  const { data: memberRewards } = await supabase.from("rewards").select("*").eq("wallet_address", addr).order("created_at", { ascending: false });
  const { data: memberWithdrawals } = await supabase.from("withdrawals").select("*").eq("wallet_address", addr).order("created_at", { ascending: false });
  const { data: directReferrals } = await supabase.from("members").select("*").eq("referrer_address", addr);

  return {
    member: { ...member, walletAddress: member.wallet_address, referrerAddress: member.referrer_address, lifetimeLock: member.lifetime_lock, createdAt: member.created_at, isObserved: member.is_observed || false, principalWithdrawalEnabled: member.principal_withdrawal_enabled !== false, earningsWithdrawalEnabled: member.earnings_withdrawal_enabled !== false, note: member.note || "" },
    orders: memberOrders || [],
    rewards: memberRewards || [],
    withdrawals: memberWithdrawals || [],
    directReferrals: directReferrals || [],
  };
}

export async function getAdminTeamTree(rootAddress: string) {
  const addr = rootAddress.toLowerCase();
  const { data: directs } = await supabase.from("members").select("*").eq("referrer_address", addr).order("created_at", { ascending: false });

  const result = [];
  for (const d of directs || []) {
    // Personal active staking
    const { data: activeOrders } = await supabase.from("orders").select("amount").eq("wallet_address", d.wallet_address).eq("status", "active");
    const stakingAmount = (activeOrders || []).reduce((sum, o) => sum + parseFloat(o.amount), 0);
    const { count: childrenCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("referrer_address", d.wallet_address);

    // Team stats (umbrella total staking & active accounts)
    let teamStaking = 0;
    let teamActiveAccounts = 0;
    const teamData = await supabase.rpc("get_team_stats", { root_address: d.wallet_address });
    if (teamData.data) {
      teamStaking = parseFloat(teamData.data.totalStaking || "0");
      teamActiveAccounts = teamData.data.totalAccounts || 0;
    }

    result.push({
      ...d,
      walletAddress: d.wallet_address,
      referrerAddress: d.referrer_address,
      lifetimeLock: d.lifetime_lock,
      createdAt: d.created_at,
      stakingAmount,
      teamStaking,
      teamActiveAccounts,
      childrenCount: childrenCount || 0,
      hasChildren: (childrenCount || 0) > 0,
      isObserved: d.is_observed || false,
      note: d.note || "",
    });
  }
  return result;
}

export async function getAdminOrders(page: number, limit: number, status: string, filters?: { search?: string; productId?: number | null; dateFrom?: string; dateTo?: string; source?: "on_chain" | "balance" | "reinvest" | null }) {
  const offset = (page - 1) * limit;

  let query = supabase.from("orders").select("*", { count: "exact" });
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (filters?.search) {
    query = query.ilike("wallet_address", `%${filters.search}%`);
  }
  if (filters?.productId) {
    query = query.eq("product_id", filters.productId);
  }
  if (filters?.dateFrom) {
    query = query.gte("start_date", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("start_date", filters.dateTo + "T23:59:59");
  }
  if (filters?.source === "on_chain") {
    query = query.eq("payment_method", "on_chain").is("reinvested_from_order_id", null);
  } else if (filters?.source === "balance") {
    query = query.eq("payment_method", "balance").is("reinvested_from_order_id", null);
  } else if (filters?.source === "reinvest") {
    query = query.not("reinvested_from_order_id", "is", null);
  }
  const { data: orderList, count, error } = await query
    .order("start_date", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  const enriched = (orderList || []).map(o => {
    const dailyEarning = parseFloat(o.amount) * parseFloat(o.daily_rate) / 100;
    const startDate = new Date(o.start_date);
    const now = new Date();
    // Use calendar day difference (not timestamp) to match settlement logic
    const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const elapsed = Math.min(Math.round((today.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000)), o.days);

    return {
      ...o,
      walletAddress: o.wallet_address,
      productId: o.product_id,
      productName: o.product_name,
      dailyRate: o.daily_rate,
      startDate: o.start_date,
      endDate: o.end_date,
      totalEarned: o.total_earned,
      txHash: o.tx_hash,
      dailyEarning: dailyEarning.toFixed(6),
      elapsedDays: elapsed,
      remainingDays: Math.max(o.days - elapsed, 0),
    };
  });

  return { orders: enriched, total: count || 0, page, limit };
}

export async function getOrderShareStats(
  status: string = "all",
  filters?: { search?: string; productId?: number | null; dateFrom?: string; dateTo?: string; source?: "on_chain" | "balance" | "reinvest" | null }
) {
  let q = supabase.from("orders").select("product_id, product_name, amount, status");
  if (status && status !== "all") q = q.eq("status", status);
  if (filters?.search) q = q.ilike("wallet_address", `%${filters.search}%`);
  if (filters?.productId) q = q.eq("product_id", filters.productId);
  if (filters?.dateFrom) q = q.gte("start_date", filters.dateFrom);
  if (filters?.dateTo) q = q.lte("start_date", filters.dateTo + "T23:59:59");
  if (filters?.source === "on_chain") q = q.eq("payment_method", "on_chain").is("reinvested_from_order_id", null);
  else if (filters?.source === "balance") q = q.eq("payment_method", "balance").is("reinvested_from_order_id", null);
  else if (filters?.source === "reinvest") q = q.not("reinvested_from_order_id", "is", null);
  const { data, error } = await q;
  if (error) throw new Error(error.message);

  // Group by product, compute shares = floor(amount / minAmount)
  // We'll return raw data and let the frontend compute with product minAmount
  const byProduct = new Map<number, { name: string; totalAmount: number; orderCount: number; activeAmount: number; activeCount: number; amounts: number[] }>();
  (data || []).forEach((o: any) => {
    const pid = o.product_id;
    if (!byProduct.has(pid)) {
      byProduct.set(pid, { name: o.product_name, totalAmount: 0, orderCount: 0, activeAmount: 0, activeCount: 0, amounts: [] });
    }
    const entry = byProduct.get(pid)!;
    const amt = parseFloat(o.amount);
    entry.totalAmount += amt;
    entry.orderCount += 1;
    entry.amounts.push(amt);
    if (o.status === "active") {
      entry.activeAmount += amt;
      entry.activeCount += 1;
    }
  });

  return Array.from(byProduct.entries()).map(([productId, v]) => ({
    productId,
    ...v,
  }));
}

export async function getAdminWithdrawals(page: number, limit: number, status: string, filters?: { search?: string; dateFrom?: string; dateTo?: string }) {
  const offset = (page - 1) * limit;

  // NULL-safe exclusion of internal balance_payment markers — pending rows have tx_hash IS NULL
  const NOT_BALANCE_PAYMENT = "tx_hash.is.null,tx_hash.neq.balance_payment";
  const search = filters?.search?.trim();

  let query = supabase.from("withdrawals").select("*", { count: "exact" }).or(NOT_BALANCE_PAYMENT);
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.ilike("wallet_address", `%${search}%`);
  }
  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo + "T23:59:59");
  }
  const { data: list, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  // Summary stats — exclude balance_payment, scoped by the same filters as the list
  const buildStatsQuery = (qstatus: string) => {
    let q = supabase.from("withdrawals").select("amount,fee,tx_hash").eq("status", qstatus).or(NOT_BALANCE_PAYMENT);
    if (search) q = q.ilike("wallet_address", `%${search}%`);
    if (filters?.dateFrom) q = q.gte("created_at", filters.dateFrom);
    if (filters?.dateTo) q = q.lte("created_at", filters.dateTo + "T23:59:59");
    return q;
  };
  const { data: completedStats } = await buildStatsQuery("completed");
  const completedTotal = (completedStats || []).reduce((s, w) => s + parseFloat(w.amount || "0"), 0);
  const completedFees = (completedStats || []).reduce((s, w) => s + parseFloat(w.fee || "0"), 0);
  const completedCount = (completedStats || []).length;

  const { data: pendingStats } = await buildStatsQuery("pending");
  const pendingTotal = (pendingStats || []).reduce((s, w) => s + parseFloat(w.amount || "0"), 0);
  const pendingCount = (pendingStats || []).length;

  return {
    withdrawals: (list || []).map(w => ({
      ...w,
      walletAddress: w.wallet_address,
      actualAmount: w.actual_amount,
      createdAt: w.created_at,
      txHash: w.tx_hash,
      batchId: w.batch_id,
      processedAt: w.processed_at,
    })),
    total: count || 0,
    page,
    limit,
    stats: {
      completedTotal,
      completedFees,
      completedCount,
      pendingTotal,
      pendingCount: pendingCount || 0,
    },
  };
}

export async function updateWithdrawalStatus(id: number, status: string) {
  const { data, error } = await supabase
    .from("withdrawals")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function getPendingWithdrawals(limit: number = 100) {
  const { data, error } = await supabase.rpc("get_pending_withdrawals", { p_limit: limit });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function markWithdrawalsProcessed(ids: number[], batchId: string, txHash: string) {
  const { data, error } = await supabase.rpc("mark_withdrawals_processed", {
    p_ids: ids,
    p_batch_id: batchId,
    p_tx_hash: txHash,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminMessages() {
  const { data } = await supabase.from("messages").select("*").order("created_at", { ascending: false });
  return (data || []).map(m => ({
    ...m,
    targetAddress: m.target_address,
    isPublished: m.is_published,
    createdAt: m.created_at,
  }));
}

export async function createAdminMessage(params: { title: string; content: string; type: string; targetAddress?: string | null; isPublished: boolean }) {
  const { data, error } = await supabase
    .from("messages")
    .insert({
      title: params.title,
      content: params.content,
      type: params.type || "system",
      target_address: params.targetAddress?.toLowerCase() || null,
      is_published: params.isPublished ?? false,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAdminMessage(id: number, params: any) {
  const updates: any = {};
  if (params.title !== undefined) updates.title = params.title;
  if (params.content !== undefined) updates.content = params.content;
  if (params.type !== undefined) updates.type = params.type;
  if (params.targetAddress !== undefined) updates.target_address = params.targetAddress?.toLowerCase() || null;
  if (params.isPublished !== undefined) updates.is_published = params.isPublished;

  const { data, error } = await supabase.from("messages").update(updates).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function deleteAdminMessage(id: number) {
  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getAdminFinance() {
  const { data, error } = await supabase.rpc("admin_finance");
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminDateRangeStats(from: string, to: string) {
  const { data, error } = await supabase.rpc("admin_date_range_stats", {
    p_start: from,
    p_end: to,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminFinanceMonthly() {
  const { data, error } = await supabase.rpc("admin_finance_monthly");
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminWithdrawalForecast() {
  const { data, error } = await supabase.rpc("admin_withdrawal_forecast");
  if (error) throw new Error(error.message);
  return data;
}

// ============ Settlement Settings ============

export async function getSettlementConfig() {
  const { data, error } = await supabase.rpc("get_settlement_config");
  if (error) throw new Error(error.message);
  return data;
}

export async function updateSettlementTime(sgtHour: number, sgtMinute: number) {
  const { data, error } = await supabase.rpc("update_settlement_time", {
    p_sgt_hour: sgtHour,
    p_sgt_minute: sgtMinute,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminReferralTree(search?: string, parentAddr?: string, levelFilter?: number | null) {
  if (parentAddr) {
    const children = await getAdminTeamTree(parentAddr);
    return { members: children };
  }

  let rootMembers;
  if (search) {
    let q = supabase.from("members").select("*").ilike("wallet_address", `%${search}%`);
    if (levelFilter !== null && levelFilter !== undefined) q = q.eq("level", levelFilter);
    const { data } = await q.order("created_at", { ascending: false }).limit(50);
    rootMembers = data || [];
  } else {
    let q = supabase.from("members").select("*");
    if (levelFilter !== null && levelFilter !== undefined) {
      q = q.eq("level", levelFilter);
    } else {
      q = q.is("referrer_address", null);
    }
    const { data } = await q.order("created_at", { ascending: false }).limit(200);
    rootMembers = data || [];
  }

  const enriched = [];
  for (const m of rootMembers) {
    const staking = await getMemberStaking(m.wallet_address);
    const { count: directCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("referrer_address", m.wallet_address);

    let teamStaking = 0;
    let teamActiveAccounts = 0;
    const teamData = await supabase.rpc("get_team_stats", { root_address: m.wallet_address });
    if (teamData.data) {
      teamStaking = parseFloat(teamData.data.totalStaking || "0");
      teamActiveAccounts = teamData.data.totalAccounts || 0;
    }

    enriched.push({
      ...m,
      walletAddress: m.wallet_address,
      referrerAddress: m.referrer_address,
      createdAt: m.created_at,
      stakingAmount: staking.toFixed(6),
      teamStaking,
      teamActiveAccounts,
      directCount: directCount || 0,
      teamCount: 0,
      hasChildren: (directCount || 0) > 0,
      isObserved: m.is_observed || false,
      note: m.note || "",
    });
  }

  const { count: totalMembers } = await supabase.from("members").select("*", { count: "exact", head: true });
  const { count: withReferrer } = await supabase.from("members").select("*", { count: "exact", head: true }).not("referrer_address", "is", null);
  const { count: rootCount } = await supabase.from("members").select("*", { count: "exact", head: true }).is("referrer_address", null);

  return {
    members: enriched,
    stats: {
      totalMembers: totalMembers || 0,
      withReferrer: withReferrer || 0,
      rootCount: rootCount || 0,
      maxDepth: 0,
    },
  };
}

// ============ Admin Role Management ============

export async function adminAddLog(action: string, targetType?: string, targetId?: string, detail?: any) {
  const session = getAdminSession();
  if (!session) return;
  try {
    await supabase.rpc("admin_add_log", {
      p_admin_id: session.id,
      p_admin_username: session.username,
      p_admin_role: session.role || "superadmin",
      p_action: action,
      p_target_type: targetType || null,
      p_target_id: targetId || null,
      p_detail: detail ? JSON.stringify(detail) : null,
    });
  } catch {};
}

export async function getAdminLogs(page: number, limit: number, filters?: { search?: string; role?: string; dateFrom?: string; dateTo?: string }) {
  const { data, error } = await supabase.rpc("admin_get_logs", {
    p_page: page,
    p_limit: limit,
    p_search: filters?.search?.trim() || null,
    p_role: filters?.role?.trim() || null,
    p_date_from: filters?.dateFrom || null,
    p_date_to: filters?.dateTo || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getAdminUsers() {
  const { data, error } = await supabase.rpc("admin_list_admins");
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createAdminUser(username: string, password: string, role: string, permissions: string[]) {
  const { data, error } = await supabase.rpc("admin_create_user", {
    p_username: username, p_password: password, p_role: role, p_permissions: JSON.stringify(permissions),
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateAdminUser(id: number, role: string, password?: string, permissions?: string[]) {
  const { data, error } = await supabase.rpc("admin_update_user", {
    p_id: id, p_role: role, p_password: password || null,
    p_permissions: permissions ? JSON.stringify(permissions) : null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export function hasPermission(perm: string): boolean {
  const session = getAdminSession();
  if (!session) return false;
  const perms: string[] = session.permissions || [];
  return perms.includes(perm);
}

export async function getAutoApproveWithdrawal(): Promise<boolean> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "auto_approve_withdrawal").single();
  return data?.value === "true";
}

export async function setAutoApproveWithdrawal(enabled: boolean) {
  const { error } = await supabase.from("system_settings").update({ value: enabled ? "true" : "false" }).eq("key", "auto_approve_withdrawal");
  if (error) throw new Error(error.message);
}

export async function getAutoWithdrawLimit(): Promise<number> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "auto_withdraw_limit").single();
  return parseFloat(data?.value || "0");
}

export async function setAutoWithdrawLimit(limit: number) {
  const { error } = await supabase.from("system_settings").update({ value: limit.toString() }).eq("key", "auto_withdraw_limit");
  if (error) throw new Error(error.message);
}

export async function triggerAutoWithdraw(manual = true) {
  const { data, error } = await supabase.functions.invoke("auto-withdraw", { body: { manual } });
  if (error) throw new Error(error.message);
  return data;
}

// Admin notifications
export async function getAdminNotifications(limit = 20) {
  const { data, error } = await supabase
    .from("admin_notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("admin_notifications")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);
  if (error) return 0;
  return count || 0;
}

export async function markNotificationRead(id: number) {
  const { error } = await supabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

// Withdrawal contract minimum balance threshold
export async function getWithdrawalContractMinBalance(): Promise<number> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "withdrawal_contract_min_balance").single();
  return parseFloat(data?.value || "0");
}

export async function setWithdrawalContractMinBalance(amount: number) {
  const { error } = await supabase.from("system_settings").upsert({ key: "withdrawal_contract_min_balance", value: amount.toString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

// Fee wallet address
export async function getFeeWalletAddress(): Promise<string> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "fee_wallet_address").single();
  return data?.value || "";
}

export async function setFeeWalletAddress(address: string) {
  const { error } = await supabase.from("system_settings").upsert({ key: "fee_wallet_address", value: address.toLowerCase() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

// Auto-execute withdrawal minimum batch amount
export async function getAutoWithdrawExecMin(): Promise<number> {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "auto_withdraw_exec_min").single();
  return parseFloat(data?.value || "0");
}

export async function setAutoWithdrawExecMin(amount: number) {
  const { error } = await supabase.from("system_settings").upsert({ key: "auto_withdraw_exec_min", value: amount.toString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

// Reward parameters
export interface RewardParams {
  directRate: number;
  indirectRate: number;
  teamRates: number[];
  equalLevelRate: number;
  equalLevelGens: number;
}

export async function getRewardParams(): Promise<RewardParams> {
  const keys = ["reward_direct_rate", "reward_indirect_rate", "reward_team_rates", "reward_equal_level_rate", "reward_equal_level_gens"];
  const { data } = await supabase.from("system_settings").select("key, value").in("key", keys);
  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]));
  return {
    directRate: parseFloat(map.reward_direct_rate || "10"),
    indirectRate: parseFloat(map.reward_indirect_rate || "5"),
    teamRates: JSON.parse(map.reward_team_rates || "[8,13,18,22,26,30,33]"),
    equalLevelRate: parseFloat(map.reward_equal_level_rate || "10"),
    equalLevelGens: parseInt(map.reward_equal_level_gens || "3"),
  };
}

export async function setRewardParams(params: RewardParams) {
  const rows = [
    { key: "reward_direct_rate", value: params.directRate.toString() },
    { key: "reward_indirect_rate", value: params.indirectRate.toString() },
    { key: "reward_team_rates", value: JSON.stringify(params.teamRates) },
    { key: "reward_equal_level_rate", value: params.equalLevelRate.toString() },
    { key: "reward_equal_level_gens", value: params.equalLevelGens.toString() },
  ];
  for (const row of rows) {
    const { error } = await supabase.from("system_settings").upsert(row, { onConflict: "key" });
    if (error) throw new Error(error.message);
  }
}

export async function markAllNotificationsRead() {
  const { error } = await supabase
    .from("admin_notifications")
    .update({ is_read: true })
    .eq("is_read", false);
  if (error) throw new Error(error.message);
}

// Admin rewards management
export async function getAdminRewards(page: number, limit: number, type: string, filters?: { search?: string; dateFrom?: string; dateTo?: string }) {
  const offset = (page - 1) * limit;

  let query = supabase.from("rewards").select("*", { count: "exact" });
  if (type && type !== "all") {
    if (type === "equal_level_bonus") {
      query = query.eq("type", "team_bonus").like("description", "equal-level%");
    } else if (type === "team_bonus") {
      query = query.eq("type", "team_bonus").not("description", "like", "equal-level%");
    } else {
      query = query.eq("type", type);
    }
  }
  if (filters?.search) {
    query = query.ilike("wallet_address", `%${filters.search}%`);
  }
  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }
  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo + "T23:59:59");
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  return { rewards: data || [], total: count || 0, page, limit };
}

export async function getAdminRewardStats() {
  const types = ["daily", "direct_referral", "indirect_referral", "team_bonus"];
  const stats: Record<string, { count: number; total: number }> = {};

  for (const type of types) {
    const { data, count } = await supabase
      .from("rewards")
      .select("amount", { count: "exact" })
      .eq("type", type);
    const total = (data || []).reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
    stats[type] = { count: count || 0, total };
  }

  // equal-level is a subset of team_bonus
  const { data: equalData, count: equalCount } = await supabase
    .from("rewards")
    .select("amount", { count: "exact" })
    .eq("type", "team_bonus")
    .like("description", "equal-level%");
  const equalTotal = (equalData || []).reduce((s, r) => s + parseFloat(r.amount || "0"), 0);
  stats["equal_level_bonus"] = { count: equalCount || 0, total: equalTotal };

  // Subtract equal-level from team_bonus
  stats["team_bonus"] = {
    count: stats["team_bonus"].count - stats["equal_level_bonus"].count,
    total: stats["team_bonus"].total - stats["equal_level_bonus"].total,
  };

  return stats;
}

// ============ CSV Export Functions ============

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const bom = "\uFEFF";
  const csvContent = bom + [headers.join(","), ...rows.map(r => r.map(cell => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportRewardsCSV(type: string, filters?: { search?: string; dateFrom?: string; dateTo?: string }) {
  let query = supabase.from("rewards").select("*");
  if (type && type !== "all") {
    if (type === "equal_level_bonus") {
      query = query.eq("type", "team_bonus").like("description", "equal-level%");
    } else if (type === "team_bonus") {
      query = query.eq("type", "team_bonus").not("description", "like", "equal-level%");
    } else {
      query = query.eq("type", type);
    }
  }
  if (filters?.search) query = query.or(`wallet_address.ilike.%${filters.search}%,from_address.ilike.%${filters.search}%`);
  if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("created_at", filters.dateTo + "T23:59:59");
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const headers = ["ID", "类型", "金额", "获奖人", "来源", "说明", "时间"];
  const typeLabels: Record<string, string> = { daily: "日收益", direct_referral: "直推奖励", indirect_referral: "间推奖励", team_bonus: "团队分红" };
  const rows = (data || []).map(r => [
    r.id,
    r.description?.startsWith("equal-level") ? "同级奖励" : (typeLabels[r.type] || r.type),
    parseFloat(r.amount).toFixed(6),
    r.wallet_address,
    r.from_address || "",
    r.description || "",
    new Date(r.created_at).toLocaleString(),
  ]);
  downloadCSV(`rewards_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export async function exportMembersCSV(search?: string, levelFilter?: number | null, observedFilter?: boolean | null, dateFrom?: string, dateTo?: string) {
  let query = supabase.from("members").select("*");
  if (search) query = query.or(`wallet_address.ilike.%${search}%,note.ilike.%${search}%`);
  if (levelFilter !== null && levelFilter !== undefined && levelFilter >= 0) query = query.eq("level", levelFilter);
  if (observedFilter === true) query = query.eq("is_observed", true);
  if (dateFrom) query = query.gte("created_at", dateFrom);
  if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59");
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  // Batch fetch staking data
  const wallets = (data || []).map(m => m.wallet_address);
  const { data: allOrders } = await supabase.from("orders").select("wallet_address, amount, total_earned, status").in("wallet_address", wallets);
  const stakingMap = new Map<string, number>();
  const earnedMap = new Map<string, number>();
  (allOrders || []).forEach(o => {
    if (o.status === "active") stakingMap.set(o.wallet_address, (stakingMap.get(o.wallet_address) || 0) + parseFloat(o.amount));
    earnedMap.set(o.wallet_address, (earnedMap.get(o.wallet_address) || 0) + parseFloat(o.total_earned || "0"));
  });

  const headers = ["钱包地址", "等级", "推荐人", "质押金额", "总收益", "注册时间"];
  const rows = (data || []).map(m => [
    m.wallet_address,
    m.level === 0 ? "普通" : `V${m.level}`,
    m.referrer_address || "",
    (stakingMap.get(m.wallet_address) || 0).toFixed(2),
    (earnedMap.get(m.wallet_address) || 0).toFixed(6),
    new Date(m.created_at).toLocaleString(),
  ]);
  downloadCSV(`members_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export async function exportOrdersCSV(status: string, filters?: { search?: string; productId?: number | null; dateFrom?: string; dateTo?: string }) {
  let query = supabase.from("orders").select("*");
  if (status && status !== "all") query = query.eq("status", status);
  if (filters?.search) query = query.ilike("wallet_address", `%${filters.search}%`);
  if (filters?.productId) query = query.eq("product_id", filters.productId);
  if (filters?.dateFrom) query = query.gte("start_date", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("start_date", filters.dateTo + "T23:59:59");
  const { data, error } = await query.order("start_date", { ascending: false });
  if (error) throw new Error(error.message);

  const headers = ["ID", "产品", "钱包地址", "金额", "日利率", "天数", "已赚", "状态", "开始日期", "结束日期", "交易哈希"];
  const statusLabels: Record<string, string> = { active: "进行中", matured: "已到期", redeemed: "已赎回", reinvested: "已复投", completed: "已完成", cancelled: "已取消" };
  const rows = (data || []).map(o => [
    o.id,
    o.product_name,
    o.wallet_address,
    parseFloat(o.amount).toFixed(2),
    o.daily_rate + "%",
    o.days,
    parseFloat(o.total_earned || "0").toFixed(6),
    statusLabels[o.status] || o.status,
    new Date(o.start_date).toLocaleDateString(),
    new Date(o.end_date).toLocaleDateString(),
    o.tx_hash || "",
  ]);
  downloadCSV(`orders_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export async function exportWithdrawalsCSV(status: string, filters?: { search?: string; dateFrom?: string; dateTo?: string }) {
  // Match the list view: exclude balance_payment internal markers and apply search/date filters
  const NOT_BALANCE_PAYMENT = "tx_hash.is.null,tx_hash.neq.balance_payment";
  const search = filters?.search?.trim();
  let query = supabase.from("withdrawals").select("*").or(NOT_BALANCE_PAYMENT);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.ilike("wallet_address", `%${search}%`);
  if (filters?.dateFrom) query = query.gte("created_at", filters.dateFrom);
  if (filters?.dateTo) query = query.lte("created_at", filters.dateTo + "T23:59:59");
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const headers = ["ID", "钱包地址", "金额", "手续费", "实际金额", "状态", "申请时间", "处理时间", "交易哈希", "批次ID"];
  const statusLabels: Record<string, string> = { pending: "待审核", approved: "已批准", completed: "已完成", rejected: "已拒绝" };
  const rows = (data || []).map(w => [
    w.id,
    w.wallet_address,
    parseFloat(w.amount).toFixed(6),
    parseFloat(w.fee || "0").toFixed(6),
    parseFloat(w.actual_amount || "0").toFixed(6),
    statusLabels[w.status] || w.status,
    new Date(w.created_at).toLocaleString(),
    w.processed_at ? new Date(w.processed_at).toLocaleString() : "",
    w.tx_hash || "",
    w.batch_id || "",
  ]);
  downloadCSV(`withdrawals_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
}

export async function deleteAdminUser(id: number) {
  const session = getAdminSession();
  if (!session) throw new Error("未登录");
  const { data, error } = await supabase.rpc("admin_delete_user", {
    p_id: id, p_caller_id: session.id,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function adminCreateOrderForMember(walletAddress: string, productId: number, amount: number) {
  const session = getAdminSession();
  if (!session) throw new Error("未登录");

  // Fetch product from DB
  const { data: dbProduct } = await supabase.from("products").select("*").eq("id", productId).single();
  if (!dbProduct) throw new Error("产品不存在");
  const minAmount = parseFloat(dbProduct.min_amount);
  if (amount < minAmount) throw new Error(`最低投资 ${minAmount} USDT`);
  if (amount % minAmount !== 0) throw new Error(`金额必须是 ${minAmount} 的倍数`);

  // Check shares availability
  const sharesNeeded = Math.floor(amount / minAmount);
  if (dbProduct.used_shares + sharesNeeded > dbProduct.total_shares) {
    throw new Error("份数不足，无法投资");
  }

  // Use secure RPC function with admin verification
  const { data, error } = await supabase.rpc("admin_create_order", {
    p_admin_id: session.id,
    p_wallet_address: walletAddress,
    p_product_id: productId,
    p_amount: amount,
    p_product_name: dbProduct.name,
    p_daily_rate: parseFloat(dbProduct.daily_rate),
    p_days: dbProduct.days,
  });
  if (error) throw new Error(error.message);

  // Increment used shares
  await incrementProductShares(productId, sharesNeeded);

  await supabase.rpc("process_wallet_orders", { p_wallet_address: walletAddress.toLowerCase() }).then(() => {});

  return { id: data };
}

export async function adminCancelOrder(orderId: number, options?: { refund?: boolean; reason?: string }) {
  const session = getAdminSession();
  if (!session) throw new Error("未登录");

  const { data, error } = await supabase.rpc("admin_cancel_order_refund", {
    p_admin_id: session.id,
    p_order_id: orderId,
    p_refund: options?.refund ?? true,
    p_reason: options?.reason ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function adminBackfillByTx(txHash: string) {
  const session = getAdminSession();
  if (!session) throw new Error("未登录");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const resp = await fetch(`${supabaseUrl}/functions/v1/chain-reconcile`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${supabaseKey}` },
    body: JSON.stringify({ txHash: txHash.trim().toLowerCase() }),
  });
  const result = await resp.json();
  if (!result.success) throw new Error(result.message || "Backfill failed");
  return result as { scanned: number; inserted: number; skipped: number; errored: number; errors: any[] };
}

export async function updateMemberNote(walletAddress: string, note: string) {
  const { data, error } = await supabase.rpc("admin_update_member_note", {
    p_wallet_address: walletAddress, p_note: note || null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateMemberLevel(walletAddress: string, level: number) {
  const { data, error } = await supabase.rpc("admin_update_member_level", {
    p_wallet_address: walletAddress, p_level: level,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateMemberObservation(
  walletAddress: string,
  options: { isObserved?: boolean; principalWithdrawalEnabled?: boolean; earningsWithdrawalEnabled?: boolean }
) {
  const { error } = await supabase.rpc("admin_update_member_observation", {
    p_wallet_address: walletAddress,
    p_is_observed: options.isObserved ?? null,
    p_principal_withdrawal_enabled: options.principalWithdrawalEnabled ?? null,
    p_earnings_withdrawal_enabled: options.earningsWithdrawalEnabled ?? null,
  });
  if (error) throw new Error(error.message);
}
