import { cn } from "@/lib/utils";

/**
 * RootCause mark: a payment-health pulse that dips, then lands on one solid dot, the root cause.
 * The same drawing is in src/app/icon.svg (the favicon), so keep them in step.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="9" fill="#00baf2" />
      <path d="M4.5 17H9l2.6-7.5 3.6 13 3-9H21" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="26" cy="16" r="3" fill="#002e6e" />
    </svg>
  );
}

/** Mark + name, for dark (navy) backgrounds. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="text-[18px] font-extrabold leading-none tracking-[-0.03em] text-white">
        Root<span className="text-sky">Cause</span>
      </span>
      <span className="rounded-md bg-sky px-1.5 py-1 text-[10.5px] font-extrabold leading-none tracking-wider text-navy">AI</span>
    </span>
  );
}
