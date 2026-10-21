// 자연 음성(TTS) — 구글 Cloud Text-to-Speech(Chirp 3 HD). 키(GOOGLE_TTS_KEY)가 있고 TTS=live 일 때만 켜진다.
// 꺼져 있으면 화면이 브라우저 내장 음성으로 대신 읽는다(무료, 남자 음성이 없는 기기가 많음).
// 비용: Chirp 3 HD 100만 자당 30달러, 매월 100만 자 무료. 같은 문장은 메모리에 보관해 다시 돈을 쓰지 않는다.
import { createHash } from 'node:crypto';

export const ttsLive = () => process.env.TTS === 'live' && !!process.env.GOOGLE_TTS_KEY;

// 상담사별 목소리(R5 V1) — 성별이 다른 목소리로 대신 읽지 않는다. 운영자가 청취 후 TTS_VOICE_<상담사id> 로 바꿀 수 있다.
// Chirp 3 HD 한국어 목소리 이름: https://cloud.google.com/text-to-speech/docs/chirp3-hd
type VoiceSpec = { name: string; gender: 'F' | 'M'; rate: number };
const PERSONA_VOICE: Record<string, VoiceSpec> = {
  harin: { name: 'ko-KR-Chirp3-HD-Achernar', gender: 'F', rate: 1.0 }, // 서월 — 20~30대 여성, 따뜻하고 차분하게
  seoyeon: { name: 'ko-KR-Chirp3-HD-Vindemiatrix', gender: 'F', rate: 0.97 }, // 서연 — 차분한 성숙감
  yeonhwa: { name: 'ko-KR-Chirp3-HD-Gacrux', gender: 'F', rate: 0.88 }, // 연화 할매 — 나이 든 여성 느낌(성숙한 목소리 + 느린 속도)
  baksa: { name: 'ko-KR-Chirp3-HD-Rasalgethi', gender: 'M', rate: 0.98 }, // 사주박사 — 중년 남성, 명료한 설명
  cheongun: { name: 'ko-KR-Chirp3-HD-Schedar', gender: 'M', rate: 0.97 }, // 청운 선생 — 중년 남성, 차분하고 현실적
  junho: { name: 'ko-KR-Chirp3-HD-Achird', gender: 'M', rate: 1.02 }, // 준호 — 20~30대 남성, 다정하게
};
const DEFAULT_VOICE = { F: () => process.env.TTS_VOICE_F || 'ko-KR-Chirp3-HD-Aoede', M: () => process.env.TTS_VOICE_M || 'ko-KR-Chirp3-HD-Charon' };
export function voiceOf(persona: string | null | undefined, gender: 'F' | 'M'): VoiceSpec {
  const p = persona ? PERSONA_VOICE[persona] : undefined;
  if (p && p.gender === gender) return { ...p, name: process.env[`TTS_VOICE_${persona!.toUpperCase()}`] || p.name };
  return { name: DEFAULT_VOICE[gender](), gender, rate: 1 };
}
export const TTS_MAX_CHARS = 1200;

const cache = new Map<string, Buffer>();
const CACHE_MAX = 400;
let monthKey = '';
let monthChars = 0; // 이번 달 사용 글자 수(서버 재시작 시 초기화 — 관리 화면 참고용)
export const ttsUsage = () => ({ month: monthKey, chars: monthChars });

/** 소리 내기 좋게 정리: 이모지·마크다운 기호·괄호 속 한자 제거, 번호 기호는 말로, 길이 제한 */
export function cleanForSpeech(text: string) {
  return text
    .replace(/\(\s*[\u4E00-\u9FFF]+\s*\)/g, '') // 서월(瑞月) → 서월
    .replace(/[①②③④⑤]/g, (c) => `${['첫째', '둘째', '셋째', '넷째', '다섯째']['①②③④⑤'.indexOf(c)]}, `)
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/[*#_`>~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TTS_MAX_CHARS);
}

export async function synthesize(text: string, gender: 'F' | 'M', http: typeof fetch = fetch, persona?: string | null): Promise<Buffer> {
  const t = cleanForSpeech(text);
  if (!t) throw new Error('읽을 글이 없어요');
  const v = voiceOf(persona, gender);
  const key = createHash('sha256').update(`${v.name}|${v.rate}|${t}`).digest('hex');
  const hit = cache.get(key);
  if (hit) return hit;
  const call = (rate: number | null) => http(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(process.env.GOOGLE_TTS_KEY ?? '')}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text: t }, voice: { languageCode: 'ko-KR', name: v.name }, audioConfig: { audioEncoding: 'MP3', ...(rate != null && rate !== 1 ? { speakingRate: rate } : {}) } }),
  });
  let res = await call(v.rate);
  if (res.status === 400 && v.rate !== 1) res = await call(null); // 속도 조절을 받지 않는 목소리면 기본 속도로
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
