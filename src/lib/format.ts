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

/** "31 Oct, 2:41 PM IST": how a time should read in tickets and messages, never a raw ISO timestamp. */
export function istTime(date: string | Date) {
  const d = new Date(date);
  const day = d.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  return `${day}, ${time} IST`;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Deep-copies a value with every ISO timestamp string turned into an IST time, for text an LLM will quote. */
export function humanizeTimes<T>(value: T): T {
  if (typeof value === "string") return (ISO.test(value) ? istTime(value) : value) as T;
  if (value instanceof Date) return istTime(value) as T;
  if (Array.isArray(value)) return value.map(humanizeTimes) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, humanizeTimes(v)])) as T;
  return value;
}
