const { run, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const file = path.join(__dirname, `../deployments/${network.name}.json`);
  if (!fs.existsSync(file)) throw new Error(`No deployment for "${network.name}".`);

  const { factory, wallet, owners, required } = JSON.parse(fs.readFileSync(file));

  console.log("Verifying Factory...");
  try {
    await run("verify:verify", { address: factory, constructorArguments: [] });
    console.log("✅ Factory verified");
  } catch (e) {
    console.log(e.message.includes("Already Verified") ? "ℹ️  Already verified" : `❌ ${e.message}`);
  }

  console.log("Verifying Wallet...");
  try {
    await run("verify:verify", { address: wallet, constructorArguments: [owners, required] });
    console.log("✅ Wallet verified");
  } catch (e) {
    console.log(e.message.includes("Already Verified") ? "ℹ️  Already verified" : `❌ ${e.message}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});