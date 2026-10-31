import { Wordmark } from "@/components/Logo";
import { cn } from "@/lib/utils";
import type { AgentStatus } from "./Dashboard";

export function TopBar({
  agent,
  onToggle,
  embed,
}: {
  agent: AgentStatus;
  onToggle: () => void;
  embed?: boolean;
}) {
  const status = !agent.on ? "Paused" : agent.error ? "Retrying…" : "Watching payments";
  return (
    <header className={cn("bg-gradient-to-r from-navy via-navy to-navy-2 text-white", !embed && "sticky top-0 z-20 shadow-[0_1px_0_rgba(255,255,255,0.06)]")}>
      <div className={cn("mx-auto flex max-w-[1600px] items-center gap-3", embed ? "px-3 py-2" : "px-4 py-2.5 lg:px-6")}>
        <div className="flex min-w-0 items-center gap-3">
          <Wordmark className="shrink-0" />
          <span className="hidden border-l border-white/20 pl-3 text-xs font-medium leading-5 whitespace-nowrap text-white/60 lg:inline">Payments Ops console</span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.07] py-1 pr-1 pl-2.5 ring-1 ring-white/10 sm:gap-2.5 sm:pl-3">
            <span className="flex items-center gap-2 text-xs font-medium" aria-live="polite">
              <span className="relative flex size-2" title={status}>
                {agent.on && !agent.error && <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-60 motion-reduce:hidden" />}
                <span className={cn("relative inline-flex size-2 rounded-full", !agent.on ? "bg-white/40" : agent.error ? "bg-warn" : "bg-ok")} />
              </span>
              <span className="hidden whitespace-nowrap sm:inline sm:min-w-[118px]" title={agent.error ?? undefined}>
                {status}
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={agent.on}
              aria-label="Autonomous agent"
              onClick={onToggle}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-xs font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-sky"
            >
              Agent
              <span className={cn("relative h-5 w-9 rounded-full transition-colors", agent.on ? "bg-sky" : "bg-white/25")}>
                <span className={cn("absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform", agent.on && "translate-x-4")} />
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

