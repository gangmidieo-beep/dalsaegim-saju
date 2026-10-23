// 자연 음성(TTS) — TTS=live 일 때만 켜진다. 꺼져 있으면 화면이 브라우저 내장 음성으로 대신 읽는다(무료, 남자 음성이 없는 기기가 많음).
// 엔진 두 가지(D74):
//  ① 타입캐스트(TYPECAST_API_KEY) — 한국어가 가장 자연스럽고 할머니·할아버지 같은 나이대 목소리가 있다. 키가 있으면 이쪽이 먼저.
//     비용: 1글자 = 1크레딧. Lite 월 15달러에 20만 자(넘으면 10만 자당 9달러). 무료 요금제 음성은 상업적 사용 불가.
//  ② 구글 Chirp 3 HD(GOOGLE_TTS_KEY) — 100만 자당 30달러, 매월 100만 자 무료.
// 같은 문장은 메모리에 보관해 다시 돈을 쓰지 않는다. TTS_PROVIDER=google|typecast 로 강제 선택 가능.
import { createHash } from 'node:crypto';

export type TtsProvider = 'typecast' | 'google';
export function ttsProvider(): TtsProvider | null {
  if (process.env.TTS !== 'live') return null;
  const tc = !!process.env.TYPECAST_API_KEY, gg = !!process.env.GOOGLE_TTS_KEY;
  const want = process.env.TTS_PROVIDER;
  if (want === 'google' && gg) return 'google';
  if (want === 'typecast' && tc) return 'typecast';
  return tc ? 'typecast' : gg ? 'google' : null;
}
export const ttsLive = () => ttsProvider() != null;

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

