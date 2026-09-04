import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  Bot,
  ChevronDown,
  CircleHelp,
  ExternalLink,
  LayoutDashboard,
  Menu,
  Plus,
  Wallet,
} from "lucide-react";
import { useWallet } from "@/hooks/use-wallet";
import { MarketTicker } from "@/components/layout/market-ticker";

type Section = "positions" | "create" | "automation" | "activity";

const navLinks = [
  { id: "positions" as Section, path: "/", label: "Positions", icon: LayoutDashboard },
  { id: "create" as Section, path: "/create", label: "Create LP", icon: Plus },
  { id: "automation" as Section, path: "/automation", label: "Automation", icon: Bot },
  { id: "activity" as Section, path: "/activity", label: "Activity", icon: Activity },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const logoSrc = `${import.meta.env.BASE_URL}liqora-logo.png`;
  const {
    connected,
    address,
    wrongNetwork,
    isConnecting,
    error,
    networkName,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet();
  const [mobileNav, setMobileNav] = useState(false);

  const isCurrent = (path: string) => {
    if (path === "/" && location !== "/") return false;
    return location.startsWith(path);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-background">
      <div className="pointer-events-none fixed inset-0 opacity-40 liqora-grid" />
      
      {/* Global Terminal Ticker */}
      <MarketTicker className="relative z-30 hidden sm:flex" />

      <div className="relative flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border/50 bg-card/40 px-5 py-6 backdrop-blur-xl lg:flex relative z-20">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-foreground p-1">
              <img src={logoSrc} alt="" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">liqora<span className="text-primary">.</span></div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground">control surface</div>
            </div>
          </div>
          
          <div className="mt-12 space-y-1.5">
            <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
              Workspace
            </p>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isCurrent(item.path);
              return (
                <Link 
                  key={item.id} 
                  href={item.path} 
                  className={`group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all focus:outline-none focus:ring-1 focus:ring-primary ${
                    active 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  }`}
                >
                  <Icon size={16} className={active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} />
                  {item.label}
                  {item.id === "automation" && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />}
                </Link>
              );
            })}
          </div>
          
          <div className="mt-auto space-y-1">
            <button onClick={() => alert("Docs are not connected.")} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-all hover:bg-white/5 hover:text-foreground">
              <CircleHelp size={16} /> Documentation <ExternalLink size={12} className="ml-auto opacity-50" />
            </button>
            <div className="mt-6 rounded-lg border border-border/40 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-border" /> Config Standby
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/70">
                Keeper deployment and RPC settings will appear here when ready.
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex min-w-0 flex-1 flex-col">
          {/* Top Header */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 px-4 backdrop-blur-md sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <button onClick={() => setMobileNav(!mobileNav)} aria-label="Open navigation" className="rounded-md p-1.5 text-muted-foreground hover:bg-white/5">
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-foreground p-0.5">
                  <img src={logoSrc} alt="" className="h-full w-full object-contain" />
                </span>
                <span className="text-sm font-bold">liqora<span className="text-primary">.</span></span>
              </div>
            </div>
            
            <div className="hidden items-center gap-3 text-xs font-medium text-muted-foreground sm:flex">
              <div className="flex items-center gap-2 rounded-full border border-border/50 bg-black/20 px-3 py-1">
                <span className={`h-1.5 w-1.5 rounded-full shadow-[0_0_6px_currentColor] ${connected ? 'bg-primary text-primary' : 'bg-muted-foreground text-muted-foreground'}`} /> 
                Production
              </div>
              <span className="text-border">/</span>
              <span className={`font-mono ${connected ? "text-primary/90" : "text-muted-foreground/60"}`}>
                {connected
                  ? wrongNetwork
                    ? "Wrong network"
                    : `Wallet ${address?.slice(0, 6)}…${address?.slice(-4)}`
                  : "No wallet connected"}
              </span>
            </div>
            
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={wrongNetwork ? () => void switchNetwork() : undefined}
                disabled={!wrongNetwork}
                className={`flex items-center gap-2 rounded-md border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition-colors ${
                  wrongNetwork 
                    ? "cursor-pointer border-amber-500/30 text-amber-500 hover:bg-amber-500/10" 
                    : "cursor-default text-muted-foreground"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${wrongNetwork ? "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]" : "bg-primary shadow-[0_0_6px_rgba(94,224,138,0.6)]"}`} />
                {wrongNetwork ? "Switch network" : networkName} <ChevronDown size={13} className="opacity-50" />
              </button>
              
              <button
                onClick={connected ? disconnect : () => void connect()}
                disabled={isConnecting}
                className={`flex items-center gap-2 rounded-md px-4 py-1.5 text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background ${
                  connected 
                    ? "border border-border/50 bg-card/50 text-muted-foreground hover:bg-white/5 hover:text-foreground" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_12px_rgba(94,224,138,0.3)]"
                }`}
              >
                <Wallet size={14} />
                {isConnecting ? "Connecting…" : connected ? "Disconnect" : "Connect"}
              </button>
            </div>
          </header>

          <MarketTicker className="sticky top-16 z-10 sm:hidden" />

          {error && (
            <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-2.5 text-center text-xs font-medium text-destructive-foreground sm:px-8">
              {error}
            </div>
          )}

          {/* Mobile Nav Dropdown */}
          {mobileNav && (
            <div className="absolute left-3 right-3 top-[76px] z-40 rounded-xl border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-xl lg:hidden">
              {navLinks.map(item => {
                const I = item.icon;
                return (
                  <Link key={item.id} href={item.path} onClick={() => setMobileNav(false)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-white/5 hover:text-foreground">
                    <I size={16} />{item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Page Content */}
          <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-8 sm:px-8 sm:pt-10 lg:pb-12">
            {children}
          </div>

          {/* Mobile Bottom Nav */}
          <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-border/50 bg-background/90 py-2 pb-safe backdrop-blur-lg lg:hidden">
            {navLinks.map(item => {
              const I = item.icon;
              const active = isCurrent(item.path);
              return (
                <Link key={item.id} href={item.path} className={`flex min-w-[68px] flex-col items-center gap-1.5 py-2 text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                  <I size={18} />{item.label}
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
