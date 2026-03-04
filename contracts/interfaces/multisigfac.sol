// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./MultiSigWallet.sol";

/**
 * @title  MultiSigWalletFactory
 * @notice Deploy new MultiSigWallet instances and keep a registry of them.
 */
contract MultiSigWalletFactory {
    // ─── Events ───────────────────────────────────────────────────────────────
    event WalletCreated(
        address indexed wallet,
        address[] owners,
        uint256 required,
        address indexed creator
    );

    // ─── State ────────────────────────────────────────────────────────────────

    address[] public allWallets;

    // creator => list of wallets they deployed
    mapping(address => address[]) private _walletsByCreator;

    // ─── Create ───────────────────────────────────────────────────────────────

    /**
     * @notice Deploy a new MultiSigWallet.
     * @param owners   Initial owner list.
     * @param required Confirmation threshold.
     * @return wallet  Address of the newly deployed wallet.
     */
    function createWallet(address[] calldata owners, uint256 required)
        external
        returns (address wallet)
    {
        MultiSigWallet newWallet = new MultiSigWallet(owners, required);
        wallet = address(newWallet);

        allWallets.push(wallet);
        _walletsByCreator[msg.sender].push(wallet);

        emit WalletCreated(wallet, owners, required, msg.sender);
    }

    // ─── View ─────────────────────────────────────────────────────────────────

    function getWalletCount() external view returns (uint256) {
        return allWallets.length;
    }

    function getWalletsByCreator(address creator)
        external
        view
        returns (address[] memory)
    {
        return _walletsByCreator[creator];
    }
}
