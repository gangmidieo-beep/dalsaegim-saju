// DB 구조(납품물 "DB 구조") — drizzle/ 마이그레이션 SQL 은 이 파일에서 생성(npm run db:generate -w server).
import { pgTable, text, integer, boolean, timestamp, jsonb, bigserial, serial, index } from 'drizzle-orm/pg-core';

const now = () => timestamp({ withTimezone: true }).defaultNow().notNull();
// 사이트 구분값 — 2호 사이트(성인궁합 등) 독립 시 같은 구조 재사용
const site = () => text().default('dalsaegim').notNull();

export const users = pgTable('users', {
  siteId: site(),
  id: text().primaryKey(),
  deviceId: text(),
  provider: text(), // google | kakao | naver | mock (null = 게스트)
  providerId: text(),
  email: text(),
  name: text(),
  platform: text(), // web | android
  marketing: boolean(), // 이벤트·혜택 알림 수신 동의
  memoryAI: boolean().default(true).notNull(), // AI 사주친구가 내 기록을 참고해도 되는지
  letterNotifyAt: timestamp({ withTimezone: true }), // 카카오톡 '달빛 편지 도착' 안내 수신 동의 시각(철회하면 null)
  mergedInto: text(), // 게스트 → 로그인 계정으로 합쳐지면 대상 id
  createdAt: now(),
  lastSeenAt: now(),
  deletedAt: timestamp({ withTimezone: true }),
}, (t) => [index('users_device').on(t.deviceId), index('users_provider').on(t.provider, t.providerId)]);

export const profiles = pgTable('profiles', {
  siteId: site(),
  id: text().primaryKey(),
  userId: text().notNull(),
  name: text().notNull(),
  relation: text(),
  gender: text().notNull(), // M | F
  birthYear: integer().notNull(),
  birthMonth: integer().notNull(),
  birthDay: integer().notNull(),
  calendar: text().notNull(), // solar | lunar
  leap: boolean().default(false).notNull(),
  birthHour: integer(), // null = 시간 모름
  bloodType: text(),
  mbti: text(),
  meta: jsonb(), // 관상·손금·성향 결과 요약 등 확장 자리
  isMain: boolean().default(false).notNull(),
  createdAt: now(),
}, (t) => [index('profiles_user').on(t.userId)]);

// 상품 — 초기값은 brand.config.json seed, 이후 원본은 DB(관리자 상품관리)
export const products = pgTable('products', {
  siteId: site(),
  id: text().primaryKey(),
  kind: text().notNull(), // reading | pass | free
  series: text(), // money(돈의 흐름) | year | love | life | worry | mbti
  adult: boolean().default(false).notNull(), // 성인 상품(성인인증 후 노출)
  people: integer().default(1).notNull(), // 필요한 사주 수(궁합 2)
  title: text().notNull(),
  cardCopy: text(),
  detail: text(),
  price: integer().default(0).notNull(),
  imageUrl: text(),
  badge: text(), // BEST | HOT | NEW | 인기
  visible: boolean().default(true).notNull(),
  sort: integer().default(0).notNull(),
  meta: jsonb(),
  listPrice: integer(), // 정가(있으면 카드에 할인율% + 취소선)
  showDiscount: boolean().default(true).notNull(),
  buttonLabel: text(),
  resultTitle: text(),
  detailCopy: jsonb(), // 상세 문구 {subtitle,target,why,contents}
  updatedAt: now(),
});


export const orders = pgTable('orders', {
  siteId: site(),
  id: text().primaryKey(),
  userId: text().notNull(),
  profileId: text(),
  productId: text().notNull(),
  kind: text().notNull(), // reading | subscription(이용권)
  amount: integer().notNull(),
  discount: integer().default(0).notNull(),
  method: text(), // card | kakaopay | google | ...
  channel: text().notNull(), // google | pg | mock
  status: text().notNull(), // pending | paid | failed | cancelled | refunded
  refundStatus: text(), // requested | done
  providerRef: text(),
  meta: jsonb(), // 풀이에 넘길 추가 정보(고민의 길 질문, MBTI 등)
  createdAt: now(),
  paidAt: timestamp({ withTimezone: true }),
}, (t) => [index('orders_user').on(t.userId), index('orders_created').on(t.createdAt)]);

