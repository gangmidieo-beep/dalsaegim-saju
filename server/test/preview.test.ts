// 풀이 미리보기(R6 REQ-01·02·21) — 예시 인물의 실제 계산 결과 일부, AI 호출 없음, 19금은 목차만.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDb } from '../src/db/index.ts';
import { buildApp } from '../src/app.ts';

let app: Awaited<ReturnType<typeof buildApp>>['app'];
let close: () => Promise<void>;
const called: string[] = [];
beforeAll(async () => {
  const o = await openDb({ dir: 'memory' });
  close = o.close;
  ({ app } = await buildApp({ db: o.db, http: (async (u: string) => { called.push(u); return new Response('{}'); }) as unknown as typeof fetch }));
}, 120_000);
afterAll(async () => { await app.close(); await close(); });

describe('풀이 미리보기', () => {
  it('상품마다 표지·구성·목차·발췌, 두 번째 발췌는 잠김', async () => {
    const ps = (await app.inject({ url: '/products' })).json();
    const list = (Array.isArray(ps) ? ps : ps.products) as { id: string; kind: string; adult?: boolean }[];
    const targets = list.filter((p) => p.kind === 'reading' || p.id === 'friend_pass');
    expect(targets.length).toBeGreaterThan(3);
    for (const p of targets) {
      const r = await app.inject({ url: `/products/${p.id}/preview` });
      expect(r.statusCode, p.id).toBe(200);
      const v = r.json();
      expect(v.who).toContain('예시');
      if (p.adult) { expect(v.excerpt).toEqual([]); continue; }
      expect(v.excerpt.length, p.id).toBeGreaterThan(0);
      if (v.excerpt.length > 1 && p.id !== 'friend_pass') expect(v.excerpt[1].locked).toBe(true);
      expect(JSON.stringify(v)).not.toMatch(/undefined|NaN/);
    }
    expect(called.filter((u) => /anthropic|openai/.test(u))).toEqual([]);
  });
  it('없는 상품은 404', async () => {
    expect((await app.inject({ url: '/products/nope/preview' })).statusCode).toBe(404);
  });
});
