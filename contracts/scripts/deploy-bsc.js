const hre = require("hardhat");

async function main() {
  const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";

  const FEE_COLLECTOR = "0x72Af93B22e2A71Ebb47471F6db2d40905b777c97";
  const WALLET_1 = "0x451AFc9149aE6ACED2B0d9784FDC294fC38189c7"; // 30%
  const WALLET_2 = "0xFC0DBd5BEe2072014ab0F143De0CcE223ca873ae"; // 30%
  const WALLET_3 = "0xE9B339CE51342E2CaeBb1A2C2e6581d86fB2E9E4"; // 40%

  const WITHDRAWAL_WALLET = "0x4E05c5c549E45b35e03f4b285633e8AB881Cd64d"; // Funds the withdrawal contract

  console.log("Deploying to BSC Mainnet...\n");
  console.log("USDT:", USDT_BSC);
  console.log("Fee Collector:", FEE_COLLECTOR);
  console.log("Withdrawal Wallet:", WITHDRAWAL_WALLET);
  console.log("Wallet 1 (30%):", WALLET_1);
  console.log("Wallet 2 (30%):", WALLET_2);
  console.log("Wallet 3 (40%):", WALLET_3);
  console.log("");

  // 1. Deploy FundDistributor
  console.log("1/3 Deploying FundDistributor...");
  const FundDistributor = await hre.ethers.getContractFactory("FundDistributor");
  const distributor = await FundDistributor.deploy(USDT_BSC);
  await distributor.waitForDeployment();
  const distributorAddr = await distributor.getAddress();
  console.log("   FundDistributor:", distributorAddr);

  // 2. Deploy CoreXInvestment
  console.log("2/3 Deploying CoreXInvestment...");
  const CoreXInvestment = await hre.ethers.getContractFactory("CoreXInvestment");
  const investment = await CoreXInvestment.deploy(USDT_BSC, distributorAddr);
  await investment.waitForDeployment();
  const investmentAddr = await investment.getAddress();
  console.log("   CoreXInvestment:", investmentAddr);

  // 3. Deploy CoreXWithdrawal
  console.log("3/3 Deploying CoreXWithdrawal...");
  const CoreXWithdrawal = await hre.ethers.getContractFactory("CoreXWithdrawal");
  const withdrawal = await CoreXWithdrawal.deploy(USDT_BSC, FEE_COLLECTOR);
  await withdrawal.waitForDeployment();
  const withdrawalAddr = await withdrawal.getAddress();
  console.log("   CoreXWithdrawal:", withdrawalAddr);

  // 4. Configure FundDistributor recipients
  console.log("\nConfiguring FundDistributor recipients...");
  const tx1 = await distributor.setRecipients(
    [WALLET_1, WALLET_2, WALLET_3],
    [3000, 3000, 4000], // 30%, 30%, 40% (basis points, total = 10000)
    ["Wallet 1", "Wallet 2", "Wallet 3"]
  );
  await tx1.wait();
  console.log("   Recipients configured (30/30/40)");

  // 5. Authorize CoreXInvestment to call distribute()
  console.log("Authorizing CoreXInvestment as caller...");
  const tx2 = await distributor.setAuthorizedCaller(investmentAddr, true);
  await tx2.wait();
  console.log("   CoreXInvestment authorized");

  // 5.5 Set funding wallet on withdrawal contract
  console.log("Setting funding wallet on CoreXWithdrawal...");
  const tx3 = await withdrawal.setFundingWallet(WITHDRAWAL_WALLET);
  await tx3.wait();
  console.log("   Funding wallet set:", WITHDRAWAL_WALLET);

  // 6. Add products (matching your PRODUCTS array)
  console.log("\nAdding products...");
  const products = [
    { min: "100",   max: "0" },      // Product 1: 100 USDT min, no max
    { min: "500",   max: "0" },      // Product 2
    { min: "2000",  max: "0" },      // Product 3
    { min: "5000",  max: "0" },      // Product 4
    { min: "20000", max: "0" },      // Product 5
  ];

  for (let i = 0; i < products.length; i++) {
    const tx = await investment.addProduct(
      hre.ethers.parseUnits(products[i].min, 18),
      hre.ethers.parseUnits(products[i].max, 18)
    );
    await tx.wait();
    console.log(`   Product ${i + 1}: min=${products[i].min} USDT`);
  }

  // Summary
  console.log("\n========================================");
  console.log("  DEPLOYMENT COMPLETE - BSC MAINNET");
  console.log("========================================");
  console.log("FundDistributor:", distributorAddr);
  console.log("CoreXInvestment:", investmentAddr);
  console.log("CoreXWithdrawal:", withdrawalAddr);
  console.log("USDT (BEP-20):", USDT_BSC);
  console.log("Fee Collector:", FEE_COLLECTOR);
  console.log("========================================");
  console.log("\nUpdate these in your .env / Supabase config:");
  console.log(`INVESTMENT_CONTRACT=${investmentAddr}`);
  console.log(`WITHDRAWAL_CONTRACT=${withdrawalAddr}`);
  console.log(`DISTRIBUTOR_CONTRACT=${distributorAddr}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
