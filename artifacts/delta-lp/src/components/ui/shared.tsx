import { ReactNode } from "react";

export function Token({ symbol, tone = "#d8e8d9" }: { symbol: string; tone?: string }) {
  const normalized = symbol.toUpperCase();
  return (
    <span 
      aria-label={`${symbol} token`}
      style={{ background: normalized === "WETH" || normalized === "USDG" ? "#0b1c12" : tone, color: "#06100b" }} 
      className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold ring-2 ring-[#0b1c12]"
    >
      {normalized === "WETH" ? (
        <svg viewBox="0 0 32 32" className="h-full w-full" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="weth-gradient" x1="7" y1="4" x2="25" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#e9f4f0" />
              <stop offset="1" stopColor="#8ca9a1" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill="#627c77" />
          <path d="m16 4.5-7.2 11.8L16 20.2l7.2-3.9L16 4.5Z" fill="url(#weth-gradient)" />
          <path d="m16 21.8-7.2-4.1L16 27.5l7.2-9.8-7.2 4.1Z" fill="#c6dbd4" />
          <path d="m16 4.5v15.7l7.2-3.9L16 4.5Z" fill="#b9d0c9" opacity=".8" />
        </svg>
      ) : normalized === "USDG" ? (
        <svg viewBox="0 0 32 32" className="h-full w-full" role="img" aria-hidden="true">
          <defs>
            <linearGradient id="usdg-gradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8de3a4" />
              <stop offset="1" stopColor="#23834d" />
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="16" fill="url(#usdg-gradient)" />
          <circle cx="16" cy="16" r="10.5" fill="none" stroke="#e2ffe9" strokeWidth="1.5" opacity=".9" />
          <path d="M20.7 11.7c-1.2-1-2.7-1.5-4.7-1.5-2.6 0-4.4 1.2-4.4 3.1 0 2.1 1.8 2.7 4.4 3.1 2.1.3 3.2.8 3.2 1.8 0 1.1-1.2 1.8-3 1.8-1.8 0-3.2-.5-4.4-1.7" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M16 9v14" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      ) : (
        symbol.slice(0, 2)
      )}
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
