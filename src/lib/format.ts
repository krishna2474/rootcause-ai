/** Amounts are stored in paise. */
export function rupees(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function maskPhone(phone: string) {
  return phone.replace(/^(\+91)?(\d{2})\d{6}(\d{2})$/, (_m, cc, a, b) => `${cc ?? ""}${a}xxxxxx${b}`);
}

export function timeAgo(date: string | Date) {
  const s = Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

export function clock(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}
