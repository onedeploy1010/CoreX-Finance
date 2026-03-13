import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getAdminProducts, adminCreateProduct, adminUpdateProduct, adminDeleteProduct, adminAddLog, DBProduct } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Package, TrendingUp, Loader2, ArrowUp, ArrowDown } from "lucide-react";

function formatShares(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "万";
  return n.toString();
}

function ShareBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">投资份数</span>
        <span style={{ color: "#C9A227" }}>{formatShares(used)} / {formatShares(total)}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(201,162,39,0.1)" }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #C9A227, #E8C547)" }} />
      </div>
    </div>
  );
}

const emptyForm = {
  name: "", nameEn: "", days: 30, dailyRate: 0.3, minAmount: 200,
  description: "", totalShares: 1000000, usedShares: 0, dailyGrowth: 0,
};

export default function AdminProducts() {
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<DBProduct | null>(null);
  const [form, setForm] = useState(emptyForm);
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["/api/admin/products"],
    queryFn: getAdminProducts,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await adminCreateProduct(form);
      await adminAddLog("添加产品", "product", form.name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "产品已添加" });
      setAddOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => toast({ title: "添加失败", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editProduct) return;
      await adminUpdateProduct(editProduct.id, {
        name: form.name, nameEn: form.nameEn, days: form.days,
        dailyRate: form.dailyRate, minAmount: form.minAmount,
        description: form.description, totalShares: form.totalShares,
        usedShares: form.usedShares, dailyGrowth: form.dailyGrowth,
      });
      await adminAddLog("编辑产品", "product", editProduct.id.toString(), { name: form.name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "产品已更新" });
      setEditProduct(null);
    },
    onError: (err: any) => toast({ title: "更新失败", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await adminDeleteProduct(id);
      await adminAddLog("删除产品", "product", id.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "产品已删除" });
    },
    onError: (err: any) => toast({ title: "删除失败", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      await adminUpdateProduct(id, { isActive: active });
      await adminAddLog(active ? "上架产品" : "下架产品", "product", id.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: "up" | "down" }) => {
      const sorted = [...products].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex(p => p.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      await adminUpdateProduct(sorted[idx].id, { sortOrder: sorted[swapIdx].sortOrder });
      await adminUpdateProduct(sorted[swapIdx].id, { sortOrder: sorted[idx].sortOrder });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] }),
  });

  const openEdit = (p: DBProduct) => {
    setForm({
      name: p.name, nameEn: p.nameEn, days: p.days, dailyRate: p.dailyRate,
      minAmount: p.minAmount, description: p.description, totalShares: p.totalShares,
      usedShares: p.usedShares, dailyGrowth: p.dailyGrowth,
    });
    setEditProduct(p);
  };

  const formValid = form.name && form.nameEn && form.days > 0 && form.dailyRate > 0 && form.minAmount > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">产品管理</h2>
          <span className="text-xs text-muted-foreground ml-2">{products.length} 个产品</span>
        </div>
        <Button size="sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
          onClick={() => { setForm(emptyForm); setAddOpen(true); }}>
          <Plus size={14} className="mr-1" /> 添加产品
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : products.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <Package size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">暂无产品</p>
        </div>
      ) : (
        <div className="space-y-2">
          {products.map((p, idx) => (
            <div key={p.id} className="rounded-xl p-3 space-y-2"
              style={{
                background: "linear-gradient(145deg, #1a1510, #110e0a)",
                border: `1px solid ${p.isActive ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.06)"}`,
                opacity: p.isActive ? 1 : 0.5,
              }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: "#C9A227" }}>{p.nameEn}</span>
                  <span className="text-xs text-muted-foreground">({p.name})</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded" style={{ background: "rgba(201,162,39,0.1)" }}
                    onClick={() => moveMutation.mutate({ id: p.id, direction: "up" })} disabled={idx === 0}>
                    <ArrowUp size={11} style={{ color: idx === 0 ? "rgba(255,255,255,0.2)" : "#C9A227" }} />
                  </button>
                  <button className="p-1.5 rounded" style={{ background: "rgba(201,162,39,0.1)" }}
                    onClick={() => moveMutation.mutate({ id: p.id, direction: "down" })} disabled={idx === products.length - 1}>
                    <ArrowDown size={11} style={{ color: idx === products.length - 1 ? "rgba(255,255,255,0.2)" : "#C9A227" }} />
                  </button>
                  <button className="p-1.5 rounded" style={{ background: p.isActive ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)" }}
                    onClick={() => toggleMutation.mutate({ id: p.id, active: !p.isActive })}>
                    <div className="w-3 h-3 rounded-full" style={{ background: p.isActive ? "#22c55e" : "rgba(255,255,255,0.3)" }} />
                  </button>
                  <button className="p-1.5 rounded" style={{ background: "rgba(201,162,39,0.1)" }} onClick={() => openEdit(p)}>
                    <Edit2 size={11} style={{ color: "#C9A227" }} />
                  </button>
                  <button className="p-1.5 rounded" style={{ background: "rgba(239,68,68,0.1)" }}
                    onClick={() => { if (confirm(`确定删除 ${p.name}?`)) deleteMutation.mutate(p.id); }}>
                    <Trash2 size={11} style={{ color: "#ef4444" }} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">周期</div>
                  <div className="text-xs font-semibold">{p.days}天</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">日利率</div>
                  <div className="text-xs font-semibold">{p.dailyRate}%</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">最低</div>
                  <div className="text-xs font-semibold">{p.minAmount}U</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">日增长</div>
                  <div className="text-xs font-semibold" style={{ color: p.dailyGrowth > 0 ? "#22c55e" : "#888" }}>+{p.dailyGrowth}</div>
                </div>
              </div>

              <ShareBar used={p.usedShares} total={p.totalShares} />
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Product Dialog */}
      <Dialog open={addOpen || !!editProduct} onOpenChange={(open) => { if (!open) { setAddOpen(false); setEditProduct(null); } }}>
        <DialogContent className="max-w-sm mx-auto max-h-[85vh] overflow-y-auto" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>
              {editProduct ? "编辑产品" : "添加产品"}
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">
              配置投资产品参数和份数
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">中文名称</label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="芯未来"
                  className="text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">英文名称</label>
                <Input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })} placeholder="CoreX Future"
                  className="text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }} />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">描述</label>
              <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="入门级稳健理财"
                className="text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">周期(天)</label>
                <Input type="number" value={form.days} onChange={e => setForm({ ...form, days: parseInt(e.target.value) || 0 })}
                  className="text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">日利率(%)</label>
                <Input type="number" step="0.01" value={form.dailyRate} onChange={e => setForm({ ...form, dailyRate: parseFloat(e.target.value) || 0 })}
                  className="text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">最低金额</label>
                <Input type="number" value={form.minAmount} onChange={e => setForm({ ...form, minAmount: parseInt(e.target.value) || 0 })}
                  className="text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }} />
              </div>
            </div>

            <div className="p-2.5 rounded-lg space-y-2" style={{ background: "rgba(201,162,39,0.04)", border: "1px solid rgba(201,162,39,0.1)" }}>
              <div className="text-xs font-semibold flex items-center gap-1" style={{ color: "#C9A227" }}>
                <TrendingUp size={12} /> 份数管理
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">总份数</label>
                  <Input type="number" value={form.totalShares} onChange={e => setForm({ ...form, totalShares: parseInt(e.target.value) || 0 })}
                    className="text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">已用份数</label>
                  <Input type="number" value={form.usedShares} onChange={e => setForm({ ...form, usedShares: parseInt(e.target.value) || 0 })}
                    className="text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">每日增长</label>
                  <Input type="number" value={form.dailyGrowth} onChange={e => setForm({ ...form, dailyGrowth: parseInt(e.target.value) || 0 })}
                    className="text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "36px" }} />
                </div>
              </div>
              <ShareBar used={form.usedShares} total={form.totalShares} />
            </div>

            <Button
              className="w-full font-bold text-sm"
              disabled={!formValid || createMutation.isPending || updateMutation.isPending}
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={() => editProduct ? updateMutation.mutate() : createMutation.mutate()}
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <><Loader2 size={14} className="mr-1 animate-spin" />保存中...</>
              ) : editProduct ? "保存修改" : "确认添加"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
