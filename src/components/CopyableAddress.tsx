import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function CopyableAddress({ address, className }: { address: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(address);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = address;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <span className={`inline-flex items-center gap-1 ${className || ""}`}>
      <span className="font-mono text-xs">{shortAddr(address)}</span>
      <button
        onClick={handleCopy}
        className="p-0.5 rounded transition-colors"
        style={{ color: copied ? "#22c55e" : "rgba(201,162,39,0.6)", minWidth: "18px", minHeight: "18px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        title="复制地址"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
}
