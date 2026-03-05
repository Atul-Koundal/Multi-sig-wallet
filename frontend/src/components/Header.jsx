import { shortAddr } from "../utils/format";

export default function Header({ account, network, isOwner }) {
  return (
    <header style={styles.root}>
      <div style={styles.brand}>
        <svg width="28" height="28" viewBox="0 0 48 48" fill="none">
          <polygon points="24,4 44,36 4,36" fill="none" stroke="url(#hg1)" strokeWidth="2"/>
          <polygon points="24,12 36,32 12,32" fill="url(#hg2)" opacity="0.4"/>
          <circle cx="24" cy="24" r="3" fill="url(#hg1)"/>
          <defs>
            <linearGradient id="hg1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7c6af7"/>
              <stop offset="100%" stopColor="#e05cf7"/>
            </linearGradient>
            <linearGradient id="hg2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#7c6af7"/>
              <stop offset="100%" stopColor="#5cf7c4"/>
            </linearGradient>
          </defs>
        </svg>
        <span style={styles.brandName}>MultiSig</span>
      </div>

      <div style={styles.right}>
        {network && (
          <div style={styles.networkBadge}>
            <span style={styles.networkDot} />
            <span style={styles.networkName}>
              {network.name === "unknown" ? `Chain ${network.chainId}` : network.name}
            </span>
          </div>
        )}
        <div style={styles.accountBadge}>
          <div style={styles.avatar}>
            {account?.slice(2, 4).toUpperCase()}
          </div>
          <span style={styles.accountAddr}>{shortAddr(account)}</span>
          {isOwner && <span className="tag tag--purple">Owner</span>}
        </div>
      </div>
    </header>
  );
}

const styles = {
  root: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "20px 0 24px",
    borderBottom: "1px solid var(--border)",
    marginBottom: 28,
  },
  brand: {
    display: "flex", alignItems: "center", gap: 10,
  },
  brandName: {
    fontFamily: "var(--font-display)", fontWeight: 800,
    fontSize: 20, color: "var(--text)",
    letterSpacing: "-0.02em",
  },
  right: {
    display: "flex", alignItems: "center", gap: 12,
  },
  networkBadge: {
    display: "flex", alignItems: "center", gap: 7,
    padding: "6px 12px", borderRadius: 999,
    background: "var(--bg3)", border: "1px solid var(--border)",
    fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text2)",
  },
  networkDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "var(--success)",
    boxShadow: "0 0 6px rgba(92,247,160,0.6)",
  },
  networkName: { textTransform: "capitalize" },
  accountBadge: {
    display: "flex", alignItems: "center", gap: 8,
    padding: "6px 12px", borderRadius: 999,
    background: "var(--bg3)", border: "1px solid var(--border)",
  },
  avatar: {
    width: 24, height: 24, borderRadius: "50%",
    background: "linear-gradient(135deg, #7c6af7, #e05cf7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 9, fontWeight: 800, color: "white",
    fontFamily: "var(--font-mono)",
  },
  accountAddr: {
    fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text)",
  },
};