export const subscriptions = pgTable('subscriptions', {
  siteId: site(),
  id: text().primaryKey(),
  userId: text().notNull(),
  plan: text().notNull(), // friend(AI 사주친구 이용권) — 향후 월간 패스 등
  status: text().notNull(), // active | grace | on_hold | canceled | expired
  channel: text().notNull(),
  amount: integer().notNull(),
  startedAt: now(),
  renewedAt: timestamp({ withTimezone: true }),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  canceledAt: timestamp({ withTimezone: true }),
}, (t) => [index('subs_user').on(t.userId)]);

export const readings = pgTable('readings', {
  siteId: site(),
  id: text().primaryKey(),
  orderId: text().notNull(),
  profileId: text(),
  productId: text().notNull(),
  status: text().notNull(), // queued | generating | done | failed
  content: jsonb(),
  model: text(),
  tokensIn: integer(),
  tokensOut: integer(),
  costKrw: integer(),
  createdAt: now(),
  doneAt: timestamp({ withTimezone: true }),
});


export const events = pgTable('events', {
  siteId: site(),
  id: bigserial({ mode: 'number' }).primaryKey(),
  userId: text(),
  sessionId: text(),
  name: text().notNull(),
  props: jsonb(),
  utmSource: text(),
  utmMedium: text(),
  utmCampaign: text(),
  referrer: text(),
  platform: text(),
  createdAt: now(),
}, (t) => [index('events_name_created').on(t.name, t.createdAt)]);

export const shareLinks = pgTable('share_links', {
  siteId: site(),
  code: text().primaryKey(),
  contentId: text().notNull(),
  path: text().notNull(),
  title: text().notNull(),
  text: text().notNull(),
  userId: text(),
  clicks: integer().default(0).notNull(),
  createdAt: now(),
});

// 홈 배너 / 이벤트 팝업
export const banners = pgTable('banners', {
  siteId: site(),
  id: text().primaryKey(),
  slot: text().notNull(), // home | event_popup
  title: text().notNull(),
  copy: text(),
  imageUrl: text(),
  link: text(), // 앱 화면 경로 또는 URL
  startsAt: timestamp({ withTimezone: true }),
  endsAt: timestamp({ withTimezone: true }),
  sort: integer().default(0).notNull(),
  active: boolean().default(true).notNull(),
});



export const admins = pgTable('admins', {
  id: serial().primaryKey(),
  email: text().notNull().unique(),
  passwordHash: text().notNull(),
  role: text().notNull(), // super | operator
  failedCount: integer().default(0).notNull(),
  lockedUntil: timestamp({ withTimezone: true }),
  createdAt: now(),
});

export const auditLogs = pgTable('audit_logs', {
  id: bigserial({ mode: 'number' }).primaryKey(),
  adminId: integer(),
  action: text().notNull(),
  target: text(),
  detail: jsonb(),
  createdAt: now(),
});

// AI 사주친구 상담 — 한 대화 = 한 줄. messages: [{role:'user'|'friend', text, at}]
export const chats = pgTable('chats', {
  id: text().primaryKey(),
  siteId: site(),
  userId: text().notNull(),
  profileId: text(),
  topic: text(), // love | work | money | family | growth | etc
  source: text(), // path(고민의 길) | home | reading
  persona: text(), // 고른 상담사(달하·월화·사주박사·사주선비·사주도령)
  messages: jsonb().$type<{ role: 'user' | 'friend'; text: string; at: string }[]>().notNull(),
  turns: integer().default(0).notNull(),
  tokensIn: integer().default(0).notNull(),
  tokensOut: integer().default(0).notNull(),
  costKrw: integer().default(0).notNull(),
  createdAt: now(),
  updatedAt: now(),
}, (t) => [index('chats_user').on(t.userId)]);

