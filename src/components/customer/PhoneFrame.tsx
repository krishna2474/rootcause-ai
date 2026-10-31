import { BatteryFull, SignalHigh, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Desktop: a tall, height-driven phone (390:844) with bezel, side buttons, island and home bar.
 * Phones (<= 480px) and `embed`: full-bleed. Children fill the screen as a flex column.
 */
export function PhoneFrame({ embed, children }: { embed: boolean; children: React.ReactNode }) {
  if (embed) {
    return <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-page">{children}</div>;
  }
  return (
    <div className="min-[481px]:flex min-[481px]:min-h-dvh min-[481px]:items-center min-[481px]:justify-center min-[481px]:bg-[radial-gradient(ellipse_at_top,#e5f7fd,#f3f6fa_60%)] min-[481px]:py-4">
      <div
        className={cn(
          "rc-phone relative w-full",
          // Height drives size so the phone is always tall; width follows from the aspect ratio.
          "min-[481px]:aspect-[390/844] min-[481px]:h-[min(900px,calc(100dvh-32px))] min-[481px]:w-auto",
          "min-[481px]:rounded-[58px] min-[481px]:bg-[#0b1220] min-[481px]:p-[11px]",
          "min-[481px]:shadow-[inset_0_0_0_2px_#2a3445,0_40px_90px_-25px_rgba(0,46,110,0.55),0_8px_20px_rgba(11,18,32,0.25)]",
        )}
      >
        {/* Side buttons */}
        <span aria-hidden className="absolute -left-[3px] top-[120px] hidden h-8 w-[3px] rounded-l bg-[#2a3445] min-[481px]:block" />
        <span aria-hidden className="absolute -left-[3px] top-[180px] hidden h-14 w-[3px] rounded-l bg-[#2a3445] min-[481px]:block" />
        <span aria-hidden className="absolute -left-[3px] top-[252px] hidden h-14 w-[3px] rounded-l bg-[#2a3445] min-[481px]:block" />
        <span aria-hidden className="absolute -right-[3px] top-[200px] hidden h-20 w-[3px] rounded-r bg-[#2a3445] min-[481px]:block" />

        <div className="relative flex h-dvh w-full flex-col overflow-hidden bg-page min-[481px]:h-full min-[481px]:rounded-[47px]">
          {/* Faux status bar, only inside the desktop frame */}
          <div className="relative hidden h-12 shrink-0 items-end justify-between bg-card px-8 pb-1.5 text-[14px] font-semibold text-ink min-[481px]:flex">
            <span className="tabular">9:41</span>
            <span aria-hidden className="absolute left-1/2 top-2.5 h-[30px] w-[108px] -translate-x-1/2 rounded-full bg-[#0b1220]" />
            <span className="flex items-center gap-1" aria-hidden>
              <SignalHigh className="size-4" strokeWidth={2.5} />
              <Wifi className="size-4" strokeWidth={2.5} />
              <BatteryFull className="size-5" strokeWidth={2} />
            </span>
          </div>
          {children}
          {/* Home indicator */}
          <span aria-hidden className="pointer-events-none absolute bottom-1.5 left-1/2 z-50 hidden h-1 w-[120px] -translate-x-1/2 rounded-full bg-ink/80 min-[481px]:block" />
        </div>
      </div>
      <style>{`.rc-phone *{scrollbar-width:none}.rc-phone *::-webkit-scrollbar{display:none}`}</style>
    </div>
  );
}
