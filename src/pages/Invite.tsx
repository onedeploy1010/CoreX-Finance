import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";
import { getTeamStats, getEarnings, getRewardsByWallet, getDirectReferrals, getIndirectReferrals, getTeamTree, getMember, getOrdersByWallet } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, UserPlus, Crown, ChevronRight, ChevronDown, Star, ArrowLeft, TrendingUp, BarChart3, Loader2, Wallet, Award } from "lucide-react";
import { LEVEL_CONFIG } from "@shared/schema";

interface MemberInfo {
  walletAddress: string;
  level: number;
  createdAt: string;
  stakingAmount: number;
  teamPerformance: number;
  teamAccounts: number;
  directCount: number;
  indirectCount: number;
  hasChildren: boolean;
  childrenCount: number;
}

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getLevelName(level: number) {
  if (level === 0) return "普通";
  return `V${level}`;
}

function getLevelColor(level: number) {
  const colors: Record<number, string> = {
    0: "rgba(255,255,255,0.4)",
    1: "#CD7F32",
    2: "#A8A8A8",
    3: "#C9A227",
    4: "#E8C547",
    5: "#C9A227",
    6: "#E8C547",
    7: "#FFD700",
  };
  return colors[level] || "#C9A227";
}

function MemberCard({ member, onDrillDown }: { member: MemberInfo; onDrillDown?: (addr: string) => void }) {
  return (
    <div className="product-card rounded-xl p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #C9A22733, #9A7A1A33)", border: "1px solid rgba(201,162,39,0.3)" }}>
            <Users size={15} style={{ color: "#C9A227" }} />
          </div>
          <div>
            <div className="text-sm font-semibold font-mono text-foreground">{shortAddr(member.walletAddress)}</div>
            <div className="text-xs text-muted-foreground">{new Date(member.createdAt).toLocaleDateString()} 加入</div>
          </div>
        </div>
        <Badge style={{
          background: member.level > 0 ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.06)",
          color: getLevelColor(member.level),
          border: member.level > 0 ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.1)"
        }}>
          {getLevelName(member.level)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-1.5 border-t" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">质押中</div>
          <div className="text-xs font-bold" style={{ color: member.stakingAmount > 0 ? "#C9A227" : "rgba(255,255,255,0.3)" }}>
            {member.stakingAmount > 0 ? `${member.stakingAmount.toLocaleString()}U` : "0"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">团队业绩</div>
          <div className="text-xs font-bold" style={{ color: "#E8C547" }}>{member.teamPerformance?.toLocaleString() || 0}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">有效账户</div>
          <div className="text-xs font-bold text-foreground">{member.teamAccounts || 0}个</div>
        </div>
      </div>

      {onDrillDown && member.hasChildren && (
        <Button
          data-testid={`button-drilldown-${member.walletAddress}`}
          size="sm"
          variant="outline"
          className="w-full text-xs font-semibold"
          style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", background: "rgba(201,162,39,0.06)" }}
          onClick={() => onDrillDown(member.walletAddress)}
        >
          <ChevronDown size={12} className="mr-1" />
          查看下线 ({member.childrenCount}人)
        </Button>
      )}
    </div>
  );
}

