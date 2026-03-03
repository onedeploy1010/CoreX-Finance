import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveAccount } from "thirdweb/react";
import { useToast } from "@/hooks/use-toast";
import { Copy, Users, UserPlus, Crown, ChevronRight, ChevronDown, Star, ArrowLeft, TrendingUp, Wallet, BarChart3 } from "lucide-react";

interface TeamMember {
  address: string;
  level: string;
  directInvest: number;
  stakingAmount: number;
  joinDate: string;
  directCount: number;
  indirectCount: number;
  teamPerformance: number;
  teamAccounts: number;
  children: TeamMember[];
}

const TEAM_TREE: TeamMember[] = [
  {
    address: "0x742d...F3a2",
    level: "V2",
    directInvest: 2000,
    stakingAmount: 2000,
    joinDate: "2026-01-15",
    directCount: 3,
    indirectCount: 5,
    teamPerformance: 12500,
    teamAccounts: 8,
    children: [
      {
        address: "0xA1b2...E456",
        level: "V1",
        directInvest: 1000,
        stakingAmount: 1000,
        joinDate: "2026-01-20",
        directCount: 2,
        indirectCount: 1,
        teamPerformance: 3500,
        teamAccounts: 3,
        children: [
          {
            address: "0xD3e4...7890",
            level: "-",
            directInvest: 500,
            stakingAmount: 500,
            joinDate: "2026-02-05",
            directCount: 1,
            indirectCount: 0,
            teamPerformance: 1000,
            teamAccounts: 1,
            children: [
              {
                address: "0xF5a6...B234",
                level: "-",
                directInvest: 500,
                stakingAmount: 500,
                joinDate: "2026-02-15",
                directCount: 0,
                indirectCount: 0,
                teamPerformance: 500,
                teamAccounts: 0,
                children: [],
              },
            ],
          },
          {
            address: "0xC7d8...9012",
            level: "-",
            directInvest: 1000,
            stakingAmount: 1000,
            joinDate: "2026-02-10",
            directCount: 0,
            indirectCount: 0,
            teamPerformance: 1000,
            teamAccounts: 0,
            children: [],
          },
        ],
      },
      {
        address: "0xE9f0...1234",
        level: "V1",
        directInvest: 3000,
        stakingAmount: 3000,
        joinDate: "2026-01-25",
        directCount: 1,
        indirectCount: 0,
        teamPerformance: 5000,
        teamAccounts: 1,
        children: [
          {
            address: "0x1a2b...5678",
            level: "-",
            directInvest: 2000,
            stakingAmount: 2000,
            joinDate: "2026-02-12",
            directCount: 0,
            indirectCount: 0,
            teamPerformance: 2000,
            teamAccounts: 0,
            children: [],
          },
        ],
      },
      {
        address: "0x3c4d...9abc",
        level: "-",
        directInvest: 500,
        stakingAmount: 500,
        joinDate: "2026-02-08",
        directCount: 0,
        indirectCount: 0,
        teamPerformance: 500,
        teamAccounts: 0,
        children: [],
      },
    ],
  },
  {
    address: "0x9f3c...B891",
    level: "V1",
    directInvest: 500,
    stakingAmount: 500,
    joinDate: "2026-02-01",
    directCount: 2,
    indirectCount: 3,
    teamPerformance: 4500,
    teamAccounts: 5,
    children: [
      {
        address: "0x5e6f...D234",
        level: "-",
        directInvest: 1000,
        stakingAmount: 1000,
        joinDate: "2026-02-15",
        directCount: 1,
        indirectCount: 1,
        teamPerformance: 2500,
        teamAccounts: 2,
        children: [
          {
            address: "0x7g8h...E567",
            level: "-",
            directInvest: 500,
            stakingAmount: 500,
            joinDate: "2026-02-20",
            directCount: 1,
            indirectCount: 0,
            teamPerformance: 1000,
            teamAccounts: 1,
            children: [
              {
                address: "0x9i0j...F890",
                level: "-",
                directInvest: 500,
                stakingAmount: 0,
                joinDate: "2026-02-25",
                directCount: 0,
                indirectCount: 0,
                teamPerformance: 0,
                teamAccounts: 0,
                children: [],
              },
            ],
          },
        ],
      },
      {
        address: "0xBc1d...2345",
        level: "-",
        directInvest: 1000,
        stakingAmount: 1000,
        joinDate: "2026-02-18",
        directCount: 0,
        indirectCount: 0,
        teamPerformance: 1000,
        teamAccounts: 0,
        children: [],
      },
    ],
  },
  {
    address: "0x1a2b...C543",
    level: "V1",
    directInvest: 1000,
    stakingAmount: 1000,
    joinDate: "2026-02-10",
    directCount: 1,
    indirectCount: 0,
    teamPerformance: 1500,
    teamAccounts: 1,
    children: [
      {
        address: "0xDe3f...6789",
        level: "-",
        directInvest: 500,
        stakingAmount: 500,
        joinDate: "2026-02-22",
        directCount: 0,
        indirectCount: 0,
        teamPerformance: 500,
        teamAccounts: 0,
        children: [],
      },
    ],
  },
  {
    address: "0x5e6f...D234",
    level: "V3",
    directInvest: 5000,
    stakingAmount: 5000,
    joinDate: "2026-01-05",
    directCount: 2,
    indirectCount: 4,
    teamPerformance: 18000,
    teamAccounts: 6,
    children: [
      {
        address: "0xGh4i...0123",
        level: "V1",
        directInvest: 3000,
        stakingAmount: 3000,
        joinDate: "2026-01-10",
        directCount: 2,
        indirectCount: 1,
        teamPerformance: 8000,
        teamAccounts: 3,
        children: [
          {
            address: "0xJk5l...4567",
            level: "-",
            directInvest: 2000,
            stakingAmount: 2000,
            joinDate: "2026-01-18",
            directCount: 1,
            indirectCount: 0,
            teamPerformance: 3000,
            teamAccounts: 1,
            children: [
              {
                address: "0xMn6o...8901",
                level: "-",
                directInvest: 1000,
                stakingAmount: 1000,
                joinDate: "2026-01-22",
                directCount: 0,
                indirectCount: 0,
                teamPerformance: 1000,
                teamAccounts: 0,
                children: [],
              },
            ],
          },
          {
            address: "0xPq7r...2345",
            level: "-",
            directInvest: 1000,
            stakingAmount: 1000,
            joinDate: "2026-01-20",
            directCount: 0,
            indirectCount: 0,
            teamPerformance: 1000,
            teamAccounts: 0,
            children: [],
          },
        ],
      },
      {
        address: "0xSt8u...6789",
        level: "-",
        directInvest: 2000,
        stakingAmount: 2000,
        joinDate: "2026-01-12",
        directCount: 0,
        indirectCount: 0,
        teamPerformance: 2000,
        teamAccounts: 0,
        children: [],
      },
    ],
  },
];

