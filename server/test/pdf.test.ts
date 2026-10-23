// A4 PDF 내려받기 — 주인만 10분 링크를 받고, 링크로 PDF 파일을 받는다(정통사주 감정서)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDb } from '../src/db/index.ts';
import { buildApp } from '../src/app.ts';
import { runOne } from '../src/services/reading/generate.ts';
import * as S from '../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import { pdfReady } from '../src/services/reading/pdf.ts';

let app: Awaited<ReturnType<typeof buildApp>>['app'];
let close: () => Promise<void>;
let db: any;
beforeAll(async () => {
  const o = await openDb({ dir: 'memory' });
  close = o.close; db = o.db;
  ({ app } = await buildApp({ db: o.db, demo: true }));
}, 120_000);
afterAll(async () => { await app.close(); await close(); });
const auth = (t: string) => ({ authorization: `Bearer ${t}` });

describe.skipIf(!pdfReady())('A4 PDF', () => {
  it('주인만 링크를 받고, 링크로 PDF 를 받는다', async () => {
    const g = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'pdf-1' } })).json();
    const pr = (await app.inject({ method: 'POST', url: '/profiles', headers: auth(g.token), payload: { name: '김서윤', gender: 'F', year: 1996, month: 4, day: 2, hour: 9, calendar: 'solar' } })).json();
    const o = (await app.inject({ method: 'POST', url: '/orders', headers: auth(g.token), payload: { productId: 'lifetime', profileId: pr.id } })).json();
    expect(o.status).toBe('paid');
    expect((await app.inject({ method: 'POST', url: `/readings/${o.id}/pdf-link`, headers: auth(g.token) })).statusCode).toBe(409); // 아직 작성 중
    const [r] = await db.select().from(S.readings).where(eq(S.readings.orderId, o.id));
    await runOne(db, r);
    const other = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'pdf-2' } })).json();
    expect((await app.inject({ method: 'POST', url: `/readings/${o.id}/pdf-link`, headers: auth(other.token) })).statusCode).toBe(404);
    const link = (await app.inject({ method: 'POST', url: `/readings/${o.id}/pdf-link`, headers: auth(g.token) })).json();
    expect(link.url).toMatch(/\/pdf\?t=/);
    const res = await app.inject({ url: link.url.replace(/^https?:\/\/[^/]+/, '') });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(String(res.headers['content-disposition'])).toContain('attachment');
    expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    // 사용자 토큰으로는 PDF 를 받을 수 없고, PDF 토큰으로는 사용자 API 를 쓸 수 없다
    expect((await app.inject({ url: `/pdf?t=${g.token}` })).statusCode).toBe(410);
    const t = new URL(link.url).searchParams.get('t')!;
    expect((await app.inject({ url: '/me', headers: auth(t) })).statusCode).toBe(401);
  }, 60_000);
});
