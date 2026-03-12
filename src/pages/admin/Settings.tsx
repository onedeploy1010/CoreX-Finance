import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { getSettlementConfig, updateSettlementTime, adminAddLog, getAutoApproveWithdrawal, setAutoApproveWithdrawal } from "@/lib/api";
import { Settings, Clock, Save, Loader2, ShieldCheck } from "lucide-react";

export default function AdminSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [savingAuto, setSavingAuto] = useState(false);
  const [hour, setHour] = useState<number | null>(null);
  const [minute, setMinute] = useState<number | null>(null);

  const { data: config, isLoading } = useQuery({
    queryKey: ["/api/admin/settlement-config"],
    queryFn: getSettlementConfig,
  });

  const { data: autoApprove, isLoading: loadingAuto } = useQuery({
    queryKey: ["/api/admin/auto-approve-withdrawal"],
    queryFn: getAutoApproveWithdrawal,
  });

  const handleToggleAutoApprove = async () => {
    setSavingAuto(true);
    try {
      const newVal = !autoApprove;
      await setAutoApproveWithdrawal(newVal);
      await adminAddLog("修改提现自动审批", "settings", "auto_approve_withdrawal", { enabled: newVal });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/auto-approve-withdrawal"] });
      toast({ title: newVal ? "已开启自动审批" : "已关闭自动审批" });
    } catch (err: any) {
      toast({ title: "更新失败", description: err.message, variant: "destructive" });
    } finally {
      setSavingAuto(false);
    }
  };

  const cfg = config as any;
  const displayHour = hour ?? (cfg ? ((parseInt(cfg.utcHour) + 8) % 24) : 0);
  const displayMinute = minute ?? (cfg ? parseInt(cfg.utcMinute) : 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettlementTime(displayHour, displayMinute);
      await adminAddLog("修改结算时间", "settings", "settlement_time", { sgtHour: displayHour, sgtMinute: displayMinute });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settlement-config"] });
      toast({ title: "结算时间已更新", description: `新加坡时间 ${String(displayHour).padStart(2, "0")}:${String(displayMinute).padStart(2, "0")}` });
      setHour(null);
      setMinute(null);
    } catch (err: any) {
      toast({ title: "更新失败", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div className="text-muted-foreground text-center py-20">加载中...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg">系统设置</h2>
      </div>

      <div
        className="rounded-xl p-5 space-y-5"
        style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,162,39,0.1)" }}>
            <Clock size={16} style={{ color: "#C9A227" }} />
          </div>
          <div>
            <div className="font-semibold text-sm">每日结算时间</div>
            <div className="text-xs text-muted-foreground">系统将在指定时间自动结算所有活跃订单的每日收益</div>
          </div>
        </div>

        <div className="rounded-lg p-4 space-y-4" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.12)" }}>
          <div className="text-xs text-muted-foreground">新加坡时间 (SGT, UTC+8)</div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <select
                value={displayHour}
                onChange={(e) => setHour(parseInt(e.target.value))}
                className="rounded-lg px-3 py-2 text-lg font-bold text-center appearance-none cursor-pointer"
                style={{
                  background: "rgba(201,162,39,0.08)",
                  border: "1px solid rgba(201,162,39,0.25)",
                  color: "#C9A227",
                  width: "80px",
                }}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                ))}
              </select>
              <span className="text-2xl font-bold" style={{ color: "#C9A227" }}>:</span>
              <select
                value={displayMinute}
                onChange={(e) => setMinute(parseInt(e.target.value))}
                className="rounded-lg px-3 py-2 text-lg font-bold text-center appearance-none cursor-pointer"
                style={{
                  background: "rgba(201,162,39,0.08)",
                  border: "1px solid rgba(201,162,39,0.25)",
                  color: "#C9A227",
                  width: "80px",
                }}
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-muted-foreground ml-2">
              = UTC {String(((displayHour - 8 + 24) % 24)).padStart(2, "0")}:{String(displayMinute).padStart(2, "0")}
            </div>
          </div>
        </div>

        <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.08)" }}>
          <div className="text-xs font-semibold" style={{ color: "#C9A227" }}>结算说明</div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div>1. 系统每天在设定时间自动执行一次结算</div>
            <div>2. 结算内容：计算所有活跃订单的每日收益、发放推荐奖励和团队分红</div>
            <div>3. 结算完成后自动检查并升级符合条件的会员等级</div>
            <div>4. 到期订单将自动标记为已完成并返还本金</div>
          </div>
        </div>

        <Button
          className="w-full font-bold text-sm"
          style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
          disabled={saving || (hour === null && minute === null)}
          onClick={handleSave}
        >
          {saving ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Save size={14} className="mr-2" />}
          {saving ? "保存中..." : "保存设置"}
        </Button>
      </div>

      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,162,39,0.1)" }}>
            <ShieldCheck size={16} style={{ color: "#C9A227" }} />
          </div>
          <div>
            <div className="font-semibold text-sm">提现自动审批</div>
            <div className="text-xs text-muted-foreground">开启后，新提现申请将自动通过审批</div>
          </div>
        </div>

        <div className="rounded-lg p-4 flex items-center justify-between" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.12)" }}>
          <div>
            <div className="text-sm font-medium">{loadingAuto ? "加载中..." : autoApprove ? "已开启" : "已关闭"}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {autoApprove ? "提现申请将自动批准" : "提现申请需要手动审批"}
            </div>
          </div>
          <button
            onClick={handleToggleAutoApprove}
            disabled={savingAuto || loadingAuto}
            className="relative w-12 h-6 rounded-full transition-colors"
            style={{ background: autoApprove ? "rgba(34,197,94,0.6)" : "rgba(255,255,255,0.1)" }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
              style={{
                background: autoApprove ? "#22c55e" : "rgba(255,255,255,0.4)",
                transform: autoApprove ? "translateX(26px)" : "translateX(2px)",
              }}
            />
          </button>
        </div>

        <div className="rounded-lg p-3 space-y-1" style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.1)" }}>
          <div className="text-xs font-semibold" style={{ color: "#ef4444" }}>注意</div>
          <div className="text-xs text-muted-foreground">
            开启自动审批后，所有新的提现申请将直接标记为已通过，不再需要手动审核。请谨慎使用。
          </div>
        </div>
      </div>
    </div>
  );
}
