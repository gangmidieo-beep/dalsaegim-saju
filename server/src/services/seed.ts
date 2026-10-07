// 초기 데이터 — 상품은 brand.config.json 에서. 이미 있으면 건드리지 않는다(관리자 수정 보존).
// demo=true 면 관리자 화면 확인용 가짜 회원·주문·이벤트·기록 30일치(개발 전용, 운영 DB 에 쓰지 말 것).
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import brand from '../../../brand.config.json' with { type: 'json' };
import type { Db } from '../db/index.ts';
import { schema } from '../db/index.ts';
import { newId } from './auth.ts';

const S = schema;
export const SITE = () => process.env.SITE_ID || brand.siteId;

export async function seedBase(db: Db) {
  const rows = brand.products.map((p: any) => ({
    id: p.id, siteId: SITE(), kind: p.kind, series: p.series, adult: !!p.adult, people: p.people ?? 1,
    title: p.title, cardCopy: p.cardCopy, price: p.price, listPrice: p.listPrice ?? null, badge: p.badge ?? null,
    visible: p.visible !== false, sort: p.sort ?? 0,
  }));
  await db.insert(S.products).values(rows).onConflictDoNothing();
  await db.insert(S.banners).values([
    { id: 'b_newyear', siteId: SITE(), slot: 'home', title: '2027 신년운세가 열렸어요', copy: '내년 열두 달의 흐름을 한 장의 지도처럼', link: '/product/newyear_2027', sort: 0, active: true },
    { id: 'b_money', siteId: SITE(), slot: 'home', title: '돈의 흐름을 한눈에', copy: '재물·사업·투자·부동산, 달새김 재물 시리즈', link: '/money', sort: 1, active: true },
  ]).onConflictDoNothing();
}

export async function createAdmin(db: Db, email: string, password: string, role: 'super' | 'operator' = 'super') {
  const passwordHash = await bcrypt.hash(password, 10);
  await db.insert(S.admins).values({ email, passwordHash, role }).onConflictDoUpdate({ target: S.admins.email, set: { passwordHash, role } });
}

// ---------- 개발용 데모 데이터 ----------
export async function seedDemo(db: Db, days = 30) {
  const r0 = (await db.execute(sql`select count(*)::int as n from users`)) as unknown;
  const [{ n }] = (Array.isArray(r0) ? r0 : (r0 as { rows: unknown[] }).rows) as { n: number }[];
  if (n > 0) return;
  const rnd = mulberry(20261007);
  const DAY = 86400000;
  const now = Date.now();
  const names = ['김서윤', '이지민', '박하은', '최유진', '정다은', '강민지', '윤수아', '한예린', '오지우', '서채원'];
  const paid = brand.products.filter((p: any) => p.visible !== false && p.kind === 'reading');
  const users: any[] = [], profiles: any[] = [], orders: any[] = [], evs: any[] = [], mems: any[] = [], chats: any[] = [];
  const channels = [['instagram', 'paid'], ['meta', 'paid'], ['share', 'kakao'], ['naver', 'blog'], [null, null], [null, null]];
  for (let d = days; d >= 0; d--) {
    const dayStart = now - d * DAY;
    const count = 10 + Math.floor(rnd() * 16);
    for (let i = 0; i < count; i++) {
      const id = newId('u_');
      const at = new Date(dayStart - rnd() * DAY * 0.9);
      const [src, med] = channels[Math.floor(rnd() * channels.length)];
      const logged = rnd() < 0.4;
      users.push({ id, deviceId: newId('d_'), provider: logged ? (['kakao', 'naver', 'google'] as const)[Math.floor(rnd() * 3)] : null, providerId: logged ? newId() : null, name: names[Math.floor(rnd() * names.length)], platform: 'web', createdAt: at, lastSeenAt: new Date(at.getTime() + rnd() * d * DAY) });
      const pid = newId('p_');
      profiles.push({ id: pid, userId: id, name: users.at(-1).name, gender: rnd() < 0.8 ? 'F' : 'M', birthYear: 1985 + Math.floor(rnd() * 20), birthMonth: 1 + Math.floor(rnd() * 12), birthDay: 1 + Math.floor(rnd() * 28), calendar: 'solar', leap: false, birthHour: rnd() < 0.3 ? null : Math.floor(rnd() * 24), isMain: true, createdAt: at });
      evs.push({ userId: id, sessionId: id, name: 'page_view', props: { path: '/' }, utmSource: src, utmMedium: med, createdAt: at });
      for (const c of ['today', 'map', 'money', 'path', 'mbti'].filter(() => rnd() < 0.5)) evs.push({ userId: id, sessionId: id, name: 'content_view', props: { content: c }, createdAt: at });
      if (rnd() < 0.35) {
        evs.push({ userId: id, sessionId: id, name: 'path_done', props: { cat: ['love', 'work', 'money', 'family', 'self'][Math.floor(rnd() * 5)] }, createdAt: at });
        if (rnd() < 0.5) mems.push({ id: newId('m_'), userId: id, profileId: pid, kind: 'path', category: 'love', title: '현재 연인 — 계속 만나도 될까?', happenedOn: at.toISOString().slice(0, 10), createdAt: at, feedback: rnd() < 0.3 ? 'good' : null });
      }
      if (rnd() < 0.3) chats.push({ id: newId('c_'), userId: id, profileId: pid, topic: 'love', source: 'home', messages: [{ role: 'user', text: '요즘 연애가 고민이에요', at: at.toISOString() }, { role: 'friend', text: '이야기 들려줘서 고마워요.', at: at.toISOString() }], turns: 1 + Math.floor(rnd() * 5), createdAt: at, updatedAt: at });
      if (rnd() < 0.08) {
        const p = paid[Math.floor(rnd() * paid.length)] as any;
        evs.push({ userId: id, sessionId: id, name: 'product_view', props: { product: p.id }, createdAt: at });
        evs.push({ userId: id, sessionId: id, name: 'checkout_open', props: { product: p.id }, createdAt: at });
        const status = rnd() < 0.75 ? 'paid' : 'cancelled';
        orders.push({ id: newId('O'), userId: id, profileId: pid, productId: p.id, kind: 'reading', amount: p.price, discount: 0, method: ['card', 'kakaopay', 'naverpay'][Math.floor(rnd() * 3)], channel: 'pg', status, createdAt: at, paidAt: status === 'paid' ? at : null });
        evs.push({ userId: id, sessionId: id, name: status === 'paid' ? 'pay_success' : 'pay_cancel', props: { product: p.id }, createdAt: at });
      }
    }
  }
  for (const [t, list] of [[S.users, users], [S.profiles, profiles], [S.orders, orders], [S.events, evs], [S.memories, mems], [S.chats, chats]] as const)
    for (let i = 0; i < list.length; i += 500) await db.insert(t as any).values(list.slice(i, i + 500));
}
function mulberry(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
