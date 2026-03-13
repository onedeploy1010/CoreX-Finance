const hre = require("hardhat");

async function main() {
  const DISTRIBUTOR_ADDR = "0x530ec0cb6bc97C11bfeC9f8A52208fD104d6A01F";
  const NEW_INVESTMENT = "0xD1dA72B8DF0db5d6c61DF96F1E186E73608B5fCB";
  const OLD_INVESTMENT = "0x92931E7E9244C19d344305c210c0e541170d2230";

  const distributor = await hre.ethers.getContractAt("FundDistributor", DISTRIBUTOR_ADDR);

  console.log("Authorizing new CoreXInvestment on FundDistributor...");
  const tx1 = await distributor.setAuthorizedCaller(NEW_INVESTMENT, true);
  await tx1.wait();
  console.log("New contract authorized ✓");

  console.log("Deauthorizing old CoreXInvestment...");
  const tx2 = await distributor.setAuthorizedCaller(OLD_INVESTMENT, false);
  await tx2.wait();
  console.log("Old contract deauthorized ✓");

  console.log("\nDone! Update frontend COREX_INVESTMENT_ADDRESS to:", NEW_INVESTMENT);
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
