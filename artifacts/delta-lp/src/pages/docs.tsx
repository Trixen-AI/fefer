import { Link } from "wouter";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Clock,
  KeyRound,
  Layers,
  ShieldCheck,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { isUniswapV3Configured, robinhoodChain } from "@/config/network";

const keeperAddress = String(import.meta.env.VITE_EXIT_KEEPER_ADDRESS ?? "");

const sections = [
  { id: "overview", label: "Overview" },
  { id: "position", label: "Create a position" },
  { id: "keeper", label: "How the exit keeper works" },
  { id: "custody", label: "What LI.QO cannot do" },
  { id: "network", label: "Network & contracts" },
  { id: "faq", label: "FAQ" },
];

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-border pt-14">
      <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </p>
      <h2 className="text-[2rem] font-extrabold leading-[1.08] tracking-[-0.04em] text-foreground sm:text-[2.5rem]">
        {title}
      </h2>
      <div className="mt-7 space-y-5 text-[17px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-[14px] font-bold text-primary-foreground">
        {n}
      </span>
      <div>
        <h3 className="text-[17px] font-bold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">
          {children}
        </p>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-card-border bg-card p-6">
      <Icon size={19} className="text-signal" />
      <h3 className="mt-4 text-[16px] font-bold tracking-tight text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <span className="text-[14px] font-medium text-muted-foreground">
        {label}
      </span>
      <span className="break-all font-mono text-[13px] text-foreground">
        {value || "Not configured"}
      </span>
    </div>
  );
}

