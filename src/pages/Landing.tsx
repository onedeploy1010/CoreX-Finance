import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConnectModal } from "thirdweb/react";
import { supabase } from "@/lib/supabase";
import { client, bscChain, wallets } from "@/lib/thirdweb";
import { t, getLang } from "@/lib/i18n";
import { ChevronLeft, ChevronRight, Shield, TrendingUp, Zap, Globe, Users, BarChart3, Wallet, Play, ImageIcon } from "lucide-react";
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
  const lang = getLang();
  // Try language-specific key first, fallback to default
  const langKey = lang !== "zh" ? `company_intro_${lang}` : "company_intro";
  if (lang !== "zh") {
    const { data: langData } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", langKey)
      .single();
    if (langData?.value) return langData.value;
  }
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

function VideoSlider({ items }: { items: any[] }) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + items.length) % items.length), [items.length]);

  if (items.length === 0) return null;
  const item = items[current];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Play size={14} style={{ color: "#C9A227" }} />
        <span className="text-sm font-bold" style={{ color: "#C9A227" }}>{t("landing.videos") || "视频介绍"}</span>
        {items.length > 1 && <span className="text-[10px] text-foreground/30">{current + 1}/{items.length}</span>}
      </div>
      <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
        <div className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(201,162,39,0.15)", boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
          {item.type === "youtube" ? (
            <YouTubeEmbed url={item.url} />
          ) : (
            <video
              key={item.url}
              src={item.url}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
              style={{ background: "#000" }}
            />
          )}
        </div>

        {item.title && (
          <div className="absolute bottom-0 left-0 right-0 p-4 rounded-b-2xl z-10" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.8), transparent)" }}>
            <div className="text-sm font-bold text-white">{item.title}</div>
            {item.description && <div className="text-[11px] text-white/40 mt-0.5">{item.description}</div>}
          </div>
        )}

        {items.length > 1 && (
          <>
            <button className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 z-10"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(201,162,39,0.2)" }} onClick={prev}>
              <ChevronLeft size={16} style={{ color: "#C9A227" }} />
            </button>
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 z-10"
              style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(201,162,39,0.2)" }} onClick={next}>
              <ChevronRight size={16} style={{ color: "#C9A227" }} />
            </button>
          </>
        )}
      </div>
      {items.length > 1 && (
        <div className="flex gap-2 px-1">
          {items.map((v, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className="flex-1 py-2 rounded-lg text-[10px] font-medium transition-all truncate px-2"
              style={{
                background: i === current ? "rgba(201,162,39,0.12)" : "rgba(255,255,255,0.03)",
                border: i === current ? "1px solid rgba(201,162,39,0.3)" : "1px solid rgba(255,255,255,0.06)",
                color: i === current ? "#C9A227" : "rgba(255,255,255,0.35)",
              }}>
              {v.title || `视频 ${i + 1}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ImageSlider({ items }: { items: any[] }) {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % items.length), [items.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + items.length) % items.length), [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const timer = setInterval(next, 4000);
    return () => clearInterval(timer);
  }, [current, items.length, next]);

  if (items.length === 0) return null;
  const item = items[current];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <ImageIcon size={14} style={{ color: "#C9A227" }} />
        <span className="text-sm font-bold" style={{ color: "#C9A227" }}>{t("landing.gallery") || "企业风采"}</span>
        <span className="text-[10px] text-foreground/30">{current + 1}/{items.length}</span>
      </div>
      <div className="relative w-full" style={{ aspectRatio: "16/10" }}>
        <div className="absolute inset-0 rounded-2xl overflow-hidden"
          style={{ border: "1px solid rgba(201,162,39,0.12)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <img src={item.url} alt={item.title || ""} className="w-full h-full object-cover transition-all duration-700" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(0deg, rgba(12,10,8,0.6) 0%, transparent 40%)" }} />
        </div>

        {item.title && (
          <div className="absolute bottom-0 left-0 right-0 p-4 rounded-b-2xl z-10">
            <div className="text-sm font-bold text-white">{item.title}</div>
            {item.description && <div className="text-[11px] text-white/40 mt-0.5">{item.description}</div>}
          </div>
        )}

        {items.length > 1 && (
          <>
            <button className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 z-10"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(201,162,39,0.15)" }} onClick={prev}>
              <ChevronLeft size={16} style={{ color: "#C9A227" }} />
            </button>
            <button className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md active:scale-90 z-10"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(201,162,39,0.15)" }} onClick={next}>
              <ChevronRight size={16} style={{ color: "#C9A227" }} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {items.map((_, i) => (
                <button key={i} className="transition-all duration-300" onClick={() => setCurrent(i)}
                  style={{ width: i === current ? 20 : 5, height: 3, borderRadius: 2, background: i === current ? "#C9A227" : "rgba(255,255,255,0.2)" }} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Animated number counter
function AnimatedNum({ value, suffix = "" }: { value: string; suffix?: string }) {
  return <span className="tabular-nums">{value}{suffix}</span>;
}

// Floating particles animation
function TechParticles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${(i * 17 + 7) % 100}%`,
    top: `${(i * 23 + 13) % 100}%`,
    size: 1.5 + (i % 3),
    delay: i * 0.4,
    duration: 6 + (i % 5) * 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: `rgba(201,162,39,${0.15 + (p.id % 4) * 0.08})`,
            boxShadow: `0 0 ${p.size * 3}px rgba(201,162,39,${0.1 + (p.id % 3) * 0.05})`,
            animation: `techFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// Circuit board SVG pattern
function CircuitPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="circuit" x="0" y="0" width="120" height="120" patternUnits="userSpaceOnUse">
          {/* Horizontal lines */}
          <line x1="0" y1="30" x2="50" y2="30" stroke="#C9A227" strokeWidth="0.5" />
          <line x1="70" y1="30" x2="120" y2="30" stroke="#C9A227" strokeWidth="0.5" />
          <line x1="0" y1="90" x2="40" y2="90" stroke="#C9A227" strokeWidth="0.5" />
          <line x1="80" y1="90" x2="120" y2="90" stroke="#C9A227" strokeWidth="0.5" />
          {/* Vertical lines */}
          <line x1="60" y1="0" x2="60" y2="25" stroke="#C9A227" strokeWidth="0.5" />
          <line x1="60" y1="35" x2="60" y2="85" stroke="#C9A227" strokeWidth="0.5" />
          <line x1="60" y1="95" x2="60" y2="120" stroke="#C9A227" strokeWidth="0.5" />
          {/* Corner connections */}
          <polyline points="50,30 60,30 60,25" fill="none" stroke="#C9A227" strokeWidth="0.5" />
          <polyline points="60,95 60,90 80,90" fill="none" stroke="#C9A227" strokeWidth="0.5" />
          {/* Nodes (junction dots) */}
          <circle cx="60" cy="30" r="2" fill="#C9A227" />
          <circle cx="60" cy="90" r="2" fill="#C9A227" />
          <circle cx="50" cy="30" r="1.2" fill="#C9A227" />
          <circle cx="70" cy="30" r="1.2" fill="#C9A227" />
          <circle cx="40" cy="90" r="1.2" fill="#C9A227" />
          <circle cx="80" cy="90" r="1.2" fill="#C9A227" />
          {/* IC chip shapes */}
          <rect x="52" y="52" width="16" height="16" rx="1" fill="none" stroke="#C9A227" strokeWidth="0.5" />
          <line x1="55" y1="52" x2="55" y2="48" stroke="#C9A227" strokeWidth="0.4" />
          <line x1="60" y1="52" x2="60" y2="48" stroke="#C9A227" strokeWidth="0.4" />
          <line x1="65" y1="52" x2="65" y2="48" stroke="#C9A227" strokeWidth="0.4" />
          <line x1="55" y1="68" x2="55" y2="72" stroke="#C9A227" strokeWidth="0.4" />
          <line x1="60" y1="68" x2="60" y2="72" stroke="#C9A227" strokeWidth="0.4" />
          <line x1="65" y1="68" x2="65" y2="72" stroke="#C9A227" strokeWidth="0.4" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit)" />
    </svg>
  );
}

// Server rack silhouettes at bottom
function ServerRacks() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[280px] overflow-hidden opacity-[0.06]">
      <svg className="absolute bottom-0 w-full" viewBox="0 0 400 140" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
        {/* Rack 1 */}
        <rect x="20" y="20" width="35" height="120" rx="2" fill="none" stroke="#C9A227" strokeWidth="0.6" />
        {[0,1,2,3,4,5].map(i => (
          <g key={`r1-${i}`}>
            <rect x="24" y={25 + i * 18} width="27" height="12" rx="1" fill="#C9A227" fillOpacity="0.15" />
            <circle cx="46" cy={31 + i * 18} r="1.5" fill="#22c55e" fillOpacity="0.6" />
            <line x1="26" y1={29 + i * 18} x2="38" y2={29 + i * 18} stroke="#C9A227" strokeWidth="0.3" />
            <line x1="26" y1={33 + i * 18} x2="34" y2={33 + i * 18} stroke="#C9A227" strokeWidth="0.3" />
          </g>
        ))}
        {/* Rack 2 */}
        <rect x="70" y="10" width="40" height="130" rx="2" fill="none" stroke="#C9A227" strokeWidth="0.6" />
        {[0,1,2,3,4,5,6].map(i => (
          <g key={`r2-${i}`}>
            <rect x="74" y={15 + i * 17} width="32" height="11" rx="1" fill="#C9A227" fillOpacity="0.1" />
            <circle cx="101" cy={20 + i * 17} r="1.5" fill={i % 3 === 0 ? "#C9A227" : "#22c55e"} fillOpacity="0.5" />
            <rect x="76" y={18 + i * 17} width="8" height="4" rx="0.5" fill="#C9A227" fillOpacity="0.08" />
          </g>
        ))}
        {/* Rack 3 - taller */}
        <rect x="130" y="5" width="45" height="135" rx="2" fill="none" stroke="#C9A227" strokeWidth="0.6" />
        {[0,1,2,3,4,5,6,7].map(i => (
          <g key={`r3-${i}`}>
            <rect x="134" y={10 + i * 16} width="37" height="10" rx="1" fill="#C9A227" fillOpacity={i % 2 === 0 ? "0.12" : "0.06"} />
            <circle cx="165" cy={15 + i * 16} r="1.2" fill="#3b82f6" fillOpacity="0.5" />
            <circle cx="160" cy={15 + i * 16} r="1.2" fill="#22c55e" fillOpacity="0.4" />
          </g>
        ))}
        {/* Rack 4 */}
        <rect x="195" y="15" width="38" height="125" rx="2" fill="none" stroke="#C9A227" strokeWidth="0.6" />
        {[0,1,2,3,4,5,6].map(i => (
          <g key={`r4-${i}`}>
            <rect x="199" y={20 + i * 16} width="30" height="10" rx="1" fill="#C9A227" fillOpacity="0.08" />
            <circle cx="224" cy={25 + i * 16} r="1.5" fill="#C9A227" fillOpacity="0.4" />
          </g>
        ))}
        {/* Rack 5 */}
        <rect x="250" y="8" width="42" height="132" rx="2" fill="none" stroke="#C9A227" strokeWidth="0.6" />
        {[0,1,2,3,4,5,6,7].map(i => (
          <g key={`r5-${i}`}>
            <rect x="254" y={13 + i * 15} width="34" height="9" rx="1" fill="#C9A227" fillOpacity={i % 3 === 0 ? "0.15" : "0.07"} />
            <circle cx="282" cy={17 + i * 15} r="1" fill="#22c55e" fillOpacity="0.5" />
            <circle cx="278" cy={17 + i * 15} r="1" fill="#C9A227" fillOpacity="0.3" />
          </g>
        ))}
        {/* Rack 6 */}
        <rect x="310" y="18" width="35" height="122" rx="2" fill="none" stroke="#C9A227" strokeWidth="0.6" />
        {[0,1,2,3,4,5].map(i => (
          <g key={`r6-${i}`}>
            <rect x="314" y={23 + i * 18} width="27" height="12" rx="1" fill="#C9A227" fillOpacity="0.1" />
            <circle cx="336" cy={29 + i * 18} r="1.5" fill="#3b82f6" fillOpacity="0.4" />
          </g>
        ))}
        {/* Rack 7 */}
        <rect x="360" y="12" width="30" height="128" rx="2" fill="none" stroke="#C9A227" strokeWidth="0.6" />
        {[0,1,2,3,4,5,6].map(i => (
          <g key={`r7-${i}`}>
            <rect x="363" y={17 + i * 16} width="24" height="10" rx="1" fill="#C9A227" fillOpacity="0.09" />
            <circle cx="383" cy={22 + i * 16} r="1" fill="#22c55e" fillOpacity="0.5" />
          </g>
        ))}
        {/* Connection cables between racks */}
        <path d="M55 130 Q75 145 110 130" fill="none" stroke="#C9A227" strokeWidth="0.3" strokeDasharray="2,3" />
        <path d="M175 135 Q210 150 250 135" fill="none" stroke="#C9A227" strokeWidth="0.3" strokeDasharray="2,3" />
        <path d="M292 138 Q320 148 345 138" fill="none" stroke="#C9A227" strokeWidth="0.3" strokeDasharray="2,3" />
      </svg>
      {/* Fade gradient overlay */}
      <div className="absolute inset-x-0 top-0 h-24" style={{ background: "linear-gradient(180deg, #080604, transparent)" }} />
    </div>
  );
}

// Horizontal scanning line effect
function ScanLine() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute left-0 right-0 h-[1px]"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(201,162,39,0.08) 20%, rgba(201,162,39,0.15) 50%, rgba(201,162,39,0.08) 80%, transparent 100%)",
          animation: "scanDown 8s linear infinite",
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const { data: media = [] } = useQuery({ queryKey: ["/api/media"], queryFn: getMedia });
  const { data: companyIntro = "" } = useQuery({ queryKey: ["/api/company-intro", getLang()], queryFn: getCompanyIntro });
  const { connect } = useConnectModal();
  const [connecting, setConnecting] = useState(false);

  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);

  const handleConnectWallet = async () => {
    try {
      setConnecting(true);
      await connect({
        client,
        chain: bscChain,
        wallets,
        size: "compact",
        showThirdwebBranding: false,
      });
      // Once connected, App.tsx will auto-switch to FrontendRoutes
    } catch {
      // User cancelled or error
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden" style={{ background: "#080604" }}>
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Data center photo backgrounds - layered with transparency */}
        <div className="absolute inset-0">
          <img src="/datacenter-bg1.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.08 }} />
        </div>
        <div className="absolute inset-0" style={{ opacity: 0.06 }}>
          <img src="/datacenter-bg2.jpg" alt="" className="absolute top-0 left-0 w-full h-[50%] object-cover"
            style={{ maskImage: "linear-gradient(180deg, black 30%, transparent)", WebkitMaskImage: "linear-gradient(180deg, black 30%, transparent)" }} />
        </div>
        <div className="absolute inset-0" style={{ opacity: 0.07 }}>
          <img src="/datacenter-bg3.jpg" alt="" className="absolute bottom-0 left-0 w-full h-[50%] object-cover"
            style={{ maskImage: "linear-gradient(0deg, black 20%, transparent)", WebkitMaskImage: "linear-gradient(0deg, black 20%, transparent)" }} />
        </div>
        {/* Dark overlay with gold tint */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,6,4,0.75) 0%, rgba(8,6,4,0.6) 40%, rgba(8,6,4,0.7) 70%, rgba(8,6,4,0.85) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "rgba(201,162,39,0.03)", mixBlendMode: "overlay" }} />
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px]"
          style={{ background: "radial-gradient(ellipse, rgba(201,162,39,0.06) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px]"
          style={{ background: "radial-gradient(circle, rgba(201,162,39,0.03) 0%, transparent 60%)" }} />
        <div className="absolute top-1/3 right-0 w-[300px] h-[300px]"
          style={{ background: "radial-gradient(circle, rgba(201,162,39,0.02) 0%, transparent 60%)" }} />
        {/* Circuit board pattern */}
        <CircuitPattern />
        {/* Floating tech particles */}
        <TechParticles />
        {/* Scanning line */}
        <ScanLine />
        {/* Server rack silhouettes */}
        <ServerRacks />
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
          {t("landing.subtitle")}
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

        {/* Video Carousel */}
        {media.filter((m: any) => m.type === "video" || m.type === "youtube").length > 0 && (
          <VideoSlider items={media.filter((m: any) => m.type === "video" || m.type === "youtube")} />
        )}

        {/* Image Gallery */}
        {media.filter((m: any) => m.type === "image").length > 0 && (
          <ImageSlider items={media.filter((m: any) => m.type === "image")} />
        )}

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
          {[t("landing.trust_bsc"), t("landing.trust_contract"), "USDT", t("landing.auto_settle")].map((label) => (
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
              opacity: connecting ? 0.7 : 1,
            }}
            onClick={handleConnectWallet}
            disabled={connecting}
          >
            {/* Shine effect */}
            <div className="absolute inset-0 opacity-0 group-active:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.2), transparent)" }} />
            <span className="relative z-10 flex items-center gap-2">
              {connecting ? t("landing.connecting") : t("landing.connect_wallet")} <Wallet size={18} strokeWidth={2.5} />
            </span>
          </button>

          {/* Footer */}
          <div className="text-center space-y-2 pb-4">
            <div className="flex items-center justify-center gap-2">
              <div className="h-[1px] w-8" style={{ background: "linear-gradient(90deg, transparent, rgba(201,162,39,0.15))" }} />
              <span className="text-[10px] font-medium" style={{ color: "rgba(201,162,39,0.2)" }}>CoreX Finance</span>
              <div className="h-[1px] w-8" style={{ background: "linear-gradient(90deg, rgba(201,162,39,0.15), transparent)" }} />
            </div>
            <div className="text-[9px] text-foreground/10">{t("landing.footer_desc")}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
