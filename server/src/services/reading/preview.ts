// 풀이 미리보기(R6 REQ-01·02·21) — 결제 전에 '실제 결과물 일부'를 보여 준다.
// 예시 인물(김서윤)로 실제 계산·생성한 표지·목차·본문 일부. AI 호출 없음(비용 0).
// 정통사주는 AI 장편이 켜져 있으면 실제 40장 목차 + 예시 인물의 실제 장편 결과 발췌, 꺼져 있으면 지금 제공되는 9장 풀이.
import { LONG_OUTLINE, LONG_PARTS } from '@dalsaegim/content';
import SAMPLE from '../../../../packages/content/data/lifetime-sample.json' with { type: 'json' };
import { buildFacts, engineContent, liveAI, type Person } from './generate.ts';
import { longOn } from './long.ts';
import { calcSaju } from '@dalsaegim/engine';

const ME: Person = { name: '김서윤', gender: 'F', year: 1996, month: 4, day: 2, calendar: 'solar', hour: 9 };
const YOU: Person = { name: '이도윤', gender: 'M', year: 1994, month: 9, day: 17, calendar: 'solar', hour: 14 };
const PAIR = new Set(['gunghap', 'adult_gunghap']);
const META: Record<string, Record<string, string>> = {
  path_deep: { cat: 'love', sub: 'crush', q: '상대 마음이 궁금해' },
  mbti_deep: { mbti: 'INFP' },
  tarot_some: { cards: '6,47r,19' },
};
const sajuOf = (p: Person) => calcSaju({ year: p.year, month: p.month, day: p.day, hour: p.hour ?? null, calendar: p.calendar, gender: p.gender, timeUnknown: p.hour == null });
const cut = (s: string, n: number) => {
  if (s.length <= n) return s;
  const end = s.lastIndexOf('.', n);
  return end > n * 0.6 ? s.slice(0, end + 1) : `${s.slice(0, n).trimEnd()}…`; // 문장 끝에서 자르면 말줄임표를 붙이지 않음
};

export type Preview = {
  productId: string; title: string; who: string; intro: string; amount: string;
  basis?: string; // 예시의 기준일·분석 대상 기간(10/28 검수 12)
  tocNote?: string; // 목차 위 안내(예: 4종 묶음은 재물사주 발췌)
  summary?: { headline: string; lead: string } | null;
  toc: { part?: string; title: string }[];
  excerpt: { no: number; title: string; say: string; body: string; locked: boolean }[];
  note: string;
};
const cache = new Map<string, Preview>();
const MONTH_SAMPLE = '2026-11';
const ymOf = (y: number, m: number) => `${y}년 ${m}월`;
function basisOf(id: string, now: Date) {
  const k = new Date(now.getTime() + 9 * 3600e3);
  const y = k.getUTCFullYear(), m = k.getUTCMonth() + 1;
  const date = `${y}.${String(m).padStart(2, '0')}.${String(k.getUTCDate()).padStart(2, '0')}`;
  const ahead = (n: number) => { const t = m - 1 + n - 1; return `${ymOf(y, m)} ~ ${ymOf(y + Math.floor(t / 12), (t % 12) + 1)}`; };
  const span = id.startsWith('money_') && id !== 'money_wealth' ? `분석 대상 ${y}년`
    : id === 'path_deep' ? `분석 기간 앞으로 6개월(${ahead(6)})`
      : ['love_flow', 'reunion', 'gunghap', 'adult_gunghap', 'marriage', 'career'].includes(id) ? `분석 기간 앞으로 12달(${ahead(12)})`
        : id === 'month_detail' ? `예시 달 ${ymOf(2026, 11)} · 구매할 때는 원하는 달을 골라요`
          : id === 'newyear_2027' ? '분석 대상 2027년' : '';
  return `예시 기준일 ${date}${span ? ` · ${span}` : ''}`;
}

