import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, UserPlus, Crown, ChevronRight, ChevronDown, Star, ArrowLeft, TrendingUp, BarChart3, Loader2, Wallet } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"referral" | "team">("referral");
  const address = account?.address?.toLowerCase();

  const [drillPath, setDrillPath] = useState<string[]>([]);
  const currentDrillAddr = drillPath.length > 0 ? drillPath[drillPath.length - 1] : address;

  const { data: teamStats } = useQuery({
    queryKey: ["/api/members", address, "team-stats"],
    enabled: !!address,
  });

  const { data: directMembers = [], isLoading: directLoading } = useQuery({
    queryKey: ["/api/members", address, "direct"],
    enabled: !!address,
  });

  const { data: indirectMembers = [], isLoading: indirectLoading } = useQuery({
    queryKey: ["/api/members", address, "indirect"],
    enabled: !!address,
  });

  const { data: drillChildren = [], isLoading: drillLoading } = useQuery({
    queryKey: ["/api/members", currentDrillAddr, "children"],
    enabled: !!currentDrillAddr && activeTab === "team",
  });

  const referralLink = account?.address
    ? `${window.location.origin}/?ref=${account.address}`
    : "请先连接钱包";

  const handleCopy = () => {
    if (!account) {
      toast({ title: "请先连接钱包", variant: "destructive" });
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
              <div className="font-black text-lg" style={{ color: "#C9A227" }}>{teamStats?.directCount || 0}</div>
              <div className="text-[10px] text-muted-foreground">直推</div>
            </div>
            <div className="w-px h-6" style={{ background: "rgba(201,162,39,0.2)" }} />
            <div>
              <div className="font-black text-lg" style={{ color: "#E8C547" }}>{teamStats?.indirectCount || 0}</div>
              <div className="text-[10px] text-muted-foreground">间推</div>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-xl p-3 text-center">
          <Crown size={14} className="mx-auto mb-1" style={{ color: "#C9A227" }} />
          <div className="font-black text-xl" style={{ color: getLevelColor(teamStats?.level || 0) }}>{getLevelName(teamStats?.level || 0)}</div>
          <div className="text-[10px] text-muted-foreground">当前等级</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 size={12} style={{ color: "#C9A227" }} />
            <span className="text-[10px] text-muted-foreground">团队有效账户</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#C9A227" }}>{teamStats?.totalAccounts || 0}</div>
          <div className="text-[10px] text-muted-foreground">个 (质押中)</div>
        </div>
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} style={{ color: "#E8C547" }} />
            <span className="text-[10px] text-muted-foreground">团队质押业绩</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#E8C547" }}>{parseFloat(teamStats?.totalStaking || "0").toLocaleString()}</div>
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
            <span className="text-muted-foreground">平级奖</span>
            <span className="font-semibold" style={{ color: "#E8C547" }}>V1-V7 拿团队收益 10%</span>
          </div>
        </div>
      </div>

      <div className="flex rounded-lg p-1 gap-1" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
        <button
          data-testid="tab-referral"
          className="flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200"
          style={activeTab === "referral"
            ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
            : { color: "rgba(255,255,255,0.5)" }}
          onClick={() => setActiveTab("referral")}
        >
          推荐
        </button>
        <button
          data-testid="tab-team"
          className="flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200"
          style={activeTab === "team"
            ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
            : { color: "rgba(255,255,255,0.5)" }}
          onClick={() => { setActiveTab("team"); setDrillPath([]); }}
        >
          直推会员
        </button>
      </div>

      {activeTab === "referral" && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full" style={{ background: "#C9A227" }} />
              <span className="text-sm font-bold text-foreground">直推会员 ({(directMembers as any[]).length})</span>
            </div>
            {directLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin" style={{ color: "#C9A227" }} />
              </div>
            ) : (directMembers as any[]).length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">暂无直推会员</div>
            ) : (
              <div className="space-y-2">
                {(directMembers as any[]).map((m: any) => (
                  <MemberCard key={m.walletAddress} member={m} />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full" style={{ background: "#E8C547" }} />
              <span className="text-sm font-bold text-foreground">间推会员 ({(indirectMembers as any[]).length})</span>
            </div>
            {indirectLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={20} className="animate-spin" style={{ color: "#C9A227" }} />
              </div>
            ) : (indirectMembers as any[]).length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">暂无间推会员</div>
            ) : (
              <div className="space-y-2">
                {(indirectMembers as any[]).map((m: any) => (
                  <MemberCard key={m.walletAddress} member={m} />
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-4 rounded-full" style={{ background: "#FFD700" }} />
              <span className="text-sm font-bold text-foreground">等级说明</span>
            </div>
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
                            {lvl.lifetimeLock && <span className="text-[10px] ml-1 opacity-70">(终身保级)</span>}
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
                * 平级奖: V1-V7 拿团队收益 10% · V6/V7 终身保级
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-3">
          {drillPath.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                data-testid="button-team-back"
                onClick={handleBack}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold transition-all"
                style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}
              >
                <ArrowLeft size={12} />
                返回
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 flex-wrap px-1">
            <button
              onClick={() => handleBreadcrumb(-1)}
              className="text-xs font-mono transition-all"
              style={{ color: drillPath.length === 0 ? "#C9A227" : "rgba(255,255,255,0.4)", fontWeight: drillPath.length === 0 ? 700 : 400 }}
            >
              我的直推
            </button>
            {drillPath.map((addr, i) => (
              <div key={i} className="flex items-center gap-1">
                <ChevronRight size={10} className="text-muted-foreground" />
                <button
                  onClick={() => handleBreadcrumb(i)}
                  className="text-xs font-mono transition-all"
                  style={{ color: i === drillPath.length - 1 ? "#C9A227" : "rgba(255,255,255,0.4)", fontWeight: i === drillPath.length - 1 ? 700 : 400 }}
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
            <div className="text-center py-8 text-muted-foreground text-sm">暂无下线</div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground px-1">共 {(drillChildren as any[]).length} 人</div>
              {(drillChildren as any[]).map((m: any) => (
                <MemberCard key={m.walletAddress} member={m} onDrillDown={handleDrillDown} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