// 달새김 기록 — 상담 요약·실제 사건·풀이 메모·(V2) 갈림길·(V3) 보고서. 사용자가 고른 것만 저장
export const memories = pgTable('memories', {
  id: text().primaryKey(),
  siteId: site(),
  userId: text().notNull(),
  profileId: text(),
  kind: text().notNull(), // consult | event | reading | path | choice | report
  category: text().notNull(), // love | work | money | family | growth | health | etc
  title: text().notNull(),
  summary: text(),
  happenedOn: text().notNull(), // YYYY-MM-DD
  refId: text(), // chats.id / orders.id 등
  sajuNote: text(), // 그때 사주가 말한 흐름 한 줄(사주 VS 실제 인생)
  feedback: text(), // good | same | changed
  feedbackNote: text(),
  feedbackAt: timestamp({ withTimezone: true }),
  followupAt: timestamp({ withTimezone: true }), // "지난 고민은 어떻게 됐나요?" 물어볼 날
  visibility: text().notNull().default('self'), // private(보관만, 타임라인 숨김) | self(나만 보기) | ai(AI 사주친구가 참고)
  photo: text(), // 사진 1장(작게 줄인 data:image/webp, 120KB 이하)
  createdAt: now(),
}, (t) => [index('memories_user').on(t.userId, t.happenedOn)]);

// 시장 노트 — 투자운 "달새김이 보는 시장 이야기". 관리자가 작성(올해 = month null)
export const marketNotes = pgTable('market_notes', {
  id: serial().primaryKey(),
  siteId: site(),
  year: integer().notNull(),
  month: integer(),
  title: text().notNull(),
  body: text().notNull(),
  flow: jsonb().$type<number[]>(), // 월별 시장 흐름 1~12월(0~100) — 그래프용
  sources: text(),
  published: boolean().default(false).notNull(),
  updatedAt: now(),
});

// 오늘의 달빛 편지 — 관리자가 날짜별로 올리는 감성 글(공지사항과 별도). date 가 없으면 기본 순환 편지
export const moonLetters = pgTable('moon_letters', {
  id: serial().primaryKey(),
  siteId: site(),
  date: text(), // YYYY-MM-DD 게시일
  theme: text().notNull(), // 사랑 · 그리움 · 희망 · 위로
  title: text().notNull(),
  body: text().notNull(),
  published: boolean().default(true).notNull(),
  updatedAt: now(),
}, (t) => [index('moon_letters_date').on(t.date)]);

// 나의 달빛 우체통 — AI 맞춤 편지(본인만 열람, 삭제 가능)
export const letters = pgTable('letters', {
  id: text().primaryKey(),
  siteId: site(),
  userId: text().notNull(),
  profileId: text(),
  persona: text().notNull(),
  feeling: text().notNull(),
  topic: text(),
  input: text(),
  title: text().notNull(),
  body: text().notNull(),
  ai: boolean().default(false).notNull(),
  costKrw: integer().default(0).notNull(),
  recall: text(), // 이 편지가 떠올린 지난 고민 한 줄(고객 동의한 기록·지난 편지·소망) — 없으면 null
  memoryId: text(), // 고객이 [타임라인에 새기기]를 눌러 남긴 기록
  createdAt: now(),
}, (t) => [index('letters_user').on(t.userId, t.createdAt)]);

// 나만의 황금 달빛 부적 — 다시 저장할 수 있게 기록만(이미지는 화면에서 그린다)
export const charms = pgTable('charms', {
  id: text().primaryKey(),
  siteId: site(),
  userId: text().notNull(),
  type: text().notNull(), // business | wealth | estate | work | goal
  name: text().notNull(),
  wish: text().notNull(),
  goal: text(), // 소망과 함께 적은 실제 목표 한 줄(예: 올해 신규 거래처 3곳)
  status: text().notNull().default('start'), // start(새김) | doing(진행 중) | done(이루었어요)
  note: text(), // 고객이 직접 남기는 진행 상황 한 줄
  progressAt: timestamp({ withTimezone: true }), // 마지막으로 진행 상황을 적은 때(다시 묻기 기준)
  memoryId: text(), // 타임라인 기록(kind=wish)
  createdAt: now(),
}, (t) => [index('charms_user').on(t.userId)]);
