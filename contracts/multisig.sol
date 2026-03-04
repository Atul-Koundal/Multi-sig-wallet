// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/IMultiSigWallet.sol";

/**
 * @title  MultiSigWallet
 * @notice M-of-N multi-signature wallet for Ethereum / EVM chains.
 *         Any owner can submit a transaction proposal. Once `required`
 *         owners have confirmed it, anyone can trigger execution.
 *         Owners can also revoke their confirmation before execution.
 */
contract MultiSigWallet is IMultiSigWallet {
    // ─── State ────────────────────────────────────────────────────────────────

    address[] private _owners;
    uint256 public required;

    mapping(address => bool) private _isOwner;

    Transaction[] private _transactions;

    // txIndex => owner => confirmed?
    mapping(uint256 => mapping(address => bool)) private _confirmations;

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        require(_isOwner[msg.sender], "MultiSig: not owner");
        _;
    }

    modifier onlyWallet() {
        require(msg.sender == address(this), "MultiSig: not wallet");
        _;
    }

    modifier txExists(uint256 txIndex) {
        require(txIndex < _transactions.length, "MultiSig: tx does not exist");
        _;
    }

    modifier notExecuted(uint256 txIndex) {
        require(!_transactions[txIndex].executed, "MultiSig: tx already executed");
        _;
    }

    modifier notConfirmed(uint256 txIndex) {
        require(!_confirmations[txIndex][msg.sender], "MultiSig: tx already confirmed");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /**
     * @param owners_   List of initial owner addresses (no duplicates, no zero address).
     * @param required_ Minimum number of confirmations needed to execute a tx.
     */
    constructor(address[] memory owners_, uint256 required_) {
        require(owners_.length > 0, "MultiSig: owners required");
        require(
            required_ > 0 && required_ <= owners_.length,
            "MultiSig: invalid required count"
        );

        for (uint256 i = 0; i < owners_.length; i++) {
            address owner = owners_[i];
            require(owner != address(0), "MultiSig: zero address owner");
            require(!_isOwner[owner], "MultiSig: duplicate owner");

            _isOwner[owner] = true;
            _owners.push(owner);
            emit OwnerAdded(owner);
        }

        required = required_;
        emit RequirementChanged(required_);
    }

    // ─── Receive ETH ──────────────────────────────────────────────────────────

    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    // ─── Core Multi-Sig Logic ─────────────────────────────────────────────────

    /**
     * @notice Submit a new transaction proposal.
     * @param to    Destination address.
     * @param value ETH value (in wei) to send.
     * @param data  Calldata (empty for plain ETH transfers).
     * @return txIndex Index of the newly created transaction.
     */
    function submitTransaction(
        address to,
        uint256 value,
        bytes calldata data
    ) external override onlyOwner returns (uint256 txIndex) {
        require(to != address(0), "MultiSig: zero address destination");

        txIndex = _transactions.length;
        _transactions.push(
            Transaction({
                to: to,
                value: value,
                data: data,
                executed: false,
                numConfirmations: 0
            })
        );

        emit SubmitTransaction(msg.sender, txIndex, to, value, data);
    }

    /**
     * @notice Confirm a pending transaction.
     *         Executes automatically if the confirmation threshold is now met.
     * @param txIndex Index of the transaction to confirm.
     */
    function confirmTransaction(uint256 txIndex)
        external
        override
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
        notConfirmed(txIndex)
    {
        _confirmations[txIndex][msg.sender] = true;
        _transactions[txIndex].numConfirmations++;

        emit ConfirmTransaction(msg.sender, txIndex);

        // Auto-execute once threshold is reached
        if (_transactions[txIndex].numConfirmations >= required) {
            _execute(txIndex);
        }
    }

    /**
     * @notice Manually execute a transaction that has enough confirmations.
     *         Useful if auto-execution failed due to gas limits.
     * @param txIndex Index of the transaction to execute.
     */
    function executeTransaction(uint256 txIndex)
        external
        override
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        require(
            _transactions[txIndex].numConfirmations >= required,
            "MultiSig: insufficient confirmations"
        );
        _execute(txIndex);
    }

    /**
     * @notice Revoke your own confirmation for a pending transaction.
     * @param txIndex Index of the transaction.
     */
    function revokeConfirmation(uint256 txIndex)
        external
        override
        onlyOwner
        txExists(txIndex)
        notExecuted(txIndex)
    {
        require(
            _confirmations[txIndex][msg.sender],
            "MultiSig: tx not confirmed by you"
        );

        _confirmations[txIndex][msg.sender] = false;
        _transactions[txIndex].numConfirmations--;

        emit RevokeConfirmation(msg.sender, txIndex);
    }

    // ─── Owner Management (called via wallet proposals) ───────────────────────

    /**
     * @notice Add a new owner. Must be called via a wallet transaction (onlyWallet).
     * @param owner Address of the new owner.
     */
    function addOwner(address owner) external onlyWallet {
        require(owner != address(0), "MultiSig: zero address");
        require(!_isOwner[owner], "MultiSig: already owner");

        _isOwner[owner] = true;
        _owners.push(owner);
        emit OwnerAdded(owner);
    }

    /**
     * @notice Remove an existing owner. Must be called via a wallet transaction.
     * @param owner Address to remove.
     */
    function removeOwner(address owner) external onlyWallet {
        require(_isOwner[owner], "MultiSig: not owner");
        require(
            _owners.length - 1 >= required,
            "MultiSig: would fall below required threshold"
        );

        _isOwner[owner] = false;

        // Swap-and-pop to remove from array
        for (uint256 i = 0; i < _owners.length; i++) {
            if (_owners[i] == owner) {
                _owners[i] = _owners[_owners.length - 1];
                _owners.pop();
                break;
            }
        }

        emit OwnerRemoved(owner);
    }

    /**
     * @notice Change the confirmation threshold. Must be called via a wallet transaction.
     * @param newRequired New threshold value.
     */
    function changeRequirement(uint256 newRequired) external onlyWallet {
        require(newRequired > 0 && newRequired <= _owners.length, "MultiSig: invalid required");
        required = newRequired;
        emit RequirementChanged(newRequired);
    }

    // ─── View Functions ───────────────────────────────────────────────────────

    function getOwners() external view override returns (address[] memory) {
        return _owners;
    }

    function getTransactionCount() external view override returns (uint256) {
        return _transactions.length;
    }

    function getTransaction(uint256 txIndex)
        external
        view
        override
        txExists(txIndex)
        returns (
            address to,
            uint256 value,
            bytes memory data,
            bool executed,
            uint256 numConfirmations
        )
    {
        Transaction storage t = _transactions[txIndex];
        return (t.to, t.value, t.data, t.executed, t.numConfirmations);
    }

    function isOwner(address account) external view override returns (bool) {
        return _isOwner[account];
    }

    function isConfirmed(uint256 txIndex, address owner)
        external
        view
        override
        returns (bool)
    {
        return _confirmations[txIndex][owner];
    }

    /// @notice Returns the current ETH balance held by the wallet.
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _execute(uint256 txIndex) internal {
        Transaction storage t = _transactions[txIndex];
        t.executed = true;

        (bool success, ) = t.to.call{value: t.value}(t.data);
        require(success, "MultiSig: execution failed");

        emit ExecuteTransaction(msg.sender, txIndex);
    }
}