export default function InvitePage() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"referral" | "team" | "rewards" | "levels">("referral");
  const [refSubTab, setRefSubTab] = useState<"direct" | "indirect">("direct");
  const [rewardSubTab, setRewardSubTab] = useState<"direct_referral" | "indirect_referral" | "team_bonus" | "equal_level_bonus">("direct_referral");
  const address = account?.address?.toLowerCase();

  const [drillPath, setDrillPath] = useState<string[]>([]);
  const currentDrillAddr = drillPath.length > 0 ? drillPath[drillPath.length - 1] : address;

  const { data: memberData } = useQuery({
    queryKey: ["/api/members", address],
    queryFn: () => getMember(address!),
    enabled: !!address,
  });

  const { data: orderList = [] } = useQuery({
    queryKey: ["/api/orders", address],
    queryFn: () => getOrdersByWallet(address!),
    enabled: !!address,
  });

  const hasInvested = (orderList as any[]).length > 0;

  const { data: teamStats } = useQuery({
    queryKey: ["/api/members", address, "team-stats"],
    queryFn: () => getTeamStats(address!),
    enabled: !!address,
  });

  const { data: earningsData } = useQuery({
    queryKey: ["/api/earnings", address],
    queryFn: () => getEarnings(address!),
    enabled: !!address,
  });

  const { data: rewardList = [] } = useQuery({
    queryKey: ["/api/rewards", address],
    queryFn: () => getRewardsByWallet(address!),
    enabled: !!address,
  });

  const { data: directMembers = [], isLoading: directLoading } = useQuery({
    queryKey: ["/api/members", address, "direct"],
    queryFn: () => getDirectReferrals(address!),
    enabled: !!address,
  });

  const { data: indirectMembers = [], isLoading: indirectLoading } = useQuery({
    queryKey: ["/api/members", address, "indirect"],
    queryFn: () => getIndirectReferrals(address!),
    enabled: !!address,
  });

  const { data: drillChildren = [], isLoading: drillLoading } = useQuery({
    queryKey: ["/api/members", currentDrillAddr, "children"],
    queryFn: () => getTeamTree(currentDrillAddr!),
    enabled: !!currentDrillAddr && activeTab === "team",
  });

  const directRewards = parseFloat((earningsData as any)?.directRewards || "0");
  const indirectRewards = parseFloat((earningsData as any)?.indirectRewards || "0");
  const totalTeamRewards = parseFloat((earningsData as any)?.teamRewards || "0");

  // Split team_bonus into pure team bonus vs equal-level bonus using reward list
  const equalLevelTotal = (rewardList as any[])
    .filter((r: any) => r.type === "team_bonus" && r.description?.includes("equal-level"))
    .reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0);
  const teamRewards = totalTeamRewards - equalLevelTotal;

  const filteredRewards = (rewardList as any[]).filter((r: any) => {
    if (rewardSubTab === "equal_level_bonus") {
      return r.type === "team_bonus" && r.description?.includes("equal-level");
    }
    if (rewardSubTab === "team_bonus") {
      return r.type === "team_bonus" && !r.description?.includes("equal-level");
    }
    return r.type === rewardSubTab;
  });

  const referralLink = account?.address
    ? (hasInvested ? `${window.location.origin}/?ref=${account.address}` : "需要先投资才能邀请")
    : "请先连接钱包";

  const handleCopy = () => {
    if (!account) {
      toast({ title: "请先连接钱包", variant: "destructive" });
      return;
    }
    if (!hasInvested) {
      toast({ title: "需要先投资", description: "投资后才能生成邀请链接", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(referralLink);
    toast({ title: "推荐链接已复制" });
  };

  const handleDrillDown = (addr: string) => {
    setDrillPath(prev => [...prev, addr]);
  };

  const handleBack = () => {
    setDrillPath(prev => prev.slice(0, -1));
  };

  const handleBreadcrumb = (index: number) => {
    if (index === -1) {
      setDrillPath([]);
    } else {
      setDrillPath(prev => prev.slice(0, index + 1));
    }
  };

  if (!account) {
    return (
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-base">邀请中心</h2>
        </div>
        <div className="text-center py-16 text-muted-foreground">
          <Wallet size={40} className="mx-auto mb-3 opacity-30" />
          <p>请先连接钱包</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-base">邀请中心</h2>
      </div>

      <div
        className="rounded-xl p-4 space-y-3"
        style={{ background: "linear-gradient(135deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.25)" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <UserPlus size={15} style={{ color: "#C9A227" }} />
          <span className="text-sm font-semibold" style={{ color: "#C9A227" }}>我的推荐链接</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 rounded-lg px-3 py-2 text-xs font-mono truncate"
            style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.2)", color: "rgba(255,255,255,0.7)" }}
          >
            {referralLink}
          </div>
          <Button
            data-testid="button-copy-link"
            size="sm"
            className="shrink-0 font-bold"
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
            onClick={handleCopy}
          >
            <Copy size={13} className="mr-1" />
            复制
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card rounded-xl p-3 text-center">
          <Users size={14} className="mx-auto mb-1" style={{ color: "#C9A227" }} />
          <div className="flex items-center justify-center gap-4">
            <div>
              <div className="font-black text-lg" style={{ color: "#C9A227" }}>{(teamStats as any)?.directCount || 0}</div>
              <div className="text-[10px] text-muted-foreground">直推</div>
            </div>
            <div className="w-px h-6" style={{ background: "rgba(201,162,39,0.2)" }} />
            <div>
              <div className="font-black text-lg" style={{ color: "#E8C547" }}>{(teamStats as any)?.indirectCount || 0}</div>
              <div className="text-[10px] text-muted-foreground">间推</div>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-xl p-3 text-center">
          <Crown size={14} className="mx-auto mb-1" style={{ color: "#C9A227" }} />
          <div className="font-black text-xl" style={{ color: getLevelColor((memberData as any)?.level ?? 0) }}>{getLevelName((memberData as any)?.level ?? 0)}</div>
          <div className="text-[10px] text-muted-foreground">当前等级</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="stat-card rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-muted-foreground">直推奖励</div>
          <div className="font-bold text-xs" style={{ color: "#E8C547" }}>{directRewards.toFixed(2)} U</div>
        </div>
        <div className="stat-card rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-muted-foreground">间推奖励</div>
          <div className="font-bold text-xs" style={{ color: "#D4A832" }}>{indirectRewards.toFixed(2)} U</div>
        </div>
        <div className="stat-card rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-muted-foreground">团队奖励</div>
          <div className="font-bold text-xs" style={{ color: "#FFD700" }}>{teamRewards.toFixed(2)} U</div>
        </div>
        <div className="stat-card rounded-lg p-2.5 text-center">
          <div className="text-[10px] text-muted-foreground">同级奖励</div>
          <div className="font-bold text-xs" style={{ color: "#f97316" }}>{equalLevelTotal.toFixed(2)} U</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 size={12} style={{ color: "#C9A227" }} />
            <span className="text-[10px] text-muted-foreground">团队有效账户</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#C9A227" }}>{(teamStats as any)?.totalAccounts || 0}</div>
          <div className="text-[10px] text-muted-foreground">个 (质押中)</div>
        </div>
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} style={{ color: "#E8C547" }} />
            <span className="text-[10px] text-muted-foreground">团队质押业绩</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#E8C547" }}>{parseFloat((teamStats as any)?.totalStaking || "0").toLocaleString()}</div>
          <div className="text-[10px] text-muted-foreground">USDT</div>
        </div>
      </div>

      <div
        className="rounded-xl p-3"
        style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.2)" }}
      >
        <div className="text-xs font-semibold mb-2" style={{ color: "#C9A227" }}>推荐奖励规则</div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">直推奖励</span>
            <span className="font-semibold" style={{ color: "#E8C547" }}>被推荐人每日利息 x 10%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">间推奖励</span>
            <span className="font-semibold" style={{ color: "#E8C547" }}>被推荐人每日利息 x 5%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">团队奖励</span>
            <span className="font-semibold" style={{ color: "#E8C547" }}>团队总业绩 x 个人最高日利率 x 等级%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">同级奖励</span>
            <span className="font-semibold" style={{ color: "#E8C547" }}>同级下线团队奖励 x 10%</span>
          </div>
        </div>
      </div>

      <div className="flex rounded-lg p-1 gap-1" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
        {(["referral", "team", "rewards", "levels"] as const).map(tab => (
          <button
            key={tab}
            data-testid={`tab-${tab}`}
            className="flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200"
            style={activeTab === tab
              ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
              : { color: "rgba(255,255,255,0.5)" }}
            onClick={() => { setActiveTab(tab); if (tab === "team") setDrillPath([]); }}
          >
            {tab === "referral" ? "推荐" : tab === "team" ? "团队" : tab === "rewards" ? "奖励明细" : "等级制度"}
          </button>
        ))}
      </div>

      {activeTab === "referral" && (
        <div className="space-y-3">
          <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.1)" }}>
            <button
              data-testid="subtab-direct"
              className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200"
              style={refSubTab === "direct"
                ? { background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }
                : { color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}
              onClick={() => setRefSubTab("direct")}
            >
              直推会员 ({(directMembers as any[]).length})
            </button>
            <button
              data-testid="subtab-indirect"
              className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200"
              style={refSubTab === "indirect"
                ? { background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }
                : { color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}
              onClick={() => setRefSubTab("indirect")}
            >
              间推会员 ({(indirectMembers as any[]).length})
            </button>
          </div>

          {refSubTab === "direct" && (
            <>
              {directLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin" style={{ color: "#C9A227" }} />
                </div>
              ) : (directMembers as any[]).length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Users size={32} className="mx-auto mb-2 opacity-20" />
                  <p>暂无直推会员</p>
                  <p className="text-xs mt-1">分享推荐链接邀请好友加入</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(directMembers as any[]).map((m: any) => (
                    <MemberCard key={m.walletAddress} member={m} />
                  ))}
                </div>
              )}
            </>
          )}

          {refSubTab === "indirect" && (
            <>
              {indirectLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 size={20} className="animate-spin" style={{ color: "#C9A227" }} />
                </div>
              ) : (indirectMembers as any[]).length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Users size={32} className="mx-auto mb-2 opacity-20" />
                  <p>暂无间推会员</p>
                  <p className="text-xs mt-1">直推会员邀请的好友将出现在这里</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {(indirectMembers as any[]).map((m: any) => (
                    <MemberCard key={m.walletAddress} member={m} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-3">
          {drillPath.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                data-testid="button-team-back"
                onClick={handleBack}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all"
                style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}
              >
                <ArrowLeft size={12} />
                返回上级
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 flex-wrap px-1 py-1 rounded-lg" style={{ background: "rgba(201,162,39,0.04)" }}>
            <button
              onClick={() => handleBreadcrumb(-1)}
              className="text-xs font-mono transition-all px-1.5 py-0.5 rounded"
              style={{
                color: drillPath.length === 0 ? "#0c0a08" : "rgba(255,255,255,0.4)",
                fontWeight: drillPath.length === 0 ? 700 : 400,
                background: drillPath.length === 0 ? "linear-gradient(135deg, #C9A227, #9A7A1A)" : "transparent",
              }}
            >
              我的直推
            </button>
            {drillPath.map((addr, i) => (
              <div key={i} className="flex items-center gap-1">
                <ChevronRight size={10} className="text-muted-foreground" />
                <button
                  onClick={() => handleBreadcrumb(i)}
                  className="text-xs font-mono transition-all px-1.5 py-0.5 rounded"
                  style={{
                    color: i === drillPath.length - 1 ? "#0c0a08" : "rgba(255,255,255,0.4)",
                    fontWeight: i === drillPath.length - 1 ? 700 : 400,
                    background: i === drillPath.length - 1 ? "linear-gradient(135deg, #C9A227, #9A7A1A)" : "transparent",
                  }}
                >
                  {shortAddr(addr)}
                </button>
              </div>
            ))}
          </div>

          {drillLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: "#C9A227" }} />
            </div>
          ) : (drillChildren as any[]).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Users size={32} className="mx-auto mb-2 opacity-20" />
              <p>该会员暂无直推下线</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground px-1">
                共 {(drillChildren as any[]).length} 位直推会员
              </div>
              {(drillChildren as any[]).map((m: any) => (
                <MemberCard key={m.walletAddress} member={m} onDrillDown={handleDrillDown} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "rewards" && (
        <div className="space-y-3">
          <div className="flex rounded-lg p-0.5 gap-0.5" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.1)" }}>
            {([
              { key: "direct_referral" as const, label: "直推奖励" },
              { key: "indirect_referral" as const, label: "间推奖励" },
              { key: "team_bonus" as const, label: "团队奖励" },
              { key: "equal_level_bonus" as const, label: "同级奖励" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                className="flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-200"
                style={rewardSubTab === key
                  ? { background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }
                  : { color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}
                onClick={() => setRewardSubTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {rewardSubTab === "team_bonus" ? (
            /* Team bonus: show summary total based on team performance, not individual records */
            filteredRewards.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Award size={32} className="mx-auto mb-2 opacity-20" />
                <p>暂无团队奖励</p>
                <p className="text-xs mt-1">达到V1以上等级后可获得团队奖励</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table header */}
                <div className="grid grid-cols-4 gap-1 px-3 py-2 text-[10px] text-muted-foreground font-semibold"
                  style={{ background: "rgba(201,162,39,0.06)", borderRadius: "8px" }}>
                  <span>日期</span>
                  <span className="text-right">业绩</span>
                  <span className="text-right">最高利率</span>
                  <span className="text-right">奖励金额</span>
                </div>
                {/* Daily records */}
                {filteredRewards.map((reward: any) => {
                  // Parse description: "业绩:33400|利率:0.5|比例:13"
                  const desc = reward.description || "";
                  const perfMatch = desc.match(/业绩:(\d+)/);
                  const rateMatch = desc.match(/利率:([\d.]+)/);
                  const perf = perfMatch ? parseFloat(perfMatch[1]).toLocaleString() : "-";
                  const rate = rateMatch ? rateMatch[1] + "%" : "-";
                  return (
                    <div key={reward.id} className="grid grid-cols-4 gap-1 px-3 py-2.5 product-card rounded-lg items-center">
                      <span className="text-[11px] text-muted-foreground">{new Date(reward.createdAt).toLocaleDateString()}</span>
                      <span className="text-[11px] font-semibold text-right" style={{ color: "#E8C547" }}>{perf}</span>
                      <span className="text-[11px] font-semibold text-right" style={{ color: "#C9A227" }}>{rate}</span>
                      <span className="text-[11px] font-bold text-right" style={{ color: "#FFD700" }}>+{parseFloat(reward.amount).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredRewards.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Award size={32} className="mx-auto mb-2 opacity-20" />
              <p>暂无奖励记录</p>
            </div>
          ) : (
            filteredRewards.map((reward: any) => (
              <div
                key={reward.id}
                className="product-card rounded-xl p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.25)" }}>
                      {rewardSubTab === "direct_referral" ? <Users size={13} style={{ color: "#E8C547" }} /> :
                       rewardSubTab === "equal_level_bonus" ? <Star size={13} style={{ color: "#f97316" }} /> :
                       <ChevronRight size={13} style={{ color: "#D4A832" }} />}
                    </div>
                    <span className="text-xs font-semibold" style={{ color: "#C9A227" }}>
                      {rewardSubTab === "direct_referral" ? "直推奖励" : rewardSubTab === "equal_level_bonus" ? "同级奖励" : "间推奖励"}
                    </span>
                  </div>
                  <span className="font-bold text-sm" style={{ color: "#C9A227" }}>+{parseFloat(reward.amount).toFixed(2)} U</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-9">
                  {reward.fromAddress && (
                    <>
                      <span className="text-muted-foreground">来源账户</span>
                      <span className="font-mono text-right">
                        {shortAddr(reward.fromAddress)}
                        {reward.fromLevel > 0 && (
                          <span className="ml-1 px-1 py-0.5 rounded text-[9px] font-semibold" style={{ background: "rgba(201,162,39,0.12)", color: "#C9A227" }}>V{reward.fromLevel}</span>
                        )}
                        {reward.fromLevel === 0 && (
                          <span className="ml-1 px-1 py-0.5 rounded text-[9px]" style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)" }}>普通</span>
                        )}
                      </span>
                    </>
                  )}
                  {reward.productName && (
                    <>
                      <span className="text-muted-foreground">来源配套</span>
                      <span className="text-right">{reward.productName}</span>
                    </>
                  )}
                  {reward.orderAmount && (
                    <>
                      <span className="text-muted-foreground">配套金额</span>
                      <span className="text-right">{parseFloat(reward.orderAmount).toFixed(0)} U</span>
                    </>
                  )}
                  <span className="text-muted-foreground">时间</span>
                  <span className="text-right">{new Date(reward.createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "levels" && (
        <div className="space-y-2">
          {LEVEL_CONFIG.filter(l => l.level > 0).map((lvl) => {
            const color = getLevelColor(lvl.level);
            return (
              <div
                key={lvl.level}
                data-testid={`card-level-V${lvl.level}`}
                className="rounded-xl p-3 space-y-2"
                style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: `1px solid ${color}33` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
                      style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}>
                      V{lvl.level}
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color }}>
                        会员 V{lvl.level}
                      </div>
                      <div className="text-xs text-muted-foreground">伞下收益 {lvl.bonus}%</div>
                    </div>
                  </div>
                  <Star size={14} style={{ color }} />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t" style={{ borderColor: `${color}22` }}>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">人数要求</div>
                    <div className="text-xs font-bold" style={{ color }}>{lvl.people}人</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">金额要求</div>
                    <div className="text-xs font-bold" style={{ color }}>{(lvl.amount / 1000).toLocaleString()}K U</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">下级要求</div>
                    <div className="text-xs font-bold" style={{ color }}>
                      {lvl.subCount > 0 ? `${lvl.subCount}个V${lvl.subLevel}` : "-"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div className="text-xs text-muted-foreground text-center pt-1 pb-2">
            * 团队奖励 = 团队总业绩 x 个人最高日利率 x 等级% · 同级奖励 = 同级下线团队奖励 x 10%
          </div>
        </div>
      )}
    </div>
  );
}
