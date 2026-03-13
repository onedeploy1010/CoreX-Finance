import { useState } from "react";
import { Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getLang } from "@/lib/i18n";

const LANGUAGES = [
  { code: "zh", label: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", label: "ไทย", flag: "🇹🇭" },
  { code: "id", label: "Bahasa Indonesia", flag: "🇮🇩" },
  { code: "ms", label: "Bahasa Melayu", flag: "🇲🇾" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", flag: "🇸🇦" },
];

export function LangSwitch({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => getLang());
  const currentLangObj = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

  return (
    <>
      <button
        className={`flex items-center gap-1 px-2 py-1.5 rounded-lg transition-all ${className || ""}`}
        style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)" }}
        onClick={() => setOpen(true)}
      >
        <Globe size={13} style={{ color: "#C9A227" }} />
        <span className="text-[11px] font-medium" style={{ color: "#C9A227" }}>{currentLangObj.flag}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-sm mx-auto max-h-[80vh] overflow-y-auto"
          style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.3)" }}
        >
          <DialogHeader>
            <DialogTitle className="text-center" style={{ color: "#C9A227" }}>Language / 语言</DialogTitle>
            <DialogDescription className="text-center text-xs text-muted-foreground">Select your preferred language</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-1.5 py-2">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200"
                style={{
                  background: lang.code === currentLang ? "rgba(201,162,39,0.15)" : "rgba(255,255,255,0.02)",
                  border: lang.code === currentLang ? "1px solid rgba(201,162,39,0.35)" : "1px solid rgba(255,255,255,0.06)",
                }}
                onClick={() => {
                  setCurrentLang(lang.code as any);
                  try { localStorage.setItem("corex_lang", lang.code); } catch {}
                  setOpen(false);
                  window.location.reload();
                }}
              >
                <span className="text-base">{lang.flag}</span>
                <span className="text-xs font-medium" style={{ color: lang.code === currentLang ? "#C9A227" : "rgba(255,255,255,0.6)" }}>
                  {lang.label}
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
