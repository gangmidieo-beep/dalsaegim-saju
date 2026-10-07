// 결제 — PayApp 실결제 흐름을 가짜 결제사 응답으로 끝까지 검증
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDb } from '../src/db/index.ts';
import { buildApp } from '../src/app.ts';
import { normalizePhone, parsePayappFeedback } from '../src/services/payments/payapp.ts';

const ENV = { userid: 'dsg_test', linkkey: 'k+ey/AbC=', linkval: 'v+al/XyZ=' };
let app: Awaited<ReturnType<typeof buildApp>>['app'];
let close: () => Promise<void>;
const calls: URLSearchParams[] = [];
const fakePayApp = (async (_url: string, init: any) => {
  const body = new URLSearchParams(init.body);
  calls.push(body);
  if (body.get('cmd') === 'paycancel') return new Response('state=1');
  return new Response(`state=1&mul_no=MUL${calls.length}&payurl=${encodeURIComponent('https://www.payapp.kr/L/abc' + calls.length)}`);
}) as unknown as typeof fetch;

beforeAll(async () => {
  Object.assign(process.env, {
    PG_PROVIDER: 'payapp', PAYAPP_USERID: ENV.userid, PAYAPP_LINKKEY: ENV.linkkey, PAYAPP_LINKVAL: ENV.linkval,
    PUBLIC_WEB_ORIGIN: 'https://web.example.kr', API_ORIGIN: 'https://api.example.kr',
    READING_AI: 'live', ANTHROPIC_API_KEY: 'test-key', ANTHROPIC_MODEL: 'test-model', // 풀이 판매 허용 조건(테스트에선 워커를 돌리지 않아 실제 호출 없음)
  });
  const o = await openDb({ dir: 'memory' });
  close = o.close;
  ({ app } = await buildApp({ db: o.db, mock: false, http: fakePayApp }));
}, 120_000);
afterAll(async () => {
  await app.close(); await close();
  for (const k of ['PG_PROVIDER', 'PAYAPP_USERID', 'PAYAPP_LINKKEY', 'PAYAPP_LINKVAL', 'PUBLIC_WEB_ORIGIN', 'API_ORIGIN', 'READING_AI', 'ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL']) delete process.env[k];
});

const auth = (t: string) => ({ authorization: `Bearer ${t}` });
const guest = async (d: string) => (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: d } })).json().token as string;
const me = { name: '달님', gender: 'F', year: 1996, month: 4, day: 2, calendar: 'solar', hour: 9 };
const prof = async (t: string) => (await app.inject({ method: 'POST', url: '/profiles', headers: auth(t), payload: me })).json().id as string;
const feedback = (orderId: string, price: number, state = '4', over: Record<string, string> = {}) =>
  app.inject({ method: 'POST', url: '/pay/payapp/feedback', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    payload: new URLSearchParams({ userid: ENV.userid, linkkey: ENV.linkkey, linkval: ENV.linkval, var1: orderId, mul_no: 'MUL1', price: String(price), pay_state: state, pay_type: '1', ...over }).toString() });

