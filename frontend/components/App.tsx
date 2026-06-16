"use client";
/* Arc Treasury — idle→yield. Layout: TOP-NAV NGANG + BENTO bất đối xứng (KHÔNG sidebar — khác nhóm khác).
   GIỮ tab Vault/Deployments/Allocate/Wire + nút mạng luôn hiện. Self-contained.
   ABI preserved: createRun(name)/addRecipient(id,to,amount)/fundAndPay(id)payable/get/count/total. */
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from "wagmi";
import { parseEther, formatEther, isAddress } from "viem";
const C = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0") as `0x${string}`;
const CHAIN = 5042002, HEX = "0x4CEF52";
const ABI = [
  { name: "createRun", type: "function", stateMutability: "nonpayable", inputs: [{ name: "name", type: "string" }], outputs: [{ type: "uint256" }] },
  { name: "addRecipient", type: "function", stateMutability: "nonpayable", inputs: [{ name: "id", type: "uint256" }, { name: "to", type: "address" }, { name: "amount", type: "uint256" }], outputs: [] },
  { name: "fundAndPay", type: "function", stateMutability: "payable", inputs: [{ name: "id", type: "uint256" }], outputs: [] },
  { name: "get", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "tuple", components: [{ name: "owner", type: "address" }, { name: "name", type: "string" }, { name: "totalAmt", type: "uint256" }, { name: "paid", type: "bool" }, { name: "at", type: "uint256" }] }] },
  { name: "count", type: "function", stateMutability: "view", inputs: [{ name: "id", type: "uint256" }], outputs: [{ type: "uint256" }] },
  { name: "total", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;
const cut = (a?: string) => a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
const usd = (w?: bigint) => w === undefined ? "0.00" : Number(formatEther(w)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
async function toArc() { const e = (window as any).ethereum; if (!e) return; try { await e.request({ method: "wallet_addEthereumChain", params: [{ chainId: HEX, chainName: "Arc Testnet", nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, rpcUrls: ["https://rpc.testnet.arc.network"], blockExplorerUrls: ["https://testnet.arcscan.app"] }] }); } catch { try { await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: HEX }] }); } catch {} } }
const CSS = `
.tr{--bg:#0c0817;--card:#180f2e;--card2:#1f1640;--bd:#281a4a;--bd2:#36275f;--mut:#9a86c8;--txt:#efeafb;--acc:#a855f7;--acc2:#c084fc;--pink:#ec4899;--up:#22c55e;min-height:100vh;background:#08060f;color:var(--txt);font-family:'Sora','Segoe UI',system-ui,sans-serif}
.tr *{box-sizing:border-box}.tr a{color:var(--acc2);text-decoration:none}.tr .mono{font-family:ui-monospace,monospace}
.tr header{display:flex;align-items:center;gap:14px;padding:13px 22px;border-bottom:1px solid var(--bd);background:var(--bg)}
.tr .logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:16px}
.tr .mark{width:31px;height:31px;border-radius:9px;background:linear-gradient(135deg,#a855f7,#ec4899);display:grid;place-items:center;font-size:15px}
.tr .tabs{display:flex;gap:4px;background:var(--card);border:1px solid var(--bd);border-radius:11px;padding:4px;margin-left:6px}
.tr .tab{border:0;background:none;color:var(--mut);font:inherit;font-weight:600;font-size:13px;padding:7px 15px;border-radius:8px;cursor:pointer}.tr .tab.on{background:linear-gradient(135deg,#a855f7,#ec4899);color:#fff;font-weight:700}
.tr .btn{border:0;border-radius:9px;font:inherit;font-weight:700;cursor:pointer;padding:9px 15px;transition:.15s}.tr .btn:disabled{opacity:.5;cursor:not-allowed}
.tr .pri{background:var(--acc);color:#fff}.tr .pri:hover:not(:disabled){background:#9333ea}.tr .gho{background:var(--card2);color:var(--txt);border:1px solid var(--bd2)}.tr .red{background:#dc2626;color:#fff}
.tr .wrap{max-width:1020px;margin:0 auto;padding:20px 22px 50px}
.tr .bento{display:grid;grid-template-columns:1.6fr 1fr 1fr;grid-auto-rows:auto;gap:12px}
.tr .cardb{background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:18px}
.tr .big{grid-row:span 2;background:linear-gradient(150deg,#3b1d6e,#180f2e)}
.tr .l{font-size:12px;color:var(--mut)}.tr .v{font-size:30px;font-weight:800;margin-top:4px}
.tr .run{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:15px;margin-bottom:10px}
.tr label{display:block;font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.04em;margin:8px 0 5px}
.tr input{width:100%;background:#0c0817;border:1px solid var(--bd2);border-radius:9px;padding:10px 12px;font:inherit;font-size:14px;color:var(--txt);outline:none}.tr input:focus{border-color:var(--acc)}
.tr .card{background:var(--card);border:1px solid var(--bd);border-radius:16px;padding:18px;max-width:460px}
.tr .menu{position:absolute;right:0;top:116%;background:var(--card2);border:1px solid var(--bd2);border-radius:10px;padding:6px;min-width:180px;z-index:30;box-shadow:0 14px 34px rgba(0,0,0,.5)}
.tr .menu button{display:block;width:100%;text-align:left;background:none;border:0;color:var(--txt);font:inherit;font-weight:600;font-size:13px;padding:8px 11px;border-radius:7px;cursor:pointer}.tr .menu button:hover{background:rgba(255,255,255,.05)}
@media(max-width:820px){.tr .bento{grid-template-columns:1fr}.tr .big{grid-row:auto}.tr .tabs{flex-wrap:wrap}}
`;
function Run({ id, me, busy, write }: { id: bigint; me?: string; busy: boolean; write: (fn: string, args: any[], v?: bigint) => void }) {
  const { data: r } = useReadContract({ address: C, abi: ABI, functionName: "get", args: [id] });
  const { data: cnt } = useReadContract({ address: C, abi: ABI, functionName: "count", args: [id] });
  const [d, setD] = useState({ to: "", amount: "" });
  if (!r) return null; const x = r as any; const mine = me?.toLowerCase() === x.owner.toLowerCase();
  return (
    <div className="run">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(168,85,247,.16)", display: "grid", placeItems: "center", fontSize: 17 }}>🏦</div>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700 }}>{x.name || `Deployment #${id}`}</div><div className="mono" style={{ fontSize: 11, color: "var(--mut)" }}>${usd(x.totalAmt)} · {cnt?.toString() ?? "0"} vaults · {cut(x.owner)}</div></div>
        {x.paid && <span style={{ fontSize: 11, color: "var(--up)" }}>Deployed ✓</span>}
      </div>
      {mine && !x.paid && <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 8 }}><input value={d.to} onChange={e => setD(s => ({ ...s, to: e.target.value }))} placeholder="vault 0x…" style={{ flex: 1, fontFamily: "ui-monospace", fontSize: 12.5 }} /><input value={d.amount} onChange={e => setD(s => ({ ...s, amount: e.target.value }))} type="number" placeholder="amt" style={{ width: 90 }} /><button className="btn gho" disabled={busy || !isAddress(d.to) || !(Number(d.amount) > 0)} onClick={() => write("addRecipient", [id, d.to as `0x${string}`, parseEther(d.amount || "0")])}>Add</button></div>
        <button className="btn pri" disabled={busy || x.totalAmt === 0n} onClick={() => write("fundAndPay", [id], x.totalAmt)}>{busy ? "…" : `Deploy $${usd(x.totalAmt)}`}</button>
      </div>}
    </div>
  );
}
export default function App() {
  const { address, isConnected } = useAccount(); const net = useChainId();
  const { connectors, connect } = useConnect(); const { disconnect } = useDisconnect();
  const [pop, setPop] = useState(false); const [tab, setTab] = useState<"vault" | "deploy" | "new" | "send">("vault");
  const [nm, setNm] = useState(""); const [snd, setSnd] = useState({ to: "", amount: "" });
  const tx = useWriteContract(); const rcpt = useWaitForTransactionReceipt({ hash: tx.data, query: { enabled: !!tx.data } });
  const send = useSendTransaction(); const srcpt = useWaitForTransactionReceipt({ hash: send.data, query: { enabled: !!send.data } });
  const busy = tx.isPending || rcpt.isLoading; const sbusy = send.isPending || srcpt.isLoading;
  const total = useReadContract({ address: C, abi: ABI, functionName: "total" });
  useEffect(() => { if (rcpt.isSuccess) { tx.reset(); setNm(""); total.refetch(); } }, [rcpt.isSuccess]); // eslint-disable-line
  useEffect(() => { if (srcpt.isSuccess) { send.reset(); setSnd({ to: "", amount: "" }); } }, [srcpt.isSuccess]); // eslint-disable-line
  const wrong = isConnected && net !== CHAIN; const n = total.data !== undefined ? Number(total.data) : 0;
  const write = (fn: string, args: any[], v?: bigint) => tx.writeContract({ address: C, abi: ABI, functionName: fn as any, args, value: v });
  return (
    <div className="tr">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <header>
        <div className="logo"><span className="mark">🏦</span>Arc Treasury</div>
        <div className="tabs">{([["vault", "Vault"], ["deploy", "Deployments"], ["new", "Allocate"], ["send", "Wire"]] as const).map(([t, l]) => <button key={t} className={"tab" + (tab === t ? " on" : "")} onClick={() => setTab(t)}>{l}</button>)}</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button className={"btn " + (wrong ? "red" : "gho")} onClick={toArc}>{wrong ? "Switch to Arc" : "⚡ Arc network"}</button>
          <div style={{ position: "relative" }}><button className="btn pri" onClick={() => setPop(p => !p)}>{isConnected ? cut(address) : "Connect"}</button>
            {pop && <div className="menu">{isConnected ? <button onClick={() => { disconnect(); setPop(false); }} style={{ color: "#f87171" }}>Disconnect</button> : connectors.map(c => <button key={c.uid} onClick={() => { connect({ connector: c }); setPop(false); }}>{c.name}</button>)}</div>}</div>
        </div>
      </header>
      <div className="wrap">
        {tab === "vault" && <div className="bento">
          <div className="cardb big"><div className="l">Deployments to yield</div><div className="v">{n}<span style={{ fontSize: 14, color: "var(--mut)", fontWeight: 600 }}> batches</span></div>
            <svg viewBox="0 0 340 120" style={{ width: "100%", height: 130, marginTop: 12 }} preserveAspectRatio="none"><path d="M0 100 L50 84 L100 90 L150 60 L200 70 L260 40 L320 48 L340 36 L340 120 L0 120 Z" fill="rgba(192,132,252,.22)" /><path d="M0 100 L50 84 L100 90 L150 60 L200 70 L260 40 L320 48 L340 36" fill="none" stroke="#c084fc" strokeWidth="2.5" /></svg>
          </div>
          <div className="cardb"><div className="l">Target APY</div><div className="v" style={{ color: "var(--acc2)" }}>7.2%</div></div>
          <div className="cardb"><div className="l">Yield (30d)</div><div className="v" style={{ color: "var(--up)" }}>$4,980</div></div>
          <div className="cardb" style={{ gridColumn: "span 2" }}><div className="l" style={{ marginBottom: 8 }}>Allocation</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ width: 88, height: 88, borderRadius: "50%", background: "conic-gradient(#a855f7 0% 65%,#ec4899 65% 88%,#3a2a66 88% 100%)" }} />
              <div style={{ fontSize: 13, color: "var(--mut)", lineHeight: 2 }}><div><span style={{ color: "#a855f7" }}>●</span> Deployed to vault 65%</div><div><span style={{ color: "#ec4899" }}>●</span> Liquid 23%</div><div><span style={{ color: "#6b5a9a" }}>●</span> Idle 12%</div></div>
            </div>
          </div>
        </div>}
        {tab === "deploy" && <div>{n > 0 ? Array.from({ length: n }, (_, i) => BigInt(n - 1 - i)).map(id => <Run key={id.toString()} id={id} me={address} busy={busy} write={write} />) : <div style={{ color: "var(--mut)", textAlign: "center", padding: "40px 0" }}>No deployments yet — allocate one 🏦</div>}</div>}
        {tab === "new" && <div className="card">
          <label>Deployment name</label><input value={nm} onChange={e => setNm(e.target.value)} placeholder="e.g. Q2 idle cash" />
          <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || busy || !nm} onClick={() => write("createRun", [nm])}>{busy ? "…" : "Create deployment 🏦"}</button>
          <div style={{ fontSize: 11, color: "var(--mut)", textAlign: "center", marginTop: 8 }}>Open it under Deployments to add vaults and deploy.</div>
        </div>}
        {tab === "send" && <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Wire USDC</div>
          <div style={{ fontSize: 12.5, color: "var(--mut)", marginBottom: 6 }}>Move treasury USDC to any address on Arc.</div>
          <label>To address</label><input value={snd.to} onChange={e => setSnd(s => ({ ...s, to: e.target.value }))} placeholder="0x…" style={{ fontFamily: "ui-monospace" }} />
          <label>Amount (USDC)</label><input value={snd.amount} onChange={e => setSnd(s => ({ ...s, amount: e.target.value }))} type="number" placeholder="0.00" style={{ fontSize: 18, fontWeight: 800 }} />
          <button className="btn pri" style={{ width: "100%", marginTop: 14 }} disabled={!isConnected || sbusy || !isAddress(snd.to) || !(Number(snd.amount) > 0)} onClick={() => send.sendTransaction({ to: snd.to as `0x${string}`, value: parseEther(snd.amount || "0") })}>{sbusy ? "Wiring…" : "Wire USDC ↗"}</button>
          {srcpt.isSuccess && <div style={{ fontSize: 12, color: "var(--up)", textAlign: "center", marginTop: 8 }}>✓ Sent</div>}
        </div>}
        <div style={{ textAlign: "center", color: "#5d5282", fontSize: 12, marginTop: 22 }}>Built on <a href="https://arc.network" target="_blank" rel="noopener noreferrer">Arc Network</a></div>
      </div>
    </div>
  );
}
