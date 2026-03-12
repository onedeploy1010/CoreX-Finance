import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useActiveAccount } from "thirdweb/react";
import { useSendTransaction } from "thirdweb/react";
import {
  prepareSetRecipients,
  prepareSetAuthorizedCaller,
  getDistributorRecipients,
  isAuthorizedCaller,
  prepareAddProduct,
  getProductCount,
  parseUSDT,
  COREX_INVESTMENT_ADDRESS,
  FUND_DISTRIBUTOR_ADDRESS,
  COREX_WITHDRAWAL_ADDRESS,
} from "@/lib/contracts";
import { PRODUCTS } from "@shared/schema";
import { adminAddLog } from "@/lib/api";
import { Loader2, Check, X, Settings, Package } from "lucide-react";

const DEFAULT_RECIPIENTS = [
  { wallet: "0xD6A62D2fbBfEC363DEA3D2E7D3cf0e271311e097", percentage: 4000, label: "Operations" },
  { wallet: "0x13413fa9ebd78814B5811BE3C32c654ff968889d", percentage: 3000, label: "Technology" },
  { wallet: "0x9179D6246cB78945eAD77D49440F13621B43B0Ec", percentage: 3000, label: "Reserve" },
];

function shortAddr(addr: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function ContractSetup() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { mutateAsync: sendTransaction } = useSendTransaction();
  const [loading, setLoading] = useState("");
  const [recipients, setRecipients] = useState<any[]>([]);
  const [investAuthorized, setInvestAuthorized] = useState<boolean | null>(null);
  const [productCount, setProductCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    loadContractData();
  }, []);

  const loadContractData = async () => {
    setLoadingData(true);
    try {
      const [recs, authStatus, pCount] = await Promise.all([
        getDistributorRecipients().catch(() => []),
        isAuthorizedCaller(COREX_INVESTMENT_ADDRESS).catch(() => null),
        getProductCount().catch(() => 0),
      ]);
      setRecipients(Array.isArray(recs) ? recs as any[] : []);
      setInvestAuthorized(authStatus);
      setProductCount(pCount);
    } catch {
      // Contract might not be configured yet
    }
    setLoadingData(false);
  };

  const handleSetRecipients = async () => {
    if (!account) {
      toast({ title: "请先连接合约Owner钱包", variant: "destructive" });
      return;
    }
    setLoading("recipients");
    try {
      const wallets = DEFAULT_RECIPIENTS.map(r => r.wallet);
      const percentages = DEFAULT_RECIPIENTS.map(r => BigInt(r.percentage));
      const labels = DEFAULT_RECIPIENTS.map(r => r.label);
      const tx = prepareSetRecipients(wallets, percentages, labels);
      await sendTransaction(tx);
      await adminAddLog("设置资金分配钱包", "contract", FUND_DISTRIBUTOR_ADDRESS);
      toast({ title: "资金分配钱包设置成功" });
      loadContractData();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        toast({ title: "交易已取消", variant: "destructive" });
      } else {
        toast({ title: "设置失败", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading("");
    }
  };

  const handleAuthorizeInvestment = async () => {
    if (!account) {
      toast({ title: "请先连接合约Owner钱包", variant: "destructive" });
      return;
    }
    setLoading("authorize");
    try {
      const tx = prepareSetAuthorizedCaller(COREX_INVESTMENT_ADDRESS, true);
      await sendTransaction(tx);
      await adminAddLog("授权投资合约", "contract", COREX_INVESTMENT_ADDRESS);
      toast({ title: "投资合约授权成功" });
      loadContractData();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        toast({ title: "交易已取消", variant: "destructive" });
      } else {
        toast({ title: "授权失败", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading("");
    }
  };

  const handleAddProducts = async () => {
    if (!account) {
      toast({ title: "请先连接合约Owner钱包", variant: "destructive" });
      return;
    }
    setLoading("products");
    try {
      // Add products one by one starting from current count
      for (let i = productCount; i < PRODUCTS.length; i++) {
        const product = PRODUCTS[i];
        const minAmount = parseUSDT(product.minAmount.toString());
        const tx = prepareAddProduct(minAmount, BigInt(0));
        await sendTransaction(tx);
        toast({ title: `产品 ${product.nameEn} 添加成功 (${i + 1}/${PRODUCTS.length})` });
      }
      await adminAddLog("添加投资产品", "contract", COREX_INVESTMENT_ADDRESS, { count: PRODUCTS.length - productCount });
      toast({ title: `全部 ${PRODUCTS.length} 个产品添加完成` });
      loadContractData();
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("user rejected") || msg.includes("User denied")) {
        toast({ title: "交易已取消", variant: "destructive" });
      } else {
        toast({ title: "添加产品失败", description: msg, variant: "destructive" });
      }
      // Reload to get actual count
      loadContractData();
    } finally {
      setLoading("");
    }
  };

  const allProductsAdded = productCount >= PRODUCTS.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded-full" style={{ background: "linear-gradient(180deg, #C9A227, #9A7A1A)" }} />
        <h2 className="font-bold text-lg text-foreground">合约配置</h2>
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
              className="text-xs font-mono"
              style={{ color: "#C9A227" }}
            >
              {shortAddr(c.addr)}
            </a>
          </div>
        ))}
      </div>

      {/* Fund Distribution Setup */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">资金分配钱包</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : recipients.length > 0 ? (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
              <Check size={10} className="inline mr-1" />已配置
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              <X size={10} className="inline mr-1" />未配置
            </span>
          )}
        </div>

        {recipients.length > 0 ? (
          <div className="space-y-1.5">
            {recipients.map((r: any, i: number) => (
              <div key={i} className="flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <span className="font-mono text-muted-foreground">{shortAddr(r.wallet || r[0])}</span>
                <span style={{ color: "#C9A227" }}>{Number(r.percentage || r[1]) / 100}%</span>
                <span className="text-muted-foreground">{r.label || r[2]}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {DEFAULT_RECIPIENTS.map((r, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-1" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <span className="font-mono text-muted-foreground">{shortAddr(r.wallet)}</span>
                <span style={{ color: "#C9A227" }}>{r.percentage / 100}%</span>
                <span className="text-muted-foreground">{r.label}</span>
              </div>
            ))}
          </div>
        )}

        <Button
          size="sm"
          disabled={!!loading}
          className="w-full text-xs font-semibold"
          style={{ background: "linear-gradient(135deg, #C9A227, #9A7A1A)", color: "#0c0a08" }}
          onClick={handleSetRecipients}
        >
          {loading === "recipients" ? (
            <><Loader2 size={12} className="mr-1 animate-spin" /> 设置中...</>
          ) : (
            <><Settings size={12} className="mr-1" /> {recipients.length > 0 ? "重新设置分配钱包" : "设置分配钱包 (40/30/30)"}</>
          )}
        </Button>
      </div>

      {/* Investment Products Setup */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">投资产品</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : allProductsAdded ? (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
              <Check size={10} className="inline mr-1" />{productCount}/{PRODUCTS.length} 已添加
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(234,179,8,0.1)", color: "#eab308" }}>
              {productCount}/{PRODUCTS.length} 已添加
            </span>
          )}
        </div>

        <div className="space-y-1.5">
          {PRODUCTS.map((p, i) => {
            const added = i < productCount;
            return (
              <div key={p.id} className="flex items-center justify-between text-xs py-1.5" style={{ borderBottom: "1px solid rgba(201,162,39,0.08)" }}>
                <div className="flex items-center gap-2">
                  {added ? (
                    <Check size={12} style={{ color: "#22c55e" }} />
                  ) : (
                    <X size={12} style={{ color: "rgba(255,255,255,0.2)" }} />
                  )}
                  <span className={added ? "text-foreground" : "text-muted-foreground"}>{p.nameEn}</span>
                </div>
                <span className="text-muted-foreground">{p.minAmount} USDT</span>
              </div>
            );
          })}
        </div>

        <Button
          size="sm"
          disabled={!!loading || allProductsAdded}
          className="w-full text-xs font-semibold"
          style={{
            background: allProductsAdded ? "rgba(34,197,94,0.15)" : "linear-gradient(135deg, #C9A227, #9A7A1A)",
            color: allProductsAdded ? "#22c55e" : "#0c0a08",
          }}
          onClick={handleAddProducts}
        >
          {loading === "products" ? (
            <><Loader2 size={12} className="mr-1 animate-spin" /> 添加产品中...</>
          ) : allProductsAdded ? (
            <><Check size={12} className="mr-1" /> 全部产品已添加</>
          ) : (
            <><Package size={12} className="mr-1" /> {productCount > 0 ? `继续添加产品 (${productCount}/${PRODUCTS.length})` : "添加全部产品到合约"}</>
          )}
        </Button>
      </div>

      {/* Authorize Investment Contract */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "linear-gradient(145deg, #1a1510, #110e0a)", border: "1px solid rgba(201,162,39,0.12)" }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-foreground">投资合约授权</div>
          {loadingData ? (
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          ) : investAuthorized ? (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
              <Check size={10} className="inline mr-1" />已授权
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              <X size={10} className="inline mr-1" />未授权
            </span>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          授权 CoreXInvestment 合约调用 FundDistributor 的 distribute 函数
        </div>
        <Button
          size="sm"
          disabled={!!loading || investAuthorized === true}
          className="w-full text-xs font-semibold"
          style={{ background: investAuthorized ? "rgba(34,197,94,0.15)" : "linear-gradient(135deg, #C9A227, #9A7A1A)", color: investAuthorized ? "#22c55e" : "#0c0a08" }}
          onClick={handleAuthorizeInvestment}
        >
          {loading === "authorize" ? (
            <><Loader2 size={12} className="mr-1 animate-spin" /> 授权中...</>
          ) : investAuthorized ? (
            <><Check size={12} className="mr-1" /> 已授权</>
          ) : (
            <><Settings size={12} className="mr-1" /> 授权投资合约</>
          )}
        </Button>
      </div>

      {!account && (
        <div className="text-center text-xs text-muted-foreground py-4">
          请连接合约 Owner 钱包以执行配置操作
        </div>
      )}
    </div>
  );
}
