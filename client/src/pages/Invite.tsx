import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, UserPlus, Crown, ChevronRight, Star } from "lucide-react";

const MEMBER_LEVELS = [
  {
    level: "V1",
    teamInvestment: "500 USDT",
    accounts: 1,
    teamBonus: "0.5%",
    subLevels: "-",
    color: "#CD7F32",
  },
  {
    level: "V2",
    teamInvestment: "2,000 USDT",
    accounts: 3,
    teamBonus: "1%",
    subLevels: "1个V1",
    color: "#A8A8A8",
  },
  {
    level: "V3",
    teamInvestment: "10,000 USDT",
    accounts: 10,
    teamBonus: "1.5%",
    subLevels: "2个V2",
    color: "#C9A227",
  },
  {
    level: "V4",
    teamInvestment: "50,000 USDT",
    accounts: 30,
    teamBonus: "2%",
    subLevels: "2个V3",
    color: "#E8C547",
  },
  {
    level: "V5",
    teamInvestment: "150,000 USDT",
    accounts: 80,
    teamBonus: "2.5%",
    subLevels: "2个V4",
    color: "#C9A227",
  },
  {
    level: "V6",
    teamInvestment: "500,000 USDT",
    accounts: 200,
    teamBonus: "3%",
    subLevels: "2个V5",
    color: "#E8C547",
  },
  {
    level: "V7",
    teamInvestment: "2,000,000 USDT",
    accounts: 500,
    teamBonus: "5%",
    subLevels: "2个V6",
    color: "#FFD700",
  },
];

const MOCK_MEMBERS = [
  { address: "0x742d...F3a2", level: "V2", directInvest: 2000, joinDate: "2026-01-15" },
  { address: "0x9f3c...B891", level: "V1", directInvest: 500, joinDate: "2026-02-01" },
  { address: "0x1a2b...C543", level: "V1", directInvest: 1000, joinDate: "2026-02-10" },
  { address: "0x5e6f...D234", level: "V3", directInvest: 5000, joinDate: "2026-01-05" },
];

export default function InvitePage() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"members" | "levels">("members");

  const shortAddress = account?.address
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : "未连接";

  const referralLink = account?.address
    ? `https://corex.finance/?ref=${account.address.slice(0, 8)}`
    : "请先连接钱包";

  const handleCopy = () => {
    if (!account) {
      toast({ title: "请先连接钱包", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(referralLink);
    toast({ title: "推荐链接已复制" });
  };

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

      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card rounded-xl p-3 text-center">
          <div className="flex items-center justify-center mb-1.5">
            <Users size={16} style={{ color: "#C9A227" }} />
          </div>
          <div className="font-black text-xl" style={{ color: "#C9A227" }}>4</div>
          <div className="text-xs text-muted-foreground mt-0.5">直推人数</div>
        </div>
        <div className="stat-card rounded-xl p-3 text-center">
          <div className="flex items-center justify-center mb-1.5">
            <ChevronRight size={16} style={{ color: "#E8C547" }} />
          </div>
          <div className="font-black text-xl" style={{ color: "#E8C547" }}>12</div>
          <div className="text-xs text-muted-foreground mt-0.5">间推人数</div>
        </div>
        <div className="stat-card rounded-xl p-3 text-center">
          <div className="flex items-center justify-center mb-1.5">
            <Crown size={16} style={{ color: "#C9A227" }} />
          </div>
          <div className="font-black text-xl" style={{ color: "#C9A227" }}>V2</div>
          <div className="text-xs text-muted-foreground mt-0.5">当前等级</div>
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
            <span className="font-semibold" style={{ color: "#E8C547" }}>被推荐人每日利息 × 10%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">间推奖励</span>
            <span className="font-semibold" style={{ color: "#E8C547" }}>被推荐人每日利息 × 5%</span>
          </div>
        </div>
      </div>

      <div className="flex rounded-lg p-1 gap-1" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
        <button
          data-testid="tab-members"
          className="flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200"
          style={activeTab === "members"
            ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
            : { color: "rgba(255,255,255,0.5)" }}
          onClick={() => setActiveTab("members")}
        >
          直推会员
        </button>
        <button
          data-testid="tab-levels"
          className="flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200"
          style={activeTab === "levels"
            ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
            : { color: "rgba(255,255,255,0.5)" }}
          onClick={() => setActiveTab("levels")}
        >
          等级说明
        </button>
      </div>

      {activeTab === "members" && (
        <div className="space-y-2">
          {MOCK_MEMBERS.map((member, index) => (
            <div
              key={index}
              data-testid={`card-member-${index}`}
              className="product-card rounded-xl p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #C9A22733, #9A7A1A33)", border: "1px solid rgba(201,162,39,0.3)" }}>
                  <Users size={15} style={{ color: "#C9A227" }} />
                </div>
                <div>
                  <div className="text-sm font-semibold font-mono text-foreground">{member.address}</div>
                  <div className="text-xs text-muted-foreground">{member.joinDate} 加入</div>
                </div>
              </div>
              <div className="text-right">
                <Badge style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)" }}>
                  {member.level}
                </Badge>
                <div className="text-xs text-muted-foreground mt-1">{member.directInvest.toLocaleString()} U</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "levels" && (
        <div className="space-y-2">
          {MEMBER_LEVELS.map((lvl) => (
            <div
              key={lvl.level}
              data-testid={`card-level-${lvl.level}`}
              className="rounded-xl p-3 space-y-2"
              style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: `1px solid ${lvl.color}33` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
                    style={{ background: `${lvl.color}22`, border: `1px solid ${lvl.color}55`, color: lvl.color }}>
                    {lvl.level}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: lvl.color }}>会员 {lvl.level}</div>
                    <div className="text-xs text-muted-foreground">团队奖励 {lvl.teamBonus}</div>
                  </div>
                </div>
                <Star size={14} style={{ color: lvl.color }} />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 border-t" style={{ borderColor: `${lvl.color}22` }}>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">有效账户</div>
                  <div className="text-xs font-bold" style={{ color: lvl.color }}>{lvl.accounts}个</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">团队业绩</div>
                  <div className="text-xs font-bold" style={{ color: lvl.color }}>{lvl.teamInvestment}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">下级要求</div>
                  <div className="text-xs font-bold" style={{ color: lvl.color }}>{lvl.subLevels}</div>
                </div>
              </div>
            </div>
          ))}
          <div className="text-xs text-muted-foreground text-center pt-1 pb-2">
            * 升级条件需同时满足有效账户数、团队业绩和下级会员要求
          </div>
        </div>
      )}
    </div>
  );
}
