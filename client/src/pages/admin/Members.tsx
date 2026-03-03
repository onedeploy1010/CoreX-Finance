import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Crown, Eye } from "lucide-react";

export default function Members() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [detailAddr, setDetailAddr] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/members", `?page=${page}&limit=20&search=${search}`],
  });

  const { data: detail } = useQuery({
    queryKey: ["/api/admin/members", detailAddr],
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
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }}
          />
        </div>
        <Button data-testid="button-search" onClick={handleSearch} className="text-sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}>
          搜索
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(201,162,39,0.08)" }}>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">地址</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">等级</th>
                  <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">质押(U)</th>
                  <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">收益(U)</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">直推</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">注册</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {(d?.members || []).map((m: any) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                    <td className="px-3 py-2.5 font-mono text-xs">{m.walletAddress.slice(0, 8)}...{m.walletAddress.slice(-4)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
                        {m.level === 0 ? "普通" : `V${m.level}`}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-xs">{parseFloat(m.stakingAmount || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{parseFloat(m.totalEarned || 0).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{m.directCount || 0}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button data-testid={`button-view-member-${m.id}`} onClick={() => setDetailAddr(m.walletAddress)} className="p-1 rounded" style={{ color: "#C9A227" }}>
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">第 {page}/{totalPages} 页</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs">
            <ChevronLeft size={14} /> 上一页
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs">
            下一页 <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <Dialog open={!!detailAddr} onOpenChange={() => setDetailAddr(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>会员详情</DialogTitle>
          </DialogHeader>
          {detail ? (
            <MemberDetail data={detail as any} />
          ) : (
            <div className="text-center text-muted-foreground py-4">加载中...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MemberDetail({ data }: { data: any }) {
  const m = data.member;
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-muted-foreground">地址: </span><span className="font-mono text-xs">{m.walletAddress.slice(0, 10)}...{m.walletAddress.slice(-6)}</span></div>
        <div><span className="text-muted-foreground">等级: </span><span style={{ color: "#C9A227" }}>{m.level === 0 ? "普通" : `V${m.level}`}</span></div>
        <div><span className="text-muted-foreground">推荐人: </span><span className="font-mono text-xs">{m.referrerAddress ? `${m.referrerAddress.slice(0, 8)}...` : "无"}</span></div>
        <div><span className="text-muted-foreground">注册: </span>{new Date(m.createdAt).toLocaleString()}</div>
        <div><span className="text-muted-foreground">直推: </span>{data.directReferrals?.length || 0} 人</div>
        <div><span className="text-muted-foreground">终身锁定: </span>{m.lifetimeLock ? "是" : "否"}</div>
      </div>

      {data.orders?.length > 0 && (
        <div>
          <div className="font-semibold text-xs mb-2" style={{ color: "#C9A227" }}>订单 ({data.orders.length})</div>
          <div className="space-y-1">
            {data.orders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
                <span className="text-xs">{o.productName}</span>
                <span className="text-xs">{parseFloat(o.amount).toFixed(2)} U</span>
                <span className={`text-xs px-1.5 py-0.5 rounded ${o.status === 'active' ? '' : ''}`}
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
          <div className="font-semibold text-xs mb-2" style={{ color: "#C9A227" }}>提现 ({data.withdrawals.length})</div>
          <div className="space-y-1">
            {data.withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
                <span className="text-xs">{parseFloat(w.amount).toFixed(2)} U</span>
                <span className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</span>
                <span className="text-xs" style={{ color: w.status === "pending" ? "#eab308" : w.status === "approved" ? "#22c55e" : "#ef4444" }}>
                  {w.status === "pending" ? "待审" : w.status === "approved" ? "已通过" : "已拒绝"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