export function previewOf(p: { id: string; title: string; kind: string; adult?: boolean }, now = new Date()): Preview | null {
  const long = p.id === 'lifetime' && liveAI() && longOn();
  const key = `${p.id}:${now.toISOString().slice(0, 10)}:${long}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let out: Preview;
  if (p.id === 'friend_pass') {
    out = {
      productId: p.id, title: p.title, who: '김서윤(예시)', intro: '달빛 상담은 내 사주를 아는 상담사와 나누는 대화예요. 아래는 예시 대화예요.', amount: '질문 10회 · 90일', summary: null, toc: [],
      excerpt: [
        { no: 1, title: '예시 대화 ①', say: '고객: 요즘 일이 손에 안 잡혀요', body: '서월: 마음이 여기저기 흩어져 있는 날이 있죠. 요즘 제일 신경 쓰이는 일이 뭐예요? 김서윤 님 사주는 생각이 많아질수록 몸을 먼저 움직이면 정리가 빨라지는 편이에요.', locked: false },
        { no: 2, title: '예시 대화 ②', say: '고객: 이직을 고민 중이에요', body: '서월: 그 고민, 꽤 오래 품고 있었을 것 같아요. 김서윤 님 사주에서 일의 흐름이 밝아지는 달도 함께 짚어 드릴게요. 먼저 지금 회사에서 가장 아쉬운 게 무엇인지부터 같이 정리해 볼까요?', locked: false },
      ],
      note: '예시 대화예요. 실제 상담은 내 사주와 내가 한 말에 맞춰 이어져요.',
    };
  } else if (long) {
    out = {
      productId: p.id, title: p.title, who: '김서윤(예시)', intro: SAMPLE.intro, amount: `${LONG_PARTS.length}부 ${LONG_OUTLINE.length}장 · A4 약 40쪽(PDF 저장 가능)`, summary: null,
      toc: LONG_OUTLINE.map((c) => ({ part: c.partTitle, title: c.title })),
      excerpt: SAMPLE.chapters.map((c, i) => ({ no: c.no, title: c.title, say: c.say, body: i === 0 ? c.body : cut(c.body, 260), locked: i > 0 })),
      note: '예시 인물의 실제 결과 일부예요. 실제 풀이는 내 사주로 새로 작성돼요(개인마다 내용이 달라요).',
    };
  } else {
    const ps = PAIR.has(p.id) ? [ME, YOU] : [ME];
    // 월간운세 예시는 표지 이미지(2026년 11월)와 같은 달로 고정 — 실제 구매는 고객이 고른 달(10/28 검수 14)
    const facts = buildFacts(p.id, ps, ps.map(sajuOf), (META[p.id] as never) ?? (p.id === 'month_detail' ? { ym: MONTH_SAMPLE } : null), null, now);
    const c = engineContent({ id: p.id, title: p.title }, ps, facts);
    const adult = !!p.adult;
    out = {
      productId: p.id, title: p.title, who: ps.map((x) => x.name).join('·') + '(예시)', intro: c.intro, amount: p.id === 'money_pack' ? '풀이 4개(재물·사업·투자·부동산) · 22가지 분석' : `${c.chapters.length}가지 핵심 분석`,
      summary: c.summary && !adult ? { headline: c.summary.headline, lead: c.summary.lead } : null, // 19세 상품은 목차만(10/28 검수 15)
      basis: basisOf(p.id, now),
      tocNote: p.id === 'money_pack' ? '4종 중 「프리미엄 재물사주」 발췌 예시 · 전체는 재물 7 + 사업 5 + 투자 5 + 부동산 5 = 22가지 분석' : undefined,
      toc: c.chapters.map((x) => ({ title: x.title })),
      excerpt: adult ? [] : c.chapters.slice(0, 2).map((x, i) => ({ no: i + 1, title: x.title, say: x.say, body: i === 0 ? cut(x.body, 900) : cut(x.body, 100), locked: i > 0 })),
      note: adult ? '19세 이상 상품이라 미리보기는 구성(목차)만 보여 드려요.' : '예시 인물의 실제 결과 일부예요. 실제 풀이는 내 사주로 새로 계산돼요(개인마다 내용이 달라요).',
    };
  }
  cache.set(key, out);
  if (cache.size > 60) cache.delete(cache.keys().next().value!);
  return out;
}
