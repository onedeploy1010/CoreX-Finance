import { getContract, prepareContractCall, readContract } from "thirdweb";
import { client, bscChain, USDT_ADDRESS_BSC } from "./thirdweb";

export const FUND_DISTRIBUTOR_ADDRESS = "0x530ec0cb6bc97C11bfeC9f8A52208fD104d6A01F";
export const COREX_INVESTMENT_ADDRESS = "0xD1dA72B8DF0db5d6c61DF96F1E186E73608B5fCB";
export const COREX_WITHDRAWAL_ADDRESS = "0xC67116b71942a5043C3eaB01a308ebFd842228bE";

const FUND_DISTRIBUTOR_ABI = [
  {
    type: "function",
    name: "getRecipients",
    inputs: [],
    outputs: [
      {
        type: "tuple[]",
        components: [
          { type: "address", name: "wallet" },
          { type: "uint256", name: "percentage" },
          { type: "string", name: "label" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalPercentage",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setRecipients",
    inputs: [
      { type: "address[]", name: "_wallets" },
      { type: "uint256[]", name: "_percentages" },
      { type: "string[]", name: "_labels" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setAuthorizedCaller",
    inputs: [
      { type: "address", name: "caller" },
      { type: "bool", name: "authorized" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "authorizedCallers",
    inputs: [{ type: "address", name: "" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "FundsDistributed",
    inputs: [
      { type: "uint256", name: "totalAmount", indexed: false },
      { type: "uint256", name: "timestamp", indexed: false },
    ],
  },
] as const;

const COREX_INVESTMENT_ABI = [
  {
    type: "function",
    name: "invest",
    inputs: [
      { type: "uint256", name: "_productId" },
      { type: "uint256", name: "_amount" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getProduct",
    inputs: [{ type: "uint256", name: "_id" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { type: "uint256", name: "id" },
          { type: "uint256", name: "minAmount" },
          { type: "uint256", name: "maxAmount" },
          { type: "bool", name: "active" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalInvested",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "userTotalInvested",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "addProduct",
    inputs: [
      { type: "uint256", name: "_minAmount" },
      { type: "uint256", name: "_maxAmount" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "productCount",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "InvestmentCreated",
    inputs: [
      { type: "address", name: "investor", indexed: true },
      { type: "uint256", name: "productId", indexed: true },
      { type: "uint256", name: "amount", indexed: false },
      { type: "uint256", name: "timestamp", indexed: false },
    ],
  },
] as const;

const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    inputs: [
      { type: "address", name: "spender" },
      { type: "uint256", name: "amount" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "allowance",
    inputs: [
      { type: "address", name: "owner" },
      { type: "address", name: "spender" },
    ],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ type: "address", name: "account" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

export function getUSDTContract() {
  return getContract({
    client,
    chain: bscChain,
    address: USDT_ADDRESS_BSC,
    abi: ERC20_ABI,
  });
}

export function getInvestmentContract() {
  return getContract({
    client,
    chain: bscChain,
    address: COREX_INVESTMENT_ADDRESS,
    abi: COREX_INVESTMENT_ABI,
  });
}

export function getDistributorContract() {
  return getContract({
    client,
    chain: bscChain,
    address: FUND_DISTRIBUTOR_ADDRESS,
    abi: FUND_DISTRIBUTOR_ABI,
  });
}

export function prepareApproveUSDT(amount: bigint) {
  return prepareContractCall({
    contract: getUSDTContract(),
    method: "approve",
    params: [COREX_INVESTMENT_ADDRESS, amount],
  });
}

export function prepareInvest(productId: number, amount: bigint) {
  return prepareContractCall({
    contract: getInvestmentContract(),
    method: "invest",
    params: [BigInt(productId), amount],
  });
}

export async function getUSDTBalance(userAddress: string): Promise<bigint> {
  const result = await readContract({
    contract: getUSDTContract(),
    method: "balanceOf",
    params: [userAddress],
  });
  return result as bigint;
}

export async function getUSDTAllowance(userAddress: string): Promise<bigint> {
  const result = await readContract({
    contract: getUSDTContract(),
    method: "allowance",
    params: [userAddress, COREX_INVESTMENT_ADDRESS],
  });
  return result as bigint;
}

export function parseUSDT(amount: string): bigint {
  const parts = amount.split(".");
  const whole = parts[0] || "0";
  const decimal = (parts[1] || "").padEnd(18, "0").slice(0, 18);
  return BigInt(whole + decimal);
}

export function formatUSDT(amount: bigint): string {
  const str = amount.toString().padStart(19, "0");
  const whole = str.slice(0, -18) || "0";
  const decimal = str.slice(-18, -12);
  return `${whole}.${decimal}`;
}

const COREX_WITHDRAWAL_ABI = [
  {
    type: "function",
    name: "batchWithdraw",
    inputs: [
      { type: "bytes32", name: "_batchId" },
      { type: "address[]", name: "_recipients" },
      { type: "uint256[]", name: "_amounts" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getContractBalance",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isBatchProcessed",
    inputs: [{ type: "bytes32", name: "_batchId" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "pullFunds",
    inputs: [{ type: "uint256", name: "amount" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "fundingWallet",
    inputs: [],
    outputs: [{ type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setFundingWallet",
    inputs: [{ type: "address", name: "_wallet" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "totalWithdrawn",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalFeeCollected",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "WithdrawalProcessed",
    inputs: [
      { type: "address", name: "recipient", indexed: true },
      { type: "uint256", name: "amount", indexed: false },
      { type: "uint256", name: "fee", indexed: false },
      { type: "bytes32", name: "batchId", indexed: true },
      { type: "uint256", name: "timestamp", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BatchProcessed",
    inputs: [
      { type: "bytes32", name: "batchId", indexed: true },
      { type: "uint256", name: "count", indexed: false },
      { type: "uint256", name: "totalAmount", indexed: false },
      { type: "uint256", name: "totalFee", indexed: false },
    ],
  },
] as const;

export function getWithdrawalContract() {
  return getContract({
    client,
    chain: bscChain,
    address: COREX_WITHDRAWAL_ADDRESS,
    abi: COREX_WITHDRAWAL_ABI,
  });
}

// Contract setup helpers
export function prepareSetRecipients(
  wallets: string[],
  percentages: bigint[],
  labels: string[]
) {
  return prepareContractCall({
    contract: getDistributorContract(),
    method: "setRecipients",
    params: [wallets, percentages, labels],
  });
}

export function prepareSetAuthorizedCaller(caller: string, authorized: boolean) {
  return prepareContractCall({
    contract: getDistributorContract(),
    method: "setAuthorizedCaller",
    params: [caller, authorized],
  });
}

export async function getDistributorRecipients() {
  const result = await readContract({
    contract: getDistributorContract(),
    method: "getRecipients",
    params: [],
  });
  return result;
}

export async function isAuthorizedCaller(address: string): Promise<boolean> {
  const result = await readContract({
    contract: getDistributorContract(),
    method: "authorizedCallers",
    params: [address],
  });
  return result as boolean;
}

export function prepareAddProduct(minAmount: bigint, maxAmount: bigint) {
  return prepareContractCall({
    contract: getInvestmentContract(),
    method: "addProduct",
    params: [minAmount, maxAmount],
  });
}

export async function getProductCount(): Promise<number> {
  const result = await readContract({
    contract: getInvestmentContract(),
    method: "productCount",
    params: [],
  });
  return Number(result);
}

// Approve USDT spending by withdrawal contract (called by funding wallet owner)
export function prepareApproveUSDTForWithdrawal(amount: bigint) {
  return prepareContractCall({
    contract: getUSDTContract(),
    method: "approve",
    params: [COREX_WITHDRAWAL_ADDRESS, amount],
  });
}

// Check USDT allowance from funding wallet to withdrawal contract
export async function getWithdrawalAllowance(walletAddress: string): Promise<bigint> {
  const result = await readContract({
    contract: getUSDTContract(),
    method: "allowance",
    params: [walletAddress, COREX_WITHDRAWAL_ADDRESS],
  });
  return result as bigint;
}

// Read funding wallet address from contract
export async function getFundingWallet(): Promise<string> {
  const result = await readContract({
    contract: getWithdrawalContract(),
    method: "fundingWallet",
    params: [],
  });
  return result as string;
}

// Set funding wallet (owner only)
export function prepareSetFundingWallet(wallet: string) {
  return prepareContractCall({
    contract: getWithdrawalContract(),
    method: "setFundingWallet",
    params: [wallet],
  });
}
