import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import WalletConnect from "./components/WalletConnect";
import Dashboard from "./components/Dashboard";
import { MULTISIG_ABI } from "./utils/abi";

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState(null);
  const [walletAddress, setWalletAddress] = useState(
    localStorage.getItem("multisig_address") || ""
  );
  const [contract, setContract] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [walletData, setWalletData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Connect MetaMask ──────────────────────────────────────────────────────
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError("MetaMask not found. Please install it.");
      return;
    }
    try {
      const _provider = new ethers.BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _account = await _signer.getAddress();
      const _network = await _provider.getNetwork();
      setProvider(_provider);
      setSigner(_signer);
      setAccount(_account);
      setNetwork(_network);
      showToast("Wallet connected");
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Load contract ─────────────────────────────────────────────────────────
  const loadContract = useCallback(async (address) => {
    if (!signer || !address) return;
    try {
      setLoading(true);
      setError(null);
      const c = new ethers.Contract(address, MULTISIG_ABI, signer);
      const [owners, required, balance, txCount] = await Promise.all([
        c.getOwners(),
        c.required(),
        provider.getBalance(address),
        c.getTransactionCount(),
      ]);
      const _isOwner = owners.map(o => o.toLowerCase()).includes(account.toLowerCase());
      setContract(c);
      setIsOwner(_isOwner);
      setWalletData({ owners, required: Number(required), balance, txCount: Number(txCount) });
      localStorage.setItem("multisig_address", address);
      showToast("Contract loaded");
    } catch (e) {
      setError("Failed to load contract: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [signer, provider, account]);

  // ── Reload data ───────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!contract || !walletAddress) return;
    try {
      const [owners, required, balance, txCount] = await Promise.all([
        contract.getOwners(),
        contract.required(),
        provider.getBalance(walletAddress),
        contract.getTransactionCount(),
      ]);
      const _isOwner = owners.map(o => o.toLowerCase()).includes(account.toLowerCase());
      setIsOwner(_isOwner);
      setWalletData({ owners, required: Number(required), balance, txCount: Number(txCount) });
    } catch (e) {
      console.error(e);
    }
  }, [contract, walletAddress, provider, account]);

  // ── Account change listener ───────────────────────────────────────────────
  useEffect(() => {
    if (!window.ethereum) return;
    const handleChange = () => window.location.reload();
    window.ethereum.on("accountsChanged", handleChange);
    window.ethereum.on("chainChanged", handleChange);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleChange);
      window.ethereum.removeListener("chainChanged", handleChange);
    };
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", fontFamily: "var(--font-body)" }}>
      <style>{globalStyles}</style>

      {/* Toast */}
      {toast && (
        <div className={`toast toast--${toast.type}`}>
          <span className="toast-icon">{toast.type === "success" ? "✓" : "✗"}</span>
          {toast.msg}
        </div>
      )}

      {!account ? (
        <WalletConnect onConnect={connectWallet} error={error} />
      ) : (
        <Dashboard
          account={account}
          network={network}
          signer={signer}
          provider={provider}
          walletAddress={walletAddress}
          setWalletAddress={setWalletAddress}
          contract={contract}
          loadContract={loadContract}
          isOwner={isOwner}
          walletData={walletData}
          loading={loading}
          error={error}
          refresh={refresh}
          showToast={showToast}
        />
      )}
    </div>
  );
}

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #0a0a0f;
    --bg2: #0f0f18;
    --bg3: #15151f;
    --border: rgba(255,255,255,0.07);
    --border-bright: rgba(255,255,255,0.15);
    --accent: #7c6af7;
    --accent2: #e05cf7;
    --accent3: #5cf7c4;
    --text: #e8e8f0;
    --text2: #8888a8;
    --text3: #5555778;
    --danger: #f75c5c;
    --success: #5cf7a0;
    --warn: #f7c45c;
    --font-display: 'Syne', sans-serif;
    --font-body: 'Syne', sans-serif;
    --font-mono: 'DM Mono', monospace;
    --radius: 12px;
    --radius-lg: 20px;
    --glow: 0 0 40px rgba(124,106,247,0.15);
    --glow-strong: 0 0 60px rgba(124,106,247,0.3);
  }

  body { background: var(--bg); color: var(--text); }
  
  input, textarea, select {
    background: var(--bg3);
    border: 1px solid var(--border);
    color: var(--text);
    font-family: var(--font-mono);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    outline: none;
    transition: border 0.2s;
    width: 100%;
  }
  input:focus, textarea:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(124,106,247,0.1);
  }
  input::placeholder { color: var(--text2); }

  button {
    cursor: pointer;
    font-family: var(--font-body);
    font-weight: 600;
    border: none;
    border-radius: 8px;
    transition: all 0.2s;
  }
  button:disabled { opacity: 0.4; cursor: not-allowed; }

  .btn-primary {
    background: var(--accent);
    color: white;
    padding: 10px 20px;
    font-size: 14px;
    letter-spacing: 0.02em;
  }
  .btn-primary:hover:not(:disabled) {
    background: #9580ff;
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(124,106,247,0.4);
  }

  .btn-ghost {
    background: transparent;
    color: var(--text2);
    border: 1px solid var(--border);
    padding: 8px 16px;
    font-size: 13px;
  }
  .btn-ghost:hover:not(:disabled) {
    border-color: var(--border-bright);
    color: var(--text);
    background: var(--bg3);
  }

  .btn-danger {
    background: rgba(247,92,92,0.15);
    color: var(--danger);
    border: 1px solid rgba(247,92,92,0.3);
    padding: 8px 16px;
    font-size: 13px;
  }
  .btn-danger:hover:not(:disabled) {
    background: rgba(247,92,92,0.25);
  }

  .btn-success {
    background: rgba(92,247,160,0.12);
    color: var(--success);
    border: 1px solid rgba(92,247,160,0.25);
    padding: 8px 16px;
    font-size: 13px;
  }
  .btn-success:hover:not(:disabled) {
    background: rgba(92,247,160,0.22);
  }

  .card {
    background: var(--bg2);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 24px;
  }

  .mono { font-family: var(--font-mono); }
  .tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    font-family: var(--font-mono);
  }
  .tag--green { background: rgba(92,247,160,0.12); color: var(--success); border: 1px solid rgba(92,247,160,0.2); }
  .tag--yellow { background: rgba(247,196,92,0.12); color: var(--warn); border: 1px solid rgba(247,196,92,0.2); }
  .tag--red { background: rgba(247,92,92,0.12); color: var(--danger); border: 1px solid rgba(247,92,92,0.2); }
  .tag--purple { background: rgba(124,106,247,0.12); color: var(--accent); border: 1px solid rgba(124,106,247,0.2); }

  .toast {
    position: fixed;
    top: 24px;
    right: 24px;
    z-index: 9999;
    padding: 12px 20px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    animation: slideIn 0.3s ease;
    backdrop-filter: blur(20px);
  }
  .toast--success { background: rgba(92,247,160,0.15); color: var(--success); border: 1px solid rgba(92,247,160,0.3); }
  .toast--error { background: rgba(247,92,92,0.15); color: var(--danger); border: 1px solid rgba(247,92,92,0.3); }
  .toast-icon { font-size: 16px; }

  @keyframes slideIn {
    from { transform: translateX(40px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border-bright); border-radius: 3px; }

  .spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(255,255,255,0.1);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .divider {
    border: none;
    border-top: 1px solid var(--border);
    margin: 20px 0;
  }
`;