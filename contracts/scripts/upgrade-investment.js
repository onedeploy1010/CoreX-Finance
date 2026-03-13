const hre = require("hardhat");

async function main() {
  const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
  const DISTRIBUTOR_ADDR = "0x530ec0cb6bc97C11bfeC9f8A52208fD104d6A01F";

  console.log("Deploying new CoreXInvestment to BSC Mainnet...\n");

  // 1. Deploy new CoreXInvestment (with updateProduct support)
  console.log("Deploying CoreXInvestment...");
  const CoreXInvestment = await hre.ethers.getContractFactory("CoreXInvestment");
  const investment = await CoreXInvestment.deploy(USDT_BSC, DISTRIBUTOR_ADDR);
  await investment.waitForDeployment();
  const investmentAddr = await investment.getAddress();
  console.log("   CoreXInvestment:", investmentAddr);

  // 2. Authorize new contract on FundDistributor
  console.log("\nAuthorizing new contract on FundDistributor...");
  const distributor = await hre.ethers.getContractAt("FundDistributor", DISTRIBUTOR_ADDR);
  const tx1 = await distributor.setAuthorizedCaller(investmentAddr, true);
  await tx1.wait();
  console.log("   Authorized");

  // 3. Add products with correct minAmounts
  console.log("\nAdding products...");
  const products = [
    { min: "200",  max: "0" },  // Product 1: 芯未来     200U
    { min: "500",  max: "0" },  // Product 2: 芯未来1号  500U
    { min: "1000", max: "0" },  // Product 3: 芯未来2号  1000U
    { min: "2000", max: "0" },  // Product 4: 芯未来3号  2000U
    { min: "3000", max: "0" },  // Product 5: 芯未来4号  3000U
  ];

  for (let i = 0; i < products.length; i++) {
    const tx = await investment.addProduct(
      hre.ethers.parseUnits(products[i].min, 18),
      hre.ethers.parseUnits(products[i].max, 18)
    );
    await tx.wait();
    console.log(`   Product ${i + 1}: min=${products[i].min} USDT`);
  }

  // 4. Optionally deauthorize old contract
  const OLD_INVESTMENT = "0x92931E7E9244C19d344305c210c0e541170d2230";
  console.log("\nDeauthorizing old contract...");
  const tx2 = await distributor.setAuthorizedCaller(OLD_INVESTMENT, false);
  await tx2.wait();
  console.log("   Old contract deauthorized");

  console.log("\n========================================");
  console.log("  UPGRADE COMPLETE");
  console.log("========================================");
  console.log("New CoreXInvestment:", investmentAddr);
  console.log("\nUpdate COREX_INVESTMENT_ADDRESS in:");
  console.log("  src/lib/contracts.ts");
  console.log(`\nexport const COREX_INVESTMENT_ADDRESS = "${investmentAddr}";`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
