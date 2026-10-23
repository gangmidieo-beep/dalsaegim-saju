// 정통사주 — 「나의 사주지도 전체 풀이」(29,900원) 리포트. 사장님 10/23: "결과지 내용 보충 필요" → A4 7~8장 분량.
// 원국표(십성·십이운성·신살·귀인) → 9장(장 제목에 맞는 내용) → 오행 막대·평생 대운표·10년 연도 흐름·행운.
// 모두 엔진 계산값 + 문구 DB(data/lifetime.json). AI 호출 없음. 단정·보장 금지(결혼·건강·돈을 확정하지 않는다).
import { sipsinOfStem, twelveStage, yearPillarOf, branchRelations, kstParts, type Pillar } from '@dalsaegim/engine';
import { rawDims, toScore, type SajuResult } from './core';
import { sajuMap } from './map';
import { nextMonths } from './path';
import { moneyFlow } from './money';
import { sajuTable, type Basis, type SajuTable } from './wealth';
import { SPOUSE, MATE_EL, monthsLabel } from './life';
import L from '../data/lifetime.json' with { type: 'json' };
import WD from '../data/wealth.json' with { type: 'json' };

type PosKey = 'hour' | 'day' | 'month' | 'year';
type Cell = Extract<SajuTable[number], { empty: false }>;
export type LifeChapter = { title: string; points: string[]; say: string; paras: string[]; highlight: string; basis: Basis[] };
export type DaeunRow = { text: string; hanja: string; fromAge: number; toAge: number; fromYear: number; toYear: number; theme: string; score: number; now: boolean };

const ST = L.stem as Record<string, { nature: string; strength: string; shadow: string; env: string; motto: string }>;
const STAGE = L.stage as Record<string, string>;
const EL = L.element as Record<string, { name: string; over: string; lack: string; color: string; food: string; place: string; act: string; season: string; dir: string }>;
const SIP = L.sipsin as Record<string, string>;
const GW = L.gwiin as Record<string, string>;
const SH = L.shinsal as Record<string, string>;
const GROUP = L.groupWork as Record<string, { style: string; fields: string; tip: string }>;
const WS = WD.sipsin as Record<string, { short: string; money: string; risk: string }>;
const LUCKY = WD.lucky as Record<string, { color: string; number: number[]; direction: string; shape: string; item: string; routine: string }>;
export const LIFE_THEME = { 비견: '나다운 길을 굳히는 시기', 겁재: '경쟁 속에서 결단하는 시기', 식신: '여유와 재능이 꽃피는 시기', 상관: '변화와 새로운 도전의 시기', 편재: '기회가 넓어지고 움직임이 많은 시기', 정재: '차곡차곡 쌓아 안정되는 시기', 편관: '책임이 커지고 단단해지는 시기', 정관: '인정과 자리를 얻는 시기', 편인: '배우고 방향을 다시 찾는 시기', 정인: '도움을 받고 마음이 채워지는 시기' } as Record<string, string>;
// 대운의 십성별 '지금 할 일'
const DO: Record<string, string> = {
  비견: '내 이름으로 하는 일 하나를 정하고, 남의 기준보다 내 기준으로 계획을 세워 보세요.',
  겁재: '함께하는 사람과 역할·몫을 글로 정리해 두고, 경쟁이 있는 자리에 한 번 나서 보세요.',
  식신: '좋아하는 일을 작게라도 꾸준히 해서 기록으로 남겨 보세요. 재능이 수입으로 이어지는 시기예요.',
  상관: '바꾸고 싶던 것 하나를 골라 새 방식으로 시도해 보세요. 다만 말은 한 번 고르고 꺼내세요.',
  편재: '새로운 사람과 기회를 넓게 만나 보세요. 수입 통로를 하나 더 만드는 데 마음을 써 보세요.',
  정재: '고정 수입과 저축 구조를 먼저 다지세요. 매달 자동으로 모이는 장치가 큰 힘이 돼요.',
  편관: '맡은 책임을 피하지 말고 정면으로 해내 보세요. 몸과 마음의 쉼을 일정에 꼭 넣어 두세요.',
  정관: '자격·직함·평판처럼 인정받는 길에 힘을 모아 보세요. 약속과 원칙이 곧 기회가 돼요.',
  편인: '새로운 공부나 자격 하나를 시작해 보세요. 방향을 다시 잡는 데 혼자만의 시간이 도움이 돼요.',
  정인: '좋은 스승·선배에게 먼저 도움을 청해 보세요. 배운 것을 나누면 더 큰 도움이 돌아와요.',
};
const MOTHER: Record<string, string> = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' };
const GROUPS: [string, string[]][] = [['비겁', ['비견', '겁재']], ['식상', ['식신', '상관']], ['재성', ['편재', '정재']], ['관성', ['편관', '정관']], ['인성', ['편인', '정인']]];
const POSL: Record<PosKey, string> = { hour: '시주', day: '일주', month: '월주', year: '연주' };

const batchim = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
const ieyo = (w: string) => `${w}${batchim(w) ? '이에요' : '예요'}`;
const iga = (w: string) => `${w}${batchim(w) ? '이' : '가'}`;
const num = (b: Basis[]) => b.slice(0, 3).map((x, i) => ({ ...x, n: i + 1 }));
const avg = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length));
/** 운의 크기 — 일·재물·사랑·성장 네 지수의 평균(무료 기능과 같은 계산식) */
export const lifeScore = (saju: SajuResult, p: Pillar, seed: string) => { const r = rawDims(saju, p, seed, 0.15); return avg([r.work, r.wealth, r.love, r.growth].map(toScore)); };

