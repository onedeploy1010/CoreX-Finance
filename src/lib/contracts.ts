import { getContract, prepareContractCall, readContract } from "thirdweb";
import { client, bscChain, USDT_ADDRESS_BSC } from "./thirdweb";

export const FUND_DISTRIBUTOR_ADDRESS = "0xc4D174B0296A04D7Dd59Cb465B350d27EC88778c";
export const COREX_INVESTMENT_ADDRESS = "0x54941919869B3Da07DF5b5C94eC7A0403445821F";
export const COREX_WITHDRAWAL_ADDRESS = "0xA25c9C1dE6DA0CE04D06A27eB2779d6BAfAe9236";

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
