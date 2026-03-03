import { createThirdwebClient } from "thirdweb";
import { bsc } from "thirdweb/chains";
import { createWallet, walletConnect } from "thirdweb/wallets";

export const client = createThirdwebClient({
  clientId: "corex-dapp-client",
});

export const bscChain = bsc;

export const wallets = [
  createWallet("io.metamask"),
  createWallet("com.tokenpocket"),
  walletConnect(),
  createWallet("com.trustwallet.app"),
  createWallet("io.rabby"),
  createWallet("com.okex.wallet"),
];

export const USDT_ADDRESS_BSC = "0x55d398326f99059fF775485246999027B3197955";
