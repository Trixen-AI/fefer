import { useState, type ReactNode } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bot,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  ExternalLink,
  Gauge,
  LayoutDashboard,
  Menu,
  Plus,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Wallet,
  Zap,
} from "lucide-react";

type Section = "positions" | "create" | "automation" | "activity";

const accent = "#5ee08a";
const border = "rgba(100,180,120,.16)";
const card = "linear-gradient(145deg, #102719 0%, #0b1a11 100%)";

function Token({ symbol, tone = "#d8e8d9" }: { symbol: string; tone?: string }) {
  return (
    <span style={{ background: tone, color: "#06100b" }} className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-[#0b1c12]">
      {symbol.slice(0, 2)}
    </span>
  );
}

function StatusPill({ children, green = false }: { children: ReactNode; green?: boolean }) {
  return <span style={{ color: green ? accent : "#a2b6a6", background: green ? "rgba(94,224,138,.09)" : "rgba(160,190,170,.08)", borderColor: green ? "rgba(94,224,138,.22)" : border }} className="rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide">{children}</span>;
}

function EmptyState({ onCreate, demo }: { onCreate: () => void; demo: boolean }) {
  return (
    <div className="animate-in fade-in duration-500">
      <div style={{ background: "radial-gradient(circle at 75% 0%, rgba(57,135,78,.15), transparent 42%), #0b1a11", borderColor: border }} className="relative overflow-hidden rounded-2xl border p-6 sm:p-10">
        <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full border border-[#5ee08a18]" />
        <div className="absolute right-8 top-8 h-24 w-24 rounded-full border border-[#5ee08a12]" />
        <div className="relative max-w-xl">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#5ee08a14] text-[#5ee08a]"><Gauge size={21} /></div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[.19em] text-[#6f9b79]">Positions overview</p>
          <h2 className="text-2xl font-semibold tracking-[-.03em] text-[#f2f7f3] sm:text-3xl">Your liquidity, under a watchful keeper.</h2>
          <p className="mt-3 max-w-md text-sm leading-6 text-[#8ea596]">{demo ? "Preview mode is showing a sample position. It is not connected to a wallet or live chain data." : "Connect a wallet to inspect your positions, or start by defining a concentrated-liquidity range."}</p>
          <button onClick={onCreate} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[#5ee08a] px-4 py-2.5 text-sm font-semibold text-[#06100b] transition hover:bg-[#7aeda0] focus:outline-none focus:ring-2 focus:ring-[#5ee08a] focus:ring-offset-2 focus:ring-offset-[#0b1a11]"><Plus size={16} /> Create an LP position <ArrowRight size={15} /></button>
          <p className="mt-4 flex items-center gap-2 text-[11px] text-[#637c6b]"><ShieldCheck size={14} /> Nothing is signed or submitted in this preview.</p>
        </div>
      </div>
    </div>
  );
}

export function DeltaLP() {
  const [section, setSection] = useState<Section>("positions");
  const [connected, setConnected] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [detail, setDetail] = useState(false);
  const [step, setStep] = useState(1);
  const [automation, setAutomation] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const go = (next: Section) => { setSection(next); setDetail(false); setMobileNav(false); };
  const demo = connected && showDemo;

  const nav = [
    { id: "positions" as Section, label: "Positions", icon: LayoutDashboard },
    { id: "create" as Section, label: "Create LP", icon: Plus },
    { id: "automation" as Section, label: "Automation", icon: Bot },
    { id: "activity" as Section, label: "Activity", icon: Activity },
  ];

  return (
    <div style={{ background: "#06100b", color: "#f2f7f3", fontFamily: "'Geist', 'Inter', system-ui, sans-serif" }} className="min-h-[100dvh] overflow-x-hidden">
      <style>{`
        @keyframes delta-rise { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
        @keyframes delta-pulse { 0%,100% { opacity:.45 } 50% { opacity:1 } }
        .delta-rise { animation: delta-rise .45s ease-out both }
        .delta-grid { background-image: linear-gradient(rgba(100,180,120,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(100,180,120,.035) 1px, transparent 1px); background-size: 36px 36px; }
        button { cursor:pointer }
      `}</style>
      <div className="pointer-events-none fixed inset-0 opacity-60 delta-grid" />
      <div className="relative flex min-h-[100dvh]">
        <aside style={{ background: "rgba(8,21,14,.88)", borderColor: border }} className="hidden w-[232px] shrink-0 border-r px-5 py-6 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#5ee08a] text-[#06100b]"><ArrowDown size={18} strokeWidth={3} /></div><div><div className="text-sm font-bold tracking-tight">delta<span className="text-[#5ee08a]">.</span>lp</div><div className="text-[9px] uppercase tracking-[.18em] text-[#65806d]">control surface</div></div></div>
          <div className="mt-11 space-y-1">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#55705d]">Workspace</p>
            {nav.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => go(item.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-1 focus:ring-[#5ee08a] ${section === item.id ? "bg-[#5ee08a12] font-medium text-[#dff6e4]" : "text-[#829b88] hover:bg-[#ffffff06] hover:text-[#c8d9cb]"}`}><Icon size={16} className={section === item.id ? "text-[#5ee08a]" : ""} />{item.label}{item.id === "automation" && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#c99a57]" />}</button> })}
          </div>
          <div className="mt-auto space-y-1">
            <button onClick={() => alert("Docs are not connected in this preview.")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#829b88] hover:bg-[#ffffff06]"><CircleHelp size={16} /> Docs <ExternalLink size={12} className="ml-auto opacity-50" /></button>
            <div className="mt-5 border-t border-[#6aa47718] pt-4"><div className="flex items-center gap-2 px-2 text-[10px] uppercase tracking-[.12em] text-[#55705d]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c99a57]" /> Configuration unavailable</div><p className="mt-2 px-2 text-[11px] leading-5 text-[#667e6c]">Keeper deployment and RPC settings will appear here when configured.</p></div>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <header style={{ background: "rgba(6,16,11,.78)", borderColor: border }} className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b px-4 backdrop-blur-md sm:px-8">
            <div className="flex items-center gap-3 lg:hidden"><button onClick={() => setMobileNav(!mobileNav)} aria-label="Open navigation" className="rounded-md p-1 text-[#92a995]"><Menu size={20} /></button><span className="text-sm font-bold">delta<span className="text-[#5ee08a]">.</span>lp</span></div>
            <div className="hidden items-center gap-2 text-xs text-[#77907d] sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-[#5ee08a]" /> Preview environment <span className="text-[#3f5947]">/</span> <span className="text-[#a0b7a5]">No wallet connected</span></div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3"><button onClick={() => setShowDemo(!showDemo)} disabled={!connected} className={`hidden rounded-md border px-2.5 py-1.5 text-[10px] font-medium sm:block ${connected ? "border-[#5ee08a45] text-[#8dd99f]" : "border-[#6aa47718] text-[#526b59]"}`}>{showDemo ? "Exit preview data" : "Preview data"}</button><button className="flex items-center gap-2 rounded-md border border-[#6aa47727] bg-[#0d2115] px-3 py-2 text-xs text-[#a9bdad] hover:border-[#5ee08a55]"><span className="h-1.5 w-1.5 rounded-full bg-[#5ee08a]" /> Ethereum <ChevronDown size={13} /></button><button onClick={() => { setConnected(!connected); setShowDemo(!connected); }} className="flex items-center gap-2 rounded-md bg-[#5ee08a] px-3 py-2 text-xs font-semibold text-[#06100b] hover:bg-[#7aeda0]"><Wallet size={14} />{connected ? "Preview wallet" : "Connect wallet"}</button></div>
          </header>
          {mobileNav && <div style={{ background: "#0b1c12", borderColor: border }} className="absolute left-3 right-3 top-[76px] z-30 rounded-xl border p-2 shadow-2xl lg:hidden">{nav.map(item => { const I=item.icon; return <button key={item.id} onClick={() => go(item.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#a7bca9]"><I size={16} />{item.label}</button> })}</div>}
          <div className="mx-auto max-w-[1240px] px-4 pb-28 pt-8 sm:px-8 sm:pt-10 lg:pb-12">
            {detail ? <Detail onBack={() => setDetail(false)} /> : section === "create" ? <CreateLP step={step} setStep={setStep} onBack={() => go("positions")} /> : section === "automation" ? <Automation enabled={automation} setEnabled={setAutomation} /> : section === "activity" ? <ActivityView /> : <><div className="mb-8 flex items-end justify-between"><div><div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-[#688471]">Workspace <span className="text-[#3e5a46]">/</span> Positions</div><h1 className="text-3xl font-semibold tracking-[-.04em] sm:text-4xl">Positions</h1><p className="mt-2 text-sm text-[#819989]">Monitor ranges and define your exit logic.</p></div><button onClick={() => go("create")} className="hidden items-center gap-2 rounded-lg border border-[#5ee08a38] px-3 py-2 text-xs font-semibold text-[#b8e8c1] hover:bg-[#5ee08a0d] sm:flex"><Plus size={15} /> New position</button></div><div className="mb-6 grid gap-3 sm:grid-cols-3">{[["Total value","—","Wallet not connected"],["Active positions","—","No positions detected"],["Keeper coverage","—","Not configured"]].map(([a,b,c],i)=><div key={a} style={{ background: card, borderColor: border }} className="rounded-xl border p-4"><div className="flex items-center justify-between text-[11px] text-[#74907d]">{a}<span className="text-[#55705d]">{i===2?<Bot size={15}/>:<SlidersHorizontal size={14}/>}</span></div><div className="mt-3 text-2xl font-medium tracking-tight text-[#e3eee5]">{b}</div><div className="mt-1 text-[10px] text-[#647d6b]">{c}</div></div>)}</div>{demo ? <DemoPosition onOpen={() => setDetail(true)} /> : <EmptyState onCreate={() => go("create")} demo={false} />}</>}
          </div>
          <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-around border-t border-[#6aa4771c] bg-[#08150eee] py-2 backdrop-blur-lg lg:hidden">{nav.map(item => { const I=item.icon; return <button key={item.id} onClick={() => go(item.id)} className={`flex min-w-[68px] flex-col items-center gap-1 py-1 text-[10px] ${section===item.id?"text-[#5ee08a]":"text-[#718a77]"}`}><I size={18}/>{item.label}</button> })}</div>
        </main>
      </div>
    </div>
  );
}

function DemoPosition({ onOpen }: { onOpen: () => void }) { return <button onClick={onOpen} style={{ background: card, borderColor: border }} className="delta-rise w-full rounded-2xl border p-5 text-left transition hover:border-[#5ee08a55] focus:outline-none focus:ring-2 focus:ring-[#5ee08a]"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="flex -space-x-2"><Token symbol="ETH" tone="#9bc8a6"/><Token symbol="USDC" tone="#8db6d8"/></div><div><div className="text-sm font-semibold">ETH / USDC</div><div className="mt-1 text-[11px] text-[#718b77]">Preview position · fee tier 0.05%</div></div></div><StatusPill green>Demo only</StatusPill></div><div className="mt-7 grid grid-cols-2 gap-5 sm:grid-cols-4"><div><p className="text-[10px] uppercase tracking-wider text-[#647d6b]">Range</p><p className="mt-2 text-sm text-[#d3e2d5]">— <span className="text-[#69816f]">to</span> —</p></div><div><p className="text-[10px] uppercase tracking-wider text-[#647d6b]">Liquidity</p><p className="mt-2 text-sm text-[#d3e2d5]">Unavailable</p></div><div><p className="text-[10px] uppercase tracking-wider text-[#647d6b]">Exit automation</p><p className="mt-2 text-sm text-[#d3e2d5]">Not configured</p></div><div className="flex items-end justify-end"><span className="text-xs text-[#8dd99f]">View details <ArrowRight size={14} className="ml-1 inline"/></span></div></div></button> }

function CreateLP({ step, setStep, onBack }: { step: number; setStep: (n: number) => void; onBack: () => void }) {
  const borderColor = border;
  return <div className="delta-rise max-w-4xl"><button onClick={onBack} className="mb-7 flex items-center gap-2 text-xs text-[#7c967f] hover:text-[#c9ddcc]"><ArrowLeft size={15}/> Back to positions</button><div className="mb-8 flex items-center justify-between"><div><p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#688471]">Position builder</p><h1 className="text-3xl font-semibold tracking-[-.04em]">Create LP</h1><p className="mt-2 text-sm text-[#819989]">Set the range. Define the exit. Review before signing.</p></div><span className="text-xs text-[#6f8975]">Step {step} of 3</span></div><div className="mb-8 flex gap-2">{[["01","Pair"],["02","Range"],["03","Review"]].map(([n,l],i)=><div key={n} className="flex flex-1 items-center gap-2"><div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${step>i?"bg-[#5ee08a] text-[#06100b]":"border border-[#5ee08a33] text-[#8ea596]"}`}>{n}</div><span className="hidden text-xs text-[#8ea596] sm:block">{l}</span>{i<2&&<div className="h-px flex-1 bg-[#6aa47722]" />}</div>)}</div>{step===1?<div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]"><div style={{background:card,borderColor}} className="rounded-xl border p-5"><h3 className="text-sm font-semibold">Choose token pair</h3><p className="mt-1 text-xs text-[#718a77]">Token balances appear once a wallet is connected.</p><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-lg border border-[#6aa47727] bg-[#08150e] p-4"><div className="mb-5 flex items-center gap-2"><Token symbol="ETH" tone="#9bc8a6"/><span className="text-sm">ETH</span></div><div className="text-xs text-[#5e7765]">Balance unavailable</div></div><div className="rounded-lg border border-[#6aa47727] bg-[#08150e] p-4"><div className="mb-5 flex items-center gap-2"><Token symbol="USDC" tone="#8db6d8"/><span className="text-sm">USDC</span></div><div className="text-xs text-[#5e7765]">Balance unavailable</div></div></div><label className="mt-5 block text-xs text-[#8ea596]">Fee tier</label><button className="mt-2 flex w-full items-center justify-between rounded-lg border border-[#6aa47727] bg-[#08150e] p-3 text-sm"><span>0.05% <span className="ml-2 text-xs text-[#647d6b]">Recommended</span></span><ChevronDown size={15}/></button></div><Safety /></div>:step===2?<RangeStep onNext={()=>setStep(3)} />:<ReviewStep onBack={()=>setStep(2)} />}</div>
}
function Safety(){return <div style={{background:"rgba(201,154,87,.055)",borderColor:"rgba(201,154,87,.2)"}} className="rounded-xl border p-5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-[#c99a57]" size={18}/><div><h3 className="text-sm font-semibold text-[#dbc49e]">Before you continue</h3><p className="mt-2 text-xs leading-5 text-[#a18b68]">LP positions can experience impermanent loss. Delta LP does not predict price movement or guarantee an exit. Review all parameters before any wallet approval.</p></div></div></div>}
function RangeStep({onNext}:{onNext:()=>void}){const borderColor = border;return <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]"><div style={{background:card,borderColor}} className="rounded-xl border p-5"><h3 className="text-sm font-semibold">Set your price range</h3><p className="mt-1 text-xs text-[#718a77]">Values are unavailable until a pair and oracle are connected.</p><div className="mt-6 h-44 rounded-lg border border-[#6aa47720] bg-[#08150e] p-4"><div className="flex h-full items-end gap-1">{[25,38,32,48,44,60,51,67,57,76,63,72,55,62,48,40,52,45,31,37,22].map((h,i)=><div key={i} style={{height:`${h}%`,opacity:.25+i/100}} className="flex-1 rounded-t bg-[#5ee08a]" />)}</div></div><div className="mt-4 grid grid-cols-2 gap-3"><div><label className="text-[11px] text-[#78917e]">Min price</label><div className="mt-2 rounded-lg border border-[#6aa47727] bg-[#08150e] px-3 py-3 text-sm text-[#617b68]">— USDC per ETH</div></div><div><label className="text-[11px] text-[#78917e]">Max price</label><div className="mt-2 rounded-lg border border-[#6aa47727] bg-[#08150e] px-3 py-3 text-sm text-[#617b68]">— USDC per ETH</div></div></div><button onClick={onNext} className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#5ee08a] py-3 text-sm font-semibold text-[#06100b] hover:bg-[#7aeda0]">Continue to review <ArrowRight size={15}/></button></div><Safety/></div>}
function ReviewStep({onBack}:{onBack:()=>void}){const borderColor = border;return <div className="grid gap-4 md:grid-cols-[1.2fr_.8fr]"><div style={{background:card,borderColor}} className="rounded-xl border p-5"><div className="flex items-center gap-2"><ClipboardList size={17} className="text-[#5ee08a]"/><h3 className="text-sm font-semibold">Review and approve</h3></div><div className="mt-5 divide-y divide-[#6aa47718] text-sm">{[["Pair","ETH / USDC"],["Fee tier","0.05%"],["Price range","Unavailable"],["Deposit","Wallet not connected"]].map(x=><div key={x[0]} className="flex justify-between py-3"><span className="text-[#718a77]">{x[0]}</span><span className="text-[#c6d8c9]">{x[1]}</span></div>)}</div><div className="mt-5 rounded-lg bg-[#c99a570b] p-3 text-xs leading-5 text-[#aa9168]">No approval or transaction will be submitted from this preview. Connect a wallet and configure a deployment to continue.</div><button disabled className="mt-5 w-full rounded-lg bg-[#345740] py-3 text-sm font-semibold text-[#718f78]">Connect wallet to continue</button><button onClick={onBack} className="mt-3 w-full py-2 text-xs text-[#8ea596] hover:text-[#cfe1d2]">Adjust range</button></div><Safety/></div>}
function Automation({enabled,setEnabled}:{enabled:boolean;setEnabled:(v:boolean)=>void}){const borderColor = border;return <div className="delta-rise"><div className="mb-8"><p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#688471]">Keeper operations</p><h1 className="text-3xl font-semibold tracking-[-.04em]">Automation</h1><p className="mt-2 text-sm text-[#819989]">A narrow mandate for a high-consequence action.</p></div><div style={{background:card,borderColor}} className="max-w-3xl rounded-xl border p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5ee08a12] text-[#5ee08a]"><Bot size={20}/></div><div><h2 className="text-base font-semibold">Exit keeper</h2><p className="mt-1 text-xs leading-5 text-[#78917e]">Monitors your configured threshold and proposes a close when conditions are met.</p></div></div><button onClick={()=>setEnabled(!enabled)} aria-label="Toggle automation" className={`relative h-6 w-11 rounded-full transition ${enabled?"bg-[#5ee08a]":"bg-[#294a32]"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-[#d9f2df] transition ${enabled?"left-6":"left-1"}`}/></button></div><div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-lg border border-[#6aa4771c] bg-[#08150e] p-4"><div className="text-[10px] uppercase tracking-wider text-[#627b68]">Keeper status</div><div className="mt-3 flex items-center gap-2 text-sm">{enabled?<><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c99a57]"/>Waiting for configuration</>:<><span className="h-1.5 w-1.5 rounded-full bg-[#536c5a]"/>Not active</>}</div></div><div className="rounded-lg border border-[#6aa4771c] bg-[#08150e] p-4"><div className="text-[10px] uppercase tracking-wider text-[#627b68]">Monitored positions</div><div className="mt-3 text-sm text-[#9caf9f]">—</div></div></div><p className="mt-5 flex gap-2 text-xs leading-5 text-[#778f7d]"><Settings2 size={14} className="mt-0.5 shrink-0"/>Automation deployment is unavailable in this preview. No permissions have been granted.</p></div></div>}
function ActivityView(){const borderColor = border;return <div className="delta-rise"><div className="mb-8"><p className="mb-3 text-[11px] uppercase tracking-[.18em] text-[#688471]">Audit trail</p><h1 className="text-3xl font-semibold tracking-[-.04em]">Activity</h1><p className="mt-2 text-sm text-[#819989]">A record of approvals, keeper proposals, and exits.</p></div><div style={{background:card,borderColor}} className="flex min-h-[310px] flex-col items-center justify-center rounded-xl border p-8 text-center"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#5ee08a28] text-[#5ee08a]"><Activity size={20}/></div><h2 className="text-base font-semibold">No activity to show</h2><p className="mt-2 max-w-sm text-xs leading-5 text-[#78917e]">Connect a wallet to load your on-chain activity. Preview actions are never recorded as transactions.</p><span className="mt-5"><StatusPill>Wallet not connected</StatusPill></span></div></div>}
function Detail({onBack}:{onBack:()=>void}){const borderColor = border;return <div className="delta-rise"><button onClick={onBack} className="mb-7 flex items-center gap-2 text-xs text-[#7c967f] hover:text-[#c9ddcc]"><ArrowLeft size={15}/> Back to positions</button><div className="mb-8 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[.18em] text-[#688471]">Position <span className="text-[#3e5a46]">/</span> Preview</div><div className="flex items-center gap-3"><div className="flex -space-x-2"><Token symbol="ETH" tone="#9bc8a6"/><Token symbol="USDC" tone="#8db6d8"/></div><h1 className="text-3xl font-semibold tracking-[-.04em]">ETH / USDC</h1></div><p className="mt-2 text-sm text-[#819989]">Position data unavailable · sample view only</p></div><StatusPill green>Demo only</StatusPill></div><div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]"><div style={{background:card,borderColor}} className="rounded-xl border p-5"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Price range</h2><StatusPill>Not configured</StatusPill></div><div className="mt-6 h-52 rounded-lg border border-[#6aa47720] bg-[#08150e] p-5"><div className="flex h-full items-center justify-center text-xs text-[#5e7765]">Price data unavailable</div></div></div><div className="space-y-4"><div style={{background:card,borderColor}} className="rounded-xl border p-5"><h2 className="text-sm font-semibold">Exit automation</h2><div className="mt-4 flex items-center gap-2 text-xs text-[#c7d9ca]"><span className="h-1.5 w-1.5 rounded-full bg-[#c99a57]"/> Not configured</div><p className="mt-3 text-xs leading-5 text-[#718a77]">Set a threshold after wallet and keeper configuration are available.</p></div><div style={{background:"rgba(160,77,63,.06)",borderColor:"rgba(190,101,87,.24)"}} className="rounded-xl border p-5"><div className="flex items-center gap-2 text-sm font-semibold text-[#ddb0a5]"><Zap size={15}/> Dangerous actions</div><p className="mt-3 text-xs leading-5 text-[#aa837b]">Closing a position or revoking automation can be irreversible. Actions are disabled in preview mode.</p><button disabled className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-[#9a5b50] py-2.5 text-xs text-[#9c756e]">Close position</button></div></div></div></div>}