import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminReferralTree, getAdminMemberDetail } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search, Users, Network, ChevronRight, ChevronDown, Crown,
  GitBranch, UserPlus, Layers, Eye, X, ShoppingCart,
  Wallet, ArrowDownToLine, Gift, Minimize2, Maximize2, FoldVertical
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CopyableAddress } from "@/components/CopyableAddress";

// ─── Member Detail Dialog ───────────────────────────────────────────
function MemberDetailDialog({ address, open, onClose }: { address: string; open: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/member-detail", address],
    queryFn: () => getAdminMemberDetail(address),
    enabled: open && !!address,
  });

  const member = data?.member;
  const orders = data?.orders || [];
  const rewards = data?.rewards || [];
  const withdrawals = data?.withdrawals || [];
  const directReferrals = data?.directReferrals || [];

  const activeOrders = orders.filter((o: any) => o.status === "active");
  const totalStaking = activeOrders.reduce((s: number, o: any) => s + parseFloat(o.amount), 0);
  const totalEarnings = rewards.reduce((s: number, r: any) => s + parseFloat(r.amount || "0"), 0);
  const totalWithdrawn = withdrawals.filter((w: any) => w.status === "completed").reduce((s: number, w: any) => s + parseFloat(w.amount || "0"), 0);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto max-h-[85vh] overflow-y-auto" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
        <DialogHeader>
          <DialogTitle className="text-center" style={{ color: "#C9A227" }}>会员详情</DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ""}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">加载中...</div>
        ) : !member ? (
          <div className="text-center text-muted-foreground py-8">未找到会员</div>
        ) : (
          <div className="space-y-4 py-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "等级", value: member.level === 0 ? "普通" : `V${member.level}`, icon: Crown, color: "#C9A227" },
                { label: "直推人数", value: directReferrals.length, icon: UserPlus, color: "#22c55e" },
                { label: "活跃投资", value: `${totalStaking.toFixed(0)} U`, icon: ShoppingCart, color: "#3b82f6" },
                { label: "总收益", value: `${totalEarnings.toFixed(2)} U`, icon: Gift, color: "#C9A227" },
                { label: "已提现", value: `${totalWithdrawn.toFixed(2)} U`, icon: ArrowDownToLine, color: "#ef4444" },
                { label: "注册时间", value: new Date(member.createdAt).toLocaleDateString(), icon: Wallet, color: "rgba(255,255,255,0.5)" },
              ].map((item) => (
                <div key={item.label} className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <item.icon size={11} style={{ color: item.color }} />
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  </div>
                  <div className="text-sm font-bold" style={{ color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Referrer */}
            {member.referrerAddress && (
              <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-[10px] text-muted-foreground">推荐人</span>
                <div className="font-mono text-xs mt-0.5" style={{ color: "#C9A227" }}>
                  {member.referrerAddress}
                </div>
              </div>
            )}

            {/* Orders */}
            {orders.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <ShoppingCart size={12} style={{ color: "#C9A227" }} />
                  <span className="text-xs font-semibold text-foreground">订单 ({orders.length})</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {orders.map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <span className="font-medium text-foreground">{o.product_name}</span>
                        <span className="text-muted-foreground ml-2">{parseFloat(o.amount).toFixed(0)} U</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${o.status === "active" ? "text-green-400 bg-green-400/10" : o.status === "completed" ? "text-blue-400 bg-blue-400/10" : "text-muted-foreground bg-white/5"}`}>
                        {o.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rewards */}
            {rewards.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Gift size={12} style={{ color: "#C9A227" }} />
                  <span className="text-xs font-semibold text-foreground">收益记录 ({rewards.length})</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {rewards.slice(0, 20).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div>
                        <span className="text-muted-foreground">{r.type}</span>
                      </div>
                      <span className="font-medium" style={{ color: "#C9A227" }}>+{parseFloat(r.amount).toFixed(4)} U</span>
                    </div>
                  ))}
                  {rewards.length > 20 && <div className="text-center text-[10px] text-muted-foreground py-1">...还有 {rewards.length - 20} 条</div>}
                </div>
              </div>
            )}

            {/* Direct Referrals */}
            {directReferrals.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <UserPlus size={12} style={{ color: "#22c55e" }} />
                  <span className="text-xs font-semibold text-foreground">直推会员 ({directReferrals.length})</span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {directReferrals.map((d: any) => (
                    <div key={d.wallet_address} className="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs"
                      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <span className="font-mono text-foreground/70">{d.wallet_address.slice(0, 8)}...{d.wallet_address.slice(-6)}</span>
                      <span className="text-[10px]" style={{ color: d.level > 0 ? "#C9A227" : "rgba(255,255,255,0.4)" }}>
                        {d.level === 0 ? "普通" : `V${d.level}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Tree Node ──────────────────────────────────────────────────────
function TreeNode({
  member,
  depth = 0,
  collapsedDepths,
  onToggleCollapse,
  onViewMember,
  reportDepth,
}: {
  member: any;
  depth?: number;
  collapsedDepths: Set<number>;
  onToggleCollapse: (depth: number) => void;
  onViewMember: (address: string) => void;
  reportDepth?: (d: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Report this depth
  reportDepth?.(depth);

  const { data: childrenData, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/referrals/tree", `?parent=${member.walletAddress}`],
    queryFn: () => getAdminReferralTree(undefined, member.walletAddress),
    enabled: expanded && member.hasChildren,
  });

  const children = (childrenData as any)?.members || [];
  const isCollapsed = collapsedDepths.has(depth);

  return (
    <div>
      {/* Node row - collapsed mode shows minimal */}
      {isCollapsed ? (
        <div
          className="flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-all"
          style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.08)" }}
          onClick={() => onToggleCollapse(depth)}
        >
          <Maximize2 size={10} style={{ color: "rgba(201,162,39,0.5)" }} />
          <span className="text-[10px] text-muted-foreground truncate">
            {member.walletAddress.slice(0, 6)}...{member.walletAddress.slice(-4)}
          </span>
          <span className="text-[10px] px-1 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
            L{depth}
          </span>
          {member.hasChildren && expanded && (
            <span className="text-[10px] text-muted-foreground">({children.length} 下级)</span>
          )}
        </div>
      ) : (
        <>
          <div
            className="flex items-center gap-2 py-2 px-3 rounded-lg transition-all hover:brightness-110 group"
            style={{
              background: member.hasChildren
                ? "linear-gradient(135deg, rgba(201,162,39,0.06), rgba(201,162,39,0.02))"
                : "rgba(255,255,255,0.02)",
              border: member.hasChildren
                ? "1px solid rgba(201,162,39,0.15)"
                : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Expand icon */}
            <div
              className="w-5 flex items-center justify-center shrink-0 cursor-pointer"
              onClick={() => member.hasChildren && setExpanded(!expanded)}
            >
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

            {/* Address - clickable for detail */}
            <div
              className="min-w-0 cursor-pointer hover:underline"
              onClick={() => onViewMember(member.walletAddress)}
            >
              <CopyableAddress address={member.walletAddress} className="text-foreground/80" />
            </div>

            {/* Level badge */}
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0"
              style={{
                background: member.level > 0 ? "rgba(201,162,39,0.12)" : "rgba(255,255,255,0.05)",
                color: member.level > 0 ? "#C9A227" : "rgba(255,255,255,0.4)",
                border: member.level > 0 ? "1px solid rgba(201,162,39,0.25)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {member.level === 0 ? "普通" : `V${member.level}`}
            </span>

            {/* Direct count */}
            {member.directCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded shrink-0 flex items-center gap-0.5"
                style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.15)" }}>
                <UserPlus size={9} /> {member.directCount}
              </span>
            )}

            {/* Depth label */}
            <span className="text-[10px] px-1 py-0.5 rounded shrink-0" style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.3)" }}>
              L{depth}
            </span>

            {/* View detail button */}
            <button
              className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              style={{ background: "rgba(201,162,39,0.1)" }}
              onClick={(e) => { e.stopPropagation(); onViewMember(member.walletAddress); }}
              title="查看详情"
            >
              <Eye size={11} style={{ color: "#C9A227" }} />
            </button>

            {/* Collapse this layer */}
            {depth > 0 && (
              <button
                className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                style={{ background: "rgba(255,255,255,0.04)" }}
                onClick={(e) => { e.stopPropagation(); onToggleCollapse(depth); }}
                title={`折叠第${depth}层`}
              >
                <Minimize2 size={10} style={{ color: "rgba(255,255,255,0.4)" }} />
              </button>
            )}
          </div>

          {/* Detail row */}
          <div className="flex items-center gap-3 pl-7 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">
              个人投资: <span style={{ color: "#C9A227" }}>{parseFloat(member.stakingAmount || "0").toFixed(0)}U</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              伞下总投资: <span style={{ color: "#3b82f6" }}>{(member.teamStaking || 0).toFixed(0)}U</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              有效账户: <span style={{ color: "#22c55e" }}>{member.teamActiveAccounts || 0}</span>
            </span>
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              {new Date(member.createdAt).toLocaleDateString()}
            </span>
          </div>
        </>
      )}

      {/* Children */}
      {expanded && !isCollapsed && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 pl-3" style={{ borderColor: "rgba(201,162,39,0.15)" }}>
          {isLoading ? (
            <div className="text-xs text-muted-foreground py-2 pl-2">Loading...</div>
          ) : children.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2 pl-2">无下级</div>
          ) : (
            children.map((child: any) => (
              <TreeNode
                key={child.walletAddress}
                member={child}
                depth={depth + 1}
                collapsedDepths={collapsedDepths}
                onToggleCollapse={onToggleCollapse}
                onViewMember={onViewMember}
                reportDepth={reportDepth}
              />
            ))
          )}
        </div>
      )}

      {/* Show collapsed children indicator */}
      {expanded && isCollapsed && children.length > 0 && (
        <div className="ml-4 mt-1 space-y-0.5 border-l-2 pl-3" style={{ borderColor: "rgba(201,162,39,0.08)" }}>
          {children.map((child: any) => (
            <TreeNode
              key={child.walletAddress}
              member={child}
              depth={depth + 1}
              collapsedDepths={collapsedDepths}
              onToggleCollapse={onToggleCollapse}
              onViewMember={onViewMember}
              reportDepth={reportDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
export default function AdminReferrals() {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [collapsedDepths, setCollapsedDepths] = useState<Set<number>>(new Set());
  const [detailAddress, setDetailAddress] = useState("");
  const [detailOpen, setDetailOpen] = useState(false);
  const [collapseBelow, setCollapseBelow] = useState(0); // collapse layers 0..collapseBelow-1
  const maxDiscoveredDepth = useRef(0);

  // Track max depth seen so far
  const reportDepth = useCallback((d: number) => {
    if (d > maxDiscoveredDepth.current) maxDiscoveredDepth.current = d;
  }, []);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/referrals/tree", search ? `?search=${search}` : ""],
    queryFn: () => getAdminReferralTree(search || undefined),
  });

  const treeMembers = (data as any)?.members || [];
  const stats = (data as any)?.stats;

  const handleSearch = () => setSearch(searchInput);
  const handleClear = () => { setSearch(""); setSearchInput(""); };

  const toggleCollapseDepth = useCallback((depth: number) => {
    setCollapsedDepths((prev) => {
      const next = new Set(prev);
      if (next.has(depth)) next.delete(depth);
      else next.add(depth);
      return next;
    });
  }, []);

  const collapseAbove = useCallback((upTo: number) => {
    const set = new Set<number>();
    for (let i = 0; i < upTo; i++) set.add(i);
    setCollapsedDepths(set);
    setCollapseBelow(upTo);
  }, []);

  const expandAll = useCallback(() => { setCollapsedDepths(new Set()); setCollapseBelow(0); }, []);

  const openDetail = useCallback((address: string) => {
    setDetailAddress(address);
    setDetailOpen(true);
  }, []);

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
          {[
            { label: "总会员", value: stats.totalMembers, icon: Users, color: "#C9A227" },
            { label: "根节点", value: stats.rootCount, icon: Crown, color: "#C9A227" },
            { label: "有推荐人", value: stats.withReferrer, icon: GitBranch, color: "#22c55e" },
            { label: "最大深度", value: `${stats.maxDepth} 层`, icon: Layers, color: "#3b82f6" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon size={14} style={{ color: s.color }} />
                <span className="text-[11px] text-muted-foreground">{s.label}</span>
              </div>
              <div className="font-black text-lg" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
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
            placeholder="搜索钱包地址..."
            className="pl-9 text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
          />
        </div>
        <Button onClick={handleSearch} className="text-sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}>
          搜索
        </Button>
        {search && (
          <Button variant="outline" onClick={handleClear} className="text-sm"
            style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "40px" }}>
            清除
          </Button>
        )}
      </div>

      {/* Layer Controls */}
      <div className="rounded-xl p-3 space-y-2.5" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center gap-2">
          <FoldVertical size={12} style={{ color: "#C9A227" }} />
          <span className="text-xs font-semibold text-foreground">层级压缩</span>
          <span className="text-[10px] text-muted-foreground">— 折叠上层节点，快速查看深层</span>
        </div>

        {/* Quick collapse buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground mr-1">压缩前N层:</span>
          {[2, 3, 5, 8, 10, 15, 20].map((n) => (
            <button
              key={n}
              className="text-[10px] px-2 py-1 rounded transition-all"
              style={{
                background: collapseBelow === n ? "rgba(201,162,39,0.2)" : "rgba(255,255,255,0.04)",
                border: collapseBelow === n ? "1px solid rgba(201,162,39,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: collapseBelow === n ? "#C9A227" : "rgba(255,255,255,0.5)",
              }}
              onClick={() => collapseAbove(n)}
            >
              前{n}层
            </button>
          ))}
          {collapsedDepths.size > 0 && (
            <button
              className="text-[10px] px-2 py-1 rounded flex items-center gap-1 ml-1"
              style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}
              onClick={expandAll}
            >
              <Maximize2 size={9} /> 全部展开
            </button>
          )}
        </div>

        {/* Custom input */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">自定义:</span>
          <span className="text-[10px] text-muted-foreground">压缩前</span>
          <input
            type="number"
            min={0}
            max={100}
            className="w-14 text-center text-xs rounded px-1.5 py-0.5"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227" }}
            value={collapseBelow}
            onChange={(e) => {
              const v = parseInt(e.target.value) || 0;
              collapseAbove(Math.max(0, v));
            }}
          />
          <span className="text-[10px] text-muted-foreground">层</span>
          {collapseBelow > 0 && (
            <span className="text-[10px] text-muted-foreground ml-2">
              (L0~L{collapseBelow - 1} 已压缩，从 L{collapseBelow} 开始显示完整节点)
            </span>
          )}
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Network size={12} />
        {search ? (
          <span>搜索结果: {treeMembers.length} 个匹配会员 (点击地址查看详情，点击箭头展开下级)</span>
        ) : (
          <span>推荐关系树 - {treeMembers.length} 个根节点 (点击地址查看详情，点击箭头展开下级)</span>
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
              <TreeNode
                key={m.walletAddress}
                member={m}
                collapsedDepths={collapsedDepths}
                onToggleCollapse={toggleCollapseDepth}
                onViewMember={openDetail}
                reportDepth={reportDepth}
              />
            ))}
          </div>
        )}
      </div>

      {/* Member Detail Dialog */}
      <MemberDetailDialog address={detailAddress} open={detailOpen} onClose={() => setDetailOpen(false)} />
    </div>
  );
}