describe('PayApp 웹 결제', () => {
  let token = '';
  it('휴대폰 번호 정규화', () => {
    expect(normalizePhone('010-1234-5678')).toBe('01012345678');
    expect(normalizePhone('+82 10 1234 5678')).toBe('01012345678');
    expect(normalizePhone('02-123-4567')).toBeNull();
  });
  let pid = '';
  it('AI 풀이가 꺼져 있으면 유료 풀이는 팔지 않음(이용권은 판매)', async () => {
    token = await guest('pay-1');
    pid = await prof(token);
    delete process.env.READING_AI;
    try {
      const r = await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'newyear_2027', profileId: pid, phone: '010-1111-2222' } });
      expect(r.statusCode).toBe(503);
      expect(r.json().code).toBe('reading_off');
      expect((await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'friend_pass', phone: '010-1111-2222' } })).statusCode).toBe(200);
    } finally { process.env.READING_AI = 'live'; }
  });
  it('사주 없이·남의 사주로는 주문 불가, 궁합은 두 사람', async () => {
    expect((await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'newyear_2027', phone: '010-1111-2222' } })).json().code).toBe('profile');
    const other = await guest('pay-x');
    const opid = await prof(other);
    expect((await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'newyear_2027', profileId: opid, phone: '010-1111-2222' } })).json().code).toBe('profile');
    expect((await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'gunghap', profileId: pid, phone: '010-1111-2222' } })).json().code).toBe('profile');
    expect((await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'adult_gunghap', profileId: pid, phone: '010-1111-2222' } })).statusCode).toBe(404);
  });
  it('번호 없으면 결제창을 열지 않음', async () => {
    const r = await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'newyear_2027', profileId: pid } });
    expect(r.statusCode).toBe(400);
    expect(r.json().code).toBe('phone');
  });
  let orderId = '';
  let price = 0;
  it('주문 → PayApp 결제 주소. 돌아올 주소·통보 주소는 환경변수 도메인(하드코딩 금지)', async () => {
    const r = await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'newyear_2027', profileId: pid, phone: '010-1111-2222', price: 1 } });
    expect(r.statusCode).toBe(200);
    const o = r.json();
    orderId = o.id; price = o.amount;
    expect(o.status).toBe('pending');
    expect(o.payUrl).toMatch(/^https:\/\/www\.payapp\.kr\//);
    expect(price).toBeGreaterThan(1000); // 화면이 보낸 금액(1원)은 무시
    const sent = calls.at(-1)!;
    expect(sent.get('returnurl')).toBe(`https://web.example.kr/pay/return?order=${orderId}`);
    expect(sent.get('feedbackurl')).toBe('https://api.example.kr/pay/payapp/feedback');
    expect(sent.get('recvphone')).toBe('01011112222');
    expect(sent.get('price')).toBe(String(price));
  });
  it('연동키가 다르면 통보 거부', async () => {
    expect((await feedback(orderId, price, '4', { linkkey: 'wrong' })).statusCode).toBe(400);
    expect((await app.inject({ url: `/orders/${orderId}`, headers: auth(token) })).json().status).toBe('pending');
  });
  it('금액이 다르면 확정하지 않음', async () => {
    const t2 = await guest('pay-2');
    const o = (await app.inject({ method: 'POST', url: '/orders', headers: auth(t2), payload: { productId: 'newyear_2027', profileId: await prof(t2), phone: '01033334444' } })).json();
    expect((await feedback(o.id, 100)).body).toBe('SUCCESS');
    expect((await app.inject({ url: `/orders/${o.id}`, headers: auth(t2) })).json().status).toBe('failed');
  });
  it('통보(+ 가 공백으로 바뀌어 와도) → 결제 확정 → 풀이 생성 대기, 두 번 와도 한 번만', async () => {
    const r = await feedback(orderId, price, '4', { linkkey: ENV.linkkey.replace(/\+/g, ' ') });
    expect(r.body).toBe('SUCCESS');
    expect((await feedback(orderId, price)).body).toBe('SUCCESS');
    const o = (await app.inject({ url: `/orders/${orderId}`, headers: auth(token) })).json();
    expect(o.status).toBe('paid');
    const ent = (await app.inject({ url: '/me/entitlements', headers: auth(token) })).json();
    expect(ent.owned.filter((x: any) => x.orderId === orderId)).toHaveLength(1);
  });
  it('AI 사주친구 30일 이용권 → 두 번 사면 이어 붙임, 환불 시 즉시 종료', async () => {
    const t = await guest('pay-3');
    const m = (await app.inject({ method: 'POST', url: '/orders', headers: auth(t), payload: { productId: 'friend_pass', phone: '01055556666' } })).json();
    await feedback(m.id, m.amount);
    let ent = (await app.inject({ url: '/me/entitlements', headers: auth(t) })).json();
    expect(ent.premium).toBe(true);
    expect(Math.round((new Date(ent.subscription.expiresAt).getTime() - Date.now()) / 864e5)).toBe(30);
    const y = (await app.inject({ method: 'POST', url: '/orders', headers: auth(t), payload: { productId: 'friend_pass', phone: '01055556666' } })).json();
    await feedback(y.id, y.amount);
    ent = (await app.inject({ url: '/me/entitlements', headers: auth(t) })).json();
    expect(Math.round((new Date(ent.subscription.expiresAt).getTime() - Date.now()) / 864e5)).toBe(60);
    await feedback(y.id, y.amount, '9');
    ent = (await app.inject({ url: '/me/entitlements', headers: auth(t) })).json();
    expect(ent.premium).toBe(false);
  });
  it('주문 상품명에 서비스명', async () => {
    const t = await guest('pay-4');
    await app.inject({ method: 'POST', url: '/orders', headers: auth(t), payload: { productId: 'money_invest', profileId: await prof(t), phone: '01077778888' } });
    expect(calls.at(-1)!.get('goodname')).toBe('달새김사주 올해 나의 투자 흐름');
  });
  it('PayApp 취소 요청 형식(관리자 환불에서 사용)', async () => {
    const before = calls.length;
    const { payappCancel } = await import('../src/services/payments/payapp.ts');
    await payappCancel('MUL9', '테스트', ENV, fakePayApp);
    expect(calls[before].get('cmd')).toBe('paycancel');
    expect(calls[before].get('mul_no')).toBe('MUL9');
  });
  it('통보 파서: 값 일부만 로그, 상태 매핑', () => {
    const logs: string[] = [];
    expect(parsePayappFeedback({ userid: 'x', linkkey: ENV.linkkey, linkval: ENV.linkval }, ENV, (m) => logs.push(m))).toBeNull();
    expect(logs[0]).not.toContain(ENV.userid);
    expect(parsePayappFeedback({ ...ENV, var1: 'O1', price: '9900', pay_state: '64' }, ENV)?.state).toBe('refunded');
  });
});
