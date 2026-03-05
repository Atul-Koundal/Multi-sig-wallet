// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IMultiSigWallet {
    // ─── Events ───────────────────────────────────────────────────────────────
    event Deposit(address indexed sender, uint256 amount, uint256 balance);
    event SubmitTransaction(
        address indexed owner,
        uint256 indexed txIndex,
        address indexed to,
        uint256 value,
        bytes data
    );
    event ConfirmTransaction(address indexed owner, uint256 indexed txIndex);
    event RevokeConfirmation(address indexed owner, uint256 indexed txIndex);
    event ExecuteTransaction(address indexed owner, uint256 indexed txIndex);
    event OwnerAdded(address indexed owner);
    event OwnerRemoved(address indexed owner);
    event RequirementChanged(uint256 required);

    // ─── Structs ──────────────────────────────────────────────────────────────
    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 numConfirmations;
    }

    // ─── View Functions ───────────────────────────────────────────────────────
    function getOwners() external view returns (address[] memory);
    function getTransactionCount() external view returns (uint256);
    function getTransaction(uint256 txIndex)
        external
        view
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations
        );
    function isOwner(address account) external view returns (bool);
    function isConfirmed(uint256 txIndex, address owner) external view returns (bool);

    // ─── State-Changing Functions ─────────────────────────────────────────────
    function submitTransaction(address to, uint256 value, bytes calldata data)
        external
        returns (uint256 txIndex);
    function confirmTransaction(uint256 txIndex) external;
    function executeTransaction(uint256 txIndex) external;
    function revokeConfirmation(uint256 txIndex) external;
}