const MEMBER_LEVELS = [
  { level: "V1", teamInvestment: "500 USDT", accounts: 1, teamBonus: "0.5%", subLevels: "-", color: "#CD7F32" },
  { level: "V2", teamInvestment: "2,000 USDT", accounts: 3, teamBonus: "1%", subLevels: "1个V1", color: "#A8A8A8" },
  { level: "V3", teamInvestment: "10,000 USDT", accounts: 10, teamBonus: "1.5%", subLevels: "2个V2", color: "#C9A227" },
  { level: "V4", teamInvestment: "50,000 USDT", accounts: 30, teamBonus: "2%", subLevels: "2个V3", color: "#E8C547" },
  { level: "V5", teamInvestment: "150,000 USDT", accounts: 80, teamBonus: "2.5%", subLevels: "2个V4", color: "#C9A227" },
  { level: "V6", teamInvestment: "500,000 USDT", accounts: 200, teamBonus: "3%", subLevels: "2个V5", color: "#E8C547" },
  { level: "V7", teamInvestment: "2,000,000 USDT", accounts: 500, teamBonus: "5%", subLevels: "2个V6", color: "#FFD700" },
];

function calcTotals(members: TeamMember[]) {
  let totalAccounts = 0;
  let totalStaking = 0;
  const countAll = (list: TeamMember[]) => {
    for (const m of list) {
      if (m.stakingAmount > 0) totalAccounts++;
      totalStaking += m.stakingAmount;
      countAll(m.children);
    }
  };
  countAll(members);
  return { totalAccounts, totalStaking };
}

