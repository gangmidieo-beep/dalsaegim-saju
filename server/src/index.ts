// 서버 시작 — PORT(기본 8791). DEMO_DATA=true 면 관리자 확인용 데모 데이터(개발 전용).
import { buildApp } from './app.ts';
import { openDb } from './db/index.ts';
import { createAdmin } from './services/seed.ts';
import { schema as S } from './db/index.ts';
import { startReadingWorker } from './services/reading/generate.ts';

// 첫 배포용: ADMIN_EMAIL + ADMIN_INIT_PASSWORD 가 있고 관리자가 한 명도 없을 때만 한 번 만든다.
// (양도 때 이전 관리자를 지워도 재시작하면서 다시 생기지 않게 — 이후 계정·비밀번호는 관리자 화면 「관리자 계정」에서)
if (process.env.ADMIN_EMAIL && process.env.ADMIN_INIT_PASSWORD) {
  const { db, close } = await openDb();
  const email = process.env.ADMIN_EMAIL.toLowerCase();
  const [any] = await db.select({ id: S.admins.id }).from(S.admins).limit(1);
  if (!any && process.env.ADMIN_INIT_PASSWORD.length >= 10) await createAdmin(db, email, process.env.ADMIN_INIT_PASSWORD, 'super');
  await close();
}

// 관리자 비밀번호 재설정(비상용, 한 번만): ADMIN_RESET_EMAIL + ADMIN_RESET_PASSWORD(10자 이상).
// 같은 값으로는 한 번만 적용(감사 기록의 지문으로 확인) — 변수가 남아 있어도 재시작 때 대표님이 바꾼 비밀번호를 되돌리지 않는다.
if (process.env.ADMIN_RESET_EMAIL && (process.env.ADMIN_RESET_PASSWORD ?? '').trim().length >= 10) {
  const { createHash } = await import('node:crypto');
  const { eq, and } = await import('drizzle-orm');
  const { db, close } = await openDb();
  const email = process.env.ADMIN_RESET_EMAIL.trim().toLowerCase(), pw = process.env.ADMIN_RESET_PASSWORD!.trim();
  const fp = createHash('sha256').update(`${email}\n${pw}`).digest('hex').slice(0, 16);
  const [done] = await db.select({ id: S.auditLogs.id }).from(S.auditLogs).where(and(eq(S.auditLogs.action, 'admin.reset'), eq(S.auditLogs.target, `${email}#${fp}`)));
  if (!done) {
    await createAdmin(db, email, pw, 'super');
    await db.update(S.admins).set({ failedCount: 0, lockedUntil: null }).where(eq(S.admins.email, email));
    await db.insert(S.auditLogs).values({ action: 'admin.reset', target: `${email}#${fp}` });
    console.log(`[admin-reset] ${email} 비밀번호 재설정 완료 — 이 변수는 지워도 됩니다`);
  }
  await close();
}

const { app, db } = await buildApp({ logger: true, demo: process.env.DEMO_DATA === 'true' });
const port = Number(process.env.PORT || 8791);
await app.listen({ port, host: '0.0.0.0' });
// 결제된 풀이를 3초마다 생성(동시 3개)
startReadingWorker(db, app.log);
