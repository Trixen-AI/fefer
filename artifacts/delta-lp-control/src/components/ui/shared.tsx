import { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";

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
        <ShieldCheck className="shrink-0 text-[#c99a57]" size={18} />
        <div>
          <h3 className="text-sm font-semibold text-[#dbc49e]">Before you continue</h3>
          <p className="mt-2 text-xs leading-5 text-[#a18b68]">LP positions can experience impermanent loss. Delta LP does not predict price movement or guarantee an exit. Review all parameters before any wallet approval.</p>
        </div>
      </div>
    </div>
  );
}
