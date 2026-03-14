const hre = require("hardhat");

async function main() {
  const USDT_BSC = "0x55d398326f99059fF775485246999027B3197955";
  const OLD_WITHDRAWAL = "0xC67116b71942a5043C3eaB01a308ebFd842228bE";

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1. Read old contract settings
  console.log("\n1. Reading old contract settings...");
  const oldContract = await hre.ethers.getContractAt("CoreXWithdrawal", OLD_WITHDRAWAL);

  let feeCollector, fundingWallet, operatorAddr;
  try {
    feeCollector = await oldContract.feeCollector();
    console.log("   feeCollector:", feeCollector);
  } catch { feeCollector = deployer.address; }
  try {
    fundingWallet = await oldContract.fundingWallet();
    console.log("   fundingWallet:", fundingWallet);
  } catch { fundingWallet = null; }

  // 2. Deploy new CoreXWithdrawal
  console.log("\n2. Deploying new CoreXWithdrawal...");
  const CoreXWithdrawal = await hre.ethers.getContractFactory("CoreXWithdrawal");
  const withdrawal = await CoreXWithdrawal.deploy(USDT_BSC, feeCollector);
  await withdrawal.waitForDeployment();
  const newAddr = await withdrawal.getAddress();
  console.log("   New CoreXWithdrawal:", newAddr);

  // 3. Set operator (deployer = operator)
  console.log("\n3. Setting operator...");
  const tx1 = await withdrawal.setOperator(deployer.address, true);
  await tx1.wait();
  console.log("   Operator set:", deployer.address);

  // 4. Set funding wallet if old one existed
  if (fundingWallet && fundingWallet !== hre.ethers.ZeroAddress) {
    console.log("\n4. Setting funding wallet...");
    const tx2 = await withdrawal.setFundingWallet(fundingWallet);
    await tx2.wait();
    console.log("   Funding wallet set:", fundingWallet);
  } else {
    console.log("\n4. No funding wallet to set");
  }

  // 5. Emergency withdraw remaining USDT from old contract (if owner)
  try {
    const oldBalance = await oldContract.getContractBalance();
    if (oldBalance > 0n) {
      console.log("\n5. Withdrawing", hre.ethers.formatUnits(oldBalance, 18), "USDT from old contract...");
      const tx3 = await oldContract.emergencyWithdraw(USDT_BSC, oldBalance, newAddr);
      await tx3.wait();
      console.log("   Transferred to new contract");
    } else {
      console.log("\n5. Old contract has no USDT balance");
    }
  } catch (e) {
    console.log("\n5. Could not withdraw from old contract:", e.message?.substring(0, 80));
  }

  console.log("\n========================================");
  console.log("  WITHDRAWAL CONTRACT UPGRADE COMPLETE");
  console.log("========================================");
  console.log("New CoreXWithdrawal:", newAddr);
  console.log("MIN_WITHDRAWAL: 10 USDT (configurable)");
  console.log("FEE: 1 USDT (configurable)");
  console.log("\nUpdate these places:");
  console.log("  1. src/lib/contracts.ts  ->  COREX_WITHDRAWAL_ADDRESS");
  console.log("  2. supabase/functions/auto-withdraw/index.ts  ->  WITHDRAWAL_CONTRACT");
  console.log("  3. Funding wallet needs to approve new contract for USDT spending");
  console.log(`\nexport const COREX_WITHDRAWAL_ADDRESS = "${newAddr}";`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => { console.error(error); process.exit(1); });
