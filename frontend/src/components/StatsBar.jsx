import { ethers } from "ethers";
import { shortAddr } from "../utils/format";

export default function StatsBar({ walletData, walletAddress }) {
  const { owners, required, balance, txCount } = walletData;
  const balanceEth = parseFloat(ethers.formatEther(balance)).toFixed(4);

  const stats = [
    {
      label: "Balance",
      value: `${balanceEth} ETH`,
      sub: "Wallet holdings",
      color: "var(--accent3)",
      icon: "◈",
    },
    {
      label: "Threshold",
      value: `${required} / ${owners.length}`,
      sub: "Required signatures",
      color: "var(--accent)",
      icon: "⬡",
    },
    {
      label: "Transactions",
      value: txCount,
      sub: "Total proposals",
      color: "var(--accent2)",
      icon: "⬢",
    },
    {
      label: "Contract",
      value: shortAddr(walletAddress),
      sub: "Wallet address",
      color: "var(--warn)",
      icon: "◉",
      mono: true,
    },
  ];

  return (
    <div style={styles.grid}>
      {stats.map((s) => (
        <div key={s.label} style={styles.card} className="card">
          <div style={styles.top}>
            <span style={{ ...styles.icon, color: s.color }}>{s.icon}</span>
            <span style={styles.label}>{s.label}</span>
          </div>
          <div style={{ ...styles.value, ...(s.mono ? styles.mono : {}) }}>{s.value}</div>
          <div style={styles.sub}>{s.sub}</div>
          <div style={{ ...styles.bar, background: s.color + "22" }}>
            <div style={{ ...styles.barFill, background: s.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
    marginBottom: 28,
  },
  card: {
    padding: "20px",
    position: "relative",
    overflow: "hidden",
  },
  top: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
  },
  icon: { fontSize: 16 },
  label: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
    color: "var(--text2)", textTransform: "uppercase",
    fontFamily: "var(--font-mono)",
  },
  value: {
    fontSize: 26, fontWeight: 800, color: "var(--text)",
    fontFamily: "var(--font-display)", marginBottom: 4,
    letterSpacing: "-0.02em",
  },
  mono: {
    fontFamily: "var(--font-mono)", fontSize: 18,
  },
  sub: {
    fontSize: 11, color: "var(--text2)", fontFamily: "var(--font-mono)",
    marginBottom: 16,
  },
  bar: {
    height: 3, borderRadius: 2, overflow: "hidden",
  },
  barFill: {
    height: "100%", width: "60%", borderRadius: 2,
    opacity: 0.8,
  },
};