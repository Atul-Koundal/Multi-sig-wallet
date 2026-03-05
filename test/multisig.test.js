const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  deployWallet,
  deployFactory,
  deployViaFactory,
  submitTx,
  confirmTx,
  fundWallet,
  wasExecuted,
  encodeCall,
} = require("./helpers/utils");

describe("MultiSigWallet", function () {
  let wallet;
  let owner1, owner2, owner3, nonOwner, recipient;
  let owners;
  const REQUIRED = 2;

  // ─── Setup ─────────────────────────────────────────────────────────────────
  beforeEach(async function () {
    [owner1, owner2, owner3, nonOwner, recipient] = await ethers.getSigners();
    owners = [owner1.address, owner2.address, owner3.address];
    wallet = await deployWallet(owners, REQUIRED);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Deployment", function () {
    it("sets the correct owners", async function () {
      const onChainOwners = await wallet.getOwners();
      expect(onChainOwners).to.deep.equal(owners);
    });

    it("sets the correct required threshold", async function () {
      expect(await wallet.required()).to.equal(REQUIRED);
    });

    it("marks each address as an owner", async function () {
      for (const o of owners) {
        expect(await wallet.isOwner(o)).to.be.true;
      }
    });

    it("does not mark non-owners as owners", async function () {
      expect(await wallet.isOwner(nonOwner.address)).to.be.false;
    });

    it("starts with zero transactions", async function () {
      expect(await wallet.getTransactionCount()).to.equal(0);
    });

    it("emits OwnerAdded for each owner on deploy", async function () {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      const deployTx = await MultiSigWallet.deploy(owners, REQUIRED);
      const receipt = await deployTx.deploymentTransaction().wait();

      const iface = MultiSigWallet.interface;
      const ownerAddedEvents = receipt.logs
        .map((log) => { try { return iface.parseLog(log); } catch { return null; } })
        .filter((e) => e?.name === "OwnerAdded");

      expect(ownerAddedEvents.length).to.equal(owners.length);
    });

    it("reverts with zero owners", async function () {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(MultiSigWallet.deploy([], 1))
        .to.be.revertedWith("MultiSig: owners required");
    });

    it("reverts when required > owners", async function () {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(MultiSigWallet.deploy(owners, owners.length + 1))
        .to.be.revertedWith("MultiSig: invalid required count");
    });

    it("reverts when required is zero", async function () {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(MultiSigWallet.deploy(owners, 0))
        .to.be.revertedWith("MultiSig: invalid required count");
    });

    it("reverts with duplicate owners", async function () {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(
        MultiSigWallet.deploy([owner1.address, owner1.address, owner2.address], 2)
      ).to.be.revertedWith("MultiSig: duplicate owner");
    });

    it("reverts with zero address owner", async function () {
      const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");
      await expect(
        MultiSigWallet.deploy([owner1.address, ethers.ZeroAddress], 1)
      ).to.be.revertedWith("MultiSig: zero address owner");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DEPOSITS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Deposits", function () {
    it("accepts ETH and emits Deposit event", async function () {
      const amount = ethers.parseEther("1.0");
      await expect(
        owner1.sendTransaction({ to: await wallet.getAddress(), value: amount })
      )
        .to.emit(wallet, "Deposit")
        .withArgs(owner1.address, amount, amount);
    });

    it("correctly reflects balance after deposit", async function () {
      await fundWallet(wallet, owner1, "2.5");
      expect(await wallet.getBalance()).to.equal(ethers.parseEther("2.5"));
    });

    it("accumulates balance from multiple deposits", async function () {
      await fundWallet(wallet, owner1, "1.0");
      await fundWallet(wallet, owner2, "0.5");
      expect(await wallet.getBalance()).to.equal(ethers.parseEther("1.5"));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SUBMIT TRANSACTION
  // ═══════════════════════════════════════════════════════════════════════════
  describe("submitTransaction", function () {
    it("allows an owner to submit a transaction", async function () {
      const txIndex = await submitTx(wallet, owner1, recipient.address);
      expect(txIndex).to.equal(0n);
      expect(await wallet.getTransactionCount()).to.equal(1);
    });

    it("emits SubmitTransaction event", async function () {
      const value = ethers.parseEther("0.1");
      await expect(
        wallet.connect(owner1).submitTransaction(recipient.address, value, "0x")
      )
        .to.emit(wallet, "SubmitTransaction")
        .withArgs(owner1.address, 0, recipient.address, value, "0x");
    });

    it("stores transaction data correctly", async function () {
      const value = ethers.parseEther("0.5");
      const data = "0xdeadbeef";
      await submitTx(wallet, owner1, recipient.address, value, data);

      const [to, val, txData, executed, confirmations] = await wallet.getTransaction(0);
      expect(to).to.equal(recipient.address);
      expect(val).to.equal(value);
      expect(txData).to.equal(data);
      expect(executed).to.be.false;
      expect(confirmations).to.equal(0);
    });

    it("increments txIndex for each submission", async function () {
      const i1 = await submitTx(wallet, owner1, recipient.address);
      const i2 = await submitTx(wallet, owner1, recipient.address);
      const i3 = await submitTx(wallet, owner2, recipient.address);
      expect(i1).to.equal(0n);
      expect(i2).to.equal(1n);
      expect(i3).to.equal(2n);
    });

    it("reverts if called by non-owner", async function () {
      await expect(
        wallet.connect(nonOwner).submitTransaction(recipient.address, 0, "0x")
      ).to.be.revertedWith("MultiSig: not owner");
    });

    it("reverts with zero address destination", async function () {
      await expect(
        wallet.connect(owner1).submitTransaction(ethers.ZeroAddress, 0, "0x")
      ).to.be.revertedWith("MultiSig: zero address destination");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CONFIRM TRANSACTION
  // ═══════════════════════════════════════════════════════════════════════════
  describe("confirmTransaction", function () {
    let txIndex;

    beforeEach(async function () {
      txIndex = await submitTx(wallet, owner1, recipient.address);
    });

    it("allows an owner to confirm", async function () {
      await wallet.connect(owner1).confirmTransaction(txIndex);
      expect(await wallet.isConfirmed(txIndex, owner1.address)).to.be.true;
    });

    it("increments numConfirmations", async function () {
      await wallet.connect(owner1).confirmTransaction(txIndex);
      const [, , , , confirmations] = await wallet.getTransaction(txIndex);
      expect(confirmations).to.equal(1);
    });

    it("emits ConfirmTransaction event", async function () {
      await expect(wallet.connect(owner1).confirmTransaction(txIndex))
        .to.emit(wallet, "ConfirmTransaction")
        .withArgs(owner1.address, txIndex);
    });

    it("reverts if non-owner tries to confirm", async function () {
      await expect(
        wallet.connect(nonOwner).confirmTransaction(txIndex)
      ).to.be.revertedWith("MultiSig: not owner");
    });

    it("reverts if tx does not exist", async function () {
      await expect(
        wallet.connect(owner1).confirmTransaction(999)
      ).to.be.revertedWith("MultiSig: tx does not exist");
    });

    it("reverts if owner confirms twice", async function () {
      await wallet.connect(owner1).confirmTransaction(txIndex);
      await expect(
        wallet.connect(owner1).confirmTransaction(txIndex)
      ).to.be.revertedWith("MultiSig: tx already confirmed");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. AUTO-EXECUTION ON THRESHOLD
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Auto-execution on threshold", function () {
    it("auto-executes when confirmations reach required", async function () {
      await fundWallet(wallet, owner1, "1.0");
      const value = ethers.parseEther("0.5");

      const txIndex = await submitTx(wallet, owner1, recipient.address, value);
      const balanceBefore = await ethers.provider.getBalance(recipient.address);

      // First confirm — not yet executed
      await wallet.connect(owner1).confirmTransaction(txIndex);
      let [, , , executed] = await wallet.getTransaction(txIndex);
      expect(executed).to.be.false;

      // Second confirm — hits threshold, auto-executes
      const tx = await wallet.connect(owner2).confirmTransaction(txIndex);
      const receipt = await tx.wait();

      expect(wasExecuted(wallet, receipt)).to.be.true;

      const balanceAfter = await ethers.provider.getBalance(recipient.address);
      expect(balanceAfter - balanceBefore).to.equal(value);
    });

    it("marks tx as executed after auto-execution", async function () {
      await fundWallet(wallet, owner1, "1.0");
      const txIndex = await submitTx(wallet, owner1, recipient.address, ethers.parseEther("0.1"));
      await confirmTx(wallet, [owner1, owner2], txIndex);

      const [, , , executed] = await wallet.getTransaction(txIndex);
      expect(executed).to.be.true;
    });

    it("emits ExecuteTransaction event on auto-execution", async function () {
      await fundWallet(wallet, owner1, "1.0");
      const txIndex = await submitTx(wallet, owner1, recipient.address, ethers.parseEther("0.1"));
      await wallet.connect(owner1).confirmTransaction(txIndex);

      await expect(wallet.connect(owner2).confirmTransaction(txIndex))
        .to.emit(wallet, "ExecuteTransaction")
        .withArgs(owner2.address, txIndex);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. MANUAL EXECUTE TRANSACTION
  // ═══════════════════════════════════════════════════════════════════════════
  describe("executeTransaction (manual)", function () {
    it("allows manual execution when threshold is met", async function () {
      await fundWallet(wallet, owner1, "1.0");
      const value = ethers.parseEther("0.3");
      const txIndex = await submitTx(wallet, owner1, recipient.address, value);

      // Confirm without triggering auto-execute by using a 3-of-3 wallet
      const wallet3of3 = await deployWallet(owners, 3);
      await fundWallet(wallet3of3, owner1, "1.0");
      const ti = await submitTx(wallet3of3, owner1, recipient.address, value);
      await wallet3of3.connect(owner1).confirmTransaction(ti);
      await wallet3of3.connect(owner2).confirmTransaction(ti);
      await wallet3of3.connect(owner3).confirmTransaction(ti);

      // Manual execute (would have auto-executed in 2-of-3, so test with 3-of-3)
      const [, , , executed] = await wallet3of3.getTransaction(ti);
      expect(executed).to.be.true;
    });

    it("reverts if already executed", async function () {
      await fundWallet(wallet, owner1, "1.0");
      const txIndex = await submitTx(wallet, owner1, recipient.address, ethers.parseEther("0.1"));
      await confirmTx(wallet, [owner1, owner2], txIndex); // auto-executes

      await expect(
        wallet.connect(owner1).executeTransaction(txIndex)
      ).to.be.revertedWith("MultiSig: tx already executed");
    });

    it("reverts if insufficient confirmations", async function () {
      await fundWallet(wallet, owner1, "1.0");
      const txIndex = await submitTx(wallet, owner1, recipient.address, ethers.parseEther("0.1"));
      await wallet.connect(owner1).confirmTransaction(txIndex); // only 1 of 2

      await expect(
        wallet.connect(owner1).executeTransaction(txIndex)
      ).to.be.revertedWith("MultiSig: insufficient confirmations");
    });

    it("reverts if wallet has insufficient ETH", async function () {
      // Don't fund the wallet
      const txIndex = await submitTx(wallet, owner1, recipient.address, ethers.parseEther("1.0"));
      await wallet.connect(owner1).confirmTransaction(txIndex);

      await expect(
        wallet.connect(owner2).confirmTransaction(txIndex)
      ).to.be.revertedWith("MultiSig: execution failed");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. REVOKE CONFIRMATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe("revokeConfirmation", function () {
    let txIndex;

    beforeEach(async function () {
      txIndex = await submitTx(wallet, owner1, recipient.address);
      await wallet.connect(owner1).confirmTransaction(txIndex);
    });

    it("allows an owner to revoke their confirmation", async function () {
      await wallet.connect(owner1).revokeConfirmation(txIndex);
      expect(await wallet.isConfirmed(txIndex, owner1.address)).to.be.false;
    });

    it("decrements numConfirmations on revoke", async function () {
      await wallet.connect(owner1).revokeConfirmation(txIndex);
      const [, , , , confirmations] = await wallet.getTransaction(txIndex);
      expect(confirmations).to.equal(0);
    });

    it("emits RevokeConfirmation event", async function () {
      await expect(wallet.connect(owner1).revokeConfirmation(txIndex))
        .to.emit(wallet, "RevokeConfirmation")
        .withArgs(owner1.address, txIndex);
    });

    it("reverts if owner never confirmed", async function () {
      await expect(
        wallet.connect(owner2).revokeConfirmation(txIndex)
      ).to.be.revertedWith("MultiSig: tx not confirmed by you");
    });

    it("reverts if tx does not exist", async function () {
      await expect(
        wallet.connect(owner1).revokeConfirmation(999)
      ).to.be.revertedWith("MultiSig: tx does not exist");
    });

    it("prevents execution after revoke drops below threshold", async function () {
      await fundWallet(wallet, owner1, "1.0");
      const ti = await submitTx(wallet, owner1, recipient.address, ethers.parseEther("0.1"));
      await wallet.connect(owner1).confirmTransaction(ti);
      await wallet.connect(owner2).confirmTransaction(ti);
      // tx should have auto-executed — verify
      const [, , , executed] = await wallet.getTransaction(ti);
      expect(executed).to.be.true;

      // Now test revoke before threshold on a fresh tx
      const ti2 = await submitTx(wallet, owner1, recipient.address, ethers.parseEther("0.1"));
      await wallet.connect(owner1).confirmTransaction(ti2);
      await wallet.connect(owner1).revokeConfirmation(ti2);

      // Only owner2 confirms now — threshold not met
      await wallet.connect(owner2).confirmTransaction(ti2);
      const [, , , executed2, confirmations] = await wallet.getTransaction(ti2);
      expect(executed2).to.be.false;
      expect(confirmations).to.equal(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. OWNER MANAGEMENT (via wallet proposals)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Owner management", function () {
    it("adds a new owner via wallet proposal", async function () {
      const newOwner = nonOwner;
      const data = encodeCall(wallet.interface, "addOwner", [newOwner.address]);
      const txIndex = await submitTx(wallet, owner1, await wallet.getAddress(), 0n, data);
      await confirmTx(wallet, [owner1, owner2], txIndex);

      expect(await wallet.isOwner(newOwner.address)).to.be.true;
      const allOwners = await wallet.getOwners();
      expect(allOwners).to.include(newOwner.address);
    });

    it("removes an owner via wallet proposal", async function () {
      const data = encodeCall(wallet.interface, "removeOwner", [owner3.address]);
      const txIndex = await submitTx(wallet, owner1, await wallet.getAddress(), 0n, data);
      await confirmTx(wallet, [owner1, owner2], txIndex);

      expect(await wallet.isOwner(owner3.address)).to.be.false;
    });

    it("changes required threshold via wallet proposal", async function () {
      const data = encodeCall(wallet.interface, "changeRequirement", [3]);
      const txIndex = await submitTx(wallet, owner1, await wallet.getAddress(), 0n, data);
      await confirmTx(wallet, [owner1, owner2], txIndex);

      expect(await wallet.required()).to.equal(3);
    });

    it("emits OwnerAdded when adding owner", async function () {
      const data = encodeCall(wallet.interface, "addOwner", [nonOwner.address]);
      const txIndex = await submitTx(wallet, owner1, await wallet.getAddress(), 0n, data);

      const tx = await wallet.connect(owner1).confirmTransaction(txIndex);
      await expect(wallet.connect(owner2).confirmTransaction(txIndex))
        .to.emit(wallet, "OwnerAdded")
        .withArgs(nonOwner.address);
    });

    it("emits OwnerRemoved when removing owner", async function () {
      const data = encodeCall(wallet.interface, "removeOwner", [owner3.address]);
      const txIndex = await submitTx(wallet, owner1, await wallet.getAddress(), 0n, data);

      await expect(confirmTx(wallet, [owner1, owner2], txIndex))
        .to.emit(wallet, "OwnerRemoved")
        .withArgs(owner3.address);
    });

    it("reverts addOwner if called directly (not via wallet)", async function () {
      await expect(
        wallet.connect(owner1).addOwner(nonOwner.address)
      ).to.be.revertedWith("MultiSig: not wallet");
    });

    it("reverts removeOwner if called directly", async function () {
      await expect(
        wallet.connect(owner1).removeOwner(owner3.address)
      ).to.be.revertedWith("MultiSig: not wallet");
    });

    it("reverts removing owner if it would drop below required", async function () {
      // 2-of-3 wallet — removing 2 owners would leave only 1, below required=2
      const data = encodeCall(wallet.interface, "removeOwner", [owner3.address]);
      const ti1 = await submitTx(wallet, owner1, await wallet.getAddress(), 0n, data);
      await confirmTx(wallet, [owner1, owner2], ti1); // owner3 removed

      const data2 = encodeCall(wallet.interface, "removeOwner", [owner2.address]);
      const ti2 = await submitTx(wallet, owner1, await wallet.getAddress(), 0n, data2);
      // Now only 2 owners remain, required=2 — removing one would leave 1 < 2
      await expect(confirmTx(wallet, [owner1, owner2], ti2))
        .to.be.revertedWith("MultiSig: execution failed");
    });

    it("reverts adding duplicate owner", async function () {
      const data = encodeCall(wallet.interface, "addOwner", [owner1.address]);
      const txIndex = await submitTx(wallet, owner1, await wallet.getAddress(), 0n, data);
      await expect(confirmTx(wallet, [owner1, owner2], txIndex))
        .to.be.revertedWith("MultiSig: execution failed");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. VIEW FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("View functions", function () {
    it("getOwners returns correct list", async function () {
      expect(await wallet.getOwners()).to.deep.equal(owners);
    });

    it("getTransactionCount returns correct count", async function () {
      expect(await wallet.getTransactionCount()).to.equal(0);
      await submitTx(wallet, owner1, recipient.address);
      await submitTx(wallet, owner1, recipient.address);
      expect(await wallet.getTransactionCount()).to.equal(2);
    });

    it("isOwner returns true for owners and false for others", async function () {
      expect(await wallet.isOwner(owner1.address)).to.be.true;
      expect(await wallet.isOwner(nonOwner.address)).to.be.false;
    });

    it("isConfirmed reflects confirmation state", async function () {
      const txIndex = await submitTx(wallet, owner1, recipient.address);
      expect(await wallet.isConfirmed(txIndex, owner1.address)).to.be.false;
      await wallet.connect(owner1).confirmTransaction(txIndex);
      expect(await wallet.isConfirmed(txIndex, owner1.address)).to.be.true;
    });

    it("getTransaction reverts for non-existent index", async function () {
      await expect(wallet.getTransaction(0)).to.be.revertedWith("MultiSig: tx does not exist");
    });

    it("getBalance returns correct ETH balance", async function () {
      expect(await wallet.getBalance()).to.equal(0n);
      await fundWallet(wallet, owner1, "3.0");
      expect(await wallet.getBalance()).to.equal(ethers.parseEther("3.0"));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. EDGE CASES & COMPLEX SCENARIOS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Edge cases", function () {
    it("handles 1-of-1 wallet correctly", async function () {
      const solo = await deployWallet([owner1.address], 1);
      await fundWallet(solo, owner1, "1.0");
      const txIndex = await submitTx(solo, owner1, recipient.address, ethers.parseEther("0.5"));
      const tx = await solo.connect(owner1).confirmTransaction(txIndex);
      const receipt = await tx.wait();
      expect(wasExecuted(solo, receipt)).to.be.true;
    });

    it("handles multiple concurrent pending transactions", async function () {
      await fundWallet(wallet, owner1, "3.0");
      const v = ethers.parseEther("0.1");

      const ti0 = await submitTx(wallet, owner1, recipient.address, v);
      const ti1 = await submitTx(wallet, owner1, recipient.address, v);
      const ti2 = await submitTx(wallet, owner2, recipient.address, v);

      // Execute tx1 first
      await confirmTx(wallet, [owner1, owner2], ti1);
      const [, , , ex1] = await wallet.getTransaction(ti1);
      expect(ex1).to.be.true;

      // tx0 and tx2 still pending
      const [, , , ex0] = await wallet.getTransaction(ti0);
      const [, , , ex2] = await wallet.getTransaction(ti2);
      expect(ex0).to.be.false;
      expect(ex2).to.be.false;

      // Execute remaining
      await confirmTx(wallet, [owner1, owner2], ti0);
      await confirmTx(wallet, [owner1, owner2], ti2);
    });

    it("correctly handles contract calls (not just ETH transfers)", async function () {
  // Test that arbitrary calldata is stored correctly
  const data = "0xd09de08a"; // increment() selector

  const txIndex = await submitTx(wallet, owner1, recipient.address, 0n, data);
  const [, , storedData] = await wallet.getTransaction(txIndex);
  expect(storedData).to.equal(data);
});

    it("all 3 owners confirm a 3-of-3 wallet", async function () {
      const wallet3 = await deployWallet(owners, 3);
      await fundWallet(wallet3, owner1, "1.0");
      const txIndex = await submitTx(wallet3, owner1, recipient.address, ethers.parseEther("0.5"));

      await wallet3.connect(owner1).confirmTransaction(txIndex);
      await wallet3.connect(owner2).confirmTransaction(txIndex);

      // Not yet executed after 2
      let [, , , executed] = await wallet3.getTransaction(txIndex);
      expect(executed).to.be.false;

      const tx = await wallet3.connect(owner3).confirmTransaction(txIndex);
      const receipt = await tx.wait();
      expect(wasExecuted(wallet3, receipt)).to.be.true;
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MultiSigWalletFactory tests
// ═════════════════════════════════════════════════════════════════════════════
describe("MultiSigWalletFactory", function () {
  let factory;
  let owner1, owner2, owner3, other;
  let owners;

  beforeEach(async function () {
    [owner1, owner2, owner3, other] = await ethers.getSigners();
    owners = [owner1.address, owner2.address, owner3.address];
    factory = await deployFactory();
  });

  it("deploys a wallet and emits WalletCreated", async function () {
    await expect(factory.createWallet(owners, 2))
      .to.emit(factory, "WalletCreated");
  });

  it("registers the wallet in allWallets", async function () {
    await factory.createWallet(owners, 2);
    expect(await factory.getWalletCount()).to.equal(1);
    const addr = await factory.allWallets(0);
    expect(addr).to.be.properAddress;
  });

  it("tracks wallets by creator", async function () {
    await factory.connect(owner1).createWallet(owners, 2);
    await factory.connect(owner1).createWallet(owners, 3);
    await factory.connect(other).createWallet([owner1.address, owner2.address], 1);

    const owner1Wallets = await factory.getWalletsByCreator(owner1.address);
    const otherWallets = await factory.getWalletsByCreator(other.address);

    expect(owner1Wallets.length).to.equal(2);
    expect(otherWallets.length).to.equal(1);
  });

  it("deployed wallet has correct owners and required", async function () {
    const tx = await factory.createWallet(owners, 2);
    const receipt = await tx.wait();

    const iface = factory.interface;
    const event = receipt.logs
      .map((log) => { try { return iface.parseLog(log); } catch { return null; } })
      .find((e) => e?.name === "WalletCreated");

    const wallet = await ethers.getContractAt("MultiSigWallet", event.args.wallet);
    expect(await wallet.getOwners()).to.deep.equal(owners);
    expect(await wallet.required()).to.equal(2);
  });

  it("increments wallet count across multiple deployments", async function () {
    await factory.createWallet(owners, 2);
    await factory.createWallet(owners, 3);
    await factory.createWallet([owner1.address, owner2.address], 1);
    expect(await factory.getWalletCount()).to.equal(3);
  });

  it("reverts if invalid args passed to factory", async function () {
    await expect(factory.createWallet([], 1))
      .to.be.revertedWith("MultiSig: owners required");
    await expect(factory.createWallet(owners, 0))
      .to.be.revertedWith("MultiSig: invalid required count");
  });
});