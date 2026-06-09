const hre = require("hardhat");

// Redeploy CoreXInvestment + CoreXWithdrawal (3% fee built in).
// Reuses the EXISTING FundDistributor (already set to 0xB120…F44B 100%).
async function main() {
  const USDT            = "0x55d398326f99059fF775485246999027B3197955";
  const DISTRIBUTOR     = "0x530ec0cb6bc97C11bfeC9f8A52208fD104d6A01F"; // existing, recipients already 0xB120…F44B 100%
  const FEE_COLLECTOR   = "0xAbF8Df4B3Df20036aE86D7A7930692291De04f4E"; // 3% withdrawal fees go here
  const FUNDING_WALLET  = "0x1130862207Dd51a1Cc40e5152591B77F282e6526"; // out-of-money source for withdrawals
  const OPERATOR        = "0x4E05c5c549E45b35e03f4b285633e8AB881Cd64d"; // server signer (auto-withdraw edge fn)
  const OLD_INVESTMENT  = "0xD1dA72B8DF0db5d6c61DF96F1E186E73608B5fCB"; // to deauthorize on distributor
  const PRODUCT_MINS    = ["200", "500", "1000", "2000", "3000"];       // from DB products table

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  const bal = await hre.ethers.provider.getBalance(deployer.address);
  console.log("BNB balance:", hre.ethers.formatEther(bal));

  // 1) Deploy new CoreXInvestment -> existing distributor
  console.log("\n[1] Deploying CoreXInvestment...");
  const Inv = await hre.ethers.getContractFactory("CoreXInvestment");
  const inv = await Inv.deploy(USDT, DISTRIBUTOR);
  await inv.waitForDeployment();
  const invAddr = await inv.getAddress();
  console.log("    CoreXInvestment:", invAddr);

  // 2) Deploy new CoreXWithdrawal (feeBps = 300 = 3% by default)
  console.log("\n[2] Deploying CoreXWithdrawal...");
  const W = await hre.ethers.getContractFactory("CoreXWithdrawal");
  const w = await W.deploy(USDT, FEE_COLLECTOR);
  await w.waitForDeployment();
  const wAddr = await w.getAddress();
  console.log("    CoreXWithdrawal:", wAddr, " feeBps:", (await w.feeBps()).toString());

  console.log("\n[3] Configuring withdrawal contract...");
  await (await w.setFundingWallet(FUNDING_WALLET)).wait();
  console.log("    fundingWallet:", FUNDING_WALLET);
  await (await w.setOperator(OPERATOR, true)).wait();
  console.log("    operator:", OPERATOR);

  // 4) Authorize new investment on the existing distributor (deployer must be distributor owner)
  console.log("\n[4] Updating FundDistributor authorizations...");
  const dist = await hre.ethers.getContractAt("FundDistributor", DISTRIBUTOR);
  await (await dist.setAuthorizedCaller(invAddr, true)).wait();
  console.log("    authorized new investment");
  await (await dist.setAuthorizedCaller(OLD_INVESTMENT, false)).wait();
  console.log("    deauthorized old investment");

  // 5) Add products
  console.log("\n[5] Adding products...");
  for (const m of PRODUCT_MINS) {
    await (await inv.addProduct(hre.ethers.parseUnits(m, 18), 0n)).wait();
    console.log("    product min", m, "USDT");
  }

  console.log("\n========================================");
  console.log("  REDEPLOY COMPLETE — BSC MAINNET");
  console.log("========================================");
  console.log("NEW CoreXInvestment :", invAddr);
  console.log("NEW CoreXWithdrawal :", wAddr);
  console.log("FundDistributor     :", DISTRIBUTOR, "(reused, -> 0xB120…F44B 100%)");
  console.log("feeCollector        :", FEE_COLLECTOR);
  console.log("fundingWallet       :", FUNDING_WALLET);
  console.log("\nNext: update src/lib/contracts.ts + supabase/functions/auto-withdraw, redeploy edge fn,");
  console.log("and have fundingWallet approve the new withdrawal contract for USDT.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
