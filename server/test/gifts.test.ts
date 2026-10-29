// 부적 보내기 — 올린 부적 그림이 받는 사람 링크(/g/:code)에서 그대로 보이는지
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDb } from '../src/db/index.ts';
import { buildApp } from '../src/app.ts';

let app: Awaited<ReturnType<typeof buildApp>>['app'];
let close: () => Promise<void>;
beforeAll(async () => { const o = await openDb({ dir: 'memory' }); close = o.close; ({ app } = await buildApp({ db: o.db })); }, 120_000);
afterAll(async () => { await app.close(); await close(); });

const JPG = 'data:image/jpeg;base64,' + Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]).toString('base64');
describe('부적 보내기', () => {
  it('로그인(게스트) 없으면 거절, 있으면 링크 발급 → 받는 사람 화면·이미지', async () => {
    expect((await app.inject({ method: 'POST', url: '/gifts', payload: { kind: 'charm', image: JPG } })).statusCode).toBe(401);
    const g = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'gift-dev' } })).json();
    const h = { authorization: `Bearer ${g.token}` };
    expect((await app.inject({ method: 'POST', url: '/gifts', headers: h, payload: { kind: 'charm', image: 'data:image/png;base64,AAAA' } })).statusCode).toBe(400);
    const r = await app.inject({ method: 'POST', url: '/gifts', headers: h, payload: { kind: 'charm', title: '황금 건강수호부', fromName: '송광민', image: JPG } });
    expect(r.statusCode).toBe(200);
    const { code, url } = r.json();
    expect(url).toContain(`/g/${code}`);
    const page = await app.inject({ method: 'GET', url: `/g/${code}` });
    expect(page.statusCode).toBe(200);
    expect(page.body).toContain('송광민님이 보낸 황금 건강수호부');
    expect(page.body).toContain(`/g/${code}/charm.jpg`);
    expect(page.body).toContain('og:image');
    const img = await app.inject({ method: 'GET', url: `/g/${code}/charm.jpg` });
    expect(img.headers['content-type']).toContain('image/jpeg');
    expect(img.rawPayload[0]).toBe(0xff);
    expect((await app.inject({ method: 'GET', url: '/g/nope' })).statusCode).toBe(302);
  });
});
