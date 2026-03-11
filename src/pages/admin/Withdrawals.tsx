import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { getAdminWithdrawals, updateWithdrawalStatus } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已拒绝" },
];

export default function AdminWithdrawals() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const { toast } = useToast();

  const qk = ["/api/admin/withdrawals", `?page=${page}&limit=20&status=${status}`];
  const { data, isLoading } = useQuery({ queryKey: qk, queryFn: () => getAdminWithdrawals(page, 20, status) });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      await updateWithdrawalStatus(id, status);
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

      <div className="flex gap-2">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            data-testid={`tab-withdrawal-${tab.value}`}
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
                  <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">金额(U)</th>
                  <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">手续费</th>
                  <th className="text-right px-3 py-2.5 text-xs text-muted-foreground font-medium">实际(U)</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">时间</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">状态</th>
                  <th className="text-center px-3 py-2.5 text-xs text-muted-foreground font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {(d?.withdrawals || []).map((w: any) => (
                  <tr key={w.id} style={{ borderBottom: "1px solid rgba(201,162,39,0.06)" }}>
                    <td className="px-3 py-2.5 text-xs">#{w.id}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{w.walletAddress.slice(0, 8)}...{w.walletAddress.slice(-4)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold">{parseFloat(w.amount).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">{parseFloat(w.fee).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{parseFloat(w.actualAmount).toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{new Date(w.createdAt).toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-xs px-1.5 py-0.5 rounded"
                        style={{
                          background: w.status === "pending" ? "rgba(234,179,8,0.1)" : w.status === "approved" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                          color: w.status === "pending" ? "#eab308" : w.status === "approved" ? "#22c55e" : "#ef4444",
                        }}>
                        {w.status === "pending" ? "待审核" : w.status === "approved" ? "已通过" : "已拒绝"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {w.status === "pending" ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            data-testid={`button-approve-${w.id}`}
                            className="p-1 rounded transition-all"
                            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
                            onClick={() => updateMutation.mutate({ id: w.id, status: "approved" })}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            data-testid={`button-reject-${w.id}`}
                            className="p-1 rounded transition-all"
                            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
                            onClick={() => updateMutation.mutate({ id: w.id, status: "rejected" })}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
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
    </div>
  );
}