export default function Docs() {
  return (
    <div className="liqo-rise">
      <div className="mb-14 max-w-2xl">
        <div className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Workspace <span className="text-border">/</span>{" "}
          <span className="text-foreground">Documentation</span>
        </div>
        <h1 className="text-[2.75rem] font-extrabold leading-[1.03] tracking-[-0.045em] text-foreground sm:text-6xl">
          How LI.QO handles your liquidity.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-muted-foreground">
          LI.QO holds nothing. It reads your Uniswap V3 positions, and lets you
          write down the exit you want in advance. Everything below describes
          exactly what that means on-chain.
        </p>
      </div>

      {/* Section nav */}
      <nav className="mb-16 flex flex-wrap gap-2" aria-label="On this page">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded-full bg-secondary px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="max-w-3xl space-y-16">
        <Section id="overview" eyebrow="Overview" title="What this is">
          <p>
            A concentrated liquidity position on Uniswap V3 earns fees only
            while the price stays inside the range you chose. Step outside it
            and the position stops earning, quietly, until someone notices.
          </p>
          <p>
            LI.QO is the layer that notices. It tracks each position you hold on{" "}
            {robinhoodChain.chainName}, shows the fees you have not collected,
            and lets you define a price boundary where an automated keeper
            closes the position on your behalf.
          </p>
          <div className="grid gap-4 pt-4 sm:grid-cols-3">
            <Fact icon={Layers} title="Reads your positions">
              Position NFTs are read straight from the Uniswap V3 position
              manager. Nothing is mirrored or cached off-chain.
            </Fact>
            <Fact icon={Clock} title="Waits for confirmation">
              An exit needs the price to stay out of range for five continuous
              minutes before anything happens.
            </Fact>
            <Fact icon={Wallet} title="Pays out to you">
              Collected assets go directly to the position owner's wallet. There
              is no intermediate account.
            </Fact>
          </div>
        </Section>

        <Section
          id="position"
          eyebrow="Getting started"
          title="Create a position"
        >
          <div className="space-y-7 pt-2">
            <Step n={1} title="Connect a wallet">
              Use the Connect button in the header. LI.QO asks for your address
              so it can read positions. Connecting on its own grants no spending
              permission.
            </Step>
            <Step n={2} title="Pick a range">
              On{" "}
              <Link
                href="/create"
                className="text-signal underline underline-offset-4"
              >
                Create LP
              </Link>
              , choose your two amounts and the lower and upper bound of the
              range. A narrower range earns more fees per dollar, and leaves
              range sooner.
            </Step>
            <Step n={3} title="Approve and mint">
              Your wallet signs two transactions: a token approval, then the
              mint. The resulting position NFT lands in your wallet.
            </Step>
            <Step n={4} title="Write the exit (optional)">
              Under{" "}
              <Link
                href="/automation"
                className="text-signal underline underline-offset-4"
              >
                Automation
              </Link>
              , set the side and the minimum output you will accept. This is the
              only step that involves the keeper.
            </Step>
          </div>
        </Section>

        <Section
          id="keeper"
          eyebrow="Automation"
          title="How the exit keeper works"
        >
          <p>
            The keeper watches the pool tick against the range you set. The rule
            it follows is deliberately slow:
          </p>
          <div className="rounded-[24px] border border-card-border bg-card p-7">
            <div className="flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Clock size={15} className="text-signal" /> The five minute rule
            </div>
            <p className="mt-4 text-[16px] leading-relaxed text-foreground">
              A position tick must stay outside the{" "}
              <strong className="font-semibold">same side</strong> of its range
              for five continuous minutes before an exit can execute.
            </p>
            <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
              If the price returns in range, the timer resets. If it crosses to
              the other side, the timer resets. A brief wick through your
              boundary will not trigger anything.
            </p>
          </div>
          <p>
            You also set a minimum output amount per side. If the swap cannot
            meet it, the exit does not execute. The keeper will not sell into a
            price you did not agree to.
          </p>
          {!keeperAddress || !isUniswapV3Configured ? (
            <div className="flex gap-4 rounded-[24px] border border-amber-300 bg-amber-50 p-6">
              <TriangleAlert
                size={19}
                className="mt-0.5 shrink-0 text-amber-700"
              />
              <div>
                <h3 className="text-[15px] font-bold text-amber-900">
                  Automation is not active in this deployment
                </h3>
                <p className="mt-1.5 text-[14px] leading-relaxed text-amber-800">
                  The keeper contract, a gas-funded operator, and a running
                  worker must all be verified before automated exits execute.
                  Until then, treat the automation screen as configuration only
                  and close positions manually.
                </p>
              </div>
            </div>
          ) : null}
        </Section>

        <Section id="custody" eyebrow="Custody" title="What LI.QO cannot do">
          <p>
            Automation is the part of a product like this that deserves the most
            scepticism, so the boundaries are worth stating plainly.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Fact icon={KeyRound} title="Approval is per position">
              You approve one NFT token ID at a time. The approval does not
              extend to your other positions, and you can revoke it whenever you
              want.
            </Fact>
            <Fact icon={ShieldCheck} title="The NFT stays with you">
              Your position NFT never leaves your wallet. LI.QO is granted
              permission to close a specific position, not to hold it.
            </Fact>
            <Fact icon={Wallet} title="Proceeds never route through us">
              Everything collected on exit is sent to the owner address. There
              is no treasury, vault, or holding account in the path.
            </Fact>
            <Fact icon={Bot} title="No price prediction">
              The keeper does not forecast anything. It only checks the rule you
              wrote against the pool tick.
            </Fact>
          </div>
          <div className="flex gap-4 rounded-[24px] bg-secondary p-6">
            <TriangleAlert
              size={19}
              className="mt-0.5 shrink-0 text-muted-foreground"
            />
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Providing liquidity carries impermanent loss. A position that
              exits at your boundary can still be worth less than simply holding
              the two tokens. LI.QO does not protect against that, and does not
              guarantee an exit will find liquidity at your minimum output.
            </p>
          </div>
        </Section>

        <Section id="network" eyebrow="Reference" title="Network & contracts">
          <p>
            The addresses this build is pointed at. Verify them on the explorer
            before approving anything.
          </p>
          <div className="rounded-[24px] border border-card-border bg-card px-7 py-2">
            <Row label="Chain" value={robinhoodChain.chainName} />
            <Row
              label="Chain ID"
              value={
                robinhoodChain.chainId ? String(robinhoodChain.chainId) : ""
              }
            />
            <Row label="RPC" value={robinhoodChain.rpcUrl} />
            <Row
              label="Position manager"
              value={robinhoodChain.uniswapV3PositionManager}
            />
            <Row label="Factory" value={robinhoodChain.uniswapV3Factory} />
            <Row
              label={`${robinhoodChain.token0Label} token`}
              value={robinhoodChain.token0Address}
            />
            <Row
              label={`${robinhoodChain.token1Label} token`}
              value={robinhoodChain.token1Address}
            />
            <Row label="Exit keeper" value={keeperAddress} />
          </div>
          {robinhoodChain.explorerUrl && (
            <a
              href={robinhoodChain.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[15px] font-medium text-signal underline underline-offset-4"
            >
              Open block explorer <ArrowUpRight size={15} />
            </a>
          )}
        </Section>

        <Section id="faq" eyebrow="FAQ" title="Common questions">
          <div className="space-y-8 pt-2">
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-foreground">
                Do I pay gas for the automated exit?
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed">
                No. The exit transaction is submitted by the keeper operator,
                which funds its own gas. You pay gas only for the actions you
                sign yourself.
              </p>
            </div>
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-foreground">
                How do I cancel an automated exit?
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed">
                Revoke the NFT approval for that token ID from your wallet. The
                keeper loses the permission it needs, immediately and without
                asking us.
              </p>
            </div>
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-foreground">
                What happens if the keeper is offline?
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed">
                Nothing executes. Your position stays exactly as it is and
                remains yours to close manually at any time. Automation is an
                addition to your control, never a replacement for it.
              </p>
            </div>
            <div>
              <h3 className="text-[17px] font-bold tracking-tight text-foreground">
                Can I still collect fees normally?
              </h3>
              <p className="mt-2 text-[15px] leading-relaxed">
                Yes. Configuring an exit changes nothing about how the position
                behaves day to day. Collect fees whenever you like from the
                position detail screen.
              </p>
            </div>
          </div>
        </Section>

        <div className="rounded-[32px] bg-primary p-9 sm:p-12">
          <h2 className="text-[1.75rem] font-extrabold leading-tight tracking-[-0.04em] text-primary-foreground sm:text-[2.25rem]">
            Ready to set a boundary?
          </h2>
          <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-primary-foreground/70">
            Open a position, choose a range, and decide the exit while you are
            calm rather than while the chart is moving.
          </p>
          <Link
            href="/create"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary-foreground px-6 py-3.5 text-[15px] font-semibold text-primary transition-opacity hover:opacity-90"
          >
            Create a position <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}
