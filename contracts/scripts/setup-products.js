const hre = require("hardhat");

async function main() {
  const NEW_INVESTMENT = "0xD1dA72B8DF0db5d6c61DF96F1E186E73608B5fCB";

  console.log("Adding products to new CoreXInvestment...\n");
  const investment = await hre.ethers.getContractAt("CoreXInvestment", NEW_INVESTMENT);

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
    console.log(`Product ${i + 1}: min=${products[i].min} USDT ✓`);
  }

  console.log("\nProducts added! Now need FundDistributor owner (0xf85c...) to run:");
  console.log("  authorize-new-contract.js");
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
