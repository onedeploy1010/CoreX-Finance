import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Crown, Eye, Users, ArrowLeft, ChevronDown } from "lucide-react";

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 8)}...${addr.slice(-4)}`;
}

function TeamTree({ rootAddress }: { rootAddress: string }) {
  const [drillPath, setDrillPath] = useState<string[]>([]);
  const currentAddr = drillPath.length > 0 ? drillPath[drillPath.length - 1] : rootAddress;

  const { data: children = [], isLoading } = useQuery({
    queryKey: ["/api/admin/members", currentAddr, "team-tree"],
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        {drillPath.length > 0 && (
          <button
            onClick={() => setDrillPath(prev => prev.slice(0, -1))}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold"
            style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.2)" }}
          >
            <ArrowLeft size={10} /> Back
          </button>
        )}
        <div className="text-xs text-muted-foreground font-mono">
          {shortAddr(currentAddr)}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground text-xs py-4">Loading...</div>
      ) : (children as any[]).length === 0 ? (
        <div className="text-center text-muted-foreground text-xs py-4">No direct referrals</div>
      ) : (
        <div className="space-y-1">
          {(children as any[]).map((m: any) => (
            <div key={m.walletAddress} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
              <div className="flex items-center gap-2">
                <Users size={12} style={{ color: "#C9A227" }} />
                <span className="text-xs font-mono">{shortAddr(m.walletAddress)}</span>
                <span className="text-xs px-1 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
                  {m.level === 0 ? "Normal" : `V${m.level}`}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{m.stakingAmount > 0 ? `${m.stakingAmount.toFixed(0)}U` : "0U"}</span>
                {m.hasChildren && (
                  <button
                    onClick={() => setDrillPath(prev => [...prev, m.walletAddress])}
                    className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded"
                    style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}
                  >
                    <ChevronDown size={10} /> {m.childrenCount}
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

function MemberDetail({ data }: { data: any }) {
  const [showTree, setShowTree] = useState(false);
  const m = data.member;

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div><span className="text-muted-foreground">Address: </span><span className="font-mono text-xs">{m.walletAddress.slice(0, 10)}...{m.walletAddress.slice(-6)}</span></div>
        <div><span className="text-muted-foreground">Level: </span><span style={{ color: "#C9A227" }}>{m.level === 0 ? "Normal" : `V${m.level}`}</span></div>
        <div><span className="text-muted-foreground">Referrer: </span><span className="font-mono text-xs">{m.referrerAddress ? `${m.referrerAddress.slice(0, 8)}...` : "None"}</span></div>
        <div><span className="text-muted-foreground">Registered: </span>{new Date(m.createdAt).toLocaleString()}</div>
        <div><span className="text-muted-foreground">Direct: </span>{data.directReferrals?.length || 0}</div>
        <div><span className="text-muted-foreground">Lifetime Lock: </span>{m.lifetimeLock ? "Yes" : "No"}</div>
      </div>

      {data.directReferrals?.length > 0 && (
        <div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs"
            style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227" }}
            onClick={() => setShowTree(!showTree)}
          >
            <Users size={12} className="mr-1" />
            {showTree ? "Hide" : "Show"} Team Tree ({data.directReferrals.length} direct)
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
          <div className="font-semibold text-xs mb-2" style={{ color: "#C9A227" }}>Orders ({data.orders.length})</div>
          <div className="space-y-1">
            {data.orders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
                <span className="text-xs">{o.productName}</span>
                <span className="text-xs">{parseFloat(o.amount).toFixed(2)} U</span>
                <span className="text-xs px-1.5 py-0.5 rounded"
                  style={{ background: o.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)", color: o.status === "active" ? "#22c55e" : "#888" }}>
                  {o.status === "active" ? "Active" : "Completed"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.withdrawals?.length > 0 && (
        <div>
          <div className="font-semibold text-xs mb-2" style={{ color: "#C9A227" }}>Withdrawals ({data.withdrawals.length})</div>
          <div className="space-y-1">
            {data.withdrawals.map((w: any) => (
              <div key={w.id} className="flex items-center justify-between py-1.5 px-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
                <span className="text-xs">{parseFloat(w.amount).toFixed(2)} U</span>
                <span className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</span>
                <span className="text-xs" style={{ color: w.status === "pending" ? "#eab308" : w.status === "completed" ? "#22c55e" : "#ef4444" }}>
                  {w.status === "pending" ? "Pending" : w.status === "completed" ? "Completed" : "Rejected"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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
            placeholder="Search wallet address..."
            className="pl-9 text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)" }}
          />
        </div>
        <Button data-testid="button-search" onClick={handleSearch} className="text-sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}>
          Search
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">Loading...</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(201,162,39,0.08)" }}>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">Address</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">Level</th>
                  <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">Staking(U)</th>
                  <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">Earned(U)</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">Direct</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">Registered</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {(d?.members || []).map((m: any) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                    <td className="px-3 py-2.5 font-mono text-xs">{m.walletAddress.slice(0, 8)}...{m.walletAddress.slice(-4)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
                        {m.level === 0 ? "Normal" : `V${m.level}`}
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
        <span className="text-xs text-muted-foreground">Page {page}/{totalPages}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="text-xs">
            <ChevronLeft size={14} /> Prev
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="text-xs">
            Next <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      <Dialog open={!!detailAddr} onOpenChange={() => setDetailAddr(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>Member Detail</DialogTitle>
          </DialogHeader>
          {detail ? (
            <MemberDetail data={detail as any} />
          ) : (
            <div className="text-center text-muted-foreground py-4">Loading...</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
