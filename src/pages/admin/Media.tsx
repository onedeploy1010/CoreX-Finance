import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { adminAddLog } from "@/lib/api";
import { Plus, Trash2, ArrowUp, ArrowDown, Image, Video, Youtube, Save, Loader2, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

async function getMedia() {
  const { data } = await supabase.from("media").select("*").order("sort_order", { ascending: true });
  return data || [];
}

async function getCompanyIntro() {
  const { data } = await supabase.from("system_settings").select("value").eq("key", "company_intro").single();
  return data?.value || "";
}

export default function AdminMedia() {
  const [addOpen, setAddOpen] = useState(false);
  const [editIntro, setEditIntro] = useState(false);
  const [introText, setIntroText] = useState("");
  const [form, setForm] = useState({ type: "image", url: "", title: "", description: "" });
  const { toast } = useToast();

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["/api/admin/media"],
    queryFn: getMedia,
  });

  const { data: companyIntro = "" } = useQuery({
    queryKey: ["/api/admin/company-intro"],
    queryFn: getCompanyIntro,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxSort = media.length > 0 ? Math.max(...media.map((m: any) => m.sort_order)) + 1 : 0;
      const { error } = await supabase.from("media").insert({
        type: form.type,
        url: form.url,
        title: form.title || null,
        description: form.description || null,
        sort_order: maxSort,
      });
      if (error) throw new Error(error.message);
      await adminAddLog("添加媒体", "media", form.type);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "添加成功" });
      setAddOpen(false);
      setForm({ type: "image", url: "", title: "", description: "" });
    },
    onError: (err: any) => toast({ title: "添加失败", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from("media").delete().eq("id", id);
      if (error) throw new Error(error.message);
      await adminAddLog("删除媒体", "media", id.toString());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] });
      toast({ title: "已删除" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) => {
      const { error } = await supabase.from("media").update({ is_active: active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] }),
  });

  const moveMutation = useMutation({
    mutationFn: async ({ id, direction }: { id: number; direction: "up" | "down" }) => {
      const sorted = [...media].sort((a: any, b: any) => a.sort_order - b.sort_order);
      const idx = sorted.findIndex((m: any) => m.id === id);
      if (idx < 0) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return;
      const a = sorted[idx], b = sorted[swapIdx];
      await supabase.from("media").update({ sort_order: b.sort_order }).eq("id", a.id);
      await supabase.from("media").update({ sort_order: a.sort_order }).eq("id", b.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/media"] }),
  });

  const saveIntroMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("system_settings").update({ value: introText }).eq("key", "company_intro");
      if (error) throw new Error(error.message);
      await adminAddLog("更新公司介绍", "settings", "company_intro");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/company-intro"] });
      toast({ title: "保存成功" });
      setEditIntro(false);
    },
    onError: (err: any) => toast({ title: "保存失败", description: err.message, variant: "destructive" }),
  });

  const typeIcon = (type: string) => {
    if (type === "image") return <Image size={14} />;
    if (type === "video") return <Video size={14} />;
    return <Youtube size={14} />;
  };

  const typeLabel = (type: string) => {
    if (type === "image") return "图片";
    if (type === "video") return "视频";
    return "YouTube";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">Landing Page 管理</h2>
        </div>
        <Button size="sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }} onClick={() => setAddOpen(true)}>
          <Plus size={14} className="mr-1" /> 添加媒体
        </Button>
      </div>

      {/* Company Intro */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">公司介绍</span>
          <Button size="sm" variant="outline" style={{ border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227" }}
            onClick={() => { setIntroText(companyIntro); setEditIntro(true); }}>
            <Edit2 size={12} className="mr-1" /> 编辑
          </Button>
        </div>
        <p className="text-xs text-muted-foreground whitespace-pre-line">{companyIntro || "未设置"}</p>
      </div>

      {/* Media List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : media.length === 0 ? (
        <div className="text-center text-muted-foreground py-10">
          <Image size={32} className="mx-auto mb-2 opacity-20" />
          <p className="text-sm">暂无媒体，点击"添加媒体"开始</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(media as any[]).map((m: any, idx: number) => (
            <div key={m.id} className="rounded-xl p-3 flex items-center gap-3"
              style={{
                background: "linear-gradient(145deg, #1a1510, #110e0a)",
                border: `1px solid ${m.is_active ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.06)"}`,
                opacity: m.is_active ? 1 : 0.5,
              }}>
              {/* Preview */}
              <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0" style={{ background: "#000" }}>
                {m.type === "image" ? (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {typeIcon(m.type)}
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(201,162,39,0.1)", color: "#C9A227" }}>
                    {typeLabel(m.type)}
                  </span>
                  <span className="text-xs text-foreground font-semibold truncate">{m.title || "无标题"}</span>
                </div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">{m.url}</div>
              </div>
              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button className="p-1.5 rounded" style={{ background: "rgba(201,162,39,0.1)" }}
                  onClick={() => moveMutation.mutate({ id: m.id, direction: "up" })} disabled={idx === 0}>
                  <ArrowUp size={12} style={{ color: idx === 0 ? "rgba(255,255,255,0.2)" : "#C9A227" }} />
                </button>
                <button className="p-1.5 rounded" style={{ background: "rgba(201,162,39,0.1)" }}
                  onClick={() => moveMutation.mutate({ id: m.id, direction: "down" })} disabled={idx === media.length - 1}>
                  <ArrowDown size={12} style={{ color: idx === media.length - 1 ? "rgba(255,255,255,0.2)" : "#C9A227" }} />
                </button>
                <button className="p-1.5 rounded" style={{ background: m.is_active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.05)" }}
                  onClick={() => toggleMutation.mutate({ id: m.id, active: !m.is_active })}>
                  <div className="w-3 h-3 rounded-full" style={{ background: m.is_active ? "#22c55e" : "rgba(255,255,255,0.3)" }} />
                </button>
                <button className="p-1.5 rounded" style={{ background: "rgba(239,68,68,0.1)" }}
                  onClick={() => { if (confirm("确定删除?")) deleteMutation.mutate(m.id); }}>
                  <Trash2 size={12} style={{ color: "#ef4444" }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Media Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm mx-auto" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>添加媒体</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">添加图片、视频或YouTube链接</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">类型</label>
              <div className="flex gap-2">
                {[
                  { value: "image", label: "图片", icon: Image },
                  { value: "video", label: "视频", icon: Video },
                  { value: "youtube", label: "YouTube", icon: Youtube },
                ].map((t) => (
                  <button key={t.value}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: form.type === t.value ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.03)",
                      border: form.type === t.value ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.06)",
                      color: form.type === t.value ? "#C9A227" : "rgba(255,255,255,0.5)",
                    }}
                    onClick={() => setForm({ ...form, type: t.value })}
                  >
                    <t.icon size={12} /> {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                {form.type === "youtube" ? "YouTube URL" : form.type === "video" ? "视频 URL" : "图片 URL"}
              </label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.2)", color: "#fff" }}
                placeholder={form.type === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."}
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">标题 (可选)</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.2)", color: "#fff" }}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">描述 (可选)</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.2)", color: "#fff" }}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <Button
              className="w-full font-bold text-sm"
              disabled={!form.url || addMutation.isPending}
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? <><Loader2 size={14} className="mr-1 animate-spin" />添加中...</> : "确认添加"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Company Intro Dialog */}
      <Dialog open={editIntro} onOpenChange={setEditIntro}>
        <DialogContent className="max-w-sm mx-auto" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}>
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>编辑公司介绍</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">Landing Page 显示的公司简介</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <textarea
              className="w-full rounded-lg px-3 py-2 text-sm min-h-[120px] resize-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,162,39,0.2)", color: "#fff" }}
              value={introText}
              onChange={(e) => setIntroText(e.target.value)}
            />
            <Button
              className="w-full font-bold text-sm"
              disabled={saveIntroMutation.isPending}
              style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
              onClick={() => saveIntroMutation.mutate()}
            >
              {saveIntroMutation.isPending ? <><Loader2 size={14} className="mr-1 animate-spin" />保存中...</> : <><Save size={14} className="mr-1" />保存</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
