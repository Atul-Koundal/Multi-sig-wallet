import { useState } from "react";
import { ethers } from "ethers";

const PRESETS = [
  { label: "ETH Transfer", to: "", value: "0.1", data: "0x", desc: "Send ETH to an address" },
  { label: "Add Owner", to: "{wallet}", value: "0", data: "", desc: "Propose adding a new owner" },
  { label: "Remove Owner", to: "{wallet}", value: "0", data: "", desc: "Propose removing an owner" },
  { label: "Change Threshold", to: "{wallet}", value: "0", data: "", desc: "Update required signatures" },
];

export default function TransactionForm({ contract, isOwner, walletAddress, refresh, showToast, setTab }) {
  const [to, setTo] = useState("");
  const [value, setValue] = useState("0");
  const [data, setData] = useState("0x");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [preset, setPreset] = useState(null);

  const handlePreset = (p) => {
    setPreset(p.label);
    setValue(p.value);
    setData(p.data || "0x");
    if (p.to === "{wallet}") setTo(walletAddress);
    else setTo(p.to);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!isOwner) { setError("You are not an owner of this wallet."); return; }
    if (!to || !ethers.isAddress(to)) { setError("Invalid destination address."); return; }

    try {
      setLoading(true);
      setError(null);
      const valueWei = ethers.parseEther(value || "0");
      const tx = await contract.submitTransaction(to, valueWei, data || "0x");
      await tx.wait();
      showToast("Transaction submitted!");
      setTo(""); setValue("0"); setData("0x"); setPreset(null);
      await refresh();
      setTab("Transactions");
    } catch (e) {
      setError(e.reason || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <h2 style={styles.title}>Submit Proposal</h2>
        <p style={styles.sub}>Create a new transaction for owners to review and sign</p>
      </div>

      {!isOwner && (
        <div style={styles.notOwner}>
          <span style={{ fontSize: 18 }}>⚠</span>
          You are not an owner of this wallet. You can view proposals but cannot submit or confirm.
        </div>
      )}

      {/* Presets */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>QUICK PRESETS</p>
        <div style={styles.presetGrid}>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => handlePreset(p)}
              style={{
                ...styles.presetBtn,
                ...(preset === p.label ? styles.presetActive : {}),
              }}
            >
              <span style={styles.presetName}>{p.label}</span>
              <span style={styles.presetDesc}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <hr className="divider" />

      {/* Form */}
      <div style={styles.form}>
        <div style={styles.field}>
          <label style={styles.label}>DESTINATION ADDRESS *</label>
          <input
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
          />
          {to && !ethers.isAddress(to) && (
            <p style={styles.fieldError}>Invalid Ethereum address</p>
          )}
        </div>

        <div style={styles.fieldRow}>
          <div style={styles.field}>
            <label style={styles.label}>ETH VALUE</label>
            <input
              type="number"
              min="0"
              step="0.001"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.0"
            />
            <p style={styles.fieldHint}>Amount in ETH (0 for contract calls)</p>
          </div>
          <div style={styles.field}>
            <label style={styles.label}>CALLDATA</label>
            <input
              value={data}
              onChange={(e) => setData(e.target.value)}
              placeholder="0x"
            />
            <p style={styles.fieldHint}>ABI-encoded function call (0x for plain ETH)</p>
          </div>
        </div>

        {/* Preview */}
        {to && ethers.isAddress(to) && (
          <div style={styles.preview}>
            <p style={styles.previewLabel}>TRANSACTION PREVIEW</p>
            <div style={styles.previewRow}>
              <span style={styles.previewKey}>To</span>
              <span style={styles.previewVal}>{to}</span>
            </div>
            <div style={styles.previewRow}>
              <span style={styles.previewKey}>Value</span>
              <span style={styles.previewVal}>{value || "0"} ETH</span>
            </div>
            <div style={styles.previewRow}>
              <span style={styles.previewKey}>Data</span>
              <span style={styles.previewVal}>{data || "0x"}</span>
            </div>
          </div>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading || !isOwner || !to || !ethers.isAddress(to)}
          style={styles.submitBtn}
        >
          {loading ? (
            <><span className="spinner" style={{ marginRight: 10 }} /> Submitting…</>
          ) : (
            "Submit Proposal"
          )}
        </button>
      </div>
    </div>
  );
}

const styles = {
  root: {},
  header: { marginBottom: 24 },
  title: {
    fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800,
    color: "var(--text)", marginBottom: 4,
  },
  sub: { fontSize: 13, color: "var(--text2)", fontFamily: "var(--font-mono)" },
  notOwner: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 18px", borderRadius: 10, marginBottom: 24,
    background: "rgba(247,196,92,0.08)", border: "1px solid rgba(247,196,92,0.2)",
    fontSize: 13, color: "var(--warn)", fontFamily: "var(--font-mono)",
  },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
    color: "var(--text2)", marginBottom: 12, fontFamily: "var(--font-mono)",
  },
  presetGrid: {
    display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10,
  },
  presetBtn: {
    background: "var(--bg2)", border: "1px solid var(--border)",
    borderRadius: 10, padding: "14px 16px", textAlign: "left",
    cursor: "pointer", transition: "all 0.2s",
    display: "flex", flexDirection: "column", gap: 4,
  },
  presetActive: {
    borderColor: "var(--accent)",
    background: "rgba(124,106,247,0.08)",
    boxShadow: "0 0 0 3px rgba(124,106,247,0.1)",
  },
  presetName: {
    fontFamily: "var(--font-body)", fontWeight: 700, fontSize: 13,
    color: "var(--text)", display: "block",
  },
  presetDesc: {
    fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text2)",
    display: "block", lineHeight: 1.4,
  },
  form: { display: "flex", flexDirection: "column", gap: 20 },
  field: { display: "flex", flexDirection: "column", gap: 8 },
  fieldRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  label: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
    color: "var(--text2)", fontFamily: "var(--font-mono)",
  },
  fieldHint: { fontSize: 11, color: "var(--text2)", fontFamily: "var(--font-mono)" },
  fieldError: { fontSize: 11, color: "var(--danger)", fontFamily: "var(--font-mono)" },
  preview: {
    padding: "16px 20px", borderRadius: 10,
    background: "var(--bg3)", border: "1px solid var(--border)",
  },
  previewLabel: {
    fontSize: 10, fontWeight: 700, letterSpacing: "0.15em",
    color: "var(--text2)", marginBottom: 12, fontFamily: "var(--font-mono)",
  },
  previewRow: {
    display: "flex", gap: 12, alignItems: "flex-start",
    padding: "6px 0", borderBottom: "1px solid var(--border)",
  },
  previewKey: {
    fontSize: 12, color: "var(--text2)", fontFamily: "var(--font-mono)",
    width: 50, flexShrink: 0,
  },
  previewVal: {
    fontSize: 12, color: "var(--text)", fontFamily: "var(--font-mono)",
    wordBreak: "break-all",
  },
  error: {
    padding: "12px 16px", borderRadius: 8,
    background: "rgba(247,92,92,0.08)", border: "1px solid rgba(247,92,92,0.2)",
    fontSize: 13, color: "var(--danger)", fontFamily: "var(--font-mono)",
  },
  submitBtn: {
    padding: "14px 24px", fontSize: 15, borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "linear-gradient(135deg, #7c6af7, #9c7bf7)",
    boxShadow: "0 4px 20px rgba(124,106,247,0.3)",
  },
};