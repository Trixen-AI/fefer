import { ReactNode } from "react";

export function Token({ symbol, tone = "#d8e8d9" }: { symbol: string; tone?: string }) {
  return (
    <span 
      style={{ background: tone, color: "#06100b" }} 
      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ring-2 ring-[#0b1c12]"
    >
      {symbol.slice(0, 2)}
    </span>
  );
}

export function StatusPill({ children, green = false }: { children: ReactNode; green?: boolean }) {
  return (
    <span 
      style={{ 
        color: green ? "var(--primary)" : "#a2b6a6", 
        background: green ? "rgba(94,224,138,.09)" : "rgba(160,190,170,.08)", 
        borderColor: green ? "rgba(94,224,138,.22)" : "var(--border)" 
      }} 
      className="rounded-full border px-2.5 py-1 text-[10px] font-medium tracking-wide"
    >
      {children}
    </span>
  );
}

export function Safety() {
  return (
    <div style={{ background: "rgba(201,154,87,.055)", borderColor: "rgba(201,154,87,.2)" }} className="rounded-xl border p-5">
      <div className="flex gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#c99a57]"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
        <div>
          <h3 className="text-sm font-semibold text-[#dbc49e]">Before you continue</h3>
          <p className="mt-2 text-xs leading-5 text-[#a18b68]">LP positions can experience impermanent loss. Liqora does not predict price movement or guarantee an exit. Review all parameters before any wallet approval.</p>
        </div>
      </div>
    </div>
  );
}
