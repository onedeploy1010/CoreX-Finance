import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { getAdminWithdrawals, updateWithdrawalStatus, getPendingWithdrawals, markWithdrawalsProcessed, adminAddLog } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useActiveAccount } from "thirdweb/react";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { getWithdrawalContract, parseUSDT } from "@/lib/contracts";
import { ChevronLeft, ChevronRight, Check, X, Send, Loader2, ExternalLink } from "lucide-react";

const STATUS_TABS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已批准" },
  { value: "completed", label: "已完成" },
  { value: "rejected", label: "已拒绝" },
];

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function WithdrawalCard({ w, onApprove, onReject }: { w: any; onApprove: () => void; onReject: () => void }) {
  const statusMap: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "待审核", color: "#eab308", bg: "rgba(234,179,8,0.1)" },
    approved: { label: "已批准", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
    completed: { label: "已完成", color: "#22c55e", bg: "rgba(34,197,94,0.1)" },
    rejected: { label: "已拒绝", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  };
  const st = statusMap[w.status] || statusMap.pending;

  return (
    <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">#{w.id}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>
            {st.label}
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
      {w.txHash && (
        <a
          href={`https://bscscan.com/tx/${w.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs"
          style={{ color: "#C9A227" }}
        >
          <ExternalLink size={10} />
          <span>View on BscScan: {shortAddr(w.txHash)}</span>
        </a>
      )}
    </div>
  );
}

export default function AdminWithdrawals() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");
  const [batchProcessing, setBatchProcessing] = useState(false);
  const { toast } = useToast();
  const account = useActiveAccount();
  const { mutateAsync: sendTransaction } = useSendTransaction();

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

  const handleBatchWithdraw = async () => {
    if (!account) {
      toast({ title: "请先连接管理员钱包", variant: "destructive" });
      return;
    }

    setBatchProcessing(true);
    try {
      // 1. Get all approved withdrawals
      const pending = await getPendingWithdrawals(100);
      if (!pending.length) {
        toast({ title: "没有待处理的提现", variant: "destructive" });
        return;
      }

      // 2. Prepare batch data
      const recipients = pending.map((w: any) => w.wallet_address);
      const amounts = pending.map((w: any) => parseUSDT(w.amount.toString()));
      const ids = pending.map((w: any) => w.id);

      // 3. Generate batch ID
      const batchId = "0x" + Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(Date.now().toString() + JSON.stringify(ids))))
      ).map(b => b.toString(16).padStart(2, "0")).join("");
      const batchIdBytes32 = batchId.slice(0, 66);

      // 4. Call smart contract batchWithdraw
      const contract = getWithdrawalContract();
      const tx = prepareContractCall({
        contract,
        method: "batchWithdraw",
        params: [batchIdBytes32 as `0x${string}`, recipients, amounts],
      });

      const result = await sendTransaction(tx);
      const txHash = result.transactionHash;

      if (!txHash) {
        toast({ title: "Transaction failed", variant: "destructive" });
        return;
      }

      // 5. Update database records
      await markWithdrawalsProcessed(ids, batchIdBytes32, txHash);
      await adminAddLog("批量提现上链", "withdrawal_batch", batchIdBytes32, { count: ids.length, txHash });

      queryClient.invalidateQueries({ queryKey: ["/api/admin/withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });

      toast({
        title: "批量提现成功",
        description: `${pending.length} 笔提现已上链 TX: ${txHash.slice(0, 10)}...`,
      });
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        toast({ title: "交易已取消", variant: "destructive" });
      } else {
        toast({ title: "批量提现失败", description: msg, variant: "destructive" });
      }
    } finally {
      setBatchProcessing(false);
    }
  };

  const d = data as any;
  const totalPages = d ? Math.ceil(d.total / d.limit) : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">提现管理</h2>
          <span className="text-xs text-muted-foreground ml-2">共 {d?.total || 0} 条</span>
        </div>
        <Button
          data-testid="button-batch-withdraw"
          size="sm"
          disabled={batchProcessing}
          style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "36px" }}
          onClick={handleBatchWithdraw}
        >
          {batchProcessing ? (
            <><Loader2 size={14} className="mr-1.5 animate-spin" /> 处理中...</>
          ) : (
            <><Send size={14} className="mr-1.5" /> 批量上链提现</>
          )}
        </Button>
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
