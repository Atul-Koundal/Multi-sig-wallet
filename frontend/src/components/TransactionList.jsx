import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { shortAddr } from "../utils/format";

export default function TransactionList({
  contract, txCount, required, account, isOwner, refresh, showToast,
}) {
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); // all | pending | executed
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    if (!contract || txCount === 0) { setTxs([]); return; }
    fetchTxs();
  }, [contract, txCount]);

  const fetchTxs = async () => {
    setLoading(true);
    try {
      const items = await Promise.all(
        Array.from({ length: txCount }, async (_, i) => {
          const [to, value, data, executed, numConfirmations] = await contract.getTransaction(i);
          const confirmed = await contract.isConfirmed(i, account);
          return { index: i, to, value, data, executed, numConfirmations: Number(numConfirmations), confirmed };
        })
      );
      setTxs(items.reverse()); // newest first
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (txIndex) => {
    try {
      setActionLoading(`confirm-${txIndex}`);
      const tx = await contract.confirmTransaction(txIndex);
      await tx.wait();
      showToast("Transaction confirmed!");
      await refresh();
      await fetchTxs();
    } catch (e) {
      showToast(e.reason || "Confirm failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (txIndex) => {
    try {
      setActionLoading(`revoke-${txIndex}`);
      const tx = await contract.revokeConfirmation(txIndex);
      await tx.wait();
      showToast("Confirmation revoked");
      await refresh();
      await fetchTxs();
    } catch (e) {
      showToast(e.reason || "Revoke failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleExecute = async (txIndex) => {
    try {
      setActionLoading(`execute-${txIndex}`);
      const tx = await contract.executeTransaction(txIndex);
      await tx.wait();
      showToast("Transaction executed!");
      await refresh();
      await fetchTxs();
    } catch (e) {
      showToast(e.reason || "Execute failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = txs.filter((t) => {
    if (filter === "pending") return !t.executed;
    if (filter === "executed") return t.executed;
    return true;
  });

  const pendingCount = txs.filter((t) => !t.executed).length;

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Transactions</h2>
          <p style={styles.sub}>
            {pendingCount} pending · {txs.length - pendingCount} executed
          </p>
        </div>
        <div style={styles.filters}>
          {["all", "pending", "executed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={styles.loadingState}>
          <span className="spinner" />
          <span>Loading transactions…</span>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>⬡</div>
          <p style={styles.emptyTitle}>No transactions found</p>
          <p style={styles.emptySub}>
            {filter === "all"
              ? "Submit a proposal in the Submit tab to get started"
              : `No ${filter} transactions`}
          </p>
        </div>
      )}

      <div style={styles.list}>
        {filtered.map((tx) => (
          <TxCard
            key={tx.index}
            tx={tx}
            required={required}
            isOwner={isOwner}
            actionLoading={actionLoading}
            onConfirm={handleConfirm}
            onRevoke={handleRevoke}
            onExecute={handleExecute}
          />
        ))}
      </div>
    </div>
  );
}

function TxCard({ tx, required, isOwner, actionLoading, onConfirm, onRevoke, onExecute }) {
  const [expanded, setExpanded] = useState(false);
  const progress = Math.min((tx.numConfirmations / required) * 100, 100);
  const canExecute = !tx.executed && tx.numConfirmations >= required;

  return (
    <div style={{ ...styles.card, ...(tx.executed ? styles.cardExecuted : {}) }}>
      <div style={styles.cardTop} onClick={() => setExpanded(!expanded)}>
        {/* Status */}
        <div style={styles.statusCol}>
          <div style={tx.executed ? styles.dotExecuted : styles.dotPending} />
          <span style={styles.txIndex} className="mono">#{tx.index}</span>
        </div>

        {/* Info */}
        <div style={styles.infoCol}>
          <div style={styles.toAddr} className="mono">{shortAddr(tx.to)}</div>
          <div style={styles.valueRow}>
            <span style={styles.ethValue} className="mono">
              {parseFloat(ethers.formatEther(tx.value)).toFixed(4)} ETH
            </span>
            {tx.data !== "0x" && tx.data !== "0x0" && (
              <span className="tag tag--purple">Has calldata</span>
            )}
          </div>
        </div>

        {/* Confirmations */}
        <div style={styles.confCol}>
          <div style={styles.confCount}>
            <span style={styles.confNum}>{tx.numConfirmations}</span>
            <span style={styles.confOf}>/ {required}</span>
          </div>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <div style={styles.confLabel} className="mono">confirmations</div>
        </div>

        {/* Status tag */}
        <div style={styles.statusTag}>
          {tx.executed ? (
            <span className="tag tag--green">Executed</span>
          ) : canExecute ? (
            <span className="tag tag--yellow">Ready</span>
          ) : (
            <span className="tag tag--purple">Pending</span>
          )}
          <span style={styles.expandArrow}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={styles.detail}>
          <hr className="divider" style={{ margin: "12px 0" }} />
          <div style={styles.detailGrid}>
            <div style={styles.detailRow}>
              <span style={styles.detailKey}>Full address</span>
              <span style={styles.detailVal} className="mono">{tx.to}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailKey}>Value (wei)</span>
              <span style={styles.detailVal} className="mono">{tx.value.toString()}</span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailKey}>Calldata</span>
              <span style={{ ...styles.detailVal, wordBreak: "break-all" }} className="mono">
                {tx.data || "0x"}
              </span>
            </div>
            <div style={styles.detailRow}>
              <span style={styles.detailKey}>Your status</span>
              <span style={styles.detailVal}>
                {tx.confirmed
                  ? <span className="tag tag--green">You confirmed</span>
                  : <span className="tag tag--yellow">Not confirmed</span>}
              </span>
            </div>
          </div>

          {/* Actions */}
          {isOwner && !tx.executed && (
            <div style={styles.actions}>
              {!tx.confirmed ? (
                <button
                  className="btn-success"
                  onClick={() => onConfirm(tx.index)}
                  disabled={!!actionLoading}
                >
                  {actionLoading === `confirm-${tx.index}`
                    ? <><span className="spinner" style={{ marginRight: 8 }} />Confirming…</>
                    : "✓ Confirm"}
                </button>
              ) : (
                <button
                  className="btn-danger"
                  onClick={() => onRevoke(tx.index)}
                  disabled={!!actionLoading}
                >
                  {actionLoading === `revoke-${tx.index}`
                    ? <><span className="spinner" style={{ marginRight: 8 }} />Revoking…</>
                    : "✗ Revoke"}
                </button>
              )}
              {canExecute && (
                <button
                  className="btn-primary"
                  onClick={() => onExecute(tx.index)}
                  disabled={!!actionLoading}
                  style={{ background: "linear-gradient(135deg, #7c6af7, #9c7bf7)" }}
                >
                  {actionLoading === `execute-${tx.index}`
                    ? <><span className="spinner" style={{ marginRight: 8 }} />Executing…</>
                    : "▶ Execute"}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800,
    color: "var(--text)", marginBottom: 4,
  },
  sub: { fontSize: 13, color: "var(--text2)", fontFamily: "var(--font-mono)" },
  filters: { display: "flex", gap: 4 },
  filterBtn: {
    background: "none", border: "1px solid var(--border)",
    color: "var(--text2)", padding: "6px 14px", borderRadius: 8,
    fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 600,
    textTransform: "capitalize", cursor: "pointer",
  },
  filterActive: {
    background: "rgba(124,106,247,0.12)",
    borderColor: "var(--accent)", color: "var(--accent)",
  },
  loadingState: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "40px", justifyContent: "center",
    color: "var(--text2)", fontSize: 14,
  },
  empty: {
    textAlign: "center", padding: "60px 24px",
  },
  emptyIcon: {
    fontSize: 40, marginBottom: 16,
    background: "linear-gradient(135deg, #7c6af7, #e05cf7)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  emptyTitle: {
    fontSize: 18, fontWeight: 700, color: "var(--text)",
    marginBottom: 8, fontFamily: "var(--font-display)",
  },
  emptySub: { fontSize: 13, color: "var(--text2)", fontFamily: "var(--font-mono)" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  card: {
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 14, overflow: "hidden",
    transition: "border-color 0.2s",
  },
  cardExecuted: { opacity: 0.65 },
  cardTop: {
    display: "flex", alignItems: "center", gap: 16,
    padding: "16px 20px", cursor: "pointer",
  },
  statusCol: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    flexShrink: 0,
  },
  dotPending: {
    width: 10, height: 10, borderRadius: "50%",
    background: "var(--accent)",
    boxShadow: "0 0 8px rgba(124,106,247,0.6)",
  },
  dotExecuted: {
    width: 10, height: 10, borderRadius: "50%",
    background: "var(--success)",
  },
  txIndex: { fontSize: 11, color: "var(--text2)" },
  infoCol: { flex: 1 },
  toAddr: { fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4 },
  valueRow: { display: "flex", alignItems: "center", gap: 8 },
  ethValue: { fontSize: 12, color: "var(--text2)" },
  confCol: { textAlign: "right", minWidth: 100 },
  confCount: { marginBottom: 6 },
  confNum: {
    fontSize: 20, fontWeight: 800, color: "var(--text)",
    fontFamily: "var(--font-display)",
  },
  confOf: { fontSize: 12, color: "var(--text2)", fontFamily: "var(--font-mono)" },
  progressBar: {
    height: 4, background: "var(--border)", borderRadius: 2,
    overflow: "hidden", marginBottom: 4,
  },
  progressFill: {
    height: "100%", background: "linear-gradient(90deg, var(--accent), var(--accent2))",
    borderRadius: 2, transition: "width 0.4s ease",
  },
  confLabel: { fontSize: 10, color: "var(--text2)" },
  statusTag: {
    display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6,
    flexShrink: 0,
  },
  expandArrow: { fontSize: 10, color: "var(--text2)" },
  detail: { padding: "0 20px 16px" },
  detailGrid: { display: "flex", flexDirection: "column", gap: 8 },
  detailRow: {
    display: "flex", gap: 12, alignItems: "flex-start",
  },
  detailKey: {
    fontSize: 11, color: "var(--text2)", fontFamily: "var(--font-mono)",
    width: 100, flexShrink: 0,
  },
  detailVal: { fontSize: 12, color: "var(--text)", fontFamily: "var(--font-mono)" },
  actions: { display: "flex", gap: 10, marginTop: 16 },
};