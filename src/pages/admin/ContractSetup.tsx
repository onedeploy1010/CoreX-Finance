import { useState, useEffect } from "react";
import { Loader2, Check, ExternalLink } from "lucide-react";
import {
  getDistributorRecipients,
  isAuthorizedCaller,
  getProductCount,
  COREX_INVESTMENT_ADDRESS,
  FUND_DISTRIBUTOR_ADDRESS,
  COREX_WITHDRAWAL_ADDRESS,
} from "@/lib/contracts";
import { getProducts, DBProduct } from "@/lib/api";

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ContractSetup() {
  const [recipients, setRecipients] = useState<any[]>([]);
  const [investAuthorized, setInvestAuthorized] = useState<boolean | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);
  const [dbProducts, setDbProducts] = useState<DBProduct[]>([]);

  useEffect(() => {
    loadContractData();
  }, []);

  const loadContractData = async () => {
    setLoadingData(true);
    try {
      const [recs, authStatus, pCount, products] = await Promise.all([
        getDistributorRecipients().catch(() => []),
        isAuthorizedCaller(COREX_INVESTMENT_ADDRESS).catch(() => null),
        getProductCount().catch(() => 0),
        getProducts().catch(() => []),
      ]);
      setRecipients(Array.isArray(recs) ? recs as any[] : []);
      setInvestAuthorized(authStatus);
      setProductCount(pCount);
      setDbProducts(products);
    } catch {}
    setLoadingData(false);
  };

  const StatusBadge = ({ ok, label }: { ok: boolean | null; label: string }) => {
    if (ok === null) return <Loader2 size={14} className="animate-spin text-muted-foreground" />;
    return (
      <span className="text-xs px-2 py-0.5 rounded" style={{
        background: ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        color: ok ? "#22c55e" : "#ef4444",
      }}>
        {ok && <Check size={10} className="inline mr-1" />}{label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">合约状态</h2>
      </div>

      {/* Contract Addresses */}
      <div className="rounded-xl p-4 space-y-2" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="text-sm font-semibold text-foreground mb-2">合约地址</div>
        {[
          { label: "FundDistributor", addr: FUND_DISTRIBUTOR_ADDRESS },
          { label: "CoreXInvestment", addr: COREX_INVESTMENT_ADDRESS },
          { label: "CoreXWithdrawal", addr: COREX_WITHDRAWAL_ADDRESS },
        ].map(c => (
          <div key={c.label} className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">{c.label}</span>
            <a
              href={`https://bscscan.com/address/${c.addr}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs font-mono"
              style={{ color: "#C9A227" }}
            >
              {shortAddr(c.addr)}
              <ExternalLink size={10} />
            </a>
          </div>
        ))}
      </div>

      {/* Fund Distribution */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">资金分配</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <StatusBadge ok={recipients.length > 0} label={recipients.length > 0 ? "已配置" : "未配置"} />
          )}
        </div>
        {recipients.length > 0 && (
          <div className="space-y-1.5">
            {recipients.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <a
                  href={`https://bscscan.com/address/${r.wallet || r[0]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono flex items-center gap-1"
                  style={{ color: "#C9A227" }}
                >
                  {shortAddr(r.wallet || r[0])}
                  <ExternalLink size={9} />
                </a>
                <span className="font-semibold" style={{ color: "#E8C547" }}>{Number(r.percentage || r[1]) / 100}%</span>
                <span className="text-muted-foreground">{r.label || r[2]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Investment Products */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">投资产品</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <StatusBadge
              ok={productCount >= dbProducts.length}
              label={`${productCount}/${dbProducts.length} 已添加`}
            />
          )}
        </div>
        <div className="space-y-1.5">
          {dbProducts.map((p, i) => {
            const added = i < productCount;
            return (
              <div key={p.id} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <div className="flex items-center gap-2">
                  {added ? (
                    <Check size={12} style={{ color: "#22c55e" }} />
                  ) : (
                    <div className="w-3 h-3 rounded-full" style={{ border: "1px solid rgba(255,255,255,0.15)" }} />
                  )}
                  <span className={added ? "text-foreground font-medium" : "text-muted-foreground"}>{p.nameEn}</span>
                  <span className="text-muted-foreground">({p.name})</span>
                </div>
                <span className="text-muted-foreground">{p.minAmount} USDT</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Authorization */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">合约授权</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : (
            <StatusBadge ok={investAuthorized === true} label={investAuthorized ? "已授权" : "未授权"} />
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          CoreXInvestment → FundDistributor distribute 授权状态
        </div>
      </div>
    </div>
  );
}
