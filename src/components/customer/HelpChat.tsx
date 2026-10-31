"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, SendHorizontal, Sparkles, Square, UserRound } from "lucide-react";
import type { CustomerData } from "@/lib/queries";
import { clock } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ChatMsg } from "./types";

const SAMPLE_VOICE = "मेरा पेमेंट फेल हो गया लेकिन पैसे कट गए, क्या हुआ?";
const QUICK = ["My payment failed", "पेमेंट फेल हो गया", "Refund status"];
const DEVANAGARI = /[ऀ-ॿ]/;

type Pending = { text: string; base: number; voice: boolean };

export function HelpChat(props: {
  data: CustomerData;
  refresh: () => Promise<void>;
  draft: string;
  setDraft: (s: string) => void;
  toast: (msg: string) => void;
}) {
  const { data, refresh, draft, setDraft, toast } = props;
  const [pending, setPending] = useState<Pending | null>(null);
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const msgs = data.messages;
  // The server saves the user's message first, then the reply; derive what's still in flight from that.
  const showPendingUser = pending && msgs.length <= pending.base;
  const typing = pending && !msgs.slice(pending.base).some((m) => m.role !== "user");
  const busy = sending || recording;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [msgs.length, showPendingUser, typing]);

  // A prefilled complaint (from History) lands in the input, ready to send.
  useEffect(() => {
    if (draft) input.current?.focus();
  }, [draft]);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), []);

  async function post(url: string, init: RequestInit, p: Omit<Pending, "base">) {
    setPending({ ...p, base: msgs.length });
    setSending(true);
    try {
      const res = await fetch(url, init);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw Object.assign(new Error(body.error ?? "Couldn't send. Try again."), { status: res.status });
      }
    } catch (e) {
      setPending(null);
      throw e;
    } finally {
      setSending(false);
      refresh();
    }
  }

  async function sendText(text: string, channel: "CHAT" | "VOICE" = "CHAT") {
    const t = text.trim();
    if (!t || sending) return;
    setDraft("");
    await post(
      "/api/complaints",
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: t, channel }) },
      { text: t, voice: channel === "VOICE" },
    ).catch((e: Error) => toast(e.message));
  }

  const sendSample = (why: string) => {
    toast(why);
    sendText(SAMPLE_VOICE, "VOICE");
  };

  async function sendAudio(blob: Blob) {
    const form = new FormData();
    form.append("audio", blob, "note.webm");
    try {
      await post("/api/complaints/voice", { method: "POST", body: form }, { text: "", voice: true });
    } catch (e) {
      if ((e as { status?: number }).status === 503) sendSample("Voice needs Sarvam — sending a sample voice note");
      else toast((e as Error).message);
    }
  }

  async function onMic() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    if (sending) return;
    if (!data.config.sarvam) return sendSample("Voice needs Sarvam — sending a sample voice note");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size) sendAudio(blob);
      };
      recorder.current = rec;
      rec.start();
      setSecs(0);
      setRecording(true);
    } catch {
      sendSample("Microphone unavailable — sending a sample voice note");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 py-4" aria-live="polite">
        <div className="mx-auto w-fit rounded-full bg-card px-3 py-1 text-[11px] font-medium text-ink-3 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
          Chat is answered instantly by our AI assistant
        </div>

        {msgs.length === 0 && !pending && (
          <div className="rc-fade-up flex flex-col items-center px-4 pt-6 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-gradient-to-br from-sky to-navy-2 text-white shadow-[0_8px_20px_-8px_rgba(0,186,242,0.8)]">
              <Sparkles className="size-7" aria-hidden />
            </span>
            <p className="mt-3 text-[16px] font-bold text-navy">Hi {data.user.name.split(" ")[0]}, how can we help?</p>
            <p className="mt-1 text-[13px] leading-snug text-ink-2">
              Ask about any payment in English or Hindi. Type, or tap the mic to send a voice note.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => sendText(q)}
                  lang={DEVANAGARI.test(q) ? "hi" : "en"}
                  className="h-9 rounded-full border border-sky/50 bg-card px-4 text-[13px] font-semibold text-navy transition hover:bg-sky-soft active:scale-[.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
        {showPendingUser && (
          <Bubble m={{ id: "pending", role: "user", text: pending.text, language: "", createdAt: new Date().toISOString() }} voice={pending.voice} sending />
        )}
        {typing && <Typing />}
      </div>

      <form
        className="flex shrink-0 items-center gap-2 border-t border-line bg-card px-3 pt-2 pb-[calc(8px+env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault();
          sendText(draft);
        }}
      >
        {recording ? (
          <div className="flex h-11 flex-1 items-center gap-2 rounded-full bg-bad-soft px-4 text-[13px] font-semibold text-bad" role="status">
            <span className="size-2.5 animate-pulse rounded-full bg-bad motion-reduce:animate-none" aria-hidden />
            Recording <span className="tabular">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
            <span className="ml-auto text-[12px] font-medium text-bad/80">Tap stop to send</span>
          </div>
        ) : (
          <input
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your message…"
            aria-label="Message"
            disabled={sending}
            className="h-11 min-w-0 flex-1 rounded-full border border-transparent bg-page px-4 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-sky focus:bg-card disabled:opacity-60"
          />
        )}
        <button
          type="button"
          onClick={onMic}
          disabled={sending}
          aria-label={recording ? "Stop and send voice note" : "Record a voice note"}
          aria-pressed={recording}
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-full transition active:scale-95 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky",
            recording ? "bg-bad text-white" : "bg-sky-soft text-navy hover:bg-sky/20",
          )}
        >
          {recording ? <Square className="size-4 fill-current" /> : <Mic className="size-5" />}
        </button>
        {!recording && (
          <button
            type="submit"
            disabled={!draft.trim() || busy}
            aria-label="Send message"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-sky text-white shadow-[0_4px_10px_-4px_rgba(0,186,242,0.8)] transition active:scale-95 disabled:bg-line disabled:text-ink-3 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky"
          >
            <SendHorizontal className="size-5" />
          </button>
        )}
      </form>
    </div>
  );
}

