import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";
import { getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser, adminAddLog } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Shield, Plus, Edit, Trash2, UserCog } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "超级管理员",
  finance: "财务",
  customer_service: "客服",
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  superadmin: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  finance: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  customer_service: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
};

export default function AdminManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ username: "", password: "", role: "customer_service" });
  const { toast } = useToast();

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ["/api/admin/admins"],
    queryFn: getAdminUsers,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; role: string }) => {
      const result = await createAdminUser(data.username, data.password, data.role);
      await adminAddLog("创建管理员", "admin", data.username, { role: data.role });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: "管理员已创建" });
    },
    onError: (err: any) => toast({ title: "创建失败", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, role, password }: { id: number; role: string; password?: string }) => {
      const result = await updateAdminUser(id, role, password);
      await adminAddLog("更新管理员", "admin", id.toString(), { role, hasNewPassword: !!password });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      setDialogOpen(false);
      setEditing(null);
      resetForm();
      toast({ title: "管理员已更新" });
    },
    onError: (err: any) => toast({ title: "更新失败", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const result = await deleteAdminUser(id);
      await adminAddLog("删除管理员", "admin", id.toString());
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/admins"] });
      toast({ title: "管理员已删除" });
    },
    onError: (err: any) => toast({ title: "删除失败", description: err.message, variant: "destructive" }),
  });

  const resetForm = () => setForm({ username: "", password: "", role: "customer_service" });

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (admin: any) => {
    setEditing(admin);
    setForm({ username: admin.username, password: "", role: admin.role });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, role: form.role, password: form.password || undefined });
    } else {
      if (!form.username || !form.password) {
        toast({ title: "请填写用户名和密码", variant: "destructive" });
        return;
      }
      createMutation.mutate(form);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">管理员管理</h2>
        </div>
        <Button
          className="text-sm"
          style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}
          onClick={openCreate}
        >
          <Plus size={14} className="mr-1" /> 添加管理员
        </Button>
      </div>

      {/* Role description */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="text-xs font-semibold" style={{ color: "#C9A227" }}>角色权限说明</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded" style={{ background: "rgba(239,68,68,0.04)" }}>
            <div className="font-semibold mb-1" style={{ color: "#ef4444" }}>超级管理员</div>
            <div className="text-muted-foreground">全部功能 + 管理员管理 + 操作日志 + 调整等级/结算</div>
          </div>
          <div className="p-2 rounded" style={{ background: "rgba(59,130,246,0.04)" }}>
            <div className="font-semibold mb-1" style={{ color: "#3b82f6" }}>财务</div>
            <div className="text-muted-foreground">查看会员/推荐 + 订单管理 + 出入金 + 批准提现</div>
          </div>
          <div className="p-2 rounded" style={{ background: "rgba(34,197,94,0.04)" }}>
            <div className="font-semibold mb-1" style={{ color: "#22c55e" }}>客服</div>
            <div className="text-muted-foreground">仅查看会员和推荐关系</div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : (
        <div className="space-y-2">
          {(admins as any[]).map((a: any) => {
            const rc = ROLE_COLORS[a.role] || ROLE_COLORS.customer_service;
            return (
              <div key={a.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: rc.bg }}>
                    <UserCog size={16} style={{ color: rc.color }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{a.username}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: rc.bg, color: rc.color }}>
                        {ROLE_LABELS[a.role] || a.role}
                      </span>
                      {a.createdAt && <span className="text-[10px] text-muted-foreground">{new Date(a.createdAt).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(a)} className="p-2 rounded-lg flex items-center justify-center" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227", minWidth: "36px", minHeight: "36px" }}>
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`确定删除管理员 ${a.username}？`)) deleteMutation.mutate(a.id); }}
                    className="p-2 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", minWidth: "36px", minHeight: "36px" }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={() => { setDialogOpen(false); setEditing(null); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto mx-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle style={{ color: "#C9A227" }}>{editing ? "编辑管理员" : "添加管理员"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">用户名</Label>
              <Input
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                disabled={!!editing}
                placeholder="输入用户名"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">{editing ? "新密码（留空不修改）" : "密码"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={editing ? "留空不修改" : "输入密码"}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">角色</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v }))}>
                <SelectTrigger style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">超级管理员</SelectItem>
                  <SelectItem value="finance">财务</SelectItem>
                  <SelectItem value="customer_service">客服</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full font-bold"
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}
              disabled={!editing && (!form.username || !form.password)}
              onClick={handleSave}
            >
              {editing ? "保存修改" : "创建管理员"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
