import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CopyableAddress, shortAddr } from "@/components/CopyableAddress";
import { AlertTriangle } from "lucide-react";
import { getMemberDeletePreview, deleteMemberSingle, deleteMemberWithDownline, adminAddLog } from "@/lib/api";

// Shared admin "delete member" dialog (used by 会员管理 and 推荐管理).
// `member` only needs a `walletAddress` field.
export default function DeleteMemberDialog({ member, onClose }: { member: { walletAddress: string }; onClose: () => void }) {
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const addr: string = member.walletAddress;
  const last4 = addr.slice(-4);

  const { data: preview, isLoading } = useQuery({
    queryKey: ["/api/admin/member-delete-preview", addr],
    queryFn: () => getMemberDeletePreview(addr),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/members"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/referrals/tree"] });
  };

  const singleMut = useMutation({
    mutationFn: async () => {
      await deleteMemberSingle(addr);
      await adminAddLog("删除会员-单个账户", "member", addr, {
        mode: "single", reboundTo: preview?.upline ?? null, reboundCount: preview?.direct_count ?? 0,
      });
    },
    onSuccess: () => {
      toast({ title: "已删除该账户", description: preview?.direct_count ? `${preview.direct_count} 个直推已改绑到上级` : "该账户无直推下级" });
      invalidate(); onClose();
    },
    onError: (e: any) => toast({ title: "删除失败", description: e.message, variant: "destructive" }),
  });

  const umbrellaMut = useMutation({
    mutationFn: async () => {
      await deleteMemberWithDownline(addr);
      await adminAddLog("删除会员-含伞下全部", "member", addr, {
        mode: "umbrella", deletedTotal: preview?.umbrella_total ?? null,
      });
    },
    onSuccess: () => {
      toast({ title: "已删除该账户及伞下", description: `共删除 ${preview?.umbrella_total ?? "?"} 个账户` });
      invalidate(); onClose();
    },
    onError: (e: any) => toast({ title: "删除失败", description: e.message, variant: "destructive" }),
  });

  const busy = singleMut.isPending || umbrellaMut.isPending;
  const umbrellaConfirmed = confirmText.trim().toLowerCase() === last4.toLowerCase();

  return (
    <Dialog open onOpenChange={() => { if (!busy) onClose(); }}>
      <DialogContent className="max-w-md mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(239,68,68,0.35)" }}>
        <DialogHeader>
          <DialogTitle style={{ color: "#ef4444" }} className="flex items-center gap-2">
            <AlertTriangle size={18} /> 删除会员
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,162,39,0.15)" }}>
            <div className="flex items-center gap-2"><span className="text-muted-foreground">账户</span><CopyableAddress address={addr} /></div>
            <div className="text-muted-foreground">
              上级:{isLoading ? "…" : preview?.upline ? shortAddr(preview.upline) : "无(顶级账户)"}
            </div>
          </div>

          {/* Mode A: single */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.2)" }}>
            <div className="text-sm font-semibold" style={{ color: "#C9A227" }}>删除单个账户</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              该账户的 <span style={{ color: "#C9A227" }}>{isLoading ? "…" : preview?.direct_count ?? 0}</span> 个直推下级将
              <span className="text-foreground"> 改绑到上级{preview?.upline ? ` ${shortAddr(preview.upline)}` : "(成为顶级)"}</span>。
              该账户的订单 / 奖励 / 提现记录将一并彻底删除。
            </p>
            <Button
              size="sm" disabled={busy || isLoading}
              onClick={() => { if (confirm(`确定删除单个账户 ${shortAddr(addr)}?直推将改绑到上级。`)) singleMut.mutate(); }}
              style={{ background: "rgba(201,162,39,0.15)", color: "#C9A227", border: "1px solid rgba(201,162,39,0.3)", minHeight: "36px", width: "100%" }}
            >
              {singleMut.isPending ? "删除中..." : "删除单个账户"}
            </Button>
          </div>

          {/* Mode B: umbrella */}
          <div className="rounded-lg p-3 space-y-2" style={{ background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="text-sm font-semibold" style={{ color: "#ef4444" }}>删除该账户及伞下全部</div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              将连同整棵下线树 <span style={{ color: "#ef4444", fontWeight: 700 }}>共 {isLoading ? "…" : preview?.umbrella_total ?? 0} 个账户</span>
              （含本账户）及其全部订单 / 奖励 / 提现一起删除。<span style={{ color: "#ef4444" }}>此操作不可撤销。</span>
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] text-muted-foreground">输入账户地址末 4 位 <span className="font-mono" style={{ color: "#ef4444" }}>{last4}</span> 以确认:</label>
              <Input
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={last4}
                className="text-sm font-mono"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(239,68,68,0.3)" }}
              />
            </div>
            <Button
              size="sm" disabled={busy || isLoading || !umbrellaConfirmed}
              onClick={() => umbrellaMut.mutate()}
              style={{ background: umbrellaConfirmed ? "linear-gradient(135deg, #ef4444, #b91c1c)" : "rgba(239,68,68,0.15)", color: umbrellaConfirmed ? "#fff" : "rgba(239,68,68,0.6)", minHeight: "36px", width: "100%" }}
            >
              {umbrellaMut.isPending ? "删除中..." : `删除全部 ${preview?.umbrella_total ?? ""} 个账户`}
            </Button>
          </div>

          <Button variant="outline" size="sm" disabled={busy} onClick={onClose} style={{ width: "100%", minHeight: "36px" }}>
            取消
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