function Bubble({ m, voice, sending }: { m: ChatMsg; voice?: boolean; sending?: boolean }) {
  const hi = m.language === "hi" || DEVANAGARI.test(m.text);
  const text = cn("whitespace-pre-wrap break-words", hi ? "text-[15px] leading-relaxed" : "text-[14px] leading-snug");

  if (m.role === "user") {
    return (
      <div className="rc-fade-up flex justify-end pl-12">
        <div lang={hi ? "hi" : "en"} className="rounded-2xl rounded-br-md bg-sky px-3.5 py-2 text-white shadow-[0_2px_6px_-3px_rgba(0,186,242,0.8)]">
          {voice && (
            <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-white/85">
              <Mic className="size-3" aria-hidden /> Voice note{!m.text && " · transcribing…"}
            </p>
          )}
          {m.text && <p className={text}>{m.text}</p>}
          <p className="mt-0.5 text-right text-[10px] text-white/75">{sending ? "Sending…" : clock(m.createdAt)}</p>
        </div>
      </div>
    );
  }

  const human = m.role === "human";
  return (
    <div className="rc-fade-up flex gap-2 pr-10">
      <Avatar human={human} />
      <div className="min-w-0">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-ink-2">
          {human ? "Support team" : "Paytm Assistant"}
          {!human && <span className="rounded bg-sky-soft px-1 py-px text-[9px] font-bold tracking-wide text-sky">AI</span>}
        </p>
        <div lang={hi ? "hi" : "en"} className="rounded-2xl rounded-tl-md bg-card px-3.5 py-2 text-ink shadow-[0_1px_2px_rgba(16,24,40,0.08)]">
          <p className={text}>{m.text}</p>
          <p className="mt-0.5 text-[10px] text-ink-3">{clock(m.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

function Avatar({ human }: { human?: boolean }) {
  return (
    <span
      className={cn(
        "mt-5 grid size-7 shrink-0 place-items-center rounded-full text-white",
        human ? "bg-navy" : "bg-gradient-to-br from-sky to-navy-2",
      )}
      aria-hidden
    >
      {human ? <UserRound className="size-4" /> : <Sparkles className="size-3.5" />}
    </span>
  );
}

function Typing() {
  return (
    <div className="rc-fade-up flex gap-2" role="status" aria-label="Assistant is typing">
      <Avatar />
      <div className="min-w-0">
        <p className="mb-1 text-[11px] font-semibold text-ink-2">Paytm Assistant</p>
        <div className="flex h-9 items-center gap-1 rounded-2xl rounded-tl-md bg-card px-4 shadow-[0_1px_2px_rgba(16,24,40,0.08)]">
          {[0, 1, 2].map((i) => (
            <span key={i} className="rc-dot size-1.5 rounded-full bg-sky" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
