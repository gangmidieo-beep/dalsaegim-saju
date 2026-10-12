// 자연 음성 — 꺼져 있으면 503(화면이 브라우저 음성으로), 켜면 상담사 성별 목소리로 요청하고 같은 문장은 다시 요청하지 않는다.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDb } from '../src/db/index.ts';
import { buildApp } from '../src/app.ts';
import { cleanForSpeech } from '../src/services/tts.ts';

const calls: any[] = [];
const fakeGoogle = (async (_url: string, init: any) => {
  calls.push(JSON.parse(init.body));
  return new Response(JSON.stringify({ audioContent: Buffer.from('ID3fake').toString('base64') }), { status: 200 });
}) as unknown as typeof fetch;

let app: Awaited<ReturnType<typeof buildApp>>['app'];
let close: () => Promise<void>;
let token = '';
beforeAll(async () => {
  const o = await openDb({ dir: 'memory' });
  close = o.close;
  ({ app } = await buildApp({ db: o.db, http: fakeGoogle }));
  token = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'tts-1' } })).json().token;
}, 120_000);
afterAll(async () => { delete process.env.TTS; delete process.env.GOOGLE_TTS_KEY; await app.close(); await close(); });

describe('자연 음성', () => {
  it('꺼져 있으면 503, health 에 표시', async () => {
    expect((await app.inject({ url: '/health' })).json().tts).toBe(false);
    const r = await app.inject({ method: 'POST', url: '/tts', headers: { authorization: `Bearer ${token}` }, payload: { text: '안녕하세요', gender: 'M' } });
    expect(r.statusCode).toBe(503);
  });
  it('켜면 남자 상담사는 남자 목소리, 같은 문장은 한 번만 요청', async () => {
    process.env.TTS = 'live'; process.env.GOOGLE_TTS_KEY = 'test-key';
    const noAuth = await app.inject({ method: 'POST', url: '/tts', payload: { text: '안녕', gender: 'M' } });
    expect(noAuth.statusCode).toBe(401);
    const r = await app.inject({ method: 'POST', url: '/tts', headers: { authorization: `Bearer ${token}` }, payload: { text: '반갑습니다 😊 **오늘**', gender: 'M' } });
    expect(r.statusCode).toBe(200);
    expect(r.headers['content-type']).toContain('audio/mpeg');
    expect(calls[0].voice.name).toMatch(/Charon/);
    expect(calls[0].input.text).toBe('반갑습니다 오늘');
    await app.inject({ method: 'POST', url: '/tts', headers: { authorization: `Bearer ${token}` }, payload: { text: '반갑습니다 😊 **오늘**', gender: 'M' } });
    expect(calls.length).toBe(1);
    await app.inject({ method: 'POST', url: '/tts', headers: { authorization: `Bearer ${token}` }, payload: { text: '반갑습니다', gender: 'F' } });
    expect(calls[1].voice.name).toMatch(/Aoede/);
  });
  it('읽기 정리: 이모지·기호 제거', () => {
    expect(cleanForSpeech('## 좋아요 ✨ `x`')).toBe('좋아요 x');
  });
});
