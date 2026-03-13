import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Shield, TrendingUp, Zap, Globe, ArrowRight } from "lucide-react";

async function getMedia() {
  const { data } = await supabase
    .from("media")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return data || [];
}

async function getCompanyIntro() {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "company_intro")
    .single();
  return data?.value || "";
}

function YouTubeEmbed({ url }: { url: string }) {
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?\s]+)/);
    return match ? match[1] : null;
  };
  const videoId = getYouTubeId(url);
  if (!videoId) return null;
  return (
    <iframe
      className="w-full h-full absolute inset-0"
      src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`}
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
    />
  );
}

function MediaSlider({ items }: { items: any[] }) {
  const [current, setCurrent] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + items.length) % items.length);
  }, [items.length]);

  useEffect(() => {
    if (!isAutoPlay || items.length <= 1) return;
    const item = items[current];
    if (item?.type !== "image") return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [current, isAutoPlay, items, next]);

  if (items.length === 0) return null;

  const item = items[current];

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
      <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(201,162,39,0.15)" }}>
        {item.type === "image" && (
          <img src={item.url} alt={item.title || ""} className="w-full h-full object-cover transition-opacity duration-700" />
        )}
        {item.type === "video" && (
          <video
            src={item.url}
            controls
            className="w-full h-full object-contain"
            style={{ background: "#000" }}
            onPlay={() => setIsAutoPlay(false)}
            onEnded={() => setIsAutoPlay(true)}
          />
        )}
        {item.type === "youtube" && <YouTubeEmbed url={item.url} />}

        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(12,10,8,0.7) 0%, transparent 40%)" }} />
      </div>

      {item.title && (
        <div className="absolute bottom-0 left-0 right-0 p-5 rounded-b-2xl">
          <div className="text-base font-bold text-white">{item.title}</div>
          {item.description && <div className="text-sm text-white/50 mt-1">{item.description}</div>}
        </div>
      )}

      {items.length > 1 && (
        <>
          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-90"
            style={{ background: "rgba(201,162,39,0.15)", border: "1px solid rgba(201,162,39,0.25)" }}
            onClick={prev}
          >
            <ChevronLeft size={18} style={{ color: "#C9A227" }} />
          </button>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-sm transition-all active:scale-90"
            style={{ background: "rgba(201,162,39,0.15)", border: "1px solid rgba(201,162,39,0.25)" }}
            onClick={next}
          >
            <ChevronRight size={18} style={{ color: "#C9A227" }} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                className="transition-all duration-300"
                style={{
                  width: i === current ? 20 : 8,
                  height: 4,
                  borderRadius: 2,
                  background: i === current ? "#C9A227" : "rgba(255,255,255,0.3)",
                }}
                onClick={() => setCurrent(i)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const { data: media = [] } = useQuery({
    queryKey: ["/api/media"],
    queryFn: getMedia,
  });

  const { data: companyIntro = "" } = useQuery({
    queryKey: ["/api/company-intro"],
    queryFn: getCompanyIntro,
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "radial-gradient(ellipse at top, #1a1510 0%, #0c0a08 50%, #080604 100%)" }}>
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(201,162,39,0.08) 0%, transparent 70%)" }} />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-center px-6 pt-10 pb-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center rotate-3 transition-transform hover:rotate-0"
            style={{
              background: "linear-gradient(135deg, #C9A227, #E8D48B, #9A7A1A)",
              boxShadow: "0 8px 32px rgba(201,162,39,0.4), 0 0 0 1px rgba(201,162,39,0.2)",
            }}>
            <span className="text-black font-black text-2xl -rotate-3">C</span>
          </div>
          <div className="text-center">
            <h1 className="font-black text-3xl tracking-wider" style={{
              background: "linear-gradient(135deg, #E8D48B, #C9A227, #9A7A1A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>CoreX</h1>
            <p className="text-xs tracking-[0.3em] mt-1" style={{ color: "rgba(201,162,39,0.5)" }}>
              AI COMPUTING INFRASTRUCTURE
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pb-10 space-y-6 relative z-10">
        {/* Media Carousel */}
        {media.length > 0 && <MediaSlider items={media} />}

        {/* Stats Row */}
        <div className="flex items-center justify-center gap-8 py-2">
          {[
            { value: "BSC", label: "区块链" },
            { value: "24/7", label: "自动结算" },
            { value: "USDT", label: "稳定币" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-lg font-black" style={{ color: "#C9A227" }}>{s.value}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Company Intro */}
        {companyIntro && (
          <div className="rounded-2xl p-5 space-y-3 relative overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(26,21,16,0.9), rgba(17,14,10,0.9))",
              border: "1px solid rgba(201,162,39,0.15)",
              backdropFilter: "blur(20px)",
            }}>
            {/* Decorative corner */}
            <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none"
              style={{ background: "radial-gradient(circle at top right, rgba(201,162,39,0.08), transparent 70%)" }} />
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #E8D48B, #9A7A1A)" }} />
              <h2 className="font-bold text-base" style={{ color: "#C9A227" }}>关于 CoreX</h2>
            </div>
            <p className="text-sm text-foreground/60 leading-relaxed whitespace-pre-line">{companyIntro}</p>
          </div>
        )}

        {/* Features */}
        <div className="space-y-3">
          {[
            { icon: Shield, title: "安全可靠", desc: "智能合约自动执行，链上透明可查，资金安全有保障", color: "#22c55e" },
            { icon: TrendingUp, title: "稳定收益", desc: "AI算力驱动的量化投资策略，每日自动结算收益", color: "#C9A227" },
            { icon: Zap, title: "即时结算", desc: "BSC链上自动执行，提现秒到账，无需人工审核", color: "#3b82f6" },
            { icon: Globe, title: "全球节点", desc: "分布式AI算力网络，覆盖全球主要数据中心", color: "#a855f7" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-4 rounded-2xl p-4 transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${f.color}12`, border: `1px solid ${f.color}25` }}>
                <f.icon size={18} style={{ color: f.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-foreground mb-0.5">{f.title}</div>
                <div className="text-xs text-foreground/40 leading-relaxed">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="pt-2 space-y-4">
          <button
            className="w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            style={{
              background: "linear-gradient(135deg, #E8D48B, #C9A227, #9A7A1A)",
              color: "#0c0a08",
              boxShadow: "0 8px 32px rgba(201,162,39,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
            onClick={onEnter}
          >
            进入平台 <ArrowRight size={18} />
          </button>

          <div className="text-center space-y-1">
            <div className="text-[11px] text-foreground/25">CoreX Finance</div>
            <div className="text-[10px] text-foreground/15">BSC Chain · USDT Staking Platform</div>
          </div>
        </div>
      </main>
    </div>
  );
}
