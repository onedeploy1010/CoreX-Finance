import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminMembers, getAdminMemberDetail, getAdminTeamTree, updateMemberLevel, adminAddLog, hasPermission } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Crown, Eye, Users, ArrowLeft, ChevronDown, Save } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function TeamTree({ rootAddress }: { rootAddress: string }) {
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const currentAddr = drillPath.length > 0 ? drillPath[drillPath.length - 1] : rootAddress;

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["/api/admin/members", currentAddr, "team-tree"],
    queryFn: () => getAdminTeamTree(currentAddr),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {drillPath.length > 0 && (
          <button
            onClick={() => setDrillPath(prev => prev.slice(0, -1))}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold"
            style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}
          >
            <ArrowLeft size={12} /> 返回
          </button>
        )}
        <div className="text-xs text-muted-foreground font-mono">{shortAddr(currentAddr)}</div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground text-xs py-4">加载中...</div>
      ) : (children as any[]).length === 0 ? (
        <div className="text-center text-muted-foreground text-xs py-4">暂无直推</div>
      ) : (
        <div className="space-y-1.5">
          {(children as any[]).map((m: any) => (
            <div key={m.walletAddress} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: "rgba(201,162,39,0.04)" }}>
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: "#C9A227" }} />
                <span className="text-xs font-mono">{shortAddr(m.walletAddress)}</span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
                  {m.level === 0 ? "普通" : `V${m.level}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{m.stakingAmount > 0 ? `${m.stakingAmount.toFixed(0)}U` : "0U"}</span>
                {m.hasChildren && (
                  <button
                    onClick={() => setDrillPath(prev => [...prev, m.walletAddress])}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                    style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", minHeight: "28px" }}
                  >
                    <ChevronDown size={12} /> {m.childrenCount}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberDetail({ data, onLevelChanged }: { data: any; onLevelChanged?: () => void }) {
  const [showTree, setShowTree] = useState(false);
  const [editLevel, setEditLevel] = useState<number | null>(null);
  const { toast } = useToast();
  const m = data.member;
  const canWrite = hasPermission("members.write");

  const levelMutation = useMutation({
    mutationFn: async (newLevel: number) => {
      await updateMemberLevel(m.walletAddress, newLevel);
      await adminAddLog("调整会员等级", "member", m.walletAddress, { oldLevel: m.level, newLevel });
    },
    onSuccess: () => {
      toast({ title: "等级已更新" });
      setEditLevel(null);
      onLevelChanged?.();
    },
    onError: (err: any) => toast({ title: "更新失败", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">地址</div>
          <div className="font-mono text-xs break-all">{m.walletAddress}</div>
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">等级</div>
          {canWrite ? (
            <div className="flex items-center gap-2">
              <select
                value={editLevel ?? m.level}
                onChange={e => setEditLevel(parseInt(e.target.value))}
                className="text-xs font-semibold rounded px-1.5 py-0.5 appearance-none cursor-pointer"
                style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227" }}
              >
                <option value={0}>普通</option>
                {[1,2,3,4,5,6,7].map(v => <option key={v} value={v}>V{v}</option>)}
              </select>
              {editLevel !== null && editLevel !== m.level && (
                <button
                  onClick={() => levelMutation.mutate(editLevel)}
                  className="p-1 rounded flex items-center justify-center"
                  style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", minWidth: "28px", minHeight: "28px" }}
                >
                  <Save size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="text-xs font-semibold" style={{ color: "#C9A227" }}>{m.level === 0 ? "普通" : `V${m.level}`}</div>
          )}
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">推荐人</div>
          <div className="font-mono text-xs">{m.referrerAddress ? shortAddr(m.referrerAddress) : "无"}</div>
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">注册时间</div>
          <div className="text-xs">{new Date(m.createdAt).toLocaleString()}</div>
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">直推</div>
          <div className="text-xs">{data.directReferrals?.length || 0} 人</div>
        </div>
        <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
          <div className="text-[10px] text-muted-foreground">终身保级</div>
          <div className="text-xs">{m.lifetimeLock ? "是" : "否"}</div>
        </div>
      </div>

      {data.directReferrals?.length > 0 && (
        <div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "36px" }}
            onClick={() => setShowTree(!showTree)}
          >
            <Users size={14} className="mr-1" />
            {showTree ? "隐藏" : "查看"} 团队树 ({data.directReferrals.length} 直推)
          </Button>
          {showTree && (
            <div className="mt-2 p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.03)", border: "1px solid rgba(201,162,39,0.1)" }}>
              <TeamTree rootAddress={m.walletAddress} />
            </div>
          )}
        </div>
      )}

      {data.orders?.length > 0 && (
        <div>
          <div className="font-semibold text-xs mb-2" style={{ color: "#C9A227" }}>订单 ({data.orders.length})</div>
          <div className="space-y-1.5">
            {data.orders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
                <span className="text-xs">{o.product_name || o.productName}</span>
                <span className="text-xs font-semibold">{parseFloat(o.amount).toFixed(2)} U</span>
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: o.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)", color: o.status === "active" ? "#22c55e" : "#888" }}>
                  {o.status === "active" ? "进行中" : "已完成"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.withdrawals?.length > 0 && (
        <div>
          <div className="font-semibold text-xs mb-2" style={{ color: "#C9A227" }}>提现记录 ({data.withdrawals.length})</div>
          <div className="space-y-1.5">
            {data.withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
                <span className="text-xs font-semibold">{parseFloat(w.amount).toFixed(2)} U</span>
                <span className="text-xs text-muted-foreground">{new Date(w.created_at || w.createdAt).toLocaleDateString()}</span>
                <span className="text-xs" style={{ color: w.status === "pending" ? "#eab308" : w.status === "completed" ? "#22c55e" : "#ef4444" }}>
                  {w.status === "pending" ? "待审核" : w.status === "completed" ? "已完成" : "已拒绝"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MemberCard({ m, onView }: { m: any; onView: () => void }) {
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{shortAddr(m.walletAddress)}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.12)", color: "#C9A227" }}>
            {m.level === 0 ? "普通" : `V${m.level}`}
          </span>
        </div>
        <button onClick={onView} className="p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", minWidth: "36px", minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Eye size={16} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">质押</div>
          <div className="text-xs font-semibold">{parseFloat(m.stakingAmount || 0).toFixed(0)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">收益</div>
          <div className="text-xs font-semibold">{parseFloat(m.totalEarned || 0).toFixed(0)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">直推</div>
          <div className="text-xs font-semibold">{m.directCount || 0}</div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()} 注册</div>
    </div>
  );
}

export default function Members() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [detailAddr, setDetailAddr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/members", `?page=${page}&limit=20&search=${search}`],
    queryFn: () => getAdminMembers(page, 20, search),
  });

  const { data: detail } = useQuery({
    queryKey: ["/api/admin/members", detailAddr],
    queryFn: () => getAdminMemberDetail(detailAddr!),
    enabled: !!detailAddr,
  });

  const d = data as any;
  const totalPages = d ? Math.ceil(d.total / d.limit) : 1;

  const handleSearch = () => { setSearch(searchInput); setPage(1); };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">会员管理</h2>
        <span className="text-xs text-muted-foreground ml-2">共 {d?.total || 0} 人</span>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-testid="input-member-search"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="搜索钱包地址..."
            className="pl-9 text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
          />
        </div>
        <Button data-testid="button-search" onClick={handleSearch} className="text-sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}>
          搜索
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : (
        <div className="space-y-2">
          {(d?.members || []).map((m: any) => (
            <MemberCard key={m.id} m={m} onView={() => setDetailAddr(m.walletAddress)} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">第 {page}/{totalPages} 页</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs" style={{ minHeight: "36px" }}>
            <ChevronLeft size={14} /> 上一页
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs" style={{ minHeight: "36px" }}>
            下一页 <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <Dialog open={!!detailAddr} onOpenChange={() => setDetailAddr(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>会员详情</DialogTitle>
          </DialogHeader>
          {detail ? <MemberDetail data={detail as any} onLevelChanged={() => {
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/members", detailAddr] });
          }} /> : <div className="text-center text-muted-foreground py-4">加载中...</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
