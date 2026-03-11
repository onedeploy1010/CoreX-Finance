import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminReferralTree } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Users, Network, ChevronRight, ChevronDown, Crown,
  GitBranch, UserPlus, Layers, ArrowLeft
} from "lucide-react";

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 8)}...${addr.slice(-4)}`;
}

function TreeNode({ member, depth = 0 }: { member: any; depth?: number }) {
  const [expanded, setExpanded] = useState(false);

  const { data: childrenData, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/referrals/tree", `?parent=${member.walletAddress}`],
    queryFn: () => getAdminReferralTree(undefined, member.walletAddress),
    enabled: expanded && member.hasChildren,
  });

  const children = (childrenData as any)?.members || [];

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg transition-all hover:brightness-110 cursor-pointer"
        style={{
          background: member.hasChildren
            ? "linear-gradient(135deg, rgba(201,162,39,0.06), rgba(201,162,39,0.02))"
            : "rgba(255,255,255,0.02)",
          border: member.hasChildren
            ? "1px solid rgba(201,162,39,0.15)"
            : "1px solid rgba(255,255,255,0.06)",
          marginLeft: depth > 0 ? 0 : undefined,
        }}
        onClick={() => member.hasChildren && setExpanded(!expanded)}
      >
        {/* Expand icon */}
        <div className="w-5 flex items-center justify-center shrink-0">
          {member.hasChildren ? (
            expanded ? (
              <ChevronDown size={14} style={{ color: "#C9A227" }} />
            ) : (
              <ChevronRight size={14} style={{ color: "rgba(201,162,39,0.6)" }} />
            )
          ) : (
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />
          )}
        </div>

        {/* Address */}
        <span className="text-xs font-mono text-foreground/80 min-w-0 truncate">
          {shortAddr(member.walletAddress)}
        </span>

        {/* Level badge */}
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
          style={{
            background: member.level > 0 ? "rgba(201,162,39,0.12)" : "rgba(255,255,255,0.05)",
            color: member.level > 0 ? "#C9A227" : "rgba(255,255,255,0.4)",
            border: member.level > 0 ? "1px solid rgba(201,162,39,0.25)" : "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {member.level === 0 ? "Normal" : `V${member.level}`}
        </span>

        {/* Direct count */}
        {member.directCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5"
            style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.15)" }}>
            <UserPlus size={9} /> {member.directCount}
          </span>
        )}

        {/* Team count */}
        {member.teamCount > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5"
            style={{ background: "rgba(59,130,246,0.08)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.15)" }}>
            <Users size={9} /> {member.teamCount}
          </span>
        )}

        {/* Staking */}
        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
          {parseFloat(member.stakingAmount || "0") > 0
            ? `${parseFloat(member.stakingAmount).toFixed(0)} U`
            : "0 U"
          }
        </span>

        {/* Registered date */}
        <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">
          {new Date(member.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Children */}
      {expanded && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 pl-3" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
          {isLoading ? (
            <div className="text-xs text-muted-foreground py-2 pl-2">Loading...</div>
          ) : children.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2 pl-2">No referrals</div>
          ) : (
            children.map((child: any) => (
              <TreeNode key={child.walletAddress} member={child} depth={depth + 1} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminReferrals() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/referrals/tree", search ? `?search=${search}` : ""],
    queryFn: () => getAdminReferralTree(search || undefined),
  });

  const treeMembers = (data as any)?.members || [];
  const stats = (data as any)?.stats;

  const handleSearch = () => {
    setSearch(searchInput);
  };

  const handleClear = () => {
    setSearch("");
    setSearchInput("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">推荐管理</h2>
        <Network size={16} style={{ color: "#C9A227" }} className="ml-1" />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl p-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Users size={14} style={{ color: "#C9A227" }} />
              <span className="text-[11px] text-muted-foreground">总会员</span>
            </div>
            <div className="font-black text-lg" style={{ color: "#C9A227" }}>{stats.totalMembers}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Crown size={14} style={{ color: "#C9A227" }} />
              <span className="text-[11px] text-muted-foreground">根节点</span>
            </div>
            <div className="font-black text-lg" style={{ color: "#C9A227" }}>{stats.rootCount}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
            <div className="flex items-center gap-2 mb-1">
              <GitBranch size={14} style={{ color: "#22c55e" }} />
              <span className="text-[11px] text-muted-foreground">有推荐人</span>
            </div>
            <div className="font-black text-lg" style={{ color: "#22c55e" }}>{stats.withReferrer}</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Layers size={14} style={{ color: "#3b82f6" }} />
              <span className="text-[11px] text-muted-foreground">最大深度</span>
            </div>
            <div className="font-black text-lg" style={{ color: "#3b82f6" }}>{stats.maxDepth} 层</div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="Search wallet address..."
            className="pl-9 text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
          />
        </div>
        <Button onClick={handleSearch} className="text-sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}>
          Search
        </Button>
        {search && (
          <Button variant="outline" onClick={handleClear} className="text-sm"
            style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "40px" }}>
            Clear
          </Button>
        )}
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Network size={12} />
        {search ? (
          <span>搜索结果: {treeMembers.length} 个匹配会员 (点击展开查看下级)</span>
        ) : (
          <span>推荐关系树 - 显示 {treeMembers.length} 个根节点 (无推荐人的会员，点击展开查看下级)</span>
        )}
      </div>

      {/* Tree */}
      <div className="rounded-xl p-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
        {isLoading ? (
          <div className="text-center text-muted-foreground py-10">加载中...</div>
        ) : treeMembers.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            <Users size={32} className="mx-auto mb-2 opacity-30" />
            <div className="text-sm">{search ? "未找到匹配的会员" : "暂无会员数据"}</div>
          </div>
        ) : (
          <div className="space-y-1">
            {treeMembers.map((m: any) => (
              <TreeNode key={m.walletAddress} member={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
