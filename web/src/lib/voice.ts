// 소리로 읽기 — 서버 자연 음성(켜져 있을 때) → 없으면 브라우저 내장 음성.
// 내장 음성은 기기마다 다르고, 윈도우·대부분 휴대폰에는 한국어 남자 음성이 없다.
// 그때 남자 상담사는 낮은 음높이로 대신 읽는다(근본 해결은 자연 음성).
import { API, userToken } from './api';

let ttsOn: Promise<boolean> | null = null;
const serverTts = () => (ttsOn ??= fetch(`${API}/health`).then((r) => r.json()).then((j) => !!j.tts).catch(() => false));

const MALE = /male|injoon|minsu|남/i;
const FEMALE = /female|yuna|heami|sun|여/i;
export const hasBrowserVoice = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

let audio: HTMLAudioElement | null = null;
let url: string | null = null;

export function stopVoice() {
  if (audio) { audio.pause(); audio = null; }
  if (url) { URL.revokeObjectURL(url); url = null; }
  if (hasBrowserVoice()) speechSynthesis.cancel();
}
export function pauseVoice() { if (audio) audio.pause(); else if (hasBrowserVoice()) speechSynthesis.pause(); }
export function resumeVoice() { if (audio) void audio.play(); else if (hasBrowserVoice()) speechSynthesis.resume(); }

function browserSpeak(text: string, gender: 'F' | 'M', rate: number, onEnd?: () => void) {
  if (!hasBrowserVoice()) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ko'));
  const male = gender === 'M';
  const exact = vs.find((x) => (male ? MALE.test(x.name) && !/female/i.test(x.name) : FEMALE.test(x.name)));
  const v = exact ?? vs[0];
  if (v) u.voice = v;
  u.rate = rate;
  // 남자 상담사인데 남자 음성이 없으면 음높이를 낮춰 성별이 어긋나지 않게
  u.pitch = male && !exact ? 0.7 : 1.02;
  if (onEnd) u.onend = onEnd;
  speechSynthesis.speak(u);
  return true;
}

/** 읽기 시작. 성공하면 true(소리를 낼 방법이 전혀 없으면 false). */
export async function speak(text: string, gender: 'F' | 'M', opts: { rate?: number; onEnd?: () => void } = {}): Promise<boolean> {
  stopVoice();
  const rate = opts.rate ?? 1;
  if (await serverTts()) {
    try {
      const r = await fetch(`${API}/tts`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await userToken()}` }, body: JSON.stringify({ text, gender }) });
      if (r.ok) {
        url = URL.createObjectURL(await r.blob());
        audio = new Audio(url);
        audio.playbackRate = rate;
        audio.onended = () => { opts.onEnd?.(); stopVoice(); };
        await audio.play();
        return true;
      }
    } catch { /* 브라우저 음성으로 */ }
  }
  return browserSpeak(text, gender, rate, opts.onEnd);
}
