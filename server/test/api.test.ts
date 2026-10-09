// 서버 통합 테스트 — 메모리 PGlite. 게스트 → 사주 → 주문(mock) → AI 사주친구 → 기록·타임라인 → 로그인 합치기 → 공유 링크 → 관리자
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { openDb } from '../src/db/index.ts';
import { buildApp } from '../src/app.ts';
import { createAdmin } from '../src/services/seed.ts';

let app: Awaited<ReturnType<typeof buildApp>>['app'];
let close: () => Promise<void>;
beforeAll(async () => {
  const o = await openDb({ dir: 'memory' });
  close = o.close;
  await createAdmin(o.db, 'boss@test.kr', 'super-secret-1', 'super');
  await createAdmin(o.db, 'staff@test.kr', 'staff-secret-1', 'operator');
  ({ app } = await buildApp({ db: o.db, demo: true }));
}, 120_000);
afterAll(async () => { await app.close(); await close(); });

const auth = (t: string) => ({ authorization: `Bearer ${t}` });
const profile = (name: string) => ({ name, gender: 'F', year: 1964, month: 5, day: 21, calendar: 'solar' });

describe('공개 API', () => {
  let token = '';
  let pid = '';
  it('게스트 가입(같은 기기는 같은 계정)', async () => {
    const r = await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'dev-1' } });
    expect(r.statusCode).toBe(200);
    token = r.json().token;
    const again = await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'dev-1' } });
    expect(again.json().userId).toBe(r.json().userId);
  });
  it('사주 저장(나·연인), MBTI 대문자 저장', async () => {
    const a = (await app.inject({ method: 'POST', url: '/profiles', headers: auth(token), payload: { ...profile('나'), mbti: 'infp' } })).json();
    pid = a.id;
    expect(a.mbti).toBe('INFP');
    expect((await app.inject({ method: 'POST', url: '/profiles', headers: auth(token), payload: profile('연인') })).statusCode).toBe(200);
  });
  it('상품: 달새김 14종 노출(재회운 추가), 성인 상품은 숨김, 사이트 구분값', async () => {
    const list = (await app.inject({ url: '/products' })).json() as any[];
    expect(list).toHaveLength(14);
    expect(list.every((p) => p.siteId === 'dalsaegim')).toBe(true);
    expect(list.find((p) => p.id === 'adult_gunghap')).toBeUndefined();
    expect(list.filter((p) => p.series === 'money')).toHaveLength(5);
    expect((await app.inject({ url: '/banners?slot=home' })).json()).toHaveLength(2);
  });
  it('주문(mock) → 풀이 대기 → 고민의 길 질문 전달 → 내 주문 목록', async () => {
    const o = await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'path_deep', profileId: pid, meta: { cat: 'love', sub: 'partner', q: '계속 만나도 될까?', evil: 'x' } } });
    expect(o.json().status).toBe('paid');
    expect(o.json().meta).toEqual({ cat: 'love', sub: 'partner', q: '계속 만나도 될까?' });
    expect((await app.inject({ url: `/readings/${o.json().id}`, headers: auth(token) })).json().status).toBe('queued');
    expect(((await app.inject({ url: '/me/orders', headers: auth(token) })).json() as any[])[0].title).toBe('고민의 길 심층분석');
  });
  it('AI 사주친구: 사주 없으면 안내, 하루 3번 무료, 대화 이어 가기, 기록 초안', async () => {
    expect((await app.inject({ method: 'POST', url: '/friend/chat', headers: auth(token), payload: { text: '안녕' } })).json().code).toBe('profile');
    const a = (await app.inject({ method: 'POST', url: '/friend/chat', headers: auth(token), payload: { profileId: pid, text: '남자친구랑 계속 만나도 될지 고민이에요' } })).json();
    expect(a.reply.length).toBeGreaterThan(20);
    expect(a.topic).toBe('love');
    expect(a.draft.category).toBe('love');
    expect(a.remaining).toBe(2);
    const b = (await app.inject({ method: 'POST', url: '/friend/chat', headers: auth(token), payload: { chatId: a.chatId, profileId: pid, text: '요즘 연락이 줄었어요' } })).json();
    expect(b.chatId).toBe(a.chatId);
    await app.inject({ method: 'POST', url: '/friend/chat', headers: auth(token), payload: { chatId: a.chatId, profileId: pid, text: '어떻게 하면 좋을까요' } });
    const over = await app.inject({ method: 'POST', url: '/friend/chat', headers: auth(token), payload: { chatId: a.chatId, profileId: pid, text: '하나 더' } });
    expect(over.statusCode).toBe(402);
    expect(over.json().code).toBe('friend_limit');
    const c = (await app.inject({ url: `/friend/chats/${a.chatId}`, headers: auth(token) })).json();
    expect(c.messages).toHaveLength(6);
    expect(c).not.toHaveProperty('costKrw');
    expect((await app.inject({ url: '/friend/status', headers: auth(token) })).json().remaining).toBe(0);
  });
  it('상담사(페르소나): 고른 상담사가 대화에 남고, 남긴 기록을 다음 상담에서 떠올린다', async () => {
    const g = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'dev-persona' } })).json().token;
    const prof = { id: 'p_persona1', name: '하늘', gender: 'F', year: 1996, month: 4, day: 2, calendar: 'solar', leap: false, hour: 9 };
    await app.inject({ method: 'POST', url: '/profiles', headers: auth(g), payload: { ...prof, main: true } });
    await app.inject({ method: 'POST', url: '/memories', headers: auth(g), payload: { kind: 'consult', category: 'love', title: '헤어진 사람이 생각남', profileId: prof.id } });
    const r = (await app.inject({ method: 'POST', url: '/friend/chat', headers: auth(g), payload: { profileId: prof.id, text: '다시 연락해도 될까요?', persona: 'seonbi' } })).json();
    expect(r.reply).toContain('헤어진 사람이 생각남');
    const c = (await app.inject({ url: `/friend/chats/${r.chatId}`, headers: auth(g) })).json();
    expect(c.persona).toBe('seonbi');
    const bad = (await app.inject({ method: 'POST', url: '/friend/chat', headers: auth(g), payload: { profileId: prof.id, text: '안녕', persona: 'nobody' } })).json();
    expect((await app.inject({ url: `/friend/chats/${bad.chatId}`, headers: auth(g) })).json().persona).toBe('dalha');
  });
  it('이용권이 있으면 제한 없음', async () => {
    await app.inject({ method: 'POST', url: '/orders', headers: auth(token), payload: { productId: 'friend_pass' } });
    expect((await app.inject({ method: 'POST', url: '/friend/chat', headers: auth(token), payload: { profileId: pid, text: '이직하고 싶어요' } })).json().remaining).toBeNull();
  });
  it('달새김 기록: 저장 → 수정 → 2주 뒤 묻기(피드백) → 타임라인에 풀이와 함께 → 삭제', async () => {
    const m = (await app.inject({ method: 'POST', url: '/memories', headers: auth(token), payload: { kind: 'consult', category: 'love', title: '현재 연인과 관계를 계속할지 고민함', happenedOn: '2026-10-05', profileId: pid } })).json();
    expect(new Date(m.followupAt).getTime()).toBeGreaterThan(Date.now() + 13 * 864e5);
    const ev = (await app.inject({ method: 'POST', url: '/memories', headers: auth(token), payload: { kind: 'event', category: 'work', title: '새 팀으로 옮김', happenedOn: 'bad-date' } })).json();
    expect(ev.followupAt).toBeNull();
    expect(ev.happenedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((await app.inject({ method: 'PATCH', url: `/memories/${m.id}`, headers: auth(token), payload: { feedback: 'good', title: '연인과 계속 만나기로' } })).json()).toMatchObject({ feedback: 'good', title: '연인과 계속 만나기로' });
    const tl = (await app.inject({ url: '/timeline', headers: auth(token) })).json();
    expect(tl.items.some((x: any) => x.type === 'reading')).toBe(true);
    expect(tl.items.filter((x: any) => x.type === 'memory')).toHaveLength(2);
    expect((await app.inject({ method: 'DELETE', url: `/memories/${ev.id}`, headers: auth(token) })).json().ok).toBe(true);
    const other = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'dev-other' } })).json().token;
    expect((await app.inject({ method: 'PATCH', url: `/memories/${m.id}`, headers: auth(other), payload: { title: '남의 기록' } })).statusCode).toBe(404);
  });
  it('기록 사진·공개 설정: 비공개는 타임라인에서 빠지고, 이상한 사진 값은 버린다', async () => {
    const token = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'dev-photo' } })).json().token;
    const photo = 'data:image/webp;base64,UklGRhIAAABXRUJQVlA4TAYAAAAvAAAAAAfQ//73/w==';
    const p = (await app.inject({ method: 'POST', url: '/memories', headers: auth(token), payload: { kind: 'event', category: 'work', title: '사진 기록', photo, visibility: 'ai' } })).json();
    expect(p).toMatchObject({ photo, visibility: 'ai' });
    const bad = (await app.inject({ method: 'POST', url: '/memories', headers: auth(token), payload: { title: '숨긴 기록', photo: 'javascript:alert(1)', visibility: 'private' } })).json();
    expect(bad).toMatchObject({ photo: null, visibility: 'private' });
    const tl = (await app.inject({ url: '/timeline', headers: auth(token) })).json();
    expect(tl.items.find((x: any) => x.id === p.id)?.photo).toBe(photo);
    expect(tl.items.some((x: any) => x.id === bad.id)).toBe(false);
    expect((await app.inject({ method: 'PATCH', url: `/memories/${p.id}`, headers: auth(token), payload: { photo: null, visibility: 'self' } })).json()).toMatchObject({ photo: null, visibility: 'self' });
  });
  it('시장 노트: 공개된 것만', async () => {
    expect((await app.inject({ url: '/market' })).json()).toBeNull();
  });
  it('로그인(mock 카카오) → 게스트 기록 합치기', async () => {
    const r = await app.inject({ url: '/auth/kakao/start?redirect=http://localhost:5391/me' });
    expect(r.statusCode).toBe(302);
    const loc = new URL(r.headers.location as string);
    expect(loc.pathname).toBe('/auth/callback');
    const userToken = loc.searchParams.get('token')!;
    const m = await app.inject({ method: 'POST', url: '/auth/merge', headers: auth(userToken), payload: { guestToken: token } });
    expect(m.json().merged).toBeGreaterThan(3);
    expect((await app.inject({ url: '/profiles', headers: auth(userToken) })).json()).toHaveLength(2);
    expect((await app.inject({ url: '/memories', headers: auth(userToken) })).json().list).toHaveLength(1);
    expect((await app.inject({ url: '/me/entitlements', headers: auth(userToken) })).json().premium).toBe(true);
  });
  it('이벤트 배치 + 공유 링크 OG·카드 이미지', async () => {
    expect((await app.inject({ method: 'POST', url: '/events', payload: { events: [{ name: 'content_view', props: { content: 'money' } }] } })).json().saved).toBe(1);
    const s = (await app.inject({ method: 'POST', url: '/share', payload: { contentId: 'today', path: '/today', title: '오늘의 운세', text: '94점 — 좋은 날이에요' } })).json();
    const html = await app.inject({ url: `/s/${s.code}` });
    expect(html.body).toContain('og:image');
    expect(html.body).toContain('utm_source=share');
    const png = await app.inject({ url: `/s/${s.code}/card.png` });
    expect(png.headers['content-type']).toBe('image/png');
    expect(png.rawPayload.subarray(1, 4).toString()).toBe('PNG');
  });
});

