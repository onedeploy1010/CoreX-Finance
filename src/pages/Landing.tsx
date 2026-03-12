import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX } from "lucide-react";

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
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [current, isAutoPlay, items, next]);

  if (items.length === 0) return null;

  const item = items[current];

  return (
    <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
      <div className="absolute inset-0 rounded-xl overflow-hidden" style={{ background: "#000" }}>
        {item.type === "image" && (
          <img src={item.url} alt={item.title || ""} className="w-full h-full object-cover" />
        )}
        {item.type === "video" && (
          <video
            src={item.url}
            controls
            className="w-full h-full object-contain"
            onPlay={() => setIsAutoPlay(false)}
            onEnded={() => setIsAutoPlay(true)}
          />
        )}
        {item.type === "youtube" && <YouTubeEmbed url={item.url} />}
      </div>

      {item.title && (
        <div className="absolute bottom-0 left-0 right-0 p-3 rounded-b-xl"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
          <div className="text-sm font-semibold text-white">{item.title}</div>
          {item.description && <div className="text-xs text-white/60 mt-0.5">{item.description}</div>}
        </div>
      )}

      {items.length > 1 && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={prev}
          >
            <ChevronLeft size={16} className="text-white" />
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={next}
          >
            <ChevronRight size={16} className="text-white" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                className="w-2 h-2 rounded-full transition-all"
                style={{ background: i === current ? "#C9A227" : "rgba(255,255,255,0.4)" }}
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
    <div className="min-h-screen flex flex-col" style={{ background: "#0c0a08" }}>
      {/* Header */}
      <header className="flex items-center justify-center px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", boxShadow: "0 0 20px rgba(201,162,39,0.4)" }}>
            <span className="text-black font-black text-lg">C</span>
          </div>
          <div>
            <span className="font-bold text-xl tracking-wide gold-text">CoreX</span>
            <div className="text-[10px] text-muted-foreground -mt-0.5">AI Computing Infrastructure</div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-8 space-y-5">
        {/* Media Carousel */}
        {media.length > 0 && <MediaSlider items={media} />}

        {/* Company Intro */}
        {companyIntro && (
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.2)" }}>
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
              <h2 className="font-bold text-sm" style={{ color: "#C9A227" }}>关于 CoreX</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{companyIntro}</p>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: "🔒", title: "安全可靠", desc: "智能合约保障" },
            { icon: "📈", title: "稳定收益", desc: "AI算力驱动" },
            { icon: "⚡", title: "即时结算", desc: "链上自动执行" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl p-3 text-center"
              style={{ background: "rgba(201,162,39,0.05)", border: "1px solid rgba(201,162,39,0.12)" }}>
              <div className="text-2xl mb-1">{f.icon}</div>
              <div className="text-xs font-bold text-foreground">{f.title}</div>
              <div className="text-[10px] text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className="w-full py-4 rounded-xl font-bold text-base transition-all active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #C9A227, #9A7A1A)",
            color: "#0c0a08",
            boxShadow: "0 4px 20px rgba(201,162,39,0.3)",
          }}
          onClick={onEnter}
        >
          进入平台
        </button>

        <div className="text-center">
          <div className="text-xs text-muted-foreground">CoreX Finance · BSC链 · USDT理财质押平台</div>
        </div>
      </main>
    </div>
  );
}
