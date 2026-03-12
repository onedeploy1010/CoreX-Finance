import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";
import { getTeamStats, getEarnings, getRewardsByWallet, getDirectReferrals, getIndirectReferrals, getTeamTree, getMember, getOrdersByWallet } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, UserPlus, Crown, ChevronRight, ChevronDown, Star, ArrowLeft, TrendingUp, BarChart3, Loader2, Wallet, Award, Search } from "lucide-react";
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
    0: "rgba(255,255,255,0.5)",
    1: "#CD7F32",
    2: "#B0B0B0",
    3: "#D4AF37",
    4: "#F0D060",
    5: "#D4AF37",
    6: "#F0D060",
    7: "#FFD700",
  };
  return colors[level] || "#D4AF37";
}

// Shared card style with white border
const cardStyle = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.12)",
};

const cardStyleGold = {
  background: "rgba(201,162,39,0.04)",
  border: "1px solid rgba(201,162,39,0.2)",
};

function MemberCard({ member, onDrillDown }: { member: MemberInfo; onDrillDown?: (addr: string) => void }) {
  return (
    <div className="rounded-xl p-4 space-y-3" style={cardStyle}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "rgba(201,162,39,0.1)", border: "1px solid rgba(201,162,39,0.3)" }}>
            <Users size={16} style={{ color: "#D4AF37" }} />
          </div>
          <div>
            <div className="text-sm font-semibold font-mono" style={{ color: "#fff" }}>{shortAddr(member.walletAddress)}</div>
            <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{new Date(member.createdAt).toLocaleDateString()} 加入</div>
          </div>
        </div>
        <Badge className="px-2.5 py-1 text-xs font-bold" style={{
          background: member.level > 0 ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.06)",
          color: getLevelColor(member.level),
          border: member.level > 0 ? "1px solid rgba(201,162,39,0.35)" : "1px solid rgba(255,255,255,0.15)"
        }}>
          {getLevelName(member.level)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <div className="text-center">
          <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>质押中</div>
          <div className="text-sm font-bold" style={{ color: member.stakingAmount > 0 ? "#D4AF37" : "rgba(255,255,255,0.25)" }}>
            {member.stakingAmount > 0 ? `${member.stakingAmount.toLocaleString()}` : "0"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>团队业绩</div>
          <div className="text-sm font-bold" style={{ color: "#F0D060" }}>{member.teamPerformance?.toLocaleString() || 0}</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>有效账户</div>
          <div className="text-sm font-bold" style={{ color: "#fff" }}>{member.teamAccounts || 0}</div>
        </div>
      </div>

      {onDrillDown && member.hasChildren && (
        <Button
          data-testid={`button-drilldown-${member.walletAddress}`}
          size="sm"
          variant="outline"
          className="w-full text-xs font-semibold h-9"
          style={{ border: "1px solid rgba(201,162,39,0.3)", color: "#D4AF37", background: "rgba(201,162,39,0.06)" }}
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

  const [teamSearch, setTeamSearch] = useState("");
  const [teamLevelFilter, setTeamLevelFilter] = useState<number | null>(null);

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

  const handleDrillDown = (addr: string) => setDrillPath(prev => [...prev, addr]);
  const handleBack = () => setDrillPath(prev => prev.slice(0, -1));
  const handleBreadcrumb = (index: number) => {
    if (index === -1) setDrillPath([]);
    else setDrillPath(prev => prev.slice(0, index + 1));
  };

  if (!account) {
    return (
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(180deg, #D4AF37, #9A7A1A)" }} />
          <h2 className="font-bold text-lg" style={{ color: "#fff" }}>邀请中心</h2>
        </div>
        <div className="text-center py-20" style={{ color: "rgba(255,255,255,0.4)" }}>
          <Wallet size={44} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">请先连接钱包</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(180deg, #D4AF37, #9A7A1A)" }} />
        <h2 className="font-bold text-lg" style={{ color: "#fff" }}>邀请中心</h2>
      </div>

      {/* Referral link */}
      <div className="rounded-2xl p-5 space-y-4" style={cardStyleGold}>
        <div className="flex items-center gap-2">
          <UserPlus size={16} style={{ color: "#D4AF37" }} />
          <span className="text-sm font-semibold" style={{ color: "#D4AF37" }}>我的推荐链接</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 rounded-lg px-3 py-2.5 text-xs font-mono truncate"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
            {referralLink}
          </div>
          <Button data-testid="button-copy-link" size="sm" className="shrink-0 font-bold h-9 px-4"
            style={{ background: "linear-gradient(135deg, #D4AF37, #9A7A1A)", color: "#0c0a08" }}
            onClick={handleCopy}>
            <Copy size={13} className="mr-1.5" />
            复制
          </Button>
        </div>
      </div>

      {/* Stats overview - 3 columns */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3.5 text-center" style={cardStyle}>
          <Users size={15} className="mx-auto mb-2" style={{ color: "#D4AF37" }} />
          <div className="flex items-center justify-center gap-3">
            <div>
              <div className="font-black text-lg leading-none" style={{ color: "#D4AF37" }}>{(teamStats as any)?.directCount || 0}</div>
              <div className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>直推</div>
            </div>
            <div className="w-px h-5" style={{ background: "rgba(255,255,255,0.1)" }} />
            <div>
              <div className="font-black text-lg leading-none" style={{ color: "#F0D060" }}>{(teamStats as any)?.indirectCount || 0}</div>
              <div className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>间推</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl p-3.5 text-center" style={cardStyle}>
          <Crown size={15} className="mx-auto mb-2" style={{ color: "#D4AF37" }} />
          <div className="font-black text-xl leading-none" style={{ color: getLevelColor((memberData as any)?.level ?? 0) }}>
            {getLevelName((memberData as any)?.level ?? 0)}
          </div>
          <div className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>当前等级</div>
        </div>
        <div className="rounded-xl p-3.5 text-center" style={cardStyle}>
          <BarChart3 size={15} className="mx-auto mb-2" style={{ color: "#F0D060" }} />
          <div className="font-black text-lg leading-none" style={{ color: "#D4AF37" }}>{(teamStats as any)?.totalAccounts || 0}</div>
          <div className="text-[9px] mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>有效账户</div>
        </div>
      </div>

      {/* Team performance bar */}
      <div className="rounded-xl px-4 py-3.5 flex items-center justify-between" style={cardStyleGold}>
        <div className="flex items-center gap-2">
          <TrendingUp size={15} style={{ color: "#F0D060" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>团队总业绩</span>
        </div>
        <span className="font-black text-base" style={{ color: "#F0D060" }}>
          {parseFloat((teamStats as any)?.totalStaking || "0").toLocaleString()} <span className="text-xs font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>USDT</span>
        </span>
      </div>

      {/* Rewards summary - 4 columns */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: "直推", value: directRewards, color: "#F0D060" },
          { label: "间推", value: indirectRewards, color: "#D4AF37" },
          { label: "团队", value: teamRewards, color: "#FFD700" },
          { label: "同级", value: equalLevelTotal, color: "#FF8C00" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg py-2.5 px-2 text-center" style={cardStyle}>
            <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.4)" }}>{label}奖励</div>
            <div className="font-bold text-xs mt-1" style={{ color }}>{value.toFixed(2)}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl p-1 gap-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
        {(["referral", "team", "rewards", "levels"] as const).map(tab => (
          <button key={tab} data-testid={`tab-${tab}`}
            className="flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all duration-200"
            style={activeTab === tab
              ? { background: "linear-gradient(135deg, #D4AF37, #9A7A1A)", color: "#0c0a08" }
              : { color: "rgba(255,255,255,0.5)" }}
            onClick={() => { setActiveTab(tab); if (tab === "team") setDrillPath([]); }}>
            {tab === "referral" ? "推荐" : tab === "team" ? "团队" : tab === "rewards" ? "奖励明细" : "等级制度"}
          </button>
        ))}
      </div>

      {/* ===== TAB: REFERRAL ===== */}
      {activeTab === "referral" && (
        <div className="space-y-3">
          <div className="flex rounded-xl p-1 gap-1" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["direct", "indirect"] as const).map(sub => (
              <button key={sub} data-testid={`subtab-${sub}`}
                className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
                style={refSubTab === sub
                  ? { background: "rgba(201,162,39,0.12)", color: "#D4AF37", border: "1px solid rgba(201,162,39,0.3)" }
                  : { color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}
                onClick={() => setRefSubTab(sub)}>
                {sub === "direct" ? `直推会员 (${(directMembers as any[]).length})` : `间推会员 (${(indirectMembers as any[]).length})`}
              </button>
            ))}
          </div>
          {(() => {
            const members = refSubTab === "direct" ? directMembers : indirectMembers;
            const loading = refSubTab === "direct" ? directLoading : indirectLoading;
            const emptyText = refSubTab === "direct" ? "暂无直推会员" : "暂无间推会员";
            const emptyHint = refSubTab === "direct" ? "分享推荐链接邀请好友加入" : "直推会员邀请的好友将出现在这里";
            return loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={22} className="animate-spin" style={{ color: "#D4AF37" }} />
              </div>
            ) : (members as any[]).length === 0 ? (
              <div className="text-center py-16">
                <Users size={36} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>{emptyText}</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>{emptyHint}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(members as any[]).map((m: any) => (
                  <MemberCard key={m.walletAddress} member={m} />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ===== TAB: TEAM ===== */}
      {activeTab === "team" && (
        <div className="space-y-3">
          {drillPath.length > 0 && (
            <button data-testid="button-team-back" onClick={handleBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "rgba(201,162,39,0.08)", color: "#D4AF37", border: "1px solid rgba(201,162,39,0.2)" }}>
              <ArrowLeft size={13} /> 返回上级
            </button>
          )}

          <div className="flex items-center gap-1 flex-wrap px-2 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.02)" }}>
            <button onClick={() => handleBreadcrumb(-1)}
              className="text-xs font-mono px-2 py-1 rounded-md"
              style={{
                color: drillPath.length === 0 ? "#0c0a08" : "rgba(255,255,255,0.4)",
                fontWeight: drillPath.length === 0 ? 700 : 400,
                background: drillPath.length === 0 ? "linear-gradient(135deg, #D4AF37, #9A7A1A)" : "transparent",
              }}>
              我的直推
            </button>
            {drillPath.map((addr, i) => (
              <div key={i} className="flex items-center gap-1">
                <ChevronRight size={10} style={{ color: "rgba(255,255,255,0.3)" }} />
                <button onClick={() => handleBreadcrumb(i)}
                  className="text-xs font-mono px-2 py-1 rounded-md"
                  style={{
                    color: i === drillPath.length - 1 ? "#0c0a08" : "rgba(255,255,255,0.4)",
                    fontWeight: i === drillPath.length - 1 ? 700 : 400,
                    background: i === drillPath.length - 1 ? "linear-gradient(135deg, #D4AF37, #9A7A1A)" : "transparent",
                  }}>
                  {shortAddr(addr)}
                </button>
              </div>
            ))}
          </div>

          {/* Team filter bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-lg px-3 py-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <Search size={13} style={{ color: "rgba(255,255,255,0.3)" }} />
              <input
                type="text"
                placeholder="搜索地址..."
                value={teamSearch}
                onChange={e => setTeamSearch(e.target.value)}
                className="bg-transparent border-none outline-none text-xs flex-1"
                style={{ color: "#fff" }}
              />
            </div>
            <select
              value={teamLevelFilter ?? ""}
              onChange={e => setTeamLevelFilter(e.target.value === "" ? null : Number(e.target.value))}
              className="rounded-lg px-2.5 py-2 text-xs font-semibold outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#D4AF37" }}>
              <option value="" style={{ background: "#1a1a1a" }}>全部等级</option>
              {[0, 1, 2, 3, 4, 5, 6, 7].map(l => (
                <option key={l} value={l} style={{ background: "#1a1a1a" }}>{l === 0 ? "普通" : `V${l}`}</option>
              ))}
            </select>
          </div>

          {(() => {
            const allChildren = drillChildren as any[];
            const filtered = allChildren.filter((m: any) => {
              if (teamSearch && !m.walletAddress.toLowerCase().includes(teamSearch.toLowerCase())) return false;
              if (teamLevelFilter !== null && m.level !== teamLevelFilter) return false;
              return true;
            });
            return drillLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={22} className="animate-spin" style={{ color: "#D4AF37" }} />
              </div>
            ) : allChildren.length === 0 ? (
              <div className="text-center py-16">
                <Users size={36} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>该会员暂无直推下线</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16">
                <Search size={36} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>没有匹配的会员</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs px-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  共 {filtered.length} 位会员{(teamSearch || teamLevelFilter !== null) ? ` (筛选自 ${allChildren.length} 位)` : ""}
                </div>
                {filtered.map((m: any) => (
                  <MemberCard key={m.walletAddress} member={m} onDrillDown={handleDrillDown} />
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* ===== TAB: REWARDS ===== */}
      {activeTab === "rewards" && (
        <div className="space-y-3">
          <div className="flex rounded-xl p-1 gap-1" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)" }}>
            {([
              { key: "direct_referral" as const, label: "直推" },
              { key: "indirect_referral" as const, label: "间推" },
              { key: "team_bonus" as const, label: "团队" },
              { key: "equal_level_bonus" as const, label: "同级" },
            ]).map(({ key, label }) => (
              <button key={key}
                className="flex-1 py-2 text-xs font-semibold rounded-lg transition-all"
                style={rewardSubTab === key
                  ? { background: "rgba(201,162,39,0.12)", color: "#D4AF37", border: "1px solid rgba(201,162,39,0.3)" }
                  : { color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}
                onClick={() => setRewardSubTab(key)}>
                {label}
              </button>
            ))}
          </div>

          {rewardSubTab === "team_bonus" ? (
            filteredRewards.length === 0 ? (
              <div className="text-center py-16">
                <Award size={36} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>暂无团队奖励</p>
                <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>达到V1以上等级后可获得团队奖励</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Table header */}
                <div className="grid grid-cols-4 gap-2 px-4 py-3 text-[10px] font-semibold rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
                  <span>日期</span>
                  <span className="text-right">业绩</span>
                  <span className="text-right">最高利率</span>
                  <span className="text-right">奖励</span>
                </div>
                {filteredRewards.map((reward: any) => {
                  const desc = reward.description || "";
                  const perfMatch = desc.match(/业绩:(\d+)/);
                  const rateMatch = desc.match(/利率:([\d.]+)/);
                  const perf = perfMatch ? parseFloat(perfMatch[1]).toLocaleString() : "-";
                  const rate = rateMatch ? rateMatch[1] + "%" : "-";
                  return (
                    <div key={reward.id} className="grid grid-cols-4 gap-2 px-4 py-3.5 rounded-xl items-center" style={cardStyle}>
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{new Date(reward.createdAt).toLocaleDateString()}</span>
                      <span className="text-xs font-semibold text-right" style={{ color: "#F0D060" }}>{perf}</span>
                      <span className="text-xs font-semibold text-right" style={{ color: "#D4AF37" }}>{rate}</span>
                      <span className="text-xs font-bold text-right" style={{ color: "#FFD700" }}>+{parseFloat(reward.amount).toFixed(2)}</span>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredRewards.length === 0 ? (
            <div className="text-center py-16">
              <Award size={36} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.1)" }} />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>暂无奖励记录</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredRewards.map((reward: any) => (
                <div key={reward.id} className="rounded-xl p-4 space-y-2.5" style={cardStyle}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)" }}>
                        {rewardSubTab === "direct_referral" ? <Users size={14} style={{ color: "#F0D060" }} /> :
                         rewardSubTab === "equal_level_bonus" ? <Star size={14} style={{ color: "#FF8C00" }} /> :
                         <ChevronRight size={14} style={{ color: "#D4AF37" }} />}
                      </div>
                      <span className="text-xs font-semibold" style={{ color: "#D4AF37" }}>
                        {rewardSubTab === "direct_referral" ? "直推奖励" : rewardSubTab === "equal_level_bonus" ? "同级奖励" : "间推奖励"}
                      </span>
                    </div>
                    <span className="font-bold text-sm" style={{ color: "#FFD700" }}>+{parseFloat(reward.amount).toFixed(2)} U</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs pl-10">
                    {reward.fromAddress && (
                      <>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>来源账户</span>
                        <span className="font-mono text-right" style={{ color: "rgba(255,255,255,0.7)" }}>
                          {shortAddr(reward.fromAddress)}
                          {reward.fromLevel > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-semibold"
                              style={{ background: "rgba(201,162,39,0.12)", color: "#D4AF37" }}>V{reward.fromLevel}</span>
                          )}
                        </span>
                      </>
                    )}
                    {reward.productName && (
                      <>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>来源配套</span>
                        <span className="text-right" style={{ color: "rgba(255,255,255,0.7)" }}>{reward.productName}</span>
                      </>
                    )}
                    {reward.orderAmount && (
                      <>
                        <span style={{ color: "rgba(255,255,255,0.4)" }}>配套金额</span>
                        <span className="text-right" style={{ color: "rgba(255,255,255,0.7)" }}>{parseFloat(reward.orderAmount).toFixed(0)} U</span>
                      </>
                    )}
                    <span style={{ color: "rgba(255,255,255,0.4)" }}>时间</span>
                    <span className="text-right" style={{ color: "rgba(255,255,255,0.7)" }}>{new Date(reward.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB: LEVELS ===== */}
      {activeTab === "levels" && (
        <div className="space-y-3">
          {LEVEL_CONFIG.filter(l => l.level > 0).map((lvl) => {
            const color = getLevelColor(lvl.level);
            return (
              <div key={lvl.level} data-testid={`card-level-V${lvl.level}`}
                className="rounded-xl p-4 space-y-3"
                style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}30` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm"
                      style={{ background: `${color}18`, border: `1px solid ${color}50`, color }}>
                      V{lvl.level}
                    </div>
                    <div>
                      <div className="font-bold text-sm" style={{ color }}>会员 V{lvl.level}</div>
                      <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>团队奖励比例 {lvl.bonus}%</div>
                    </div>
                  </div>
                  <Star size={16} style={{ color, opacity: 0.5 }} />
                </div>
                <div className="grid grid-cols-3 gap-3 pt-3 border-t" style={{ borderColor: `${color}18` }}>
                  <div className="text-center">
                    <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>有效账户</div>
                    <div className="text-sm font-bold" style={{ color }}>{lvl.people}人</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>团队业绩</div>
                    <div className="text-sm font-bold" style={{ color }}>{(lvl.amount / 1000).toLocaleString()}K</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>下级要求</div>
                    <div className="text-sm font-bold" style={{ color }}>
                      {lvl.subCount > 0 ? `${lvl.subCount}个V${lvl.subLevel}` : "-"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Formula & equal-level explanation */}
          <div className="rounded-xl p-4 space-y-4" style={cardStyle}>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award size={14} style={{ color: "#D4AF37" }} />
                <span className="text-xs font-bold" style={{ color: "#D4AF37" }}>团队奖励公式</span>
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                团队总业绩 x 个人最高日利率 x 等级%
              </div>
            </div>
            <div className="border-t pt-3" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Star size={14} style={{ color: "#FF8C00" }} />
                <span className="text-xs font-bold" style={{ color: "#FF8C00" }}>同级奖励</span>
              </div>
              <div className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                推荐线上遇到同等级领导，可拿其团队奖励的10%，逐层递减，最多5层。
              </div>
              <div className="text-[10px] mt-2 leading-relaxed px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,140,0,0.06)", border: "1px solid rgba(255,140,0,0.1)", color: "rgba(255,255,255,0.35)" }}>
                例: A(V2) 团队奖励 21.71 → 同级B拿 2.171 → 同级C拿 0.217 → ... 最多5层
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
