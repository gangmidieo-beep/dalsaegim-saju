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
// 메이저 카드는 '큰 흐름'의 상징 — 그 사람의 실제 마음을 단정하지 않는다(11/3 대표님 검수)
const MAJOR_AT: [string, string, string] = [
  '메이저 카드가 그 사람의 마음 자리에 나왔어요. 상징으로 읽으면, 이 관계가 그냥 스쳐 가는 일상보다 조금 더 무게 있게 놓여 있다는 신호예요.',
  '메이저 카드가 관계 자리에 놓였어요. 두 사람 사이에 작지 않은 흐름이 움직이고 있다는 상징이에요.',
  '메이저 카드가 결과 자리에 나왔어요. 앞으로 관계의 방향을 정하는 중요한 장면이 한 번 찾아온다는 상징이에요.',
];
const ASK: [string, string, string] = ['그 사람이 나에게 가장 편안해 보였던 순간은 언제였나요?', '요즘 두 사람의 대화에서 가장 자주 나오는 주제는 무엇인가요?', '이 관계에서 내가 가장 원하는 다음 장면은 무엇인가요?'];
// 마이너 카드 숫자의 뜻(카드 한 장을 더 깊게 읽기 위한 기본 의미)
const RANK: Record<number, string> = {
  1: '에이스는 무언가가 처음 싹트는 자리예요', 2: '2는 두 마음이 마주 보는 균형의 숫자예요', 3: '3은 관계가 넓어지고 무르익는 숫자예요', 4: '4는 쉬어 가며 지키는 안정의 숫자예요',
  5: '5는 흔들림과 시험의 숫자예요', 6: '6은 주고받으며 회복하는 숫자예요', 7: '7은 고민하고 선택하는 숫자예요', 8: '8은 움직임과 변화의 숫자예요',
  9: '9는 거의 다 온 결실의 숫자예요', 10: '10은 한 흐름이 끝나고 다음으로 넘어가는 숫자예요', 11: '시종(페이지)은 새로운 소식과 호기심을 뜻해요', 12: '기사(나이트)는 빠른 행동과 추진을 뜻해요',
  13: '여왕(퀸)은 감싸 주는 깊은 마음을 뜻해요', 14: '왕(킹)은 책임감과 결정을 뜻해요',
};
// 썸에서 특히 반가운 카드 / 조심스러운 카드
const WARM = new Set(['연인', '태양', '별', '세계', '컵 2', '컵 10', '컵 9', '컵 에이스', '여황제', '완드 4']);
const COOL = new Set(['탑', '달', '소드 3', '소드 10', '소드 9', '컵 5', '은둔자']);
/** 카드 분위기 지수 — 정방향 74·역방향 52를 기준으로 썸에 따뜻한 카드는 더하고 조심스러운 카드는 뺀다(사주 점수·확률 아님) */
export function cardTone(d: Drawn) {
  let v = d.rev ? 52 : 74;
  if (WARM.has(d.card.name)) v += d.rev ? 6 : 14;
  if (COOL.has(d.card.name)) v -= d.rev ? 2 : 14;
  if (d.card.arcana === 'major' && !d.rev) v += 3;
  return Math.max(35, Math.min(95, v));
}
export const TONE_NOTE = '막대는 고른 카드의 분위기 지수예요. 정방향 74·역방향 52를 기준으로, 썸에 따뜻한 카드(연인·태양·별·컵 2 등)는 더하고 조심스러운 카드(탑·달·소드 3 등)는 빼서 계산해요. 사주 점수나 확률이 아니라, 카드가 비추는 분위기를 한눈에 보는 표시예요.';

