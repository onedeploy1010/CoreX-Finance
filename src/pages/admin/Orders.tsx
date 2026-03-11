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

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function OrderCard({ o, onView }: { o: any; onView: () => void }) {
  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">#{o.id}</span>
          <span className="text-xs font-semibold">{o.productName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: o.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)", color: o.status === "active" ? "#22c55e" : "#888" }}>
            {o.status === "active" ? "进行中" : "已完成"}
          </span>
          <button onClick={onView} className="p-2 rounded-lg" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", minWidth: "36px", minHeight: "36px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Eye size={16} />
          </button>
        </div>
      </div>
      <div className="text-xs font-mono text-muted-foreground">{shortAddr(o.walletAddress)}</div>
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">金额</div>
          <div className="text-xs font-bold">{parseFloat(o.amount).toFixed(0)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">日利率</div>
          <div className="text-xs font-semibold">{o.dailyRate}%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">进度</div>
          <div className="text-xs font-semibold">{o.elapsedDays}/{o.days}天</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">已赚</div>
          <div className="text-xs font-bold" style={{ color: "#C9A227" }}>{parseFloat(o.totalEarned).toFixed(2)}U</div>
        </div>
      </div>
    </div>
  );
}

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

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            data-testid={`tab-order-${tab.value}`}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: status === tab.value ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.03)",
              color: status === tab.value ? "#C9A227" : "rgba(255,255,255,0.5)",
              border: status === tab.value ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.06)",
              minHeight: "36px",
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
        <div className="space-y-2">
          {(d?.orders || []).map((o: any) => (
            <OrderCard key={o.id} o={o} onView={() => setDetailId(o.id)} />
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

      <Dialog open={!!detailId} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
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
      <div className="grid grid-cols-2 gap-2">
        <InfoItem label="产品" value={data.productName} />
        <InfoItem label="状态" value={data.status === "active" ? "进行中" : "已完成"} color={data.status === "active" ? "#22c55e" : "#888"} />
        <InfoItem label="质押金额" value={`${parseFloat(data.amount).toFixed(2)} U`} />
        <InfoItem label="日利率" value={`${data.dailyRate}%`} />
        <InfoItem label="日利息" value={`${parseFloat(data.dailyEarning).toFixed(4)} U`} highlight />
        <InfoItem label="总天数" value={`${data.days} 天`} />
        <InfoItem label="已释放" value={`${data.elapsedDays} 天`} highlight />
        <InfoItem label="剩余" value={`${data.remainingDays} 天`} />
        <InfoItem label="已赚" value={`${parseFloat(data.totalEarned).toFixed(4)} U`} highlight />
        <InfoItem label="开始日期" value={new Date(data.startDate).toLocaleDateString()} />
      </div>

      <div className="font-mono text-xs text-muted-foreground break-all p-2 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
        <span className="text-muted-foreground">钱包: </span>{data.walletAddress}
      </div>
    </div>
  );
}

function InfoItem({ label, value, highlight, color }: { label: string; value: string; highlight?: boolean; color?: string }) {
  return (
    <div className="p-2.5 rounded" style={{ background: "rgba(201,162,39,0.04)" }}>
      <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>
      <div className="text-xs font-semibold" style={{ color: color || (highlight ? "#C9A227" : undefined) }}>{value}</div>
    </div>
  );
}
