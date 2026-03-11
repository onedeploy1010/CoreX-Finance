import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { getAdminWithdrawals, updateWithdrawalStatus, adminAddLog } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
];

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function WithdrawalCard({ w, onApprove, onReject }: { w: any; onApprove: () => void; onReject: () => void }) {
  const statusLabel = w.status === "pending" ? "待审核" : w.status === "approved" ? "已通过" : "已拒绝";
  const statusColor = w.status === "pending" ? "#eab308" : w.status === "approved" ? "#22c55e" : "#ef4444";
  const statusBg = w.status === "pending" ? "rgba(234,179,8,0.1)" : w.status === "approved" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)";

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">#{w.id}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: statusBg, color: statusColor }}>
            {statusLabel}
          </span>
        </div>
        {w.status === "pending" && (
          <div className="flex items-center gap-2">
            <button
              data-testid={`button-approve-${w.id}`}
              className="p-2 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", minWidth: "36px", minHeight: "36px" }}
              onClick={onApprove}
            >
              <Check size={16} />
            </button>
            <button
              data-testid={`button-reject-${w.id}`}
              className="p-2 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", minWidth: "36px", minHeight: "36px" }}
              onClick={onReject}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      <div className="text-xs font-mono text-muted-foreground">{shortAddr(w.walletAddress)}</div>
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">金额</div>
          <div className="text-xs font-bold">{parseFloat(w.amount).toFixed(2)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">手续费</div>
          <div className="text-xs font-semibold text-muted-foreground">{parseFloat(w.fee).toFixed(2)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">实际</div>
          <div className="text-xs font-bold" style={{ color: "#C9A227" }}>{parseFloat(w.actualAmount).toFixed(2)}U</div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-muted-foreground">时间</div>
          <div className="text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminWithdrawals() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const { toast } = useToast();

  const qk = ["/api/admin/withdrawals", `?page=${page}&limit=20&status=${status}`];
  const { data, isLoading } = useQuery({ queryKey: qk, queryFn: () => getAdminWithdrawals(page, 20, status) });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await updateWithdrawalStatus(id, status);
      await adminAddLog(status === "approved" ? "批准提现" : "拒绝提现", "withdrawal", id.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
      toast({ title: "操作成功" });
    },
    onError: (err: any) => toast({ title: "操作失败", description: err.message, variant: "destructive" }),
  });

  const d = data as any;
  const totalPages = d ? Math.ceil(d.total / d.limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">提现管理</h2>
        <span className="text-xs text-muted-foreground ml-2">共 {d?.total || 0} 条</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            data-testid={`tab-withdrawal-${tab.value}`}
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
          {(d?.withdrawals || []).map((w: any) => (
            <WithdrawalCard
              key={w.id}
              w={w}
              onApprove={() => updateMutation.mutate({ id: w.id, status: "approved" })}
              onReject={() => updateMutation.mutate({ id: w.id, status: "rejected" })}
            />
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
    </div>
  );
}
