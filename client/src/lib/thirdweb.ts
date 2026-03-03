import { createThirdwebClient } from "thirdweb";
import { bsc } from "thirdweb/chains";
import { createWallet, walletConnect } from "thirdweb/wallets";

export const client = createThirdwebClient({
  clientId: "55c901cbfcccbc3592ae2157f8c7c3b5",
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
