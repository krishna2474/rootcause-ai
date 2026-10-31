import { cn } from "@/lib/utils";

// Text wordmark in Paytm's brand colours (navy "pay", sky "tm"). No logo artwork is used.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span aria-label="Paytm" className={cn("text-[24px] font-extrabold lowercase leading-none tracking-[-0.04em]", className)}>
      <span className="text-navy">pay</span>
      <span className="text-sky">tm</span>
    </span>
  );
}
