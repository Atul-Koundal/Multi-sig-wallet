const { ethers } = require("hardhat");

// ─── Deploy Helpers ───────────────────────────────────────────────────────────

/**
 * Deploy a fresh MultiSigWallet with given owners and required threshold.
 */
async function deployWallet(owners, required) {
  const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
  const wallet = await MultiSigWallet.deploy(owners, required);
  await wallet.waitForDeployment();
  return wallet;
}

/**
 * Deploy a fresh MultiSigWalletFactory.
 */
async function deployFactory() {
  const Factory = await ethers.getContractFactory("MultiSigWalletFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  return factory;
}

/**
 * Deploy a wallet via the factory and return both contracts.
 */
async function deployViaFactory(owners, required) {
  const factory = await deployFactory();
  const tx = await factory.createWallet(owners, required);
  const receipt = await tx.wait();

  const factoryInterface = factory.interface;
  const event = receipt.logs
    .map((log) => { try { return factoryInterface.parseLog(log); } catch { return null; } })
    .find((e) => e?.name === "WalletCreated");

  const wallet = await ethers.getContractAt("MultiSigWallet", event.args.wallet);
  return { factory, wallet };
}

// ─── Transaction Helpers ──────────────────────────────────────────────────────

/**
 * Submit a transaction from a signer and return the tx index.
 */
async function submitTx(wallet, signer, to, value = 0n, data = "0x") {
  const tx = await wallet.connect(signer).submitTransaction(to, value, data);
  const receipt = await tx.wait();

  const event = receipt.logs
    .map((log) => { try { return wallet.interface.parseLog(log); } catch { return null; } })
    .find((e) => e?.name === "SubmitTransaction");

  return event.args.txIndex;
}

/**
 * Confirm a tx from multiple signers. Returns the last receipt.
 */
async function confirmTx(wallet, signers, txIndex) {
  let receipt;
  for (const signer of signers) {
    const tx = await wallet.connect(signer).confirmTransaction(txIndex);
    receipt = await tx.wait();
  }
  return receipt;
}

/**
 * Fund the wallet with ETH.
 */
async function fundWallet(wallet, signer, amountEth = "1.0") {
  const tx = await signer.sendTransaction({
    to: await wallet.getAddress(),
    value: ethers.parseEther(amountEth),
  });
  await tx.wait();
}

/**
 * Check if a transaction was executed by parsing receipt logs.
 */
function wasExecuted(wallet, receipt) {
  return receipt.logs
    .map((log) => { try { return wallet.interface.parseLog(log); } catch { return null; } })
    .some((e) => e?.name === "ExecuteTransaction");
}

// ─── Encoding Helpers ─────────────────────────────────────────────────────────

/**
 * Encode a function call for use as tx data.
 */
function encodeCall(contractInterface, functionName, args) {
  return contractInterface.encodeFunctionData(functionName, args);
}

module.exports = {
  deployWallet,
  deployFactory,
  deployViaFactory,
  submitTx,
  confirmTx,
  fundWallet,
  wasExecuted,
  encodeCall,
};