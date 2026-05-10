import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminLogs } from "@/lib/api";
import { ChevronLeft, ChevronRight, ScrollText, UserCog, Search, Calendar } from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "超管",
  tech: "技术调试",
  finance: "财务",
  customer_service: "客服",
  custom: "自定义",
};

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  superadmin: { bg: "rgba(239,68,68,0.1)", color: "#ef4444" },
  tech: { bg: "rgba(168,85,247,0.1)", color: "#a855f7" },
  finance: { bg: "rgba(59,130,246,0.1)", color: "#3b82f6" },
  customer_service: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
  custom: { bg: "rgba(201,162,39,0.1)", color: "#C9A227" },
};

export default function AdminLogs() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");

  const filterKey = `?page=${page}&search=${search}&role=${role}&from=${appliedFrom}&to=${appliedTo}`;
  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/logs", filterKey],
    queryFn: () => getAdminLogs(page, 30, {
      search: search || undefined,
      role: role || undefined,
      dateFrom: appliedFrom || undefined,
      dateTo: appliedTo || undefined,
    }),
  });

  const d = data as any;
  const logs = d?.logs || [];
  const totalPages = d ? Math.ceil(d.total / d.limit) : 1;

  const handleSearch = () => { setSearch(searchInput.trim()); setPage(1); };
  const applyDatePreset = (days: number) => {
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
    setDateFrom(start); setDateTo(end);
    setAppliedFrom(start); setAppliedTo(end);
    setPage(1);
  };
  const clearAll = () => {
    setSearchInput(""); setSearch(""); setRole("");
    setDateFrom(""); setDateTo(""); setAppliedFrom(""); setAppliedTo("");
    setPage(1);
  };
  const hasFilters = !!(search || role || appliedFrom || appliedTo);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
          <h2 className="font-bold text-lg text-foreground">操作日志</h2>
          <span className="text-xs text-muted-foreground ml-2">共 {d?.total || 0} 条</span>
        </div>
        {hasFilters && (
          <button onClick={clearAll} className="text-[10px] px-2 py-1 rounded-full"
            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
            清除全部筛选
          </button>
        )}
      </div>

      {/* Search + role */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            placeholder="搜索操作 / 用户名 / 目标..."
            className="pl-9 text-sm"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,162,39,0.2)", minHeight: "40px" }}
          />
        </div>
        <select
          value={role}
          onChange={e => { setRole(e.target.value); setPage(1); }}
          className="text-xs rounded px-2 shrink-0"
          style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.25)", color: "#C9A227", minHeight: "40px", minWidth: "100px" }}
        >
          <option value="">全部角色</option>
          {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Button onClick={handleSearch} className="text-sm" style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "40px" }}>
          搜索
        </Button>
      </div>

      {/* Date range */}
      <div className="rounded-xl p-3 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.15)" }}>
        <div className="flex items-center gap-2">
          <Calendar size={13} style={{ color: "#C9A227" }} />
          <span className="text-xs font-bold text-foreground">日期区间</span>
          {(appliedFrom || appliedTo) && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {appliedFrom || "…"} ~ {appliedTo || "…"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-xs rounded-lg px-2.5 py-2 flex-1 min-w-[120px]"
            style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227", colorScheme: "dark" }} />
          <span className="text-xs text-muted-foreground">至</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="text-xs rounded-lg px-2.5 py-2 flex-1 min-w-[120px]"
            style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227", colorScheme: "dark" }} />
          <Button size="sm" onClick={() => { setAppliedFrom(dateFrom); setAppliedTo(dateTo); setPage(1); }}
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08", minHeight: "36px" }}>
            应用
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: "近 7 天", days: 7 },
            { label: "近 30 天", days: 30 },
            { label: "近 90 天", days: 90 },
          ].map(p => (
            <button key={p.label} onClick={() => applyDatePreset(p.days)}
              className="text-[10px] px-2 py-1 rounded-full"
              style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227" }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-10">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-muted-foreground py-20">
          <ScrollText size={32} className="mx-auto mb-2 opacity-30" />
          <div className="text-sm">{hasFilters ? "未匹配到日志" : "暂无操作日志"}</div>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log: any) => {
            const rc = ROLE_COLORS[log.adminRole] || ROLE_COLORS.customer_service;
            return (
              <div key={log.id} className="rounded-xl p-3 space-y-1.5" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCog size={14} style={{ color: rc.color }} />
                    <span className="text-xs font-semibold">{log.adminUsername}</span>
                    <span className="text-[10px] px-1 py-0.5 rounded" style={{ background: rc.bg, color: rc.color }}>
                      {ROLE_LABELS[log.adminRole] || log.adminRole}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium" style={{ color: "#C9A227" }}>{log.action}</span>
                  {log.targetType && (
                    <span className="text-[10px] text-muted-foreground">
                      [{log.targetType}] {log.targetId || ""}
                    </span>
                  )}
                </div>
                {log.detail && (
                  <div className="text-[10px] text-muted-foreground font-mono p-1.5 rounded break-all" style={{ background: "rgba(201,162,39,0.04)" }}>
                    {typeof log.detail === "string" ? log.detail : JSON.stringify(log.detail)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
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
      )}
    </div>
  );
}
