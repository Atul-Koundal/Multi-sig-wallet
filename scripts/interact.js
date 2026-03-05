const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// ── Set ACTION here before running ──────────────────────────────────────────
const ACTION = "status"; // status | submit | confirm | revoke | execute
const TX_INDEX = 0;
const SUBMIT_PARAMS = {
  to: "0xRecipientAddress",
  value: "0.01",
  data: "0x",
};

function loadDeployment() {
  const file = path.join(__dirname, `../deployments/${network.name}.json`);
  if (!fs.existsSync(file)) throw new Error(`No deployment for "${network.name}". Run deploy.js first.`);
  return JSON.parse(fs.readFileSync(file));
}

async function main() {
  const [signer] = await ethers.getSigners();
  const deployment = loadDeployment();
  const wallet = await ethers.getContractAt("MultiSigWallet", deployment.wallet, signer);

  console.log(`Network : ${network.name}`);
  console.log(`Wallet  : ${deployment.wallet}`);
  console.log(`Signer  : ${signer.address}\n`);

  switch (ACTION) {
    case "status": {
      const owners = await wallet.getOwners();
      const required = await wallet.required();
      const balance = await ethers.provider.getBalance(deployment.wallet);
      const txCount = await wallet.getTransactionCount();

      console.log("📊 Wallet Status");
      console.log(`  Balance  : ${ethers.utils.formatEther(balance)} ETH`);
      console.log(`  Required : ${required} / ${owners.length}`);
      console.log(`  Owners   :`);
      owners.forEach((o, i) => console.log(`    [${i}] ${o}`));
      console.log(`  Total Txs: ${txCount}`);
      break;
    }
    case "submit": {
      const tx = await wallet.submitTransaction(
        SUBMIT_PARAMS.to,
        ethers.utils.parseEther(SUBMIT_PARAMS.value),
        SUBMIT_PARAMS.data
      );
      const receipt = await tx.wait();
      const event = receipt.events.find((e) => e.event === "SubmitTransaction");
      console.log(`✅ Submitted! Tx index: ${event.args.txIndex}`);
      break;
    }
    case "confirm": {
      const tx = await wallet.confirmTransaction(TX_INDEX);
      await tx.wait();
      console.log(`✅ Confirmed tx #${TX_INDEX}`);
      break;
    }
    case "revoke": {
      const tx = await wallet.revokeConfirmation(TX_INDEX);
      await tx.wait();
      console.log(`✅ Revoked tx #${TX_INDEX}`);
      break;
    }
    case "execute": {
      const tx = await wallet.executeTransaction(TX_INDEX);
      await tx.wait();
      console.log(`✅ Executed tx #${TX_INDEX}`);
      break;
    }
    default:
      console.error(`Unknown action: "${ACTION}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});