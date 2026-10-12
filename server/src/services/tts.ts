// 자연 음성(TTS) — 구글 Cloud Text-to-Speech(Chirp 3 HD). 키(GOOGLE_TTS_KEY)가 있고 TTS=live 일 때만 켜진다.
// 꺼져 있으면 화면이 브라우저 내장 음성으로 대신 읽는다(무료, 남자 음성이 없는 기기가 많음).
// 비용: Chirp 3 HD 100만 자당 30달러, 매월 100만 자 무료. 같은 문장은 메모리에 보관해 다시 돈을 쓰지 않는다.
import { createHash } from 'node:crypto';

export const ttsLive = () => process.env.TTS === 'live' && !!process.env.GOOGLE_TTS_KEY;

// 상담사 성별별 목소리(필요하면 TTS_VOICE_F / TTS_VOICE_M 으로 바꿈)
const VOICE = {
  F: () => process.env.TTS_VOICE_F || 'ko-KR-Chirp3-HD-Aoede',
  M: () => process.env.TTS_VOICE_M || 'ko-KR-Chirp3-HD-Charon',
};
export const TTS_MAX_CHARS = 1200;

const cache = new Map<string, Buffer>();
const CACHE_MAX = 400;
let monthKey = '';
let monthChars = 0; // 이번 달 사용 글자 수(서버 재시작 시 초기화 — 관리 화면 참고용)
export const ttsUsage = () => ({ month: monthKey, chars: monthChars });

/** 소리 내기 좋게 정리: 이모지·마크다운 기호 제거, 길이 제한 */
export function cleanForSpeech(text: string) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[*#_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TTS_MAX_CHARS);
}

export async function synthesize(text: string, gender: 'F' | 'M', http: typeof fetch = fetch): Promise<Buffer> {
  const t = cleanForSpeech(text);
  if (!t) throw new Error('읽을 글이 없어요');
  const voice = VOICE[gender]();
  const key = createHash('sha256').update(`${voice}|${t}`).digest('hex');
  const hit = cache.get(key);
  if (hit) return hit;
  const res = await http(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_KEY ?? '')}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text: t }, voice: { languageCode: 'ko-KR', name: voice }, audioConfig: { audioEncoding: 'MP3' } }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  const j = (await res.json()) as { audioContent?: string };
  if (!j.audioContent) throw new Error('TTS 응답 없음');
  const buf = Buffer.from(j.audioContent, 'base64');
  const m = new Date().toISOString().slice(0, 7);
  if (m !== monthKey) { monthKey = m; monthChars = 0; }
  monthChars += t.length;
  cache.set(key, buf);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return buf;
}
