import { supabase } from "./supabase";

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
  // Trigger settlement first
  await supabase.rpc("process_wallet_orders", { p_wallet_address: walletAddress.toLowerCase() }).then(() => {});

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

  // Trigger settlement first
  await supabase.rpc("process_wallet_orders", { p_wallet_address: addr }).then(() => {});

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
  if (amount < 30) throw new Error("Minimum withdrawal is 30 USDT");
  if (amount % 10 !== 0) throw new Error("Amount must be a multiple of 10 USDT");
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

export async function getAdminMembers(page: number, limit: number, search: string) {
  const offset = (page - 1) * limit;

  let query = supabase.from("members").select("*", { count: "exact" });
  if (search) {
    query = query.ilike("wallet_address", `%${search}%`);
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
    const { data: activeOrders } = await supabase.from("orders").select("amount").eq("wallet_address", d.wallet_address).eq("status", "active");
    const stakingAmount = (activeOrders || []).reduce((sum, o) => sum + parseFloat(o.amount), 0);
    const { count: childrenCount } = await supabase.from("members").select("*", { count: "exact", head: true }).eq("referrer_address", d.wallet_address);

    result.push({
      ...d,
      walletAddress: d.wallet_address,
      referrerAddress: d.referrer_address,
      lifetimeLock: d.lifetime_lock,
      createdAt: d.created_at,
      stakingAmount,
      childrenCount: childrenCount || 0,
      hasChildren: (childrenCount || 0) > 0,
    });
  }
  return result;
}

export async function getAdminOrders(page: number, limit: number, status: string) {
  const offset = (page - 1) * limit;

  let query = supabase.from("orders").select("*", { count: "exact" });
  if (status && status !== "all") {
    query = query.eq("status", status);
  }
  const { data: orderList, count, error } = await query
    .order("start_date", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);

  const enriched = (orderList || []).map(o => {
    const dailyEarning = parseFloat(o.amount) * parseFloat(o.daily_rate) / 100;
    const startDate = new Date(o.start_date);
    const now = new Date();
    const elapsed = Math.min(Math.floor((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)), o.days);

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

    enriched.push({
      ...m,
      walletAddress: m.wallet_address,
      referrerAddress: m.referrer_address,
      createdAt: m.created_at,
      stakingAmount: staking.toFixed(6),
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

export async function deleteAdminUser(id: number) {
  const session = getAdminSession();
  if (!session) throw new Error("未登录");
  const { data, error } = await supabase.rpc("admin_delete_user", {
    p_id: id, p_caller_id: session.id,
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
