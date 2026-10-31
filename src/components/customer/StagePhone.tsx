"use client";

import { useEffect, useState } from "react";
import { BatteryFull, SignalHigh, Wifi } from "lucide-react";

const W = 390;
const H = 844;
const BEZEL = 11;

/** Stage-view phone: the app renders at a true 390x844 and the whole device is scaled to fit the screen height. */
export function StagePhone() {
  const [scale, setScale] = useState(0.9);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 80) / (H + BEZEL * 2)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const outerW = (W + BEZEL * 2) * scale;
  const outerH = (H + BEZEL * 2) * scale;
  return (
    <div style={{ width: outerW, height: outerH }}>
      <div
        className="relative origin-top-left rounded-[58px] bg-[#0b1220] shadow-[inset_0_0_0_2px_#2a3445,0_40px_90px_-25px_rgba(0,0,0,0.6)]"
        style={{ width: W + BEZEL * 2, height: H + BEZEL * 2, padding: BEZEL, transform: `scale(${scale})` }}
      >
        <span aria-hidden className="absolute -left-[3px] top-[120px] h-8 w-[3px] rounded-l bg-[#2a3445]" />
        <span aria-hidden className="absolute -left-[3px] top-[180px] h-14 w-[3px] rounded-l bg-[#2a3445]" />
        <span aria-hidden className="absolute -left-[3px] top-[252px] h-14 w-[3px] rounded-l bg-[#2a3445]" />
        <span aria-hidden className="absolute -right-[3px] top-[200px] h-20 w-[3px] rounded-r bg-[#2a3445]" />
        <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[47px] bg-page">
          <div className="relative flex h-12 shrink-0 items-end justify-between bg-card px-8 pb-1.5 text-[14px] font-semibold text-ink">
            <span className="tabular">9:41</span>
            <span aria-hidden className="absolute left-1/2 top-2.5 h-[30px] w-[108px] -translate-x-1/2 rounded-full bg-[#0b1220]" />
            <span className="flex items-center gap-1" aria-hidden>
              <SignalHigh className="size-4" strokeWidth={2.5} />
              <Wifi className="size-4" strokeWidth={2.5} />
              <BatteryFull className="size-5" strokeWidth={2} />
            </span>
          </div>
          <iframe src="/app?embed=1" title="Customer app" className="min-h-0 w-full flex-1 border-0 bg-page" />
          <span aria-hidden className="pointer-events-none absolute bottom-1.5 left-1/2 z-50 h-1 w-[120px] -translate-x-1/2 rounded-full bg-ink/80" />
        </div>
      </div>
    </div>
  );
}