function collectIndirect(members: TeamMember[]): TeamMember[] {
  const result: TeamMember[] = [];
  for (const m of members) {
    for (const c of m.children) {
      result.push(c);
    }
  }
  return result;
}

interface BreadcrumbItem {
  address: string;
  members: TeamMember[];
}

function MemberCard({ member, onDrillDown }: { member: TeamMember; onDrillDown: (m: TeamMember) => void }) {
  return (
    <div
      data-testid={`card-member-${member.address}`}
      className="product-card rounded-xl p-3 space-y-2.5"
    >
      <div className="flex items-center justify-between">
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
        <div className="text-right flex flex-col items-end gap-1">
          <Badge style={{ background: member.level !== "-" ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.06)", color: member.level !== "-" ? "#C9A227" : "rgba(255,255,255,0.4)", border: member.level !== "-" ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.1)" }}>
            {member.level !== "-" ? member.level : "普通"}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 pt-1.5 border-t" style={{ borderColor: "rgba(201,162,39,0.12)" }}>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">质押中</div>
          <div className="text-xs font-bold" style={{ color: member.stakingAmount > 0 ? "#C9A227" : "rgba(255,255,255,0.3)" }}>
            {member.stakingAmount > 0 ? `${member.stakingAmount.toLocaleString()}U` : "0"}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">直推</div>
          <div className="text-xs font-bold text-foreground">{member.directCount}人</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">团队业绩</div>
          <div className="text-xs font-bold" style={{ color: "#E8C547" }}>{member.teamPerformance.toLocaleString()}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">有效账户</div>
          <div className="text-xs font-bold text-foreground">{member.teamAccounts}个</div>
        </div>
      </div>

      {member.children.length > 0 && (
        <Button
          data-testid={`button-drilldown-${member.address}`}
          size="sm"
          variant="outline"
          className="w-full text-xs font-semibold"
          style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", background: "rgba(201,162,39,0.06)" }}
          onClick={() => onDrillDown(member)}
        >
          <ChevronDown size={12} className="mr-1" />
          查看下线 ({member.children.length}人)
        </Button>
      )}
    </div>
  );
}

export default function InvitePage() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"direct" | "indirect" | "team" | "levels">("direct");

  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { address: "我的团队", members: TEAM_TREE }
  ]);

  const currentMembers = breadcrumbs[breadcrumbs.length - 1].members;

  const handleDrillDown = (member: TeamMember) => {
    setBreadcrumbs(prev => [...prev, { address: member.address, members: member.children }]);
  };

  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumbs(prev => prev.slice(0, index + 1));
  };

  const handleBack = () => {
    if (breadcrumbs.length > 1) {
      setBreadcrumbs(prev => prev.slice(0, -1));
    }
  };

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

  const indirectMembers = collectIndirect(TEAM_TREE);
  const { totalAccounts, totalStaking } = calcTotals(TEAM_TREE);

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
          <div className="flex items-center justify-center mb-1.5">
            <Users size={14} style={{ color: "#C9A227" }} />
          </div>
          <div className="flex items-center justify-center gap-4">
            <div>
              <div className="font-black text-lg" style={{ color: "#C9A227" }}>{TEAM_TREE.length}</div>
              <div className="text-[10px] text-muted-foreground">直推</div>
            </div>
            <div className="w-px h-6" style={{ background: "rgba(201,162,39,0.2)" }} />
            <div>
              <div className="font-black text-lg" style={{ color: "#E8C547" }}>{indirectMembers.length}</div>
              <div className="text-[10px] text-muted-foreground">间推</div>
            </div>
          </div>
        </div>
        <div className="stat-card rounded-xl p-3 text-center">
          <div className="flex items-center justify-center mb-1.5">
            <Crown size={14} style={{ color: "#C9A227" }} />
          </div>
          <div className="font-black text-xl" style={{ color: "#C9A227" }}>V2</div>
          <div className="text-[10px] text-muted-foreground">当前等级</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <BarChart3 size={12} style={{ color: "#C9A227" }} />
            <span className="text-[10px] text-muted-foreground">团队有效账户</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#C9A227" }}>{totalAccounts}</div>
          <div className="text-[10px] text-muted-foreground">个 (质押中)</div>
        </div>
        <div className="stat-card rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} style={{ color: "#E8C547" }} />
            <span className="text-[10px] text-muted-foreground">团队质押业绩</span>
          </div>
          <div className="font-black text-lg" style={{ color: "#E8C547" }}>{totalStaking.toLocaleString()}</div>
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
        </div>
      </div>

      <div className="flex rounded-lg p-1 gap-0.5" style={{ background: "rgba(201,162,39,0.06)", border: "1px solid rgba(201,162,39,0.15)" }}>
        {([
          { key: "direct", label: "直推会员" },
          { key: "indirect", label: "间推会员" },
          { key: "team", label: "团队下线" },
          { key: "levels", label: "等级说明" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            data-testid={`tab-${tab.key}`}
            className="flex-1 py-2 text-xs font-semibold rounded-md transition-all duration-200"
            style={activeTab === tab.key
              ? { background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }
              : { color: "rgba(255,255,255,0.5)" }}
            onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === "team") {
                setBreadcrumbs([{ address: "我的团队", members: TEAM_TREE }]);
              }
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "direct" && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground px-1">共 {TEAM_TREE.length} 位直推会员</div>
          {TEAM_TREE.map((member) => (
            <MemberCard
              key={member.address}
              member={member}
              onDrillDown={handleDrillDown}
            />
          ))}
        </div>
      )}

      {activeTab === "indirect" && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground px-1">共 {indirectMembers.length} 位间推会员 (直推的下线)</div>
          {indirectMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">暂无间推会员</div>
          ) : (
            indirectMembers.map((member) => (
              <MemberCard
                key={member.address}
                member={member}
                onDrillDown={handleDrillDown}
              />
            ))
          )}
        </div>
      )}

      {activeTab === "team" && (
        <div className="space-y-2">
          {breadcrumbs.length > 1 && (
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
            {breadcrumbs.map((bc, index) => (
              <div key={index} className="flex items-center gap-1">
                {index > 0 && <ChevronRight size={10} className="text-muted-foreground" />}
                <button
                  data-testid={`breadcrumb-${index}`}
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-xs font-mono transition-all"
                  style={{
                    color: index === breadcrumbs.length - 1 ? "#C9A227" : "rgba(255,255,255,0.4)",
                    fontWeight: index === breadcrumbs.length - 1 ? 700 : 400,
                  }}
                >
                  {bc.address}
                </button>
              </div>
            ))}
          </div>

          {(() => {
            const cm = currentMembers;
            const sub = calcTotals(cm);
            return (
              <div className="grid grid-cols-3 gap-2">
                <div className="stat-card rounded-lg p-2 text-center">
                  <div className="text-[10px] text-muted-foreground">当前层级人数</div>
                  <div className="font-bold text-sm" style={{ color: "#C9A227" }}>{cm.length}</div>
                </div>
                <div className="stat-card rounded-lg p-2 text-center">
                  <div className="text-[10px] text-muted-foreground">有效账户</div>
                  <div className="font-bold text-sm" style={{ color: "#E8C547" }}>{sub.totalAccounts}</div>
                </div>
                <div className="stat-card rounded-lg p-2 text-center">
                  <div className="text-[10px] text-muted-foreground">质押业绩</div>
                  <div className="font-bold text-sm" style={{ color: "#C9A227" }}>{sub.totalStaking.toLocaleString()}U</div>
                </div>
              </div>
            );
          })()}

          <div className="text-xs text-muted-foreground px-1">共 {currentMembers.length} 人</div>

          {currentMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">该会员暂无下线</div>
          ) : (
            currentMembers.map((member) => (
              <MemberCard
                key={member.address}
                member={member}
                onDrillDown={(m) => {
                  setBreadcrumbs(prev => [...prev, { address: m.address, members: m.children }]);
                }}
              />
            ))
          )}
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
