import { useState, ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  Activity,
  ArrowDown,
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

type Section = "positions" | "create" | "automation" | "activity";

const navLinks = [
  { id: "positions" as Section, path: "/", label: "Positions", icon: LayoutDashboard },
  { id: "create" as Section, path: "/create", label: "Create LP", icon: Plus },
  { id: "automation" as Section, path: "/automation", label: "Automation", icon: Bot },
  { id: "activity" as Section, path: "/activity", label: "Activity", icon: Activity },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { connected, connect, disconnect } = useWallet();
  const [mobileNav, setMobileNav] = useState(false);

  const isCurrent = (path: string) => {
    if (path === "/" && location !== "/") return false;
    return location.startsWith(path);
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-60 delta-grid" />
      <div className="relative flex min-h-[100dvh]">
        {/* Desktop Sidebar */}
        <aside style={{ background: "rgba(8,21,14,.88)" }} className="hidden w-[232px] shrink-0 border-r px-5 py-6 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ArrowDown size={18} strokeWidth={3} />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">delta<span className="text-primary">.</span>lp</div>
              <div className="text-[9px] uppercase tracking-[.18em] text-[#65806d]">control surface</div>
            </div>
          </div>
          <div className="mt-11 space-y-1">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#55705d]">Workspace</p>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isCurrent(item.path);
              return (
                <Link key={item.id} href={item.path} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition focus:outline-none focus:ring-1 focus:ring-primary ${active ? "bg-accent font-medium text-accent-foreground" : "text-muted-foreground hover:bg-[#ffffff06] hover:text-[#c8d9cb]"}`}>
                  <Icon size={16} className={active ? "text-primary" : ""} />
                  {item.label}
                  {item.id === "automation" && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#c99a57]" />}
                </Link>
              );
            })}
          </div>
          <div className="mt-auto space-y-1">
            <button onClick={() => alert("Docs are not connected.")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-[#ffffff06]">
              <CircleHelp size={16} /> Docs <ExternalLink size={12} className="ml-auto opacity-50" />
            </button>
            <div className="mt-5 border-t border-[#6aa47718] pt-4">
              <div className="flex items-center gap-2 px-2 text-[10px] uppercase tracking-[.12em] text-[#55705d]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#536c5a]" /> Configuration unavailable
              </div>
              <p className="mt-2 px-2 text-[11px] leading-5 text-[#667e6c]">Keeper deployment and RPC settings will appear here when configured.</p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="min-w-0 flex-1 flex flex-col">
          {/* Top Header */}
          <header style={{ background: "rgba(6,16,11,.78)" }} className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b px-4 backdrop-blur-md sm:px-8">
            <div className="flex items-center gap-3 lg:hidden">
              <button onClick={() => setMobileNav(!mobileNav)} aria-label="Open navigation" className="rounded-md p-1 text-[#92a995]">
                <Menu size={20} />
              </button>
              <span className="text-sm font-bold">delta<span className="text-primary">.</span>lp</span>
            </div>
            <div className="hidden items-center gap-2 text-xs text-[#77907d] sm:flex">
              <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-primary' : 'bg-[#536c5a]'}`} /> 
              Production environment <span className="text-[#3f5947]">/</span> 
              <span className={connected ? "text-[#a0b7a5]" : "text-[#77907d]"}>{connected ? "Wallet connected" : "No wallet connected"}</span>
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <button className="flex items-center gap-2 rounded-md border border-[#6aa47727] bg-[#0d2115] px-3 py-2 text-xs text-[#a9bdad] hover:border-[#5ee08a55]">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Ethereum <ChevronDown size={13} />
              </button>
              <button onClick={connected ? disconnect : connect} className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${connected ? "border border-[#6aa47727] bg-[#0d2115] text-[#a9bdad] hover:border-[#5ee08a55]" : "bg-primary text-primary-foreground hover:bg-[#7aeda0]"}`}>
                <Wallet size={14} />
                {connected ? "Disconnect" : "Connect wallet"}
              </button>
            </div>
          </header>

          {/* Mobile Nav Dropdown */}
          {mobileNav && (
            <div style={{ background: "#0b1c12" }} className="absolute left-3 right-3 top-[76px] z-30 rounded-xl border p-2 shadow-2xl lg:hidden">
              {navLinks.map(item => {
                const I = item.icon;
                return (
                  <Link key={item.id} href={item.path} onClick={() => setMobileNav(false)} className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-[#a7bca9]">
                    <I size={16} />{item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Page Content */}
          <div className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-8 sm:px-8 sm:pt-10 lg:pb-12 flex-1">
            {children}
          </div>

          {/* Mobile Bottom Nav */}
          <div className="fixed bottom-0 left-0 right-0 z-20 flex justify-around border-t border-[#6aa4771c] bg-[#08150eee] py-2 backdrop-blur-lg lg:hidden">
            {navLinks.map(item => {
              const I = item.icon;
              const active = isCurrent(item.path);
              return (
                <Link key={item.id} href={item.path} className={`flex min-w-[68px] flex-col items-center gap-1 py-1 text-[10px] ${active ? "text-primary" : "text-[#718a77]"}`}>
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
