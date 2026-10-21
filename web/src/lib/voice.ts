// 소리로 읽기 — 서버 자연 음성(켜져 있을 때, 상담사마다 정해진 목소리) → 없으면 브라우저 내장 음성.
// R5 V1·V2: ① 다른 성별 목소리로 대신 읽지 않는다(남자 음성이 없는 기기에서는 "준비하지 못했어요")
// ② 새로 읽거나 멈추거나 상담사를 바꾸면 이전 소리는 바로 끊는다(늦게 도착한 음성도 버림)
// ③ 읽는 중인지 화면이 알 수 있게 알린다(멈추기·다시 듣기 버튼)
import { API, userToken } from './api';

let ttsOn: Promise<boolean> | null = null;
const serverTts = () => (ttsOn ??= fetch(`${API}/health`).then((r) => r.json()).then((j) => !!j.tts).catch(() => false));

const MALE = /male|injoon|minsu|남/i;
const FEMALE = /female|yuna|heami|sun|여/i;
export const hasBrowserVoice = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

let audio: HTMLAudioElement | null = null;
let url: string | null = null;
let seq = 0; // 가장 최근 읽기 요청 번호 — 이보다 오래된 음성은 재생하지 않는다
let playing = false;
const subs = new Set<(on: boolean) => void>();
const setPlaying = (on: boolean) => { playing = on; subs.forEach((f) => f(on)); };
export const isPlaying = () => playing;
export function onVoiceChange(f: (on: boolean) => void) { subs.add(f); return () => { subs.delete(f); }; }

export function stopVoice() {
  seq++;
  if (audio) { audio.onended = null; audio.pause(); audio = null; }
  if (url) { URL.revokeObjectURL(url); url = null; }
  if (hasBrowserVoice()) speechSynthesis.cancel();
  if (playing) setPlaying(false);
}
export function pauseVoice() { if (audio) audio.pause(); else if (hasBrowserVoice()) speechSynthesis.pause(); }
export function resumeVoice() { if (audio) void audio.play(); else if (hasBrowserVoice()) speechSynthesis.resume(); }

/** 브라우저 음성 — 상담사 성별과 맞는 한국어 목소리가 없으면 읽지 않는다 */
function browserSpeak(text: string, gender: 'F' | 'M', rate: number, onEnd?: () => void): 'ok' | 'no-voice' | 'unsupported' {
  if (!hasBrowserVoice()) return 'unsupported';
  speechSynthesis.cancel();
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('ko'));
  const male = gender === 'M';
  const exact = vs.find((x) => (male ? MALE.test(x.name) && !/female/i.test(x.name) : FEMALE.test(x.name) || !MALE.test(x.name)));
  if (!exact) return 'no-voice';
  const u = new SpeechSynthesisUtterance(text.replace(/\(\s*[一-鿿]+\s*\)/g, '').replace(/[①②③④⑤]/g, (c) => `${['첫째', '둘째', '셋째', '넷째', '다섯째']['①②③④⑤'.indexOf(c)]}, `));
  u.lang = 'ko-KR';
  u.voice = exact;
  u.rate = rate;
  const my = seq;
  u.onend = () => { if (my === seq) { setPlaying(false); onEnd?.(); } };
  u.onerror = () => { if (my === seq) setPlaying(false); };
  speechSynthesis.speak(u);
  setPlaying(true);
  return 'ok';
}

export type SpeakResult = 'ok' | 'no-voice' | 'unsupported' | 'stale';
/** 읽기 시작. persona 를 주면 서버가 그 상담사 목소리로 읽는다. */
export async function speak(text: string, gender: 'F' | 'M', opts: { rate?: number; onEnd?: () => void; persona?: string } = {}): Promise<SpeakResult> {
  stopVoice();
  const my = seq;
  const rate = opts.rate ?? 1;
  if (await serverTts()) {
    try {
      const r = await fetch(`${API}/tts`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${await userToken()}` }, body: JSON.stringify({ text, gender, persona: opts.persona }) });
      if (my !== seq) return 'stale'; // 그사이 멈추거나 다른 음성을 요청함
      if (r.ok) {
        const blob = await r.blob();
        if (my !== seq) return 'stale';
        url = URL.createObjectURL(blob);
        audio = new Audio(url);
        audio.onended = () => { if (my === seq) { setPlaying(false); opts.onEnd?.(); stopVoice(); } };
        setPlaying(true);
        await audio.play();
        return 'ok';
      }
    } catch { /* 브라우저 음성으로 */ }
    if (my !== seq) return 'stale';
  }
  return browserSpeak(text, gender, rate, opts.onEnd);
}
/** 화면에 보여 줄 안내 문장 */
export const voiceFailText = (r: SpeakResult, name: string) => (r === 'no-voice' ? `이 기기에서는 ${name}의 목소리를 준비하지 못했어요. 글로 읽어 주세요.` : r === 'unsupported' ? '이 브라우저에서는 소리로 읽기가 어려워요. 글로 읽어 주세요.' : '');
