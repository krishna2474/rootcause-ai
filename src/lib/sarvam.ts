// Thin wrappers over Sarvam AI REST APIs. All return null when SARVAM_API_KEY is missing,
// so the app keeps working with typed text instead of voice.
const BASE = "https://api.sarvam.ai";

function key() {
  return process.env.SARVAM_API_KEY || "";
}

export function sarvamEnabled() {
  return Boolean(key());
}

/** "hi" -> "hi-IN". Sarvam uses BCP-47 codes with the -IN region. */
export function toSarvamLang(lang: string) {
  return lang.includes("-") ? lang : `${lang}-IN`;
}

export async function speechToText(audio: Blob, filename = "note.webm"): Promise<{ text: string; language: string } | null> {
  if (!sarvamEnabled()) return null;
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", "saarika:v2.5");
  form.append("language_code", "unknown"); // auto-detect
  const res = await fetch(`${BASE}/speech-to-text`, {
    method: "POST",
    headers: { "api-subscription-key": key() },
    body: form,
  });
  if (!res.ok) throw new Error(`Sarvam STT failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { transcript: string; language_code?: string };
  return { text: data.transcript, language: (data.language_code || "hi-IN").split("-")[0] };
}

export async function translate(text: string, from: string, to: string): Promise<string | null> {
  if (!sarvamEnabled() || from === to) return null;
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: { "api-subscription-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({
      input: text,
      source_language_code: toSarvamLang(from),
      target_language_code: toSarvamLang(to),
      model: "mayura:v1",
    }),
  });
  if (!res.ok) throw new Error(`Sarvam translate failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { translated_text: string };
  return data.translated_text;
}

/** Returns base64 WAV audio, or null. */
export async function textToSpeech(text: string, lang: string): Promise<string | null> {
  if (!sarvamEnabled()) return null;
  const res = await fetch(`${BASE}/text-to-speech`, {
    method: "POST",
    headers: { "api-subscription-key": key(), "Content-Type": "application/json" },
    body: JSON.stringify({ text, target_language_code: toSarvamLang(lang), model: "bulbul:v2", speaker: "anushka" }),
  });
  if (!res.ok) throw new Error(`Sarvam TTS failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { audios: string[] };
  return data.audios?.[0] ?? null;
}