// ── 타입캐스트 ──────────────────────────────────────────────
// 상담사마다 '성별 + 나이대'로 목소리를 고른다. 처음 한 번 목소리 목록(GET /v3/voices)에서 조건에 맞는 첫 목소리를 골라 기억.
// 운영자가 청취 후 Railway 변수 TYPECAST_VOICE_<상담사id>=tc_xxx 로 바꿀 수 있다(관리자 /admin/api/tts/voices 에서 후보 확인).
type Age = 'young_adult' | 'middle_age' | 'elder';
type TcSpec = { gender: 'F' | 'M'; age: Age; tempo: number; pitch: number };
export const TC_PERSONA: Record<string, TcSpec> = {
  harin: { gender: 'F', age: 'young_adult', tempo: 1.0, pitch: 0 }, // 서월 — 20~30대 여성, 따뜻하고 차분하게
  seoyeon: { gender: 'F', age: 'middle_age', tempo: 0.97, pitch: 0 }, // 서연 — 차분한 성숙감
  yeonhwa: { gender: 'F', age: 'elder', tempo: 0.9, pitch: 0 }, // 연화 할매 — 할머니 목소리, 천천히
  baksa: { gender: 'M', age: 'middle_age', tempo: 1.0, pitch: 0 }, // 사주박사 — 중년 남성, 명료하게
  cheongun: { gender: 'M', age: 'elder', tempo: 0.93, pitch: 0 }, // 청운 선생 — 할아버지 목소리, 느긋하게
  junho: { gender: 'M', age: 'young_adult', tempo: 1.02, pitch: 0 }, // 준호 — 20~30대 남성, 다정하게
};
const TC_BASE = 'https://api.typecast.ai';
const TC_MODEL = () => process.env.TYPECAST_MODEL || 'ssfm-v30';
const tcHeaders = () => ({ 'X-API-KEY': process.env.TYPECAST_API_KEY ?? '', 'content-type': 'application/json' });
export type TcVoice = { voice_id: string; voice_name?: { kor?: string; eng?: string }; gender?: string | null; age?: string | null; voice_type?: string; preview_url?: string | null; use_cases?: string[] };
const tcList = new Map<string, Promise<TcVoice[]>>();
/** 조건에 맞는 기본 목소리 목록(성공한 결과만 기억) */
export function tcVoices(gender: 'F' | 'M', age: Age | null, http: typeof fetch = fetch): Promise<TcVoice[]> {
  const k = `${gender}|${age ?? ''}`;
  let p = tcList.get(k);
  if (!p) {
    const q = new URLSearchParams({ model: TC_MODEL(), gender: gender === 'M' ? 'male' : 'female', voice_type: 'original' });
    if (age) q.set('age', age);
    p = http(`${TC_BASE}/v3/voices?${q}`, { headers: tcHeaders() }).then(async (r) => {
      if (!r.ok) throw new Error(`Typecast voices ${r.status}`);
      const j = (await r.json()) as TcVoice[];
      return (Array.isArray(j) ? j : []).filter((v) => v.voice_id?.startsWith('tc_') && (!v.gender || v.gender === (gender === 'M' ? 'male' : 'female')));
    });
    p.catch(() => tcList.delete(k));
    tcList.set(k, p);
  }
  return p;
}
// 상담에 어울리는 목소리 먼저(오디오북·대화·내레이션), 게임·애니·광고처럼 과장된 목소리는 뒤로
const CALM = /audiobook|conversation|narrat|documentar|educat|news|podcast|story|meditat|counsel|calm|e-?learning/i;
const LOUD = /game|anime|cartoon|kid|child|ads?$|advert|promo|comic|horror|sport/i;
const logged = new Set<string>();
export function pickVoice(list: TcVoice[]): TcVoice {
  const score = (v: TcVoice) => (v.use_cases ?? []).reduce((n, u) => n + (CALM.test(u) ? 2 : 0) - (LOUD.test(u) ? 3 : 0), 0);
  return list.map((v, i) => ({ v, i, s: score(v) })).sort((a, b) => b.s - a.s || a.i - b.i)[0].v;
}
/** 상담사 → 타입캐스트 목소리(id·속도·높낮이). 성별이 다른 목소리로 대신 읽지 않는다. */
export async function tcVoiceOf(persona: string | null | undefined, gender: 'F' | 'M', http: typeof fetch = fetch) {
  const p = persona ? TC_PERSONA[persona] : undefined;
  const spec: TcSpec = p && p.gender === gender ? p : { gender, age: 'young_adult', tempo: 1, pitch: 0 };
  const own = p && p.gender === gender ? process.env[`TYPECAST_VOICE_${persona!.toUpperCase()}`] : undefined;
  const fixed = own || (!(p && p.gender === gender) ? process.env[`TYPECAST_VOICE_${gender}`] : undefined);
  if (fixed) return { id: fixed, tempo: spec.tempo, pitch: spec.pitch };
  let list = await tcVoices(gender, spec.age, http);
  if (!list.length) list = await tcVoices(gender, null, http); // 그 나이대가 없으면 같은 성별 아무 목소리
  if (!list.length) throw new Error('Typecast 목소리 없음');
  const pick = pickVoice(list);
  const lk = `${persona ?? gender}|${pick.voice_id}`;
  if (!logged.has(lk)) { logged.add(lk); console.log(`[tts] ${persona ?? gender} → ${pick.voice_name?.kor ?? ''} ${pick.voice_id} [${(pick.use_cases ?? []).join(',')}] 후보(${list.length}): ${list.map((v) => `${v.voice_name?.kor}=${v.voice_id}(${(v.use_cases ?? []).join('/')})`).join(' ')}`); }
  return { id: pick.voice_id, tempo: spec.tempo, pitch: spec.pitch };
}
async function typecastAudio(t: string, v: { id: string; tempo: number; pitch: number }, http: typeof fetch): Promise<Buffer> {
  const body = (full: boolean) => JSON.stringify({
    voice_id: v.id, text: t, model: TC_MODEL(), language: 'kor',
    ...(full ? { prompt: { emotion_type: 'preset', emotion_preset: 'normal', emotion_intensity: 1 } } : {}),
    output: { audio_format: 'mp3', ...(full ? { audio_tempo: v.tempo, audio_pitch: v.pitch, target_lufs: -16 } : {}) },
  });
  let res = await http(`${TC_BASE}/v1/text-to-speech`, { method: 'POST', headers: tcHeaders(), body: body(true) });
  if (res.status === 400 || res.status === 422) res = await http(`${TC_BASE}/v1/text-to-speech`, { method: 'POST', headers: tcHeaders(), body: body(false) }); // 감정·속도를 받지 않는 목소리면 기본값으로
  if (!res.ok) throw new Error(`Typecast TTS ${res.status}`); // 402 = 크레딧 부족, 429 = 너무 잦은 요청
  return Buffer.from(await res.arrayBuffer());
}

export async function synthesize(text: string, gender: 'F' | 'M', http: typeof fetch = fetch, persona?: string | null): Promise<Buffer> {
  const t = cleanForSpeech(text);
  if (!t) throw new Error('읽을 글이 없어요');
  if (ttsProvider() === 'typecast') {
    try {
      const tv = await tcVoiceOf(persona, gender, http);
      const key = createHash('sha256').update(`tc|${tv.id}|${tv.tempo}|${tv.pitch}|${t}`).digest('hex');
      const hit = cache.get(key);
      if (hit) return hit;
      const buf = await typecastAudio(t, tv, http);
      remember(key, buf, t.length);
      return buf;
    } catch (e) {
      if (!process.env.GOOGLE_TTS_KEY) throw e; // 구글 키도 있으면 구글로 대신 읽는다(크레딧 부족 등)
    }
  }
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
  remember(key, buf, t.length);
  return buf;
}
function remember(key: string, buf: Buffer, chars: number) {
  const m = new Date().toISOString().slice(0, 7);
  if (m !== monthKey) { monthKey = m; monthChars = 0; }
  monthChars += chars;
  cache.set(key, buf);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
}