export function lifetimeReport(saju: SajuResult, name: string, profileId: string, now = new Date()) {
  const table = sajuTable(saju);
  const cells = table.filter((c): c is Cell => !c.empty);
  const at = (k: PosKey) => cells.find((c) => c.key === k);
  const map = sajuMap(saju, profileId, now);
  const y0 = kstParts(now).year;
  const age = y0 - saju.solarDate.year + 1;
  const dayC = at('day')!, monthC = at('month')!, yearC = at('year')!, hourC = at('hour');
  const ds = saju.pillars.day.stem;
  const st = ST[map.dayMaster.char] ?? ST['기'];
  const counts = saju.tenGods.counts as Record<string, number>;
  const c = (...k: string[]) => k.reduce((s, x) => s + (counts[x] ?? 0), 0);
  const ratio = saju.elementRatio.ratio as Record<string, number>;
  const strongest = saju.elementRatio.strongest as string, weakest = saju.elementRatio.weakest as string;
  const missing = (saju.elementRatio.missing as string[]) ?? [];
  const need = map.need;
  const E = (e: string) => EL[e] ?? EL['토'];
  // 십성이 놓인 자리(일간 제외) — 근거 표시용
  const where = (pred: (sip: string) => boolean): Basis[] => {
    const out: Basis[] = [];
    for (const k of ['month', 'year', 'hour', 'day'] as PosKey[]) {
      const x = at(k); if (!x) continue;
      if (k !== 'day' && pred(x.stem.sip)) out.push({ pos: k, part: 'stem', n: 0 });
      if (pred(x.branch.sip)) out.push({ pos: k, part: 'branch', n: 0 });
    }
    return out;
  };
  const ranked = Object.entries(counts).filter(([k, v]) => k !== '일간' && v > 0).sort((a, b) => b[1] - a[1]);
  const groups = GROUPS.map(([g, ks]) => ({ g, n: c(...ks), top: ks.reduce((a, b) => ((counts[b] ?? 0) > (counts[a] ?? 0) ? b : a)) })).sort((a, b) => b.n - a.n);

  /* 1장 타고난 나 */
  const top1 = ranked[0], top2 = ranked[1];
  const ch1: LifeChapter = {
    title: '타고난 나 — 일간과 기질', points: ['일간으로 보는 나', '타고난 강점', '일지와 십이운성', '보완하면 좋은 점'],
    say: `${name} 님은 ${ieyo(map.dayMaster.title)}.`,
    paras: [
      `${name} 님의 사주에서 '나'를 뜻하는 글자(일간)는 ${map.dayMaster.char}(${map.dayMaster.hanja}), ${E(map.dayMaster.element).name} 기운이에요. ${st.nature}`,
      st.strength,
      ds % 2 === 0
        ? `${map.dayMaster.char}${batchim(map.dayMaster.char) ? '은' : '는'} 양(陽)의 글자라 마음먹은 것을 겉으로 드러내고 먼저 움직이는 편이에요. 생각보다 행동이 앞설 때 일이 풀리고, 기다림이 길어지면 오히려 답답함을 느껴요.`
        : `${map.dayMaster.char}${batchim(map.dayMaster.char) ? '은' : '는'} 음(陰)의 글자라 겉으로는 차분해 보여도 안으로 단단하게 다지는 힘이 있어요. 충분히 살펴본 뒤 움직일 때 실수가 적고, 한번 정한 일은 끝까지 해내요.`,
      `일간이 앉은 자리(일지)는 ${dayC.branch.han}(${dayC.branch.kor}), 십이운성으로는 '${dayC.stage}'의 자리예요. ${STAGE[dayC.stage] ?? ''} 일지의 십성은 '${dayC.branch.sip}'${batchim(dayC.branch.sip) ? '이라' : '라'}, ${SIP[dayC.branch.sip] ?? ''}`,
      top1 ? `사주 여덟 글자 가운데 가장 많이 보이는 기운은 '${top1[0]}'(${top1[1]}개)${top2 ? `이고, 그다음은 '${top2[0]}'(${top2[1]}개)` : ''}예요. ${SIP[top1[0]] ?? ''}${top2 ? ` 여기에 ${top2[0]}의 결이 더해져 ${SIP[top2[0]] ?? ''}` : ''}` : '',
      `${st.shadow}`,
      `${st.env} ${name} 님이 가진 ${map.dayMaster.keywords.join('·')}의 힘은 이런 환경에서 가장 크게 자라요.`,
    ].filter(Boolean),
    highlight: `${name} 님은 ${ieyo(map.dayMaster.title)}. ${map.dayMaster.line.split(/(?<=요\.)\s/)[0]}`,
    basis: num([{ pos: 'day', part: 'stem', n: 0 }, { pos: 'day', part: 'branch', n: 0 }, ...(top1 ? where((s) => s === top1[0]).filter((b) => !(b.pos === 'day' && b.part === 'branch')).slice(0, 1) : [])]),
  };

  /* 2장 오행 */
  const elLine = map.elements.map((e) => `${e.el}(${E(e.el).name}) ${e.pct}%`).join(' · ');
  const self = (ratio[map.dayMaster.element] ?? 0) + (ratio[MOTHER[map.dayMaster.element]] ?? 0);
  const strength = self >= 55 ? 'strong' : self <= 35 ? 'weak' : 'balanced';
  const N = E(need);
  const ch2: LifeChapter = {
    title: '오행 균형과 나를 채우는 법', points: ['나의 오행 비율', '강한 기운과 약한 기운', '신강·신약', '나를 채우는 색·음식·습관'],
    say: `가장 강한 기운은 ${strongest}, 채우면 좋은 기운은 ${ieyo(need)}.`,
    paras: [
      `${name} 님의 사주 여덟 글자를 오행으로 나누면 ${elLine}예요. 가장 강한 기운은 ${strongest}(${E(strongest).name}), 가장 약한 기운은 ${weakest}(${E(weakest).name})이에요.`,
      E(strongest).over,
      missing.length
        ? `${missing.map((m) => `${m}(${E(m).name})`).join('·')}의 기운은 원국에 드러나 있지 않아요. ${E(need).lack} 없는 기운은 나쁜 것이 아니라 '바깥에서 채워 쓰는 기운'이라, 생활 속에서 조금씩 보태 주면 균형이 살아나요.`
        : `다섯 기운이 모두 원국에 들어 있어요. 어느 한쪽이 비어 있지 않다는 건 상황마다 꺼내 쓸 카드가 있다는 뜻이에요. 다만 ${weakest} 기운이 가장 작아서, ${E(weakest).lack.replace(/^[^ ]+ 기운이 부족하면 /, '때때로 ')}`,
      `내 기운(${map.dayMaster.element})과 나를 돕는 기운(${MOTHER[map.dayMaster.element]})을 합치면 약 ${self}%예요. ${(L.strength as Record<string, string>)[strength]}`,
      `${name} 님에게 가장 필요한 기운은 '${need}(${N.name})'이에요. 색으로는 ${N.color}, 음식으로는 ${N.food}, 장소로는 ${iga(N.place)} 이 기운을 채워 줘요.`,
      `${N.act}처럼 작은 습관부터 시작해 보세요. 계절로는 ${N.season}, 방향으로는 ${N.dir}의 기운이 ${name} 님에게 힘을 보태요. ${map.elementAdvice}`,
    ],
    highlight: `${name} 님은 '${need}' 기운을 채울 때 가장 편안하고 단단해져요.`,
    basis: [],
  };

  /* 3장 연애와 결혼 */
  const female = saju.gender === 'F';
  const sp = SPOUSE[dayC.branch.sip] ?? SPOUSE['정인'];
  const starKs = female ? ['정관', '편관'] : ['정재', '편재'];
  const star = c(...starKs), starName = female ? '관성' : '재성';
  const starPos = where((s) => starKs.includes(s));
  const dohwa = cells.find((x) => x.shinsal === '년살');
  const loveM = nextMonths(saju, 'love', profileId, now), partM = nextMonths(saju, 'partner', profileId, now);
  const loveBlend = loveM.map((x, i) => ({ ...x, score: avg([x.score, partM[i].score]) }));
  const loveGood = [...loveBlend].sort((a, b) => b.score - a.score).slice(0, 3);
  const loveCare = [...loveBlend].sort((a, b) => a.score - b.score).slice(0, 2);
  const ch3: LifeChapter = {
    title: '연애와 결혼', points: ['나의 연애 스타일', '배우자 자리(일지)', '나와 잘 맞는 사람', '인연이 밝은 달'],
    say: `${name} 님의 배우자 자리에는 '${dayC.branch.sip}'의 기운이 있어요.`,
    paras: [
      `${map.dayMaster.love} ${map.areas.find((a) => a.id === 'love')!.line}`,
      `사주에서 배우자를 보는 자리는 일지예요. ${name} 님의 일지에는 '${dayC.branch.sip}'의 기운이 앉아 있어요. ${sp.life}`,
      star === 0
        ? `배우자를 뜻하는 ${iga(starName)} 원국에 드러나 있지 않아요. 인연이 없다는 뜻이 아니라, 스스로 마음을 충분히 확인한 뒤에 깊어지는 타입이라는 뜻이에요. 서두르지 않을 때 오히려 좋은 사람을 알아봐요.`
        : star >= 3
          ? `배우자를 뜻하는 ${iga(starName)} ${star}개나 보여요. 인연의 기회가 많은 만큼, 설렘보다 '편안함'을 기준으로 고르는 눈이 결혼의 열쇠예요.`
          : `배우자를 뜻하는 ${iga(starName)} ${star}개 자리하고 있어요. 인연이 자연스럽게 들어오는 구조라, 만남보다 '맞춰 가는 과정'이 더 중요해요.`,
      dohwa
        ? `${POSL[dohwa.key]}에는 사람을 끌어당기는 도화(년살)가 있어요. 처음 만나는 자리에서 호감을 얻기 쉬운 매력이에요. 다만 인기가 많을수록 내 마음이 편한 사람이 누구인지 한 번 더 살펴보세요.`
        : `도화가 두드러지지 않는 대신, 오래 볼수록 진가가 드러나는 매력이에요. 친구나 동료처럼 편하게 시작한 인연이 깊은 사랑으로 이어지기 쉬워요.`,
      `${name} 님에게 잘 맞는 사람은 ${sp.mate}이에요. 오행으로 보면 '${need}' 기운을 채워 주는, ${MATE_EL[need] ?? '마음을 잘 알아주는'} 사람 곁에서 가장 편안해져요.`,
      `앞으로 열두 달 가운데 인연과 관계의 기운이 밝은 달은 ${monthsLabel(loveGood, now)}이에요. 고백·소개·중요한 대화는 이 시기에 두면 자연스러워요. ${monthsLabel(loveCare, now)}에는 결론을 서두르지 말고 듣는 쪽을 맡아 보세요. ${sp.keep}`,
    ],
    highlight: `${name} 님에게 잘 맞는 사람은 ${sp.mate}이에요.`,
    basis: num([{ pos: 'day', part: 'branch', n: 0 }, ...starPos.slice(0, 1), ...(dohwa ? [{ pos: dohwa.key as PosKey, part: 'branch' as const, n: 0 }] : [])]),
  };

  /* 4장 재물 */
  const jae = c('편재', '정재'), sik = c('식신', '상관'), gwan = c('편관', '정관'), inn = c('편인', '정인'), bi = c('비견', '겁재');
  const jaePos = where((s) => s === '편재' || s === '정재');
  const mSip = monthC.branch.sip;
  const wf = moneyFlow(saju, 'wealth', y0, profileId, { now });
  const wf2 = moneyFlow(saju, 'wealth', y0 + 1, profileId, { now });
  const riskSip = (bi >= 2 ? (counts['겁재'] ? '겁재' : '비견') : sik >= 2 ? '상관' : jae >= 2 ? '편재' : mSip) as string;
  const toR = (xs: number[]) => xs.map((m) => `${m}월`).join('·');
  const ch4: LifeChapter = {
    title: '재물', points: ['타고난 재물 그릇', '돈이 들어오는 길', '올해·내년 재물 흐름', '지키는 법'],
    say: jae >= 2 ? '재물을 다루는 감각을 타고났어요.' : jae === 1 ? '재물의 씨앗이 분명히 자리 잡은 사주예요.' : '버는 길을 스스로 만들어 가는 사주예요.',
    paras: [
      map.areas.find((a) => a.id === 'money')!.line,
      jae >= 2
        ? `재물을 뜻하는 재성이 ${jae}개로, 돈의 흐름을 읽고 다루는 감각이 타고났어요. 들어오는 길이 여러 갈래라 수입 통로를 넓힐수록 힘이 나요.`
        : jae === 1
          ? `재물을 뜻하는 재성이 한 자리 있어요. 재물의 씨앗이 분명한 구조라, 한 가지 수입원을 깊고 단단하게 키울 때 크게 자라요.`
          : `재물을 뜻하는 재성이 원국에 드러나 있지 않아요. 돈이 없는 사주가 아니라, ${groups[0].g === '재성' ? '' : `'${groups[0].g}'의 힘(${GROUP[groups[0].g].style})으로 `}돈을 만들어 가는 구조라는 뜻이에요. 재물 운이 들어오는 해에 크게 움직이면 좋아요.`,
      sik >= 1 && jae >= 1
        ? `재능을 뜻하는 식상(${sik}개)이 재물로 이어지는 '식상생재'의 흐름이 있어요. 내 솜씨와 아이디어를 상품·서비스로 만드는 일이 곧 돈이 돼요.`
        : sik >= 1
          ? `재능을 뜻하는 식상이 ${sik}개 있어요. 솜씨는 충분하니, 그 솜씨에 '값'을 매기는 연습이 재물로 가는 다리가 돼요.`
          : gwan >= 1
            ? `일과 책임을 뜻하는 관성이 ${gwan}개 있어요. 조직 안에서 직함과 신뢰를 쌓아 안정된 수입을 만드는 길이 잘 맞아요.`
            : inn >= 1
              ? `배움을 뜻하는 인성이 ${inn}개 있어요. 자격·전문 지식이 몸값이 되는 구조라, 공부가 곧 재테크예요.`
              : `내 힘을 뜻하는 비겁이 중심이라, 남의 지시보다 내 판단으로 일할 때 수입이 안정돼요.`,
      ({ 비겁: '돈 버는 습관으로 보면, 내 이름을 건 일·내 판단으로 굴리는 돈이 잘 맞아요. 다만 동업이나 공동 지출은 처음부터 몫을 글로 정해 두세요.', 식상: '돈 버는 습관으로 보면, 재능을 꾸준히 보여 주는 것이 곧 수입이 되는 사주예요. 작은 부업·콘텐츠·강의처럼 솜씨를 파는 통로를 하나 만들어 보세요.', 재성: '돈 버는 습관으로 보면, 흐름을 읽는 감각이 좋아 기회를 잘 알아봐요. 다만 기회가 많을수록 원칙(한도·손절선·저축 비율)을 먼저 정해 두는 게 좋아요.', 관성: '돈 버는 습관으로 보면, 월급·연금·적금처럼 안정된 구조에서 재물이 커지는 사주예요. 직함과 경력이 쌓일수록 수입도 따라 올라요.', 인성: '돈 버는 습관으로 보면, 공부와 자격이 몸값이 되는 사주예요. 배움에 쓰는 돈은 아끼지 말고, 대신 충동적인 소비는 하루 미뤄 보세요.' } as Record<string, string>)[groups[0].g],
      `사회생활의 무대인 월지에는 '${mSip}'의 기운이 있어요. ${(WS[mSip] ?? WS['정재']).money}`,
      `올해 재물 흐름 지수는 ${wf.score}점이에요. 기운이 살아나는 달은 ${toR(wf.good)}이고, 한 템포 쉬어 가면 좋은 달은 ${toR(wf.careful)}이에요. 내년(${y0 + 1}년)은 ${wf2.score}점으로 ${wf2.score > wf.score + 2 ? '올해보다 한 걸음 올라서는' : wf2.score < wf.score - 2 ? '올해보다 다지는 쪽에 가까운' : '올해와 비슷하게 이어지는'} 흐름이에요.`,
      `지키는 법도 함께 볼게요. ${(WS[riskSip] ?? WS['정재']).risk} 큰돈이 오가는 결정은 기운이 밝은 달에, 숫자를 한 번 더 확인한 뒤에 내려 주세요.`,
    ],
    highlight: jae >= 1 ? `${name} 님의 재물은 '${(WS[jaePos.length ? (at(jaePos[0].pos)![jaePos[0].part === 'stem' ? 'stem' : 'branch'].sip) : '정재'] ?? WS['정재']).short}'에서 커져요.` : `${name} 님은 '${GROUP[groups[0].g].style}'으로 재물을 만드는 사람이에요.`,
    basis: num([...jaePos.slice(0, 2), { pos: 'month', part: 'branch', n: 0 }]),
  };

  /* 5장 일과 적성 */
  const g1 = groups[0], g2 = groups[1];
  const G1 = GROUP[g1.g], G2 = GROUP[g2.g];
  const wM = nextMonths(saju, 'work', profileId, now);
  const workGood = [...wM].sort((a, b) => b.score - a.score).slice(0, 3);
  const munchang = cells.find((x) => x.gwiin.includes('문창귀인'));
  const ch5: LifeChapter = {
    title: '일과 적성', points: ['일하는 방식', '잘 맞는 분야', '사회생활의 자리(월주)', '일이 풀리는 달'],
    say: `${name} 님은 '${G1.style}'에서 힘이 나요.`,
    paras: [
      `${map.dayMaster.work} ${map.areas.find((a) => a.id === 'work')!.line}`,
      `${name} 님의 사주에서 가장 힘이 있는 무리는 '${g1.g}'(${g1.n}개)예요. 그래서 ${G1.style}에서 가장 자연스럽게 실력이 드러나요. 잘 맞는 분야로는 ${G1.fields} 같은 쪽을 꼽을 수 있어요.`,
      g2.n > 0 ? `두 번째로 힘이 있는 '${g2.g}'(${g2.n}개)의 결도 함께 써 보세요. ${G2.style}의 감각이 더해지면 ${G2.fields} 쪽으로도 길이 넓어져요.` : `한 가지 결이 뚜렷한 사주라, 여러 갈래보다 한 길을 깊게 파는 것이 잘 맞아요.`,
      `사회생활의 무대인 월주는 ${monthC.stem.han}${monthC.branch.han}, 십이운성 '${monthC.stage}'에 '${monthC.shinsal}'이 함께해요. ${STAGE[monthC.stage] ?? ''} ${SH[monthC.shinsal] ?? ''}`,
      munchang ? `${POSL[munchang.key]}에 문창귀인이 있어요. ${GW['문창귀인']} 일에서도 글·기획·자격으로 이름을 남기는 길이 잘 열려요.` : G1.tip,
      `앞으로 열두 달 가운데 일의 기운이 가장 밝은 달은 ${monthsLabel(workGood, now)}이에요. 이직·면접·새 프로젝트·승진 면담처럼 일을 바꾸거나 키우는 일은 이 시기에 두면 좋아요. ${munchang ? G1.tip : G2.tip}`,
    ],
    highlight: `${name} 님에게 잘 맞는 일은 '${G1.style}'이에요.`,
    basis: num([{ pos: 'month', part: 'stem', n: 0 }, { pos: 'month', part: 'branch', n: 0 }, ...where((s) => GROUPS.find(([g]) => g === g1.g)![1].includes(s)).filter((b) => b.pos !== 'month').slice(0, 1)]),
  };

  /* 6장 가족과 사람 */
  const gwiins = cells.flatMap((x) => x.gwiin.map((g) => ({ g, key: x.key })));
  const relDM = branchRelations(saju.pillars.day.branch, saju.pillars.month.branch);
  const relDY = branchRelations(saju.pillars.day.branch, saju.pillars.year.branch);
  const has = (rs: string[], k: string) => rs.some((r) => r.toLowerCase().includes(k));
  const palace = (x: Cell | undefined, k: PosKey) => x ? `${(L.palace as Record<string, string>)[k]} ${name} 님의 ${POSL[k]}는 ${x.stem.han}${x.branch.han}, '${x.stem.sip}'${batchim(x.stem.sip) ? '과' : '와'} '${x.branch.sip}'의 기운이에요. ${SIP[x.branch.sip] ?? SIP[x.stem.sip] ?? ''}` : '';
  const ch6: LifeChapter = {
    title: '가족과 사람', points: ['집안과 뿌리(연주)', '부모·형제(월주)', '자녀와 후반(시주)', '나를 돕는 귀인'],
    say: gwiins.length ? `${name} 님의 사주에는 ${[...new Set(gwiins.map((x) => x.g))].join('·')}이 있어요.` : '스스로 쌓은 신뢰가 귀인이 되는 사주예요.',
    paras: [
      map.areas.find((a) => a.id === 'family')!.line,
      palace(yearC, 'year'),
      palace(monthC, 'month'),
      hourC ? palace(hourC, 'hour') : '태어난 시간을 몰라 시주는 비워 두었어요. 자녀와 인생 후반의 흐름은 태어난 시간을 알면 더 자세히 볼 수 있어요.',
      gwiins.length
        ? gwiins.slice(0, 3).map((x) => `${POSL[x.key]}의 ${x.g} — ${GW[x.g] ?? ''}`).join(' ')
        : `특별한 귀인 글자가 따로 드러나지 않는 대신, 오래 알고 지낸 사람과의 신뢰가 귀인 역할을 해요. 연락이 뜸해진 고마운 사람에게 안부 한 통을 먼저 건네 보세요.`,
      has(relDM, 'clash') || has(relDY, 'clash')
        ? `나의 자리(일지)가 ${has(relDM, 'clash') ? '월지' : '연지'}와 부딪히는 '충'의 관계가 있어요. 가까운 사이일수록 생각이 다를 수 있다는 뜻이라, 거리를 적당히 두고 각자의 방식을 인정할 때 관계가 편안해져요.`
        : has(relDM, 'combine') || has(relDY, 'combine')
          ? `나의 자리(일지)가 ${has(relDM, 'combine') ? '월지' : '연지'}와 서로 끌어당기는 '합'의 관계예요. 가족과 주변 사람에게서 도움과 정을 받기 쉬운 구조라, 받은 만큼 표현하면 관계가 더 단단해져요.`
          : `나의 자리(일지)와 집안의 자리 사이에 큰 부딪힘이 없어요. 관계가 담백하게 이어지는 편이라, 함께 보내는 시간이 쌓일수록 깊어져요.`,
    ].filter(Boolean),
    highlight: gwiins.length ? `${name} 님의 곁에는 도움의 손길이 닿는 귀인의 기운이 있어요.` : `${name} 님이 쌓은 신뢰가 가장 든든한 귀인이에요.`,
    basis: num([{ pos: 'year', part: 'pillar', n: 0 }, { pos: 'month', part: 'pillar', n: 0 }, ...(hourC ? [{ pos: 'hour' as PosKey, part: 'pillar' as const, n: 0 }] : [])]),
  };

  /* 7장 대운 */
  const dw = saju.daewoon as any;
  const cycles: { text: string; hanja: string; stem: number; branch: number; fromAge: number; toAge: number }[] = dw?.available ? dw.cycles : [];
  const by = saju.solarDate.year;
  const daeun: DaeunRow[] = cycles.map((x) => {
    const sip = sipsinOfStem(ds, x.stem) as string;
    return { text: x.text, hanja: x.hanja, fromAge: x.fromAge, toAge: x.toAge, fromYear: by + x.fromAge - 1, toYear: by + x.toAge - 1, theme: LIFE_THEME[sip] ?? '', score: lifeScore(saju, { text: x.text, hanja: x.hanja, stem: x.stem, branch: x.branch }, `${profileId}:dw:${x.fromAge}`), now: age >= x.fromAge && age <= x.toAge };
  });
  const curI = daeun.findIndex((x) => x.now);
  const cur = curI >= 0 ? cycles[curI] : null, nxt = curI >= 0 ? cycles[curI + 1] : cycles.find((x) => x.fromAge > age);
  const dwLine = (x: (typeof cycles)[number]) => { const sip = sipsinOfStem(ds, x.stem) as string; const stg = twelveStage(ds, x.branch) as string; return `${x.text}(${x.hanja}) 대운은 천간에 '${sip}', 지지에 '${stg}'의 기운이 들어와요. ${SIP[sip] ?? ''} ${STAGE[stg] ?? ''}`; };
  const rowOf = (x: (typeof cycles)[number]) => daeun[cycles.indexOf(x)];
  const later = curI >= 0 ? daeun.slice(curI + 2, curI + 5) : [];
  const ch7: LifeChapter = {
    title: '인생의 큰 흐름 — 대운', points: ['대운이란', '지금 대운', '다음 대운', '평생 대운표'],
    say: cur ? `지금은 ${rowOf(cur).fromYear}~${rowOf(cur).toYear}년, '${rowOf(cur).theme}'예요.` : '10년마다 바뀌는 인생의 계절을 살펴봐요.',
    paras: cycles.length ? [
      `대운은 10년마다 바뀌는 인생의 계절이에요. 같은 사람이라도 어떤 계절을 지나느냐에 따라 힘을 쓰는 방식이 달라져요. ${name} 님은 ${dw.startAge}세 무렵부터 첫 대운이 시작됐어요.`,
      curI > 0 ? `지나온 대운을 짧게 보면 ${daeun.slice(Math.max(0, curI - 3), curI).map((x) => `${x.fromAge}~${x.toAge}세 '${x.theme}'`).join(', ')}를 거쳐 왔어요. 그 시기에 겪은 일들이 지금 ${name} 님의 바탕이 되었어요.` : '',
      cur ? `지금은 ${rowOf(cur).fromYear}~${rowOf(cur).toYear}년(${cur.fromAge}~${cur.toAge}세) 대운, '${rowOf(cur).theme}'예요. ${dwLine(cur)}` : '',
      cur ? `이 대운에서 할 일: ${DO[sipsinOfStem(ds, cur.stem) as string] ?? ''}` : '',
      nxt ? `다음 대운은 ${rowOf(nxt).fromYear}년(${nxt.fromAge}세)부터 시작되는 '${rowOf(nxt).theme}'예요. ${dwLine(nxt)} 대운이 바뀌는 해의 앞뒤 1년은 환경이 바뀌기 쉬운 전환기라, 큰 결정은 충분히 준비한 뒤에 내리면 좋아요.` : '',
      later.length ? `그 뒤로는 ${later.map((x) => `${x.fromYear}~${x.toYear}년 '${x.theme}'`).join(', ')}로 이어져요. 아래 평생 대운표에서 계절의 흐름을 한눈에 볼 수 있어요.` : '',
    ].filter(Boolean) : [`태어난 정보로는 대운을 계산하지 못했어요. 생년월일과 태어난 시간을 다시 확인해 주세요.`],
    highlight: cur ? `지금 ${name} 님은 '${rowOf(cur).theme}'를 지나고 있어요.` : `${name} 님의 인생은 10년마다 새 계절을 맞아요.`,
    basis: [],
  };

  /* 8장 전성기 */
  const prime = daeun.filter((x) => x.fromAge >= 17 && x.fromAge <= 65); // 어린 시절·노년 대운은 '전성기'로 부르지 않는다
  const ahead = prime.filter((x) => x.toAge >= age);
  const bestAll = [...prime].sort((a, b) => b.score - a.score)[0];
  const lateBest = daeun.filter((x) => x.fromAge > 65).sort((a, b) => b.score - a.score)[0];
  const bestAhead = [...ahead].sort((a, b) => b.score - a.score)[0];
  const years = Array.from({ length: 10 }, (_, i) => { const y = y0 + i; return { y, score: lifeScore(saju, yearPillarOf(new Date(Date.UTC(y, 5, 15, 3))), `${profileId}:yr:${y}`) }; });
  const yTop = [...years].sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.y - b.y);
  const yLow = [...years].sort((a, b) => a.score - b.score).slice(0, 2).sort((a, b) => a.y - b.y);
  const ch8: LifeChapter = {
    title: '나의 전성기', points: ['인생 전체의 전성기', '앞으로의 전성기', '앞으로 10년, 빛나는 해', '전성기를 키우는 법'],
    say: bestAhead ? `앞으로 가장 밝은 대운은 ${bestAhead.fromYear}~${bestAhead.toYear}년이에요.` : '앞으로 10년의 흐름을 살펴봐요.',
    paras: [
      bestAll ? `${name} 님의 대운을 점수로 이어 보면, 기운이 가장 크게 오르는 때는 ${bestAll.fromYear}~${bestAll.toYear}년(${bestAll.fromAge}~${bestAll.toAge}세) ${bestAll.text} 대운이에요. '${bestAll.theme}'의 흐름이 ${name} 님의 전성기를 이끌어요.` : '',
      bestAll && bestAhead && bestAll !== bestAhead
        ? (bestAll.toAge < age
          ? `그 시기는 이미 지나왔어요. 그때 쌓은 경험과 사람이 지금 ${name} 님의 자산이에요. 앞으로 남은 대운 가운데서는 ${bestAhead.fromYear}~${bestAhead.toYear}년 '${bestAhead.theme}'가 가장 밝아요.`
          : `앞으로 남은 대운 가운데서는 ${bestAhead.fromYear}~${bestAhead.toYear}년 '${bestAhead.theme}'도 밝게 빛나요.`)
        : bestAhead?.now ? `바로 지금이 전성기의 한가운데예요. 미뤄 둔 도전이 있다면 이 10년 안에 꺼내 보세요. 지금 시작한 일이 가장 크게 자라요.`
          : bestAhead ? `아직 오지 않은 시기라, 지금은 그때를 위한 준비의 시간이에요. 실력과 사람, 그리고 작은 저축을 차곡차곡 모아 두세요.` : '',
      lateBest && bestAll && lateBest.score > bestAll.score ? `인생 후반(${lateBest.fromAge}세 무렵 이후)에도 '${lateBest.theme}'의 밝은 기운이 이어져, 나이 들수록 든든해지는 사주예요.` : '',
      `앞으로 10년(${y0}~${y0 + 9}년) 가운데 특히 빛나는 해는 ${yTop.map((x) => `${x.y}년`).join(', ')}이에요. 이직·이사·창업·결혼처럼 큰 결정은 이런 해에 두면 흐름을 타기 쉬워요. ${yTop.map((x) => { const yp = yearPillarOf(new Date(Date.UTC(x.y, 5, 15, 3))); const sp2 = sipsinOfStem(ds, yp.stem) as string; return `${x.y}년(${yp.text}년)은 '${LIFE_THEME[sp2] ?? ''}'의 결이 들어오는 해예요.`; }).join(' ')}`,
      `${yLow.map((x) => `${x.y}년`).join('과 ')}은 속도를 늦추고 다지는 해예요. 새로 벌이기보다 건강·관계·저축을 챙기면 다음 상승이 더 커져요.`,
      `전성기를 크게 만드는 열쇠는 두 가지예요. 첫째, '${need}' 기운을 생활 속에서 채워 균형을 잡는 것. 둘째, ${GROUP[g1.g].tip}`,
    ].filter(Boolean),
    highlight: yTop.length ? `${yTop.map((x) => `${x.y}년`).join('·')}, ${name} 님의 달력에 표시해 둘 빛나는 해예요.` : `${name} 님의 전성기는 준비한 만큼 커져요.`,
    basis: [],
  };

  /* 9장 지금 새길 한 문장 */
  const curSip = cur ? (sipsinOfStem(ds, cur.stem) as string) : g1.top;
  const best12 = nextMonths(saju, 'work', profileId, now).map((x, i) => ({ ...x, score: avg([x.score, loveM[i].score, nextMonths(saju, 'wealth', profileId, now)[i].score]) }));
  const goodMonths = [...best12].sort((a, b) => b.score - a.score).slice(0, 3);
  const LK = LUCKY[need] ?? LUCKY['토'];
  const ch9: LifeChapter = {
    title: '지금 새길 한 문장', points: ['나에게 주는 한 문장', '지금 할 일', '달력에 표시할 달', '행운의 습관'],
    say: `"${st.motto}"`,
    paras: [
      `${name} 님의 사주를 한 문장으로 새긴다면 이렇게 말하고 싶어요. "${st.motto}"`,
      `${iga(map.dayMaster.keywords.join('·'))} ${name} 님의 무기이고, '${need}' 기운을 채울 때 그 무기가 가장 잘 쓰여요. 지금은 '${LIFE_THEME[curSip] ?? ''}'를 지나고 있으니, ${DO[curSip] ?? ''}`,
      `앞으로 열두 달 가운데 일·재물·사랑의 기운이 고르게 밝은 달은 ${monthsLabel(goodMonths, now)}이에요. 지금 달력에 표시해 두고, 그때마다 하고 싶은 일을 하나씩 꺼내 보세요.`,
      `작은 행운의 습관도 곁들여 보세요. 행운의 색은 ${N.color}, 숫자는 ${LK.number.join('·')}, 방향은 ${N.dir}이에요. ${N.act} — 이런 하루하루가 '${need}' 기운을 채워 줘요.`,
      `사주는 정해진 답이 아니라 나를 이해하는 지도예요. 오늘 읽은 내용 가운데 마음에 남는 한 줄을 기록해 두면, 몇 달 뒤 실제로 어땠는지 함께 돌아볼 수 있어요.`,
    ],
    highlight: st.motto,
    basis: [],
  };

  const chapters = [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9];
  const lucky = { element: need, color: N.color, number: LK.number, direction: N.dir, shape: LK.shape, item: LK.item, routine: N.act, note: '재미로 보는 행운이에요. 결과를 보장하지 않아요.' };
  const facts = [
    `일간 ${map.dayMaster.char}(${map.dayMaster.hanja}) ${map.dayMaster.title} / 일지 ${dayC.branch.han} ${dayC.branch.sip}·${dayC.stage}`,
    `오행 ${elLine} / 강한 기운 ${strongest} / 채울 기운 ${need} / ${strength === 'strong' ? '신강' : strength === 'weak' ? '신약' : '중화'}(내 기운+돕는 기운 ${self}%)`,
    `십성 많은 순: ${ranked.map(([k, v]) => `${k} ${v}`).join(', ')} / 무리: ${groups.map((g) => `${g.g} ${g.n}`).join(', ')}`,
    `배우자 자리 ${dayC.branch.sip} / ${starName} ${star}개${dohwa ? ` / 도화 ${POSL[dohwa.key]}` : ''} / 인연 밝은 달 ${monthsLabel(loveGood, now)}`,
    `재물 지수 올해 ${wf.score}(좋은 달 ${toR(wf.good)}) 내년 ${wf2.score} / 일 밝은 달 ${monthsLabel(workGood, now)}`,
    `귀인: ${gwiins.map((x) => `${POSL[x.key]} ${x.g}`).join(', ') || '없음'}`,
    `대운: ${daeun.map((x) => `${x.fromAge}~${x.toAge}세 ${x.text} ${x.theme} ${x.score}점${x.now ? '(지금)' : ''}`).join(' / ')}`,
    `앞으로 10년 빛나는 해 ${yTop.map((x) => x.y).join(', ')} / 다지는 해 ${yLow.map((x) => x.y).join(', ')}`,
    ...chapters.map((ch, i) => `${i + 1}장 근거 표시: ${ch.basis.length ? ch.basis.map((b) => `${'①②③'[b.n - 1]} ${POSL[b.pos as PosKey]} ${b.part === 'stem' ? '천간' : b.part === 'branch' ? '지지' : '전체'}`).join(', ') : '없음'}`),
  ];
  return { table, chapters, elements: map.elements, daeun, years, lucky, facts, strength, self, need, groups, keywords: [...map.dayMaster.keywords, `${need} 기운`] };
}
export type LifetimeReport = ReturnType<typeof lifetimeReport>;
