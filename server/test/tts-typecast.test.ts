// 타입캐스트 자연 음성(D74) — 키가 있으면 타입캐스트가 먼저, 상담사 나이대에 맞는 목소리, 같은 문장은 한 번만, 실패하면 구글로.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDb } from '../src/db/index.ts';
import { buildApp } from '../src/app.ts';

const listCalls: string[] = [];
const ttsCalls: any[] = [];
let failTts = 0;
const VOICES: Record<string, any[]> = {
  'female|elder': [{ voice_id: 'tc_grandma', voice_name: { kor: '할머니', eng: 'Grandma' }, gender: 'female', age: 'elder', voice_type: 'original' }],
  'male|elder': [{ voice_id: 'tc_grandpa', voice_name: { kor: '할아버지', eng: 'Grandpa' }, gender: 'male', age: 'elder', voice_type: 'original' }, { voice_id: 'tc_grandpa2', voice_name: { kor: '할아버지2' }, gender: 'male', age: 'elder', use_cases: ['Game'] }],
  'female|young_adult': [{ voice_id: 'tc_young_f', gender: 'female', age: 'young_adult' }],
  'male|young_adult': [{ voice_id: 'tc_young_m', gender: 'male', age: 'young_adult' }],
  'male|middle_age': [],
  'female|middle_age': [{ voice_id: 'tc_mid_f', gender: 'female', age: 'middle_age' }],
  'male|': [{ voice_id: 'tc_any_m', gender: 'male' }],
};
const fake = (async (url: string, init: any = {}) => {
  if (url.includes('texttospeech.googleapis.com')) {
    ttsCalls.push({ google: JSON.parse(init.body) });
    return new Response(JSON.stringify({ audioContent: Buffer.from('ID3google').toString('base64') }), { status: 200 });
  }
  expect(init.headers['X-API-KEY']).toBe('tc-test');
  if (url.includes('/v3/voices')) {
    listCalls.push(url);
    const q = new URL(url).searchParams;
    return new Response(JSON.stringify(VOICES[`${q.get('gender')}|${q.get('age') ?? ''}`] ?? []), { status: 200 });
  }
  if (failTts > 0) { failTts--; return new Response(JSON.stringify({ detail: 'Insufficient credit' }), { status: 402 }); }
  ttsCalls.push(JSON.parse(init.body));
  return new Response(Buffer.from('ID3typecast'), { status: 200, headers: { 'content-type': 'audio/mpeg' } });
}) as unknown as typeof fetch;

let app: Awaited<ReturnType<typeof buildApp>>['app'];
let close: () => Promise<void>;
let token = '';
const say = (payload: any) => app.inject({ method: 'POST', url: '/tts', headers: { authorization: `Bearer ${token}` }, payload });
beforeAll(async () => {
  process.env.TTS = 'live'; process.env.TYPECAST_API_KEY = 'tc-test'; process.env.TYPECAST_AUTO_VOICE = '1';
  const o = await openDb({ dir: 'memory' });
  close = o.close;
  ({ app } = await buildApp({ db: o.db, http: fake }));
  token = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'tts-tc' } })).json().token;
}, 120_000);
afterAll(async () => {
  for (const k of ['TTS', 'TYPECAST_API_KEY', 'GOOGLE_TTS_KEY', 'TYPECAST_VOICE_JUNHO', 'TYPECAST_AUTO_VOICE']) delete process.env[k];
  await app.close(); await close();
});

