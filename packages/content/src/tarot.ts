// 썸 타로 — 78장(메이저 22 + 마이너 56) 썸·연애 해석 DB. 3장 배열: 그 사람의 마음 / 우리 사이의 흐름 / 다가올 결과와 조언.
// 카드는 고객이 화면에서 직접 고른다(정·역방향은 고를 때 정해짐). 해석은 DB + 사주로 본 '마음이 닿는 달'을 묶어 AI 없이 만든다.
import type { SajuResult } from '@dalsaegim/engine';
import { pick } from './core';
import { nextMonths } from './path';
import { monthsLabel } from './life';
import T from '../data/tarot.json' with { type: 'json' };

export type TarotCard = { id: number; name: string; arcana: 'major' | 'minor'; num?: number; suit?: string; rank?: number; sym: string; kw: string; rkw: string; up: string; rv: string; tip: string; rtip: string };
export const TAROT = T.cards as TarotCard[];
export const TAROT_POSITIONS = T.positions as { id: string; title: string; lead: string }[];
export const TAROT_SUITS = T.suits as Record<string, { name: string; mean: string }>;
export type Drawn = { card: TarotCard; rev: boolean };

/** "12r,5,33" → 3장. 잘못된 값이면 null */
export function parseCards(s: string | undefined | null): Drawn[] | null {
  if (!s) return null;
  const xs = s.split(',').map((t) => ({ id: Number(t.replace('r', '')), rev: t.endsWith('r') }));
  if (xs.length !== 3 || new Set(xs.map((x) => x.id)).size !== 3 || xs.some((x) => !Number.isInteger(x.id) || x.id < 0 || x.id >= TAROT.length)) return null;
  return xs.map((x) => ({ card: TAROT[x.id], rev: x.rev }));
}
export const cardKw = (d: Drawn) => (d.rev ? d.card.rkw : d.card.kw);
/** 받침에 맞춰 '이에요/예요' */
export const ieyo = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 ? `${w}이에요` : `${w}예요`; };
// 자리별로 덧붙이는 해석(카드 결 + 자리의 뜻)
const SUIT_AT: Record<string, [string, string, string]> = {
  wands: ['완드는 열정과 행동을 뜻해요. 그 사람은 생각보다 몸이 먼저 움직이는 상태라, 작은 계기에도 반응이 빨라요.', '완드가 관계 자리에 놓이면 두 사람 사이에 설렘과 추진력이 흐른다는 뜻이에요. 다만 열기가 식지 않게 꾸준함이 필요해요.', '완드가 결과 자리에 오면 행동이 결과를 만든다는 신호예요. 기다리기보다 먼저 움직이는 쪽에 흐름이 와요.'],
  cups: ['컵은 감정과 마음을 뜻해요. 그 사람의 마음은 지금 머리보다 감정 쪽에서 크게 움직이고 있어요.', '컵이 관계 자리에 놓이면 두 사람을 잇는 건 감정의 교류라는 뜻이에요. 대화의 온도가 관계의 온도예요.', '컵이 결과 자리에 오면 마음을 나눌수록 결과가 좋아진다는 신호예요. 감정을 숨기지 않는 쪽이 유리해요.'],
  swords: ['소드는 생각과 말을 뜻해요. 그 사람은 감정보다 생각이 많아, 마음을 정하기 전에 여러 번 따져 보는 중이에요.', '소드가 관계 자리에 놓이면 두 사람 사이의 열쇠는 대화라는 뜻이에요. 말 한마디가 관계를 크게 바꿀 수 있어요.', '소드가 결과 자리에 오면 솔직하고 분명한 대화가 결과를 정한다는 신호예요. 애매함을 걷어 낼수록 좋아요.'],
  pentacles: ['펜타클은 현실과 안정을 뜻해요. 그 사람은 설렘보다 이 관계가 현실적으로 이어질 수 있는지를 살피고 있어요.', '펜타클이 관계 자리에 놓이면 두 사람 사이가 천천히, 하지만 단단하게 쌓이고 있다는 뜻이에요.', '펜타클이 결과 자리에 오면 꾸준함과 실제 행동이 결과를 만든다는 신호예요. 약속을 지키는 모습이 가장 큰 고백이에요.'],
};
const MAJOR_AT: [string, string, string] = ['메이저 카드가 그 사람의 마음 자리에 나왔어요. 이 관계가 그 사람에게 가볍지 않다는 뜻이에요.', '메이저 카드가 관계 자리에 놓였어요. 두 사람 사이에 작지 않은 흐름이 움직이고 있어요.', '메이저 카드가 결과 자리에 나왔어요. 앞으로 관계의 방향을 바꿀 만한 중요한 순간이 다가와요.'];
const ASK: [string, string, string] = ['그 사람이 나에게 가장 편안해 보였던 순간은 언제였나요?', '요즘 두 사람의 대화에서 가장 자주 나오는 주제는 무엇인가요?', '이 관계에서 내가 가장 원하는 다음 장면은 무엇인가요?'];
// 썸에서 특히 반가운 카드 / 조심스러운 카드
const WARM = new Set(['연인', '태양', '별', '세계', '컵 2', '컵 10', '컵 9', '컵 에이스', '여황제', '완드 4']);
const COOL = new Set(['탑', '달', '소드 3', '소드 10', '소드 9', '컵 5', '은둔자']);
/** 카드가 보여 주는 분위기(점수·확률 아님 — 화면 막대 길이용) */
export function cardTone(d: Drawn) {
  let v = d.rev ? 52 : 74;
  if (WARM.has(d.card.name)) v += d.rev ? 6 : 14;
  if (COOL.has(d.card.name)) v -= d.rev ? 2 : 14;
  if (d.card.arcana === 'major' && !d.rev) v += 3;
  return Math.max(35, Math.min(95, v));
}

