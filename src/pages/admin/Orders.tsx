import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminOrders } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "active", label: "进行中" },
  { value: "completed", label: "已完成" },
];

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/orders", `?page=${page}&limit=20&status=${status}`],
    queryFn: () => getAdminOrders(page, 20, status),
  });

  const { data: detail } = useQuery({
    queryKey: ["/api/admin/orders", detailId?.toString() || ""],
    queryFn: () => getAdminOrders(1, 1, "all").then(res => {
      const order = (res as any).orders?.find((o: any) => o.id === detailId);
      return order || null;
    }),
    enabled: !!detailId,
  });

  const d = data as any;
  const totalPages = d ? Math.ceil(d.total / d.limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">订单管理</h2>
        <span className="text-xs text-muted-foreground ml-2">共 {d?.total || 0} 条</span>
      </div>

      <div className="flex gap-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            data-testid={`tab-order-${tab.value}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: status === tab.value ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.03)",
              color: status === tab.value ? "#C9A227" : "rgba(255,255,255,0.5)",
              border: status === tab.value ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.06)",
            }}
            onClick={() => { setStatus(tab.value); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(201,162,39,0.15)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(201,162,39,0.08)" }}>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">ID</th>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">地址</th>
                  <th className="text-left px-3 py-2.5 text-xs text-muted-foreground font-medium">产品</th>
                  <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">金额(U)</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">日利率</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">天数</th>
                  <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">已赚(U)</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">状态</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {(d?.orders || []).map((o: any) => (
                  <tr key={o.id} style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                    <td className="px-3 py-2.5 text-xs">#{o.id}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{o.walletAddress.slice(0, 8)}...{o.walletAddress.slice(-4)}</td>
                    <td className="px-3 py-2.5 text-xs">{o.productName}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold">{parseFloat(o.amount).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{o.dailyRate}%</td>
                    <td className="px-3 py-2.5 text-center text-xs">{o.elapsedDays}/{o.days}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{parseFloat(o.totalEarned).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: o.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)", color: o.status === "active" ? "#22c55e" : "#888" }}>
                        {o.status === "active" ? "进行中" : "已完成"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button data-testid={`button-view-order-${o.id}`} onClick={() => setDetailId(o.id)} className="p-1 rounded" style={{ color: "#C9A227" }}>
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

      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>订单详情 #{detailId}</DialogTitle>
          </DialogHeader>
          {detail ? <OrderDetail data={detail as any} /> : <div className="text-center text-muted-foreground py-4">加载中...</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderDetail({ data }: { data: any }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <InfoItem label="产品" value={data.productName} />
        <InfoItem label="状态" value={data.status === "active" ? "进行中" : "已完成"} color={data.status === "active" ? "#22c55e" : "#888"} />
        <InfoItem label="质押金额" value={`${parseFloat(data.amount).toFixed(2)} U`} />
        <InfoItem label="日利率" value={`${data.dailyRate}%`} />
        <InfoItem label="日利息" value={`${parseFloat(data.dailyEarning).toFixed(4)} U`} highlight />
        <InfoItem label="总天数" value={`${data.days} 天`} />
        <InfoItem label="已释放" value={`${data.elapsedDays} 天`} highlight />
        <InfoItem label="剩余" value={`${data.remainingDays} 天`} />
        <InfoItem label="已赚" value={`${parseFloat(data.totalEarned).toFixed(4)} U`} highlight />
        <InfoItem label="已提现" value={`${parseFloat(data.totalWithdrawn).toFixed(2)} U`} />
        <InfoItem label="开始日期" value={new Date(data.startDate).toLocaleDateString()} />
        <InfoItem label="到期日期" value={new Date(data.endDate).toLocaleDateString()} />
      </div>

      <div className="font-mono text-xs text-muted-foreground break-all">
        <span className="text-muted-foreground">钱包: </span>{data.walletAddress}
      </div>

      {data.rewards?.length > 0 && (
        <div>
          <div className="font-semibold text-xs mb-2" style={{ color: "#C9A227" }}>相关奖励明细 ({data.rewards.length})</div>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {data.rewards.slice(0, 20).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between py-1 px-2 rounded text-xs" style={{ background: "rgba(201,162,39,0.04)" }}>
                <span className="text-muted-foreground">{r.description || r.type}</span>
                <span style={{ color: "#C9A227" }}>+{parseFloat(r.amount).toFixed(4)} U</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div className="p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className="text-xs font-semibold" style={{ color: color || (highlight ? "#C9A227" : undefined) }}>{value}</div>
    </div>
  );
}