describe('타입캐스트 음성', () => {
  it('health 에 엔진 표시, 연화 할매는 할머니·청운 선생은 할아버지 목소리', async () => {
    expect((await app.inject({ url: '/health' })).json()).toMatchObject({ tts: true, ttsProvider: 'typecast' });
    const r = await say({ text: '아이고 왔구나 (瑞月)', gender: 'F', persona: 'yeonhwa' });
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toContain('audio/mpeg');
    expect(r.rawPayload.toString()).toBe('ID3typecast');
    expect(ttsCalls[0]).toMatchObject({ voice_id: 'tc_grandma', text: '아이고 왔구나', model: 'ssfm-v30', language: 'kor', output: { audio_format: 'mp3', audio_tempo: 0.9 } });
    await say({ text: '천천히 보세요', gender: 'M', persona: 'cheongun' });
    expect(ttsCalls[1].voice_id).toBe('tc_grandpa');
    expect(listCalls.some((u) => u.includes('age=elder') && u.includes('gender=male'))).toBe(true);
  });
  it('같은 문장은 다시 요청하지 않고, 목록도 한 번만 받는다', async () => {
    const n = ttsCalls.length, l = listCalls.length;
    await say({ text: '아이고 왔구나', gender: 'F', persona: 'yeonhwa' });
    expect(ttsCalls.length).toBe(n);
    await say({ text: '다른 말이에요', gender: 'F', persona: 'yeonhwa' });
    expect(ttsCalls.length).toBe(n + 1);
    expect(listCalls.length).toBe(l);
  });
  it('그 나이대 목소리가 없으면 같은 성별, 성별이 다르면 그 성별 기본 목소리', async () => {
    await say({ text: '사주박사입니다', gender: 'M', persona: 'baksa' });
    expect(ttsCalls.at(-1).voice_id).toBe('tc_any_m');
    await say({ text: '서월이에요', gender: 'M', persona: 'harin' });
    expect(ttsCalls.at(-1).voice_id).toBe('tc_young_m');
  });
  it('기본 목소리(코드에 정한 한국어 목소리)가 자동 선택보다 먼저', async () => {
    delete process.env.TYPECAST_AUTO_VOICE;
    await say({ text: '할매 기본', gender: 'F', persona: 'yeonhwa' });
    expect(ttsCalls.at(-1).voice_id).toBe('tc_60ad0841061ee28740ec2e1c');
    await say({ text: '청운 기본', gender: 'M', persona: 'cheongun' });
    expect(ttsCalls.at(-1).voice_id).toBe('tc_675a73eb789ff3ea6cc80235');
    process.env.TYPECAST_AUTO_VOICE = '1';
  });
  it('Railway 변수로 상담사 목소리 고정', async () => {
    process.env.TYPECAST_VOICE_JUNHO = 'tc_chosen';
    await say({ text: '준호예요', gender: 'M', persona: 'junho' });
    expect(ttsCalls.at(-1)).toMatchObject({ voice_id: 'tc_chosen', output: { audio_tempo: 1.02 } });
  });
  it('크레딧 부족(402)이면 502 → 화면이 브라우저 음성으로, 구글 키가 있으면 구글로 대신', async () => {
    failTts = 1;
    expect((await say({ text: '크레딧 없음 1', gender: 'F', persona: 'seoyeon' })).statusCode).toBe(502);
    process.env.GOOGLE_TTS_KEY = 'g';
    failTts = 1;
    const r = await say({ text: '크레딧 없음 2', gender: 'F', persona: 'seoyeon' });
    expect(r.statusCode).toBe(200);
    expect(ttsCalls.at(-1).google.voice.name).toMatch(/Vindemiatrix/);
  });
});

describe('목소리 고르기', () => {
  it('게임·애니 목소리보다 오디오북·대화 목소리를 먼저', async () => {
    const { pickVoice } = await import('../src/services/tts.ts');
    expect(pickVoice([{ voice_id: 'tc_a', use_cases: ['Game', 'Anime'] }, { voice_id: 'tc_b', use_cases: ['Audiobook'] }, { voice_id: 'tc_c' }]).voice_id).toBe('tc_b');
    expect(pickVoice([{ voice_id: 'tc_a', use_cases: ['Ads'] }, { voice_id: 'tc_c' }]).voice_id).toBe('tc_c');
  });
});

describe('시청취 후보(R6 REQ-13)', () => {
  it('"cheongun~2" 는 같은 성별·나이대 후보의 2번째, 다른 성별·없는 번호는 막는다', async () => {
    const { tcVoiceOf } = await import('../src/services/tts.ts');
    expect((await tcVoiceOf('cheongun~1', 'M', fake)).id).toBe('tc_grandpa');
    expect((await tcVoiceOf('cheongun~2', 'M', fake)).id).toBe('tc_grandpa2');
    expect((await tcVoiceOf('cheongun~9', 'M', fake)).id).toBe('tc_grandpa2');
    expect((await tcVoiceOf('cheongun~1', 'M', fake)).tempo).toBeLessThan(1);
    await expect(tcVoiceOf('cheongun~0', 'M', fake)).rejects.toThrow();
  });
});
