import { shortAddr } from "../utils/format";

export default function OwnerList({ owners, required, account }) {
  return (
    <div>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Owners</h2>
          <p style={styles.sub}>
            {required}-of-{owners.length} signatures required to execute any transaction
          </p>
        </div>
        <div style={styles.threshold}>
          <span style={styles.threshNum}>{required}</span>
          <span style={styles.threshOf}>of {owners.length}</span>
        </div>
      </div>

      {/* Threshold visual */}
      <div style={styles.threshBar}>
        {owners.map((_, i) => (
          <div
            key={i}
            style={{
              ...styles.threshSegment,
              background: i < required ? "var(--accent)" : "var(--border)",
            }}
          />
        ))}
      </div>

      <div style={styles.list}>
        {owners.map((owner, i) => {
          const isMe = owner.toLowerCase() === account?.toLowerCase();
          return (
            <div key={owner} style={styles.row}>
              <div style={styles.indexBadge}>{i + 1}</div>
              <div style={styles.ownerAvatar}>
                {owner.slice(2, 4).toUpperCase()}
              </div>
              <div style={styles.ownerInfo}>
                <div style={styles.ownerAddr}>{owner}</div>
                <div style={styles.ownerShort}>{shortAddr(owner)}</div>
              </div>
              <div style={styles.badges}>
                {isMe && <span className="tag tag--purple">You</span>}
                {i < required && <span className="tag tag--green">Signer {i + 1}</span>}
              </div>
              <button
                className="btn-ghost"
                style={{ fontSize: 11, padding: "4px 10px" }}
                onClick={() => navigator.clipboard.writeText(owner)}
              >
                Copy
              </button>
            </div>
          );
        })}
      </div>

      <div style={styles.notice} className="card">
        <span style={styles.noticeIcon}>ℹ</span>
        <span style={styles.noticeText}>
          To add/remove owners or change the threshold, submit a wallet proposal in the Submit tab.
          Owner management requires consensus just like any other transaction.
        </span>
      </div>
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
  threshold: {
    textAlign: "right",
    padding: "12px 20px",
    background: "rgba(124,106,247,0.1)",
    border: "1px solid rgba(124,106,247,0.2)",
    borderRadius: 12,
  },
  threshNum: {
    fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800,
    color: "var(--accent)", display: "block", lineHeight: 1,
  },
  threshOf: {
    fontSize: 12, color: "var(--text2)", fontFamily: "var(--font-mono)",
  },
  threshBar: {
    display: "flex", gap: 6, marginBottom: 24,
  },
  threshSegment: {
    height: 6, flex: 1, borderRadius: 3,
    transition: "background 0.3s",
  },
  list: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 },
  row: {
    display: "flex", alignItems: "center", gap: 14,
    padding: "14px 18px",
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 12,
    transition: "border-color 0.2s",
  },
  indexBadge: {
    width: 24, height: 24, borderRadius: "50%",
    background: "var(--bg3)", border: "1px solid var(--border)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, color: "var(--text2)",
    fontFamily: "var(--font-mono)", flexShrink: 0,
  },
  ownerAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg, #7c6af7, #e05cf7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 800, color: "white",
    fontFamily: "var(--font-mono)", flexShrink: 0,
  },
  ownerInfo: { flex: 1, minWidth: 0 },
  ownerAddr: {
    fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text)",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  ownerShort: {
    fontSize: 11, color: "var(--text2)", fontFamily: "var(--font-mono)",
  },
  badges: { display: "flex", gap: 6 },
  notice: {
    display: "flex", gap: 12, alignItems: "flex-start",
    background: "rgba(124,106,247,0.06)",
    border: "1px solid rgba(124,106,247,0.15)",
    padding: "14px 18px",
  },
  noticeIcon: { color: "var(--accent)", fontSize: 16, flexShrink: 0 },
  noticeText: { fontSize: 12, color: "var(--text2)", lineHeight: 1.6, fontFamily: "var(--font-mono)" },
};