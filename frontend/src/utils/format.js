export function shortAddr(addr, chars = 6) {
  if (!addr) return "";
  return `${addr.slice(0, chars)}…${addr.slice(-4)}`;
}

export function formatEth(wei, decimals = 4) {
  if (wei === undefined || wei === null) return "0";
  const eth = Number(wei) / 1e18;
  return eth.toFixed(decimals);
}