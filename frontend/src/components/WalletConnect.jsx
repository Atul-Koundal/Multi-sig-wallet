export default function WalletConnect({ onConnect, error }) {
  return (
    <div style={styles.root}>
      {/* Ambient glow orbs */}
      <div style={styles.orb1} />
      <div style={styles.orb2} />
      <div style={styles.orb3} />

      <div style={styles.grid} />

      <div style={styles.container}>
        {/* Logo mark */}
        <div style={styles.logoWrap}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <polygon points="24,4 44,36 4,36" fill="none" stroke="url(#g1)" strokeWidth="2"/>
            <polygon points="24,12 36,32 12,32" fill="url(#g2)" opacity="0.3"/>
            <circle cx="24" cy="24" r="4" fill="url(#g1)"/>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c6af7"/>
                <stop offset="100%" stopColor="#e05cf7"/>
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#7c6af7"/>
                <stop offset="100%" stopColor="#5cf7c4"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <p style={styles.eyebrow}>ETHEREUM · MULTI-SIGNATURE</p>
        <h1 style={styles.heading}>
          Trustless<br />
          <span style={styles.headingAccent}>Co-custody</span>
        </h1>
        <p style={styles.sub}>
          Require M-of-N signatures to authorize any on-chain action.
          No single point of failure. No single point of control.
        </p>

        <div style={styles.featureRow}>
          {["2-of-3 threshold", "On-chain proposals", "Auto-execution"].map((f) => (
            <div key={f} style={styles.feature}>
              <span style={styles.featureDot} />
              {f}
            </div>
          ))}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button className="btn-primary" style={styles.connectBtn} onClick={onConnect}>
          <MetaMaskIcon />
          Connect MetaMask
        </button>

        <p style={styles.hint}>Supports Ethereum, Sepolia, and any EVM network</p>
      </div>
    </div>
  );
}

function MetaMaskIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 35 33" fill="none" style={{ marginRight: 8 }}>
      <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99125L32.9582 1Z" fill="#E17726"/>
      <path d="M2.04834 1L15.0595 10.8058L12.7423 4.99125L2.04834 1Z" fill="#E27625"/>
    </svg>
  );
}

const styles = {
  root: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    background: "var(--bg)",
  },
  orb1: {
    position: "absolute", top: "10%", left: "15%",
    width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(124,106,247,0.12) 0%, transparent 70%)",
    filter: "blur(40px)", pointerEvents: "none",
  },
  orb2: {
    position: "absolute", bottom: "10%", right: "10%",
    width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(224,92,247,0.1) 0%, transparent 70%)",
    filter: "blur(40px)", pointerEvents: "none",
  },
  orb3: {
    position: "absolute", top: "50%", right: "30%",
    width: 300, height: 300, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(92,247,196,0.07) 0%, transparent 70%)",
    filter: "blur(40px)", pointerEvents: "none",
  },
  grid: {
    position: "absolute", inset: 0, pointerEvents: "none",
    backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
    backgroundSize: "60px 60px",
  },
  container: {
    position: "relative", zIndex: 1,
    maxWidth: 520, width: "100%",
    padding: "60px 48px",
    textAlign: "center",
    background: "rgba(15,15,24,0.8)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 24,
    backdropFilter: "blur(20px)",
    boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(124,106,247,0.1)",
  },
  logoWrap: {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 80, height: 80, borderRadius: "50%",
    background: "rgba(124,106,247,0.1)",
    border: "1px solid rgba(124,106,247,0.2)",
    marginBottom: 28,
  },
  eyebrow: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
    color: "var(--accent)", marginBottom: 16,
    fontFamily: "var(--font-mono)",
  },
  heading: {
    fontFamily: "var(--font-display)",
    fontSize: 52, fontWeight: 800, lineHeight: 1.05,
    color: "var(--text)", marginBottom: 20,
  },
  headingAccent: {
    background: "linear-gradient(135deg, #7c6af7, #e05cf7)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  sub: {
    fontSize: 16, color: "var(--text2)", lineHeight: 1.7,
    marginBottom: 32,
  },
  featureRow: {
    display: "flex", justifyContent: "center", gap: 16,
    marginBottom: 36, flexWrap: "wrap",
  },
  feature: {
    display: "flex", alignItems: "center", gap: 8,
    fontSize: 13, color: "var(--text2)", fontFamily: "var(--font-mono)",
  },
  featureDot: {
    width: 6, height: 6, borderRadius: "50%",
    background: "var(--accent3)",
  },
  connectBtn: {
    width: "100%", padding: "16px 24px",
    fontSize: 16, borderRadius: 12,
    display: "flex", alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    background: "linear-gradient(135deg, #7c6af7, #9c7bf7)",
    boxShadow: "0 8px 32px rgba(124,106,247,0.35)",
  },
  hint: {
    fontSize: 12, color: "var(--text2)", fontFamily: "var(--font-mono)",
  },
  error: {
    background: "rgba(247,92,92,0.1)", border: "1px solid rgba(247,92,92,0.2)",
    borderRadius: 8, padding: "10px 14px",
    fontSize: 13, color: "var(--danger)", marginBottom: 20,
    fontFamily: "var(--font-mono)",
  },
};