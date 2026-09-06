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

type Section = "positions" | "create" | "automation" | "activity";

const navLinks = [
  {
    id: "positions" as Section,
    path: "/",
    label: "Positions",
    icon: LayoutDashboard,
  },
  { id: "create" as Section, path: "/create", label: "Create LP", icon: Plus },
  {
    id: "automation" as Section,
    path: "/automation",
    label: "Automation",
    icon: Bot,
  },
  {
    id: "activity" as Section,
    path: "/activity",
    label: "Activity",
    icon: Activity,
  },
];

function Wordmark({ size = "base" }: { size?: "base" | "sm" }) {
  return (
    <span
      className={`font-extrabold tracking-[-0.04em] ${size === "sm" ? "text-base" : "text-lg"}`}
    >
      LI<span className="text-signal">.</span>CO
    </span>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const logoSrc = `${import.meta.env.BASE_URL}lico-logo.png`;
  const {
    connected,
    address,
    wrongNetwork,
    isConnecting,
    error,
    networkName,
    connect,
    openAccount,
    switchNetwork,
  } = useWallet();
  const [mobileNav, setMobileNav] = useState(false);

  const isCurrent = (path: string) => {
    if (path === "/" && location !== "/") return false;
    return location.startsWith(path);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-background">
      <div className="relative flex flex-1">
        {/* Desktop sidebar: a quiet column, not a control panel. */}
        <aside className="sticky top-0 hidden h-[100dvh] w-72 shrink-0 flex-col border-r border-border px-5 py-8 lg:flex">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-full px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <img
              src={logoSrc}
              alt=""
              className="h-9 w-9 shrink-0 object-contain"
            />
            <Wordmark />
          </Link>

          <nav className="mt-14 space-y-1.5">
            <p className="mb-5 px-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Workspace
            </p>
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isCurrent(item.path);
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  aria-current={active ? "page" : undefined}
                  className={`group flex w-full items-center gap-3 rounded-full px-4 py-3 text-[15px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <Icon size={17} strokeWidth={2} />
                  {item.label}
                  {item.id === "automation" && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 space-y-1 border-t border-border pt-6">
            <a
              href="https://x.com/liqoprotocol"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Follow LI.CO on X"
            >
              <span className="w-[17px] text-center font-semibold">𝕏</span>
              Follow on X
              <ExternalLink size={12} className="ml-auto opacity-50" />
            </a>
            <Link
              href="/docs"
              className={`flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                isCurrent("/docs")
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <CircleHelp size={17} /> Documentation
            </Link>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-20 items-center gap-3 border-b border-border bg-background px-4 sm:px-10">
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setMobileNav(!mobileNav)}
                aria-label="Open navigation"
                aria-expanded={mobileNav}
                className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Menu size={20} />
              </button>
              <div className="flex items-center gap-2">
                <img
                  src={logoSrc}
                  alt=""
                  className="h-7 w-7 shrink-0 object-contain"
                />
                <Wordmark size="sm" />
              </div>
            </div>

            <div className="hidden items-center gap-3 text-[13px] font-medium text-muted-foreground sm:flex">
              <span
                className={`h-1.5 w-1.5 rounded-full ${connected ? "bg-signal" : "bg-muted-foreground/50"}`}
              />
              <span className="text-xs">
                {connected
                  ? wrongNetwork
                    ? "Wrong network"
                    : "Wallet connected"
                  : "No wallet connected"}
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              <button
                onClick={wrongNetwork ? () => void switchNetwork() : undefined}
                disabled={!wrongNetwork}
                className={`flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  wrongNetwork
                    ? "cursor-pointer bg-amber-100 text-amber-800 hover:bg-amber-200"
                    : "cursor-default bg-secondary text-muted-foreground"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${wrongNetwork ? "bg-amber-500" : "bg-signal"}`}
                />
                <span className="hidden sm:inline">
                  {wrongNetwork ? "Switch network" : networkName}
                </span>
                <ChevronDown size={13} className="opacity-50" />
              </button>

              <button
                onClick={
                  connected ? () => void openAccount() : () => void connect()
                }
                disabled={isConnecting}
                className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60 ${
                  connected
                    ? "bg-secondary text-foreground hover:bg-accent"
                    : "bg-primary text-primary-foreground hover:opacity-90"
                }`}
              >
                <Wallet size={14} />
                {isConnecting
                  ? "Connecting…"
                  : connected
                    ? `${address?.slice(0, 6)}…${address?.slice(-4)}`
                    : "Connect"}
              </button>
            </div>
          </header>

          {error && (
            <div className="border-b border-destructive/20 bg-destructive/10 px-4 py-3 text-center text-[13px] font-medium text-destructive sm:px-10">
              {error}
            </div>
          )}

          {mobileNav && (
            <div className="absolute left-3 right-3 top-[84px] z-40 rounded-[26px] border border-border bg-card p-2.5 shadow-[0_12px_40px_rgba(26,26,26,0.1)] lg:hidden">
              {navLinks.map((item) => {
                const I = item.icon;
                const active = isCurrent(item.path);
                return (
                  <Link
                    key={item.id}
                    href={item.path}
                    onClick={() => setMobileNav(false)}
                    className={`flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-[15px] font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <I size={17} />
                    {item.label}
                  </Link>
                );
              })}
              <div className="mt-2 border-t border-border pt-2">
                <a
                  href="https://x.com/liqoprotocol"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileNav(false)}
                  className="flex w-full items-center gap-3 rounded-full px-4 py-3 text-left text-[15px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <span className="w-[17px] text-center font-semibold">𝕏</span>
                  Follow on X
                  <ExternalLink size={12} className="ml-auto opacity-50" />
                </a>
              </div>
            </div>
          )}

          <div className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-12 sm:px-10 sm:pt-16 lg:pb-20">
            {children}
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-border bg-background py-2 pb-safe lg:hidden">
            {navLinks.map((item) => {
              const I = item.icon;
              const active = isCurrent(item.path);
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`flex min-w-[68px] flex-col items-center gap-1.5 py-2 text-[10px] font-semibold transition-colors ${
                    active ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  <I size={18} strokeWidth={active ? 2.4 : 2} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
