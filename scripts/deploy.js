const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer, signer1, signer2] = await ethers.getSigners();

  console.log("═══════════════════════════════════════");
  console.log("  MultiSig Wallet — Deployment");
  console.log("═══════════════════════════════════════");
  console.log(`  Network  : ${network.name}`);
  console.log(`  Deployer : ${deployer.address}`);
 console.log(`  Balance  : ${ethers.formatEther(
    await ethers.provider.getBalance(deployer.address)
  )} ETH`);
  console.log("═══════════════════════════════════════\n");

  // ── Owners & threshold ──────────────────────────────────────────────────
  let owners, required;

  if (network.name === "hardhat" || network.name === "localhost") {
    owners = [deployer.address, signer1.address, signer2.address];
    required = 2;
    console.log("ℹ️  Local network — using test accounts as owners");
  } else {
    owners = process.env.MULTISIG_OWNERS.split(",").map((a) => a.trim());
    required = parseInt(process.env.MULTISIG_REQUIRED);
  }

  console.log(`  Owners   : ${owners.length}`);
  owners.forEach((o, i) => console.log(`    [${i}] ${o}`));
  console.log(`  Required : ${required}\n`);

 // ── Deploy Factory ───────────────────────────────────────────────────────
  console.log("⏳ Deploying MultiSigWalletFactory...");
  const Factory = await ethers.getContractFactory("MultiSigWalletFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log(`✅ Factory deployed → ${factory.target}`);

  // ── Deploy Wallet via Factory ────────────────────────────────────────────
  console.log("\n⏳ Creating MultiSigWallet via factory...");
  const tx = await factory.createWallet(owners, required);
  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => { try { return factory.interface.parseLog(log); } catch { return null; } })
    .find((e) => e?.name === "WalletCreated");
  const walletAddress = event.args.wallet;
  console.log(`✅ MultiSigWallet deployed → ${walletAddress}`);

  // ── Verify on-chain state ────────────────────────────────────────────────
  const wallet = await ethers.getContractAt("MultiSigWallet", walletAddress);
  console.log("\n── Verification ───────────────────────");
  console.log(`  Owners   : ${(await wallet.getOwners()).length}`);
  console.log(`  Required : ${await wallet.required()}`);
  console.log(`  Balance  : ${ethers.formatEther(
    await ethers.provider.getBalance(walletAddress)
  )} ETH`);
  console.log("───────────────────────────────────────\n");

  // ── Save deployment info ─────────────────────────────────────────────────
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) fs.mkdirSync(deploymentsDir);

  const deploymentData = {
    factory: factory.target,
    wallet: walletAddress,
    owners,
    required,
    deployer: deployer.address,
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}.json`),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log(`📄 Saved → deployments/${network.name}.json`);
  console.log("🎉 Deployment complete!\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});