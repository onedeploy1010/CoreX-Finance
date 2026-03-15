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
  }));
}

export async function getAdminProducts(): Promise<DBProduct[]> {
  const { data } = await supabase
    .from("products")
    .select("*")
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
  }));
}

export async function adminCreateProduct(params: {
  name: string; nameEn: string; days: number; dailyRate: number;
  minAmount: number; description: string; totalShares: number;
  usedShares: number; dailyGrowth: number;
}) {
  const { data: maxOrder } = await supabase.from("products").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const sortOrder = maxOrder && maxOrder.length > 0 ? maxOrder[0].sort_order + 1 : 0;
  const { data, error } = await supabase.from("products").insert({
    name: params.name, name_en: params.nameEn, days: params.days,
    daily_rate: params.dailyRate, min_amount: params.minAmount,
    description: params.description, total_shares: params.totalShares,
    used_shares: params.usedShares, daily_growth: params.dailyGrowth,
    sort_order: sortOrder,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}

export async function adminUpdateProduct(id: number, params: Partial<{
  name: string; nameEn: string; days: number; dailyRate: number;
  minAmount: number; description: string; totalShares: number;
  usedShares: number; dailyGrowth: number; isActive: boolean; sortOrder: number;
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

  // Check referrer exists
  const { data: referrer } = await supabase
    .from("members")
    .select("id, wallet_address")
    .eq("wallet_address", refAddr)
    .single();
  if (!referrer) {
    throw new Error("REFERRAL_REQUIRED");
  }

  // Referrer must have at least one order (invested) to invite others
  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true })
    .eq("wallet_address", refAddr);
  if (!orderCount || orderCount === 0) {
    throw new Error("REFERRER_NOT_INVESTED");
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
  // Fallback if RPC not available
  const { data: directs } = await supabase
    .from("members")
    .select("*")
    .eq("referrer_address", addr);
  return {
    totalAccounts: directs?.length || 0,
    totalStaking: "0",
    directCount: directs?.length || 0,
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
    // Use RPC function for atomic duplicate check + insert + settlement
    const { data, error } = await supabase.rpc("create_order_from_tx", {
      p_wallet_address: params.walletAddress,
      p_product_id: params.productId,
      p_amount: params.amount,
      p_tx_hash: params.txHash,
      p_product_name: params.productName,
      p_daily_rate: params.dailyRate,
      p_days: params.days,
    });
    if (error) throw new Error(error.message);
    return { id: data };
  }

  // Fallback for non-contract orders
  const { data, error } = await supabase
    .from("orders")
    .insert({
      wallet_address: params.walletAddress.toLowerCase(),
      product_id: params.productId,
      product_name: params.productName,
      amount: params.amount,
      daily_rate: params.dailyRate,
      days: params.days,
      end_date: params.endDate.toISOString(),
      tx_hash: null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  await supabase.rpc("process_wallet_orders", { p_wallet_address: params.walletAddress.toLowerCase() }).then(() => {});
  await supabase.rpc("check_and_upgrade_level", { p_wallet_address: params.walletAddress.toLowerCase() }).then(() => {});

  return data;
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
  }));
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
  // totalRewards excludes daily to avoid double counting with totalEarnings
  const totalRewards = directRewards + indirectRewards + teamRewards;

  const { data: wData } = await supabase
    .from("withdrawals")
    .select("amount")
    .eq("wallet_address", addr)
    .neq("status", "rejected");
  const totalWithdrawn = (wData || []).reduce((s, w) => s + parseFloat(w.amount), 0);

  // Use dailyRewards (from rewards table) + referral/team rewards - withdrawn
  const availableBalance = dailyRewards + totalRewards - totalWithdrawn;

  return {
    totalEarnings: totalEarnings.toFixed(6),
    totalRewards: totalRewards.toFixed(6),
    directRewards: directRewards.toFixed(6),
    indirectRewards: indirectRewards.toFixed(6),
    teamRewards: teamRewards.toFixed(6),
    dailyRewards: dailyRewards.toFixed(6),
    availableBalance: availableBalance.toFixed(6),
    totalWithdrawn: totalWithdrawn.toFixed(6),
  };
}

// ============ Rewards ============

// ============ Withdrawals ============

export async function createWithdrawal(walletAddress: string, amount: number, fee: number) {
  if (amount < WITHDRAW_MIN) throw new Error(`Minimum withdrawal is ${WITHDRAW_MIN} USDT`);
  const actualAmount = amount - fee;
  const { data, error } = await supabase
    .from("withdrawals")
    .insert({
      wallet_address: walletAddress.toLowerCase(),
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

export async function getAdminMembers(page: number, limit: number, search: string, levelFilter?: number | null) {
  const offset = (page - 1) * limit;

  let query = supabase.from("members").select("*", { count: "exact" });
  if (search) {
    query = query.ilike("wallet_address", `%${search}%`);
  }
  if (levelFilter !== null && levelFilter !== undefined && levelFilter >= 0) {
    query = query.eq("level", levelFilter);
  }
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
    member: { ...member, walletAddress: member.wallet_address, referrerAddress: member.referrer_address, lifetimeLock: member.lifetime_lock, createdAt: member.created_at },
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
    });
  }
  return result;
}

export async function getAdminOrders(page: number, limit: number, status: string, filters?: { search?: string; productId?: number | null; dateFrom?: string; dateTo?: string }) {
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

export async function getOrderShareStats() {
  const { data, error } = await supabase
    .from("orders")
    .select("product_id, product_name, amount, status");
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

export async function getAdminWithdrawals(page: number, limit: number, status: string) {
  const offset = (page - 1) * limit;

  let query = supabase.from("withdrawals").select("*", { count: "exact" });
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  const { data: list, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

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

export async function getAdminReferralTree(search?: string, parentAddr?: string) {
  if (parentAddr) {
    const children = await getAdminTeamTree(parentAddr);
    return { members: children };
  }

  let rootMembers;
  if (search) {
    const { data } = await supabase.from("members").select("*").ilike("wallet_address", `%${search}%`).order("created_at", { ascending: false }).limit(50);
    rootMembers = data || [];
  } else {
    const { data } = await supabase.from("members").select("*").is("referrer_address", null).order("created_at", { ascending: false });
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

export async function getAdminLogs(page: number, limit: number) {
  const { data, error } = await supabase.rpc("admin_get_logs", { p_page: page, p_limit: limit });
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
    query = query.or(`wallet_address.ilike.%${filters.search}%,from_address.ilike.%${filters.search}%`);
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

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + dbProduct.days);

  const { data, error } = await supabase
    .from("orders")
    .insert({
      wallet_address: walletAddress.toLowerCase(),
      product_id: productId,
      product_name: dbProduct.name,
      amount: amount.toString(),
      daily_rate: dbProduct.daily_rate.toString(),
      days: dbProduct.days,
      end_date: endDate.toISOString(),
      tx_hash: null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  // Increment used shares
  await incrementProductShares(productId, sharesNeeded);

  await supabase.rpc("process_wallet_orders", { p_wallet_address: walletAddress.toLowerCase() }).then(() => {});
  await supabase.rpc("check_and_upgrade_level", { p_wallet_address: walletAddress.toLowerCase() }).then(() => {});

  return data;
}

export async function adminCancelOrder(orderId: number) {
  const { data, error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("status", "active")
    .select()
    .single();
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