export function tarotReading(cards: Drawn[], name: string, saju: SajuResult, profileId: string, now = new Date()) {
  const [a, b, c] = cards;
  const pos = (d: Drawn, i: number) => {
    const P = TAROT_POSITIONS[i];
    const dir = d.rev ? '역방향' : '정방향';
    const at = d.card.arcana === 'major' ? MAJOR_AT[i] : SUIT_AT[d.card.suit ?? 'cups'][i];
    const tip = d.rev ? d.card.rtip : d.card.tip;
    const kw = cardKw(d);
    return [`${P.lead}에 '${d.card.name}' ${dir} 카드가 나왔어요. 키워드는 '${kw}'${ieyo(kw).slice(kw.length)}.`, d.rev ? d.card.rv : d.card.up, at, ...(i < 2 ? [`이 자리의 조언: ${tip}`] : []), `스스로에게 물어보세요 — ${ASK[i]}`];
  };
  const revN = cards.filter((d) => d.rev).length;
  const majors = cards.filter((d) => d.card.arcana === 'major').length;
  const suits = cards.map((d) => d.card.suit).filter(Boolean) as string[];
  const domSuit = Object.entries(suits.reduce<Record<string, number>>((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {})).sort((x, y) => y[1] - x[1])[0];
  const flowLine = revN === 0 ? '세 장 모두 정방향이라 마음의 흐름이 막힘없이 열려 있어요. 지금은 망설이기보다 한 걸음 다가가기 좋은 때예요.'
    : revN === 1 ? '세 장 가운데 한 장이 역방향이에요. 마음은 이어져 있지만 한 가지 걸림돌이 있으니, 그 부분만 풀면 흐름이 훨씬 가벼워져요.'
      : revN === 2 ? '역방향 카드가 두 장이에요. 서로 마음은 있지만 조심스러운 부분이 많아, 속도를 맞추는 게 가장 중요해요.'
        : '세 장 모두 역방향이에요. 지금은 관계를 밀어붙이기보다 각자의 마음을 정리할 시간이 필요하다는 신호예요. 멈춤이 끝은 아니에요.';
  const majorLine = majors >= 2 ? `메이저 카드가 ${majors}장이나 나왔어요. 이 썸은 가볍게 스쳐 가는 인연이 아니라, ${name} 님의 마음에 큰 흐름을 만드는 만남이에요.`
    : majors === 1 ? '메이저 카드가 한 장 섞여 있어요. 일상의 작은 순간 속에 관계를 바꿀 중요한 계기가 하나 숨어 있어요.'
      : '세 장 모두 마이너 카드예요. 큰 사건보다는 매일의 대화와 작은 행동이 이 관계를 만들어 가요.';
  const suitLine = domSuit && domSuit[1] >= 2 ? `특히 ${TAROT_SUITS[domSuit[0]].name} 카드가 ${domSuit[1]}장으로, 이 관계의 열쇠는 '${TAROT_SUITS[domSuit[0]].mean}'이에요.` : '';
  const love = nextMonths(saju, 'love', profileId, now), partner = nextMonths(saju, 'partner', profileId, now);
  const meet = love.map((x, i) => ({ ...x, score: Math.round((x.score + partner[i].score) / 2) }));
  const good = [...meet].sort((x, y) => y.score - x.score).slice(0, 2), care = [...meet].sort((x, y) => x.score - y.score).slice(0, 1);
  const tone = Math.round(cards.reduce((s, d) => s + cardTone(d), 0) / 3);
  const verdict = tone >= 78 ? '따뜻하게 다가오는 썸' : tone >= 66 ? '서로를 알아 가는 썸' : tone >= 55 ? '조심스럽게 맞춰 가는 썸' : '잠시 숨을 고르는 썸';
  const advice = c.rev ? c.card.rtip : c.card.tip;
  const sections: string[][] = [
    pos(a, 0),
    pos(b, 1),
    [...pos(c, 2), `카드가 건네는 조언은 이거예요. ${advice}`],
    [flowLine, majorLine, suitLine, `세 장의 키워드를 이어 보면 '${cardKw(a)} → ${cardKw(b)} → ${cardKw(c)}'의 흐름이에요. 지금 두 사람은 ${verdict}의 단계에 있어요.`].filter(Boolean),
    [`타로가 지금의 분위기를 보여 준다면, 사주는 마음이 움직이기 좋은 때를 알려 줘요. ${name} 님의 사주로 보면 앞으로 마음이 닿기 쉬운 달은 ${monthsLabel(good, now)}이에요.`,
      `중요한 대화나 고백, 데이트 제안은 이 시기에 두면 자연스럽게 이어지기 쉬워요. 반대로 ${monthsLabel(care, now)}에는 마음이 쉽게 흔들리니 결론을 서두르지 마세요.`,
      pick(['카드는 정답이 아니라 지금 마음을 비춰 보는 거울이에요. 마지막 선택은 언제나 내 마음이 정해요.', '타로는 지금 이 순간의 분위기예요. 내가 다르게 움직이면 다음 카드도 달라져요.'], `${profileId}:tarot:end`)],
  ];
  return {
    sections,
    verdict, tone,
    metrics: cards.map((d, i) => ({ label: TAROT_POSITIONS[i].title, score: cardTone(d), note: cardKw(d) })),
    good: monthsLabel(good, now), careful: monthsLabel(care, now),
    facts: [`카드: ${cards.map((d, i) => `${TAROT_POSITIONS[i].title}=${d.card.name}(${d.rev ? '역' : '정'})`).join(' / ')}`, `분위기: ${verdict} / 마음이 닿기 쉬운 달 ${monthsLabel(good, now)}`],
    action: advice,
  };
}

/** 오늘의 타로 한 장(무료) — 같은 날 같은 사람이면 같은 카드 */
export function dailyCard(seed: string): Drawn {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return { card: TAROT[h % TAROT.length], rev: (h >> 8) % 4 === 0 };
}
