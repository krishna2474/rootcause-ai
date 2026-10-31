import { ArrowLeft, Bell, Headset, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wordmark } from "./Wordmark";

export const iconBtn =
  "relative grid size-9 place-items-center rounded-full text-navy transition hover:bg-sky-soft active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky";

function initials(name?: string) {
  return (name ?? "").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function AppHeader(props: {
  name?: string;
  unread: number;
  title: string | null;
  onBack: () => void;
  onBell: () => void;
  onHelp: () => void;
  onLang: () => void;
  hideHelp: boolean;
}) {
  const { name, unread, title } = props;
  return (
    <header className="z-20 shrink-0 bg-card pt-[env(safe-area-inset-top)] shadow-[0_1px_0_var(--line)]">
      <div className="flex h-14 items-center gap-2 px-3">
        {title ? (
          <>
            <button type="button" onClick={props.onBack} aria-label="Back to home" className={iconBtn}>
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="flex-1 truncate text-[17px] font-bold text-navy">{title}</h1>
          </>
        ) : (
          <>
            <span
              aria-label={name ? `Profile: ${name}` : "Profile"}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-sky to-navy-2 text-[13px] font-bold text-white ring-2 ring-sky-soft"
            >
              {initials(name) || "·"}
            </span>
            <div className="flex flex-1 justify-center">
              <Wordmark />
            </div>
          </>
        )}
        {!title && (
          <button type="button" onClick={props.onLang} aria-label="Change language" className={iconBtn}>
            <Languages className="size-[22px]" />
          </button>
        )}
        <button type="button" onClick={props.onBell} aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"} className={iconBtn}>
          <Bell className="size-[22px]" />
          {unread > 0 && (
            <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-bad px-1 text-[10px] font-bold leading-none text-white ring-2 ring-card">
              {unread}
            </span>
          )}
        </button>
        <button type="button" onClick={props.onHelp} aria-label="Help and support" className={cn(iconBtn, props.hideHelp && "hidden")}>
          <Headset className="size-[22px]" />
        </button>
      </div>
    </header>
  );
}
