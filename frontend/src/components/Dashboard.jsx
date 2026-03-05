import { useState } from "react";
import Header from "./Header";
import StatsBar from "./StatsBar";
import OwnerList from "./OwnerList";
import TransactionForm from "./TransactionForm";
import TransactionList from "./TransactionList";

const TABS = ["Transactions", "Owners", "Submit"];

export default function Dashboard({
  account, network, signer, provider,
  walletAddress, setWalletAddress,
  contract, loadContract, isOwner,
  walletData, loading, error, refresh, showToast,
}) {
  const [tab, setTab] = useState("Transactions");
  const [addressInput, setAddressInput] = useState(walletAddress);

  const handleLoad = () => {
    if (!addressInput) return;
    setWalletAddress(addressInput);
    loadContract(addressInput);
  };

  return (
    <div style={styles.root}>
      {/* Ambient */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.grid} />

      <div style={styles.inner}>
        <Header account={account} network={network} isOwner={isOwner} />

        {/* Contract loader */}
        <div style={styles.loader} className="card">
          <p style={styles.loaderLabel}>CONTRACT ADDRESS</p>
          <div style={styles.loaderRow}>
            <input
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0x... MultiSigWallet address"
              style={{ flex: 1, fontFamily: "var(--font-mono)" }}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
            />
            <button
              className="btn-primary"
              onClick={handleLoad}
              disabled={loading || !addressInput}
              style={{ whiteSpace: "nowrap", minWidth: 120 }}
            >
              {loading ? <span className="spinner" /> : "Load Wallet"}
            </button>
          </div>
          {error && <p style={styles.error}>{error}</p>}
        </div>

        {walletData && (
          <>
            <StatsBar walletData={walletData} walletAddress={walletAddress} />

            {/* Tabs */}
            <div style={styles.tabBar}>
              {TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    ...styles.tab,
                    ...(tab === t ? styles.tabActive : {}),
                  }}
                >
                  {t}
                  {t === "Transactions" && walletData.txCount > 0 && (
                    <span style={styles.tabBadge}>{walletData.txCount}</span>
                  )}
                </button>
              ))}
              <button
                className="btn-ghost"
                onClick={refresh}
                style={{ marginLeft: "auto", padding: "6px 14px", fontSize: 12 }}
              >
                ↻ Refresh
              </button>
            </div>

            {/* Tab content */}
            <div style={styles.content}>
              {tab === "Transactions" && (
                <TransactionList
                  contract={contract}
                  txCount={walletData.txCount}
                  required={walletData.required}
                  account={account}
                  isOwner={isOwner}
                  refresh={refresh}
                  showToast={showToast}
                />
              )}
              {tab === "Owners" && (
                <OwnerList
                  owners={walletData.owners}
                  required={walletData.required}
                  account={account}
                />
              )}
              {tab === "Submit" && (
                <TransactionForm
                  contract={contract}
                  isOwner={isOwner}
                  walletAddress={walletAddress}
                  refresh={refresh}
                  showToast={showToast}
                  setTab={setTab}
                />
              )}
            </div>
          </>
        )}

        {!walletData && !loading && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}>◈</div>
            <p style={styles.emptyTitle}>No wallet loaded</p>
            <p style={styles.emptySub}>Enter a deployed MultiSigWallet address above to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: "100vh", position: "relative", overflow: "hidden",
    padding: "0 0 60px",
  },
  orb1: {
    position: "fixed", top: -100, left: -100,
    width: 600, height: 600, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(124,106,247,0.08) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  orb2: {
    position: "fixed", bottom: -100, right: -100,
    width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(92,247,196,0.06) 0%, transparent 70%)",
    pointerEvents: "none", zIndex: 0,
  },
  grid: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)`,
    backgroundSize: "60px 60px",
  },
  inner: {
    position: "relative", zIndex: 1,
    maxWidth: 900, margin: "0 auto", padding: "0 24px",
  },
  loader: {
    marginBottom: 24,
  },
  loaderLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
    color: "var(--text2)", marginBottom: 10,
    fontFamily: "var(--font-mono)",
  },
  loaderRow: {
    display: "flex", gap: 12, alignItems: "center",
  },
  error: {
    fontSize: 12, color: "var(--danger)", marginTop: 10,
    fontFamily: "var(--font-mono)",
  },
  tabBar: {
    display: "flex", alignItems: "center", gap: 4,
    marginBottom: 20,
    borderBottom: "1px solid var(--border)",
    paddingBottom: 0,
  },
  tab: {
    background: "none", color: "var(--text2)",
    fontSize: 14, fontWeight: 600, padding: "12px 20px",
    borderRadius: "8px 8px 0 0", border: "none",
    position: "relative", display: "flex", alignItems: "center", gap: 8,
    transition: "color 0.2s",
  },
  tabActive: {
    color: "var(--text)",
    boxShadow: "inset 0 -2px 0 var(--accent)",
  },
  tabBadge: {
    background: "var(--accent)", color: "white",
    fontSize: 10, fontWeight: 700, padding: "1px 6px",
    borderRadius: 999, fontFamily: "var(--font-mono)",
  },
  content: { minHeight: 400 },
  empty: {
    textAlign: "center", padding: "80px 24px",
  },
  emptyIcon: {
    fontSize: 48, marginBottom: 20,
    background: "linear-gradient(135deg, #7c6af7, #e05cf7)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  emptyTitle: {
    fontSize: 20, fontWeight: 700, marginBottom: 10, color: "var(--text)",
    fontFamily: "var(--font-display)",
  },
  emptySub: {
    fontSize: 14, color: "var(--text2)", lineHeight: 1.6,
  },
};