export function tarotReading(cards: Drawn[], name: string, saju: SajuResult, profileId: string, now = new Date()) {
  const [a, b, c] = cards;
  const kwOf = (d: Drawn) => cardKw(d);
  const intro = (d: Drawn) => (d.card.arcana === 'major' ? `메이저 아르카나 ${d.card.num ?? 0}번 '${d.card.name}'` : `'${d.card.name}'`);
  const deep = (d: Drawn) => d.card.arcana === 'major' ? '' : `${RANK[d.card.rank ?? 0] ?? ''}${RANK[d.card.rank ?? 0] ? '. ' : ''}${TAROT_SUITS[d.card.suit ?? 'cups'].name}는 '${TAROT_SUITS[d.card.suit ?? 'cups'].mean}'을 뜻하는 무늬예요.`;
  const other = (d: Drawn) => (d.rev ? `같은 카드가 정방향이었다면 '${d.card.kw}'로 읽혔을 거예요. 지금은 거꾸로 놓여, 그 힘이 아직 막혀 있거나 안쪽으로 숨어 있다는 뜻이 더해져요.` : `이 카드가 거꾸로 나왔다면 '${d.card.rkw}'로 읽혔을 거예요. 바로 놓였다는 건 카드의 좋은 결이 그대로 흐르고 있다는 뜻이에요.`);
  const pos = (d: Drawn, i: number) => {
    const P = TAROT_POSITIONS[i];
    const dir = d.rev ? '역방향' : '정방향';
    const at = d.card.arcana === 'major' ? MAJOR_AT[i] : SUIT_AT[d.card.suit ?? 'cups'][i].replace('그 사람은 ', '카드의 결로 보면 그 사람은 ').replace('그 사람의 마음은 ', '카드의 결로 보면 그 사람의 마음은 ');
    const kw = kwOf(d);
    return [
      `${P.lead}에는 ${intro(d)} ${dir} 카드가 놓였어요. 이 자리에서의 키워드는 '${kw}'${ieyo(kw).slice(kw.length)}.`,
      ...(i === 0 ? ['먼저 한 가지를 짚을게요. 이 자리는 카드가 상징하는 마음의 결을 읽는 곳이에요. 그 사람의 실제 감정이나 의도를 대신 말해 주는 건 아니에요. 실제 마음은 대화 속 반응으로 확인하는 게 가장 정확해요.'] : []),
      d.rev ? d.card.rv : d.card.up,
      [deep(d), at].filter(Boolean).join(' '),
      other(d),
      `스스로에게 물어보세요 — ${ASK[i]}`,
    ];
  };
  const revN = cards.filter((d) => d.rev).length;
  const majors = cards.filter((d) => d.card.arcana === 'major').length;
  const suits = cards.map((d) => d.card.suit).filter(Boolean) as string[];
  const domSuit = Object.entries(suits.reduce<Record<string, number>>((m, s) => ({ ...m, [s]: (m[s] ?? 0) + 1 }), {})).sort((x, y) => y[1] - x[1])[0];
  const flowLine = revN === 0 ? '세 장 모두 정방향이에요. 마음의 흐름이 막힘없이 열려 있다는 상징이라, 망설이기보다 가볍게 한 걸음 다가가기 좋은 결이에요.'
    : revN === 1 ? `세 장 가운데 한 장('${[a, b, c].find((d) => d.rev)!.card.name}')이 역방향이에요. 마음은 이어져 있지만 걸림돌이 하나 있다는 상징이에요. 그 한 장이 말하는 부분만 풀어도 흐름이 훨씬 가벼워져요.`
      : revN === 2 ? '역방향 카드가 두 장이에요. 서로 마음은 있어도 조심스러운 부분이 많다는 상징이라, 속도를 맞추는 게 가장 중요해요.'
        : '세 장 모두 역방향이에요. 지금은 관계를 밀어붙이기보다 각자의 마음을 정리할 시간이 필요하다는 신호예요. 멈춤이 끝은 아니에요.';
  const majorLine = majors >= 2 ? `메이저 카드가 ${majors}장이에요. 메이저 카드는 인생의 큰 장면을 뜻해서, 이 썸이 ${name} 님 마음에서 작지 않은 자리를 차지하고 있다는 상징이에요.`
    : majors === 1 ? '메이저 카드가 한 장 섞여 있어요. 일상의 작은 순간 속에 관계를 바꿀 중요한 계기가 하나 숨어 있다는 상징이에요.'
      : '세 장 모두 마이너 카드예요. 큰 사건보다 매일의 대화와 작은 행동이 이 관계를 만들어 간다는 뜻이에요.';
  const suitLine = domSuit && domSuit[1] >= 2 ? `특히 ${TAROT_SUITS[domSuit[0]].name} 카드가 ${domSuit[1]}장으로, 이 관계의 열쇠는 '${TAROT_SUITS[domSuit[0]].mean}'이에요.` : '';
  const love = nextMonths(saju, 'love', profileId, now), partner = nextMonths(saju, 'partner', profileId, now);
  const meet = love.map((x, i) => ({ ...x, score: Math.round((x.score + partner[i].score) / 2) }));
  const good = [...meet].sort((x, y) => y.score - x.score).slice(0, 2), care = [...meet].sort((x, y) => x.score - y.score).slice(0, 1);
  const tone = Math.round(cards.reduce((s, d) => s + cardTone(d), 0) / 3);
  const verdict = tone >= 78 ? '따뜻하게 다가오는 썸' : tone >= 66 ? '서로를 알아 가는 썸' : tone >= 55 ? '조심스럽게 맞춰 가는 썸' : '잠시 숨을 고르는 썸';
  // 하나의 행동 지침 — 결과 카드와 역방향 수로 '다가가기/기다리기' 중 하나를 정하고, 각 카드의 조언은 그 안에서 조건으로 쓴다(서로 반대 조언 금지)
  const wait = c.rev || revN >= 2 || COOL.has(c.card.name);
  const goodL = monthsLabel(good, now), careL = monthsLabel(care, now);
  const tipOf = (d: Drawn) => (d.rev ? d.card.rtip : d.card.tip).replace(/[.。]$/, '');
  const stance = wait
    ? `지금 세 장이 함께 가리키는 방향은 '서두르지 않기'예요. 결과 자리의 '${c.card.name}'${c.rev ? ' 역방향' : ''}이 타이밍을 맞추라고 말하고 있어서, 먼저 결론을 내려 하거나 관계를 정의해 달라고 재촉하는 건 미뤄 두는 게 좋아요.`
    : `지금 세 장이 함께 가리키는 방향은 '가볍게 다가가기'예요. 결과 자리의 '${c.card.name}'이 열린 흐름을 보여 주고 있어서, 부담 없는 연락 한 번이 관계를 한 칸 앞으로 옮겨 줄 수 있어요.`;
  const stanceTip = wait === c.rev ? `결과 카드가 건네는 조언도 같은 방향이에요 — ${tipOf(c)}.` : ''; // 방향과 어긋나는 카드 조언은 싣지 않는다
  const actions = [
    `연락해도 좋은 때: 상대가 먼저 안부를 묻거나 답장이 전보다 빨라졌을 때, 그리고 사주로 본 ${goodL} 무렵이에요. 이때는 '${tipOf(b)}' — 이렇게 해 보세요.`,
    `기다리는 게 나은 때: 답이 짧아지거나 늦어질 때, 그리고 ${careL}이에요. 이때는 결론을 묻거나 관계를 정의해 달라고 하기보다, 안부나 둘이 함께 좋아하는 이야기 정도로 대화의 온도만 지켜 주세요.`,
    `어느 쪽이든 지킬 한 가지: ${tipOf(a)}. 그 사람의 마음은 카드보다 실제 반응이 더 정확히 알려 줘요.`,
  ];
  const sections: string[][] = [
    pos(a, 0),
    pos(b, 1),
    pos(c, 2),
    [flowLine, majorLine, suitLine, `세 장의 키워드를 이어 보면 '${kwOf(a)} → ${kwOf(b)} → ${kwOf(c)}'의 흐름이에요. 마음의 결(${kwOf(a)})이 관계의 움직임(${kwOf(b)})으로 이어지고, 그 끝에서 '${kwOf(c)}'을 만나는 이야기예요. 지금 두 사람은 ${verdict}의 단계에 있어요.`].filter(Boolean),
    [stance, stanceTip, ...actions].filter(Boolean),
    [`타로가 지금의 분위기를 보여 준다면, 사주는 마음이 움직이기 좋은 때를 알려 줘요. ${name} 님 사주의 연애 기운(일간과 그 달의 기운이 만나는 정도)과 배우자·인연 자리의 기운을 함께 계산해, 앞으로 12달 가운데 가장 밝은 달을 골랐어요.`,
      `마음이 닿기 쉬운 달은 ${goodL}이에요. 중요한 대화나 데이트 제안은 이 무렵에 두면 자연스럽게 이어지기 쉬워요. 반대로 ${careL}은 마음이 쉽게 흔들리는 달이라, 큰 결론은 미뤄 두는 게 좋아요.`,
      pick(['카드는 정답이 아니라 지금 마음을 비춰 보는 거울이에요. 마지막 선택은 언제나 내 마음이 정해요.', '타로는 지금 이 순간의 분위기예요. 내가 다르게 움직이면 다음 카드도 달라져요.'], `${profileId}:tarot:end`)],
  ];
  return {
    sections,
    verdict, tone,
    metrics: cards.map((d, i) => ({ label: TAROT_POSITIONS[i].title, score: cardTone(d), note: kwOf(d) })),
    good: goodL, careful: careL,
    facts: [`카드: ${cards.map((d, i) => `${TAROT_POSITIONS[i].title}=${d.card.name}(${d.rev ? '역' : '정'})`).join(' / ')}`, `분위기: ${verdict} / 마음이 닿기 쉬운 달 ${goodL}`],
    action: wait ? `서두르지 말고, ${goodL} 무렵 상대의 반응을 보며 가볍게 다가가세요.` : `${goodL} 무렵, 부담 없는 연락 한 번으로 먼저 다가가 보세요.`,
    actions,
    // 장마다 머리 문구·강조 한 줄(본문 첫 문장을 되풀이하지 않게)
    meta: [
      { say: kwOf(a), highlight: `카드의 상징은 '${kwOf(a)}' — 실제 마음은 대화 속 반응으로 확인해요.` },
      { say: kwOf(b), highlight: `두 사람 사이에 흐르는 결은 '${kwOf(b)}'이에요.` },
      { say: kwOf(c), highlight: `앞으로 만날 장면의 열쇠는 '${kwOf(c)}'이에요.` },
      { say: verdict, highlight: `지금 두 사람은 '${verdict}'의 단계에 있어요.` },
      { say: wait ? '서두르지 않기' : '가볍게 다가가기', highlight: wait ? `${goodL} 무렵, 상대의 반응을 보며 천천히 다가가요.` : `${goodL} 무렵, 부담 없는 연락 한 번이 좋아요.` },
      { say: '사주로 본 시기', highlight: `마음이 닿기 쉬운 달 · ${goodL}` },
    ],
  };
}

/** 오늘의 타로 한 장(무료) — 같은 날 같은 사람이면 같은 카드 */
export function dailyCard(seed: string): Drawn {
  let h = 2166136261;
  for (const ch of seed) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return { card: TAROT[h % TAROT.length], rev: (h >> 8) % 4 === 0 };
}
