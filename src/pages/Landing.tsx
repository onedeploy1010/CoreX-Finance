import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { t } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, Shield, TrendingUp, Zap, Globe, ArrowRight, Users, BarChart3 } from "lucide-react";
import { LangSwitch } from "@/components/LangSwitch";

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
      <div className="absolute inset-0 rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(201,162,39,0.12)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
        {item.type === "image" && (
          <img src={item.url} alt={item.title || ""} className="w-full h-full object-cover transition-opacity duration-700" />
        )}
        {item.type === "video" && (
          <video
            src={item.url}
            controls
            playsInline
            preload="metadata"
            className="w-full h-full object-contain"
            style={{ background: "#000" }}
            onPlay={() => setIsAutoPlay(false)}
            onPause={() => setIsAutoPlay(true)}
            onEnded={() => { setIsAutoPlay(true); next(); }}
          />
        )}
        {item.type === "youtube" && <YouTubeEmbed url={item.url} />}
        <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(12,10,8,0.8) 0%, transparent 50%)" }} />
      </div>

      {item.title && (
        <div className="absolute bottom-0 left-0 right-0 p-5 rounded-b-2xl z-10">
          <div className="text-base font-bold text-white">{item.title}</div>
          {item.description && <div className="text-sm text-white/50 mt-1">{item.description}</div>}
        </div>
      )}

      {items.length > 1 && (
        <>
          <button className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 z-10"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(201,162,39,0.2)" }} onClick={prev}>
            <ChevronLeft size={18} style={{ color: "#C9A227" }} />
          </button>
          <button className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md transition-all active:scale-90 z-10"
            style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(201,162,39,0.2)" }} onClick={next}>
            <ChevronRight size={18} style={{ color: "#C9A227" }} />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {items.map((_, i) => (
              <button key={i} className="transition-all duration-300" onClick={() => setCurrent(i)}
                style={{ width: i === current ? 24 : 6, height: 4, borderRadius: 2, background: i === current ? "#C9A227" : "rgba(255,255,255,0.25)" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Animated number counter
function AnimatedNum({ value, suffix = "" }: { value: string; suffix?: string }) {
  return <span className="tabular-nums">{value}{suffix}</span>;
}

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const { data: media = [] } = useQuery({ queryKey: ["/api/media"], queryFn: getMedia });
  const { data: companyIntro = "" } = useQuery({ queryKey: ["/api/company-intro"], queryFn: getCompanyIntro });

  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: "#080604" }}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{ background: "radial-gradient(ellipse, rgba(201,162,39,0.06) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px]"
          style={{ background: "radial-gradient(circle, rgba(201,162,39,0.03) 0%, transparent 60%)" }} />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px]"
          style={{ background: "radial-gradient(circle, rgba(201,162,39,0.02) 0%, transparent 60%)" }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]"
          style={{ backgroundImage: "linear-gradient(rgba(201,162,39,1) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,39,1) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* Language Switch - top right */}
      <div className="absolute top-4 right-4 z-20">
        <LangSwitch />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center pt-12 pb-8 px-6"
        style={{ transition: "opacity 0.8s ease, transform 0.8s ease", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)" }}>
        {/* Logo */}
        <div className="relative mb-5">
          <div className="absolute inset-0 scale-150 blur-3xl opacity-30"
            style={{ background: "radial-gradient(circle, rgba(201,162,39,0.4), transparent 70%)" }} />
          <img src="/corex.png" alt="CoreX" className="w-24 h-24 relative z-10"
            style={{ filter: "drop-shadow(0 0 30px rgba(201,162,39,0.3))" }} />
        </div>

        {/* Title */}
        <h1 className="font-black text-4xl tracking-wider mb-2" style={{
          background: "linear-gradient(135deg, #F5E6A3 0%, #C9A227 50%, #8B6914 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          textShadow: "none",
        }}>CoreX</h1>
        <p className="text-[11px] tracking-[0.4em] uppercase font-medium" style={{ color: "rgba(201,162,39,0.4)" }}>
          AI Computing Infrastructure
        </p>

        {/* Tagline */}
        <div className="mt-4 text-center max-w-xs">
          <p className="text-sm font-medium text-foreground/50 leading-relaxed">
            {t("landing.tagline")}<br />
            <span style={{ color: "rgba(201,162,39,0.7)" }}>{t("landing.keywords")}</span>
          </p>
        </div>
      </div>

      <main className="flex-1 px-5 pb-10 space-y-7 relative z-10"
        style={{ transition: "opacity 1s ease 0.3s, transform 1s ease 0.3s", opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(30px)" }}>

        {/* Media Carousel */}
        {media.length > 0 && <MediaSlider items={media} />}

        {/* Stats Strip */}
        <div className="rounded-2xl p-4 grid grid-cols-3 gap-4"
          style={{
            background: "linear-gradient(135deg, rgba(201,162,39,0.06) 0%, rgba(201,162,39,0.02) 100%)",
            border: "1px solid rgba(201,162,39,0.1)",
          }}>
          {[
            { icon: Shield, value: "BSC", label: t("landing.blockchain"), color: "#22c55e" },
            { icon: BarChart3, value: "24/7", label: t("landing.auto_settle"), color: "#C9A227" },
            { icon: Users, value: "USDT", label: t("landing.stablecoin"), color: "#3b82f6" },
          ].map((s) => (
            <div key={s.label} className="text-center space-y-1.5">
              <div className="w-9 h-9 rounded-xl mx-auto flex items-center justify-center"
                style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <div className="text-base font-black" style={{ color: "#C9A227" }}>
                <AnimatedNum value={s.value} />
              </div>
              <div className="text-[10px] text-foreground/30">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Company Intro */}
        {companyIntro && (
          <div className="rounded-2xl relative overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(26,21,16,0.95), rgba(12,10,8,0.95))",
              border: "1px solid rgba(201,162,39,0.12)",
            }}>
            {/* Top gold line */}
            <div className="h-[2px] w-full" style={{ background: "linear-gradient(90deg, transparent, #C9A227, transparent)" }} />
            <div className="p-5 space-y-3">
              <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
                style={{ background: "radial-gradient(circle at top right, rgba(201,162,39,0.06), transparent 70%)" }} />
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #F5E6A3, #9A7A1A)" }} />
                <h2 className="font-bold text-base" style={{ color: "#C9A227" }}>{t("landing.about")}</h2>
              </div>
              <p className="text-[13px] text-foreground/50 leading-[1.8] whitespace-pre-line">{companyIntro}</p>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 mb-1">
            <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
            <span className="text-sm font-bold text-foreground/70">{t("landing.advantages")}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Shield, title: t("landing.feat_secure"), desc: t("landing.feat_secure_desc"), color: "#22c55e" },
              { icon: TrendingUp, title: t("landing.feat_profit"), desc: t("landing.feat_profit_desc"), color: "#C9A227" },
              { icon: Zap, title: t("landing.feat_withdraw"), desc: t("landing.feat_withdraw_desc"), color: "#3b82f6" },
              { icon: Globe, title: t("landing.feat_global"), desc: t("landing.feat_global_desc"), color: "#a855f7" },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl p-4 relative overflow-hidden group"
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.03), rgba(255,255,255,0.005))",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}>
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                  style={{ background: `radial-gradient(circle at center, ${f.color}08, transparent 70%)` }} />

                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                  style={{ background: `${f.color}10`, border: `1px solid ${f.color}18` }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <div className="font-bold text-sm text-foreground mb-1">{f.title}</div>
                <div className="text-[11px] text-foreground/30 leading-relaxed whitespace-pre-line">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-6 py-2">
          {["BSC Chain", "Smart Contract", "USDT", "Auto Settlement"].map((label) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
              <span className="text-[10px] text-foreground/25">{label}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="pt-1 space-y-5">
          <button
            className="w-full py-4.5 rounded-2xl font-bold text-base transition-all active:scale-[0.97] flex items-center justify-center gap-2.5 relative overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, #F5E6A3, #C9A227, #9A7A1A)",
              color: "#0c0a08",
              boxShadow: "0 8px 32px rgba(201,162,39,0.25), 0 2px 8px rgba(201,162,39,0.2)",
              padding: "18px 0",
            }}
            onClick={onEnter}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.2), transparent)" }} />
            <span className="relative z-10 flex items-center gap-2">
              {t("landing.enter")} <ArrowRight size={18} strokeWidth={2.5} />
            </span>
          </button>

          {/* Footer */}
          <div className="text-center space-y-2 pb-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] w-8" style={{ background: "linear-gradient(90deg, transparent, rgba(201,162,39,0.15))" }} />
              <span className="text-[10px] font-medium" style={{ color: "rgba(201,162,39,0.2)" }}>CoreX Finance</span>
              <div className="h-[1px] w-8" style={{ background: "linear-gradient(90deg, rgba(201,162,39,0.15), transparent)" }} />
            </div>
            <div className="text-[9px] text-foreground/10">BSC Chain · USDT Staking · Decentralized Platform</div>
          </div>
        </div>
      </main>
    </div>
  );
}