describe('관리자 API', () => {
  let boss = '', staff = '';
  it('로그인', async () => {
    boss = (await app.inject({ method: 'POST', url: '/admin/api/login', payload: { email: 'boss@test.kr', password: 'super-secret-1' } })).json().token;
    staff = (await app.inject({ method: 'POST', url: '/admin/api/login', payload: { email: 'staff@test.kr', password: 'staff-secret-1' } })).json().token;
    expect(boss && staff).toBeTruthy();
    expect((await app.inject({ url: '/admin/api/dashboard' })).statusCode).toBe(401);
  });
  it('대시보드·회원·결제·구독·통계', async () => {
    const d = (await app.inject({ url: '/admin/api/dashboard?period=month', headers: auth(staff) })).json();
    expect(d.cards.signups).toBeGreaterThan(0);
    expect(d.daily.length).toBeGreaterThan(0);
    expect(Object.keys(d.byKind).length).toBeGreaterThan(1);
    expect((await app.inject({ url: '/admin/api/dashboard?period=7d&format=csv', headers: auth(staff) })).body).toContain('date,visitors');
    expect(((await app.inject({ url: '/admin/api/members?limit=5', headers: auth(staff) })).json() as any[]).length).toBe(5);
    expect(((await app.inject({ url: '/admin/api/payments?kind=money', headers: auth(staff) })).json() as any[]).every((p) => p.bucket === 'money')).toBe(true);
    expect((await app.inject({ url: '/admin/api/subscriptions/stats?period=month', headers: auth(staff) })).json()).toHaveProperty('active');
    const st = (await app.inject({ url: '/admin/api/stats?period=month', headers: auth(staff) })).json();
    expect(st.views.length).toBeGreaterThan(0);
    const k = (await app.inject({ url: '/admin/api/kpi?period=month', headers: auth(staff) })).json();
    expect(k.rates.friendUse).toBeGreaterThan(0);
    expect(k.rates.pathDone).toBeGreaterThanOrEqual(0);
    expect(k.byProduct.length).toBe(14);
  });
  it('권한 2단계 — 운영자는 가격 변경 불가, 변경 이력 기록', async () => {
    expect((await app.inject({ method: 'PATCH', url: '/admin/api/products/money_wealth', headers: auth(staff), payload: { badge: 'BEST' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'PATCH', url: '/admin/api/products/money_wealth', headers: auth(staff), payload: { price: 1000 } })).statusCode).toBe(403);
    expect((await app.inject({ method: 'PATCH', url: '/admin/api/products/money_wealth', headers: auth(boss), payload: { price: 12900 } })).json().price).toBe(12900);
    const logs = (await app.inject({ url: '/admin/api/audit', headers: auth(boss) })).json() as any[];
    expect(logs.map((l) => l.action)).toEqual(expect.arrayContaining(['product.update']));
  });
  it('배너 저장 · 시장 노트 작성 → 공개 → 투자운 화면이 읽음', async () => {
    expect((await app.inject({ method: 'POST', url: '/admin/api/banners', headers: auth(staff), payload: { slot: 'event_popup', title: '신년운세 오픈 이벤트', link: '/product/newyear_2027' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/admin/api/market', headers: auth(staff), payload: { title: 'x' } })).statusCode).toBe(400);
    const flow = [50, 52, 55, 60, 62, 58, 55, 50, 48, 52, 56, 60];
    const n = (await app.inject({ method: 'POST', url: '/admin/api/market', headers: auth(staff), payload: { year: new Date().getFullYear(), title: '올해 시장 이야기', body: '금리와 환율의 큰 흐름을 함께 보는 해예요.', flow, published: true } })).json();
    expect(n.flow).toEqual(flow);
    const pub = (await app.inject({ url: '/market' })).json();
    expect(pub.title).toBe('올해 시장 이야기');
    expect((await app.inject({ method: 'DELETE', url: `/admin/api/market/${n.id}`, headers: auth(staff) })).statusCode).toBe(403);
  });
  it('관리자 5회 실패 잠금', async () => {
    for (let i = 0; i < 5; i++) await app.inject({ method: 'POST', url: '/admin/api/login', payload: { email: 'staff@test.kr', password: 'wrong' } });
    expect((await app.inject({ method: 'POST', url: '/admin/api/login', payload: { email: 'staff@test.kr', password: 'staff-secret-1' } })).statusCode).toBe(423);
  });
  it('관리자 계정: 추가 → 비밀번호 변경 → 이전 관리자 삭제(남은 토큰도 즉시 무효)', async () => {
    const ip = { remoteAddress: '10.9.9.9' }; // 위 잠금 테스트와 분당 로그인 제한을 나눠 쓰지 않게
    const login = async (email: string, password: string) => (await app.inject({ method: 'POST', url: '/admin/api/login', payload: { email, password }, ...ip })).json().token as string;
    const boss = await login('boss@test.kr', 'super-secret-1');
    expect((await app.inject({ method: 'POST', url: '/admin/api/admins', headers: auth(boss), payload: { email: 'Owner@Test.kr', password: 'short' } })).statusCode).toBe(400);
    const made = (await app.inject({ method: 'POST', url: '/admin/api/admins', headers: auth(boss), payload: { email: 'Owner@Test.kr', password: 'owner-first-1' } })).json();
    expect(made).toMatchObject({ email: 'owner@test.kr', role: 'super' });
    expect((await app.inject({ method: 'POST', url: '/admin/api/admins', headers: auth(boss), payload: { email: 'owner@test.kr', password: 'owner-first-1' } })).statusCode).toBe(409);
    const owner = await login('owner@test.kr', 'owner-first-1');
    expect((await app.inject({ method: 'POST', url: '/admin/api/me/password', headers: auth(owner), payload: { current: 'wrong-password', next: 'owner-second-2' } })).statusCode).toBe(400);
    expect((await app.inject({ method: 'POST', url: '/admin/api/me/password', headers: auth(owner), payload: { current: 'owner-first-1', next: 'owner-second-2' } })).statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: '/admin/api/login', payload: { email: 'owner@test.kr', password: 'owner-first-1' }, ...ip })).statusCode).toBe(401);
    const owner2 = await login('owner@test.kr', 'owner-second-2');
    const list = (await app.inject({ url: '/admin/api/admins', headers: auth(owner2) })).json() as any[];
    expect(list.some((a) => 'passwordHash' in a)).toBe(false);
    const bossId = list.find((a) => a.email === 'boss@test.kr').id;
    expect((await app.inject({ method: 'DELETE', url: `/admin/api/admins/${made.id}`, headers: auth(owner2) })).statusCode).toBe(400); // 내 계정
    expect((await app.inject({ method: 'DELETE', url: `/admin/api/admins/${bossId}`, headers: auth(owner2) })).statusCode).toBe(200);
    expect((await app.inject({ url: '/admin/api/dashboard', headers: auth(boss) })).statusCode).toBe(401);
    const staffId = list.find((a) => a.email === 'staff@test.kr').id;
    expect((await app.inject({ method: 'DELETE', url: `/admin/api/admins/${staffId}`, headers: auth(owner2) })).statusCode).toBe(200);
  });
});

describe('회원 탈퇴', () => {
  it('개인정보 삭제, 결제 기록은 남김, 같은 기기는 새 계정으로', async () => {
    const g = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'bye-1' } })).json();
    const h = auth(g.token);
    const pr = (await app.inject({ method: 'POST', url: '/profiles', headers: h, payload: profile('탈퇴할 사람') })).json();
    const o = (await app.inject({ method: 'POST', url: '/orders', headers: h, payload: { productId: 'money_wealth', profileId: pr.id } })).json();
    expect(o.status).toBe('paid');
    await app.inject({ method: 'POST', url: '/memories', headers: h, payload: { title: '지울 기록' } });
    expect((await app.inject({ method: 'POST', url: '/me/delete', headers: h, payload: {} })).statusCode).toBe(200);
    expect((await app.inject({ url: '/me', headers: h })).statusCode).toBe(401);
    expect((await app.inject({ url: '/profiles', headers: h })).statusCode).toBe(401);
    const again = (await app.inject({ method: 'POST', url: '/auth/guest', payload: { deviceId: 'bye-1' } })).json();
    expect(again.userId).not.toBe(g.userId);
  });
});
