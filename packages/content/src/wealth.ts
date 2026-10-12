// 프리미엄 재물 리포트 — 대표님이 보낸 타사 「프리미엄 재물사주」(54쪽)를 벤치마킹한 구성.
// 원국표(십성·음양오행·십이운성·십이신살·귀인) → 7장 → 장마다 근거 위치(①②③) 표시 → 3년 월별 재물 흐름·강한 시기 TOP 3 → 행운 실천.
// 모두 엔진 계산값. 근거 없는 순위·퍼센트·수익률은 만들지 않는다. AI 호출 없음.
import { STEMS, STEMS_HANJA, BRANCHES, BRANCHES_HANJA, ELEMENTS, STEM_ELEMENT, BRANCH_ELEMENT, sipsinOfStem, sipsinOfBranch, twelveStage, kstParts } from '@dalsaegim/engine';
import type { SajuResult } from './core';
import { moneyFlow, investStyle } from './money';
import { sajuMap } from './map';
import D from '../data/wealth.json' with { type: 'json' };

type PosKey = 'hour' | 'day' | 'month' | 'year';
export const POS: { key: PosKey; label: string }[] = [{ key: 'hour', label: '시주' }, { key: 'day', label: '일주' }, { key: 'month', label: '월주' }, { key: 'year', label: '연주' }];
// 지지 음양은 쓰임(체용) 기준: 子午는 음, 巳亥는 양
const BRANCH_YANG = [false, false, true, false, true, true, false, false, true, false, true, true];
const SHINSAL = ['지살', '년살', '월살', '망신살', '장성살', '반안살', '역마살', '육해살', '화개살', '겁살', '재살', '천살'];
const SHINSAL_START: Record<number, number> = { 2: 2, 0: 8, 1: 5, 3: 11 }; // 삼합별 지살 자리(寅·申·巳·亥)
export const shinsalOf = (yearBranch: number, target: number) => SHINSAL[(target - SHINSAL_START[yearBranch % 4] + 12) % 12];

const CHEONEUL: Record<number, number[]> = { 0: [1, 7], 4: [1, 7], 6: [1, 7], 1: [0, 8], 5: [0, 8], 2: [11, 9], 3: [11, 9], 7: [2, 6], 8: [3, 5], 9: [3, 5] };
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
const TAEGEUK: Record<number, number[]> = { 0: [0, 6], 1: [0, 6], 2: [3, 9], 3: [3, 9], 4: [4, 10, 1, 7], 5: [4, 10, 1, 7], 6: [2, 11], 7: [2, 11], 8: [5, 8], 9: [5, 8] };
// 천덕: 월지별 — s:천간 / b:지지
const CHEONDEOK: Record<number, ['s' | 'b', number]> = { 0: ['b', 5], 1: ['s', 6], 2: ['s', 3], 3: ['b', 8], 4: ['s', 8], 5: ['s', 7], 6: ['b', 11], 7: ['s', 0], 8: ['s', 9], 9: ['b', 2], 10: ['s', 2], 11: ['s', 1] };
const WOLDEOK: Record<number, number> = { 2: 2, 6: 2, 10: 2, 8: 8, 0: 8, 4: 8, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 };

const el = (i: number) => ELEMENTS[i] as string;
const yy = (yang: boolean) => (yang ? '양' : '음');

/** 사주 구성표 — 시·일·월·연 네 기둥(시간 모르면 시주 비움) */
export function sajuTable(saju: SajuResult) {
  const P = saju.pillars;
  const ds = P.day.stem;
  const ms = P.month.branch;
  return POS.map(({ key, label }) => {
    const p = P[key];
    if (!p) return { key, label, empty: true as const };
    const gw: string[] = [];
    if (CHEONEUL[ds].includes(p.branch)) gw.push('천을귀인');
    if (MUNCHANG[ds] === p.branch) gw.push('문창귀인');
    if (TAEGEUK[ds].includes(p.branch)) gw.push('태극귀인');
    const [t, v] = CHEONDEOK[ms];
    if ((t === 'b' && p.branch === v) || (t === 's' && p.stem === v)) gw.push('천덕귀인');
    if (WOLDEOK[ms] === p.stem) gw.push('월덕귀인');
    return {
      key, label, empty: false as const,
      stem: { han: STEMS_HANJA[p.stem], kor: STEMS[p.stem], el: el(STEM_ELEMENT[p.stem]), yy: yy(p.stem % 2 === 0), sip: key === 'day' ? '일간' : sipsinOfStem(ds, p.stem) as string },
      branch: { han: BRANCHES_HANJA[p.branch], kor: BRANCHES[p.branch], el: el(BRANCH_ELEMENT[p.branch]), yy: yy(BRANCH_YANG[p.branch]), sip: sipsinOfBranch(ds, p.branch) as string },
      stage: twelveStage(ds, p.branch),
      shinsal: shinsalOf(P.year.branch, p.branch),
      gwiin: [...new Set(gw)],
    };
  });
}
export type SajuTable = ReturnType<typeof sajuTable>;
type Cell = Extract<SajuTable[number], { empty: false }>;

export type Basis = { pos: PosKey; part: 'stem' | 'branch' | 'pillar'; n: number };
export type WealthChapter = { title: string; points: string[]; say: string; paras: string[]; highlight: string; basis: Basis[] };

const ym = (x: { y: number; m: number }) => `${x.y}년 ${x.m}월`;
const batchim = (w: string) => { const c = w.charCodeAt(w.length - 1); return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0; };
/** '편'+이에요 / '구조'+예요 */
const ieyo = (w: string) => `${w}${batchim(w) ? '이에요' : '예요'}`;
const eul = (w: string) => `${w}${batchim(w) ? '을' : '를'}`;
const WEALTH_TITLES = ['부자의 그릇', '돈 버는 구조', '인생역전 타이밍', '투자와 자산 증식', '돈과 사람', '경고와 리스크', '재물운 실천 지도'];
export const WEALTH_CHAPTERS = WEALTH_TITLES;

/** 3년(올해~2년 뒤) 월별 재물 흐름 — 무료 '돈의 흐름'과 같은 계산(같은 숫자) */
export function wealthFlow36(saju: SajuResult, profileId: string, now = new Date()) {
  const y0 = kstParts(now).year;
  const pts = [y0, y0 + 1, y0 + 2].flatMap((y) => moneyFlow(saju, 'wealth', y, profileId, { now }).flow.map((f) => ({ y, m: f.month, score: f.score })));
  const k = kstParts(now);
  const ahead = pts.filter((p) => p.y > k.year || (p.y === k.year && p.m >= k.month));
  // 강한 시기 TOP 3 — 서로 3개월 이상 떨어진 봉우리
  const top: typeof pts = [];
  for (const p of [...ahead].sort((a, b) => b.score - a.score)) {
    if (top.every((t) => Math.abs((t.y * 12 + t.m) - (p.y * 12 + p.m)) >= 3)) top.push(p);
    if (top.length === 3) break;
  }
  const low: typeof pts = [];
  for (const p of [...ahead].sort((a, b) => a.score - b.score)) {
    if (low.every((t) => Math.abs((t.y * 12 + t.m) - (p.y * 12 + p.m)) >= 3)) low.push(p);
    if (low.length === 3) break;
  }
  return { points: pts, top: top.sort((a, b) => b.score - a.score), low: low.sort((a, b) => a.y * 12 + a.m - (b.y * 12 + b.m)) };
}

export function wealthReport(saju: SajuResult, name: string, profileId: string, now = new Date()) {
  const table = sajuTable(saju);
  const cells = table.filter((c): c is Cell => !c.empty);
  const at = (k: PosKey) => cells.find((c) => c.key === k);
  const map = sajuMap(saju, profileId, now);
  const year = kstParts(now).year;
  const flow = wealthFlow36(saju, profileId, now);
  const W = moneyFlow(saju, 'wealth', year, profileId, { now });
  const B = moneyFlow(saju, 'business', year, profileId, { now });
  const E = moneyFlow(saju, 'estate', year, profileId, { now });
  const style = investStyle(saju);
  const counts = saju.tenGods.counts as Record<string, number>;
  const S = D.sipsin as Record<string, { short: string; money: string; risk: string }>;
  const SH = D.shinsal as Record<string, { good: boolean; money: string }>;
  const GW = D.gwiin as Record<string, string>;
  const month = at('month')!;
  const day = at('day')!;
  const ms = S[month.stem.sip] ?? S['정재'];
  const mb = S[month.branch.sip] ?? S['정재'];
  const jae = (counts['편재'] ?? 0) + (counts['정재'] ?? 0);
  const sik = (counts['식신'] ?? 0) + (counts['상관'] ?? 0);
  const gwan = (counts['편관'] ?? 0) + (counts['정관'] ?? 0);
  const inn = (counts['편인'] ?? 0) + (counts['정인'] ?? 0);
  const bi = (counts['비견'] ?? 0) + (counts['겁재'] ?? 0);
  // 재성이 놓인 자리(근거 표시용)
  const jaePos: Basis[] = [];
  cells.forEach((c) => { if (/재$/.test(c.stem.sip) && c.key !== 'day') jaePos.push({ pos: c.key, part: 'stem', n: 0 }); if (/재$/.test(c.branch.sip) && c.branch.sip !== '겁재') jaePos.push({ pos: c.key, part: 'branch', n: 0 }); });
  const num = (b: Basis[]) => b.map((x, i) => ({ ...x, n: i + 1 }));

  // 1장 부자의 그릇
  const vessel = jae >= 2 ? '재물을 담는 그릇이 넉넉한 편' : jae === 1 ? '재물의 씨앗이 분명히 자리 잡은 구조' : '재물이 원국에 드러나 있지 않아, 버는 길을 스스로 만드는 구조';
  const ch1: WealthChapter = {
    title: WEALTH_TITLES[0], points: ['나는 부자가 될 팔자인가', '타고난 내 재물운', '나의 부의 그릇', '재물의 강점과 약점'],
    say: `${name} 님은 ${ms.short}의 기질을 타고났어요.`,
    paras: [
      `${name} 님의 사주에서 돈을 대하는 태도는 월간의 ${month.stem.sip}에서 먼저 드러나요(①). ${ms.money}`,
      `실제 생활에서 돈이 움직이는 방식은 월지의 ${month.branch.sip}이 보여 줘요(②). ${mb.money}`,
      `원국 여덟 글자 가운데 재성(편재·정재)은 ${jae}개로, ${ieyo(vessel)}.${jaePos.length ? ' 재성이 놓인 자리(③)는 돈이 실제로 드나드는 통로라서, 그 자리가 뜻하는 분야를 넓힐수록 그릇이 커져요.' : ' 이런 사주는 식상(만들어 내는 힘)으로 재물을 불러오는 경우가 많아, 내 손으로 만든 결과물이 곧 돈의 길이 돼요.'}`,
      `강점은 ${ms.short}·${mb.short}, 조심할 점은 ${ms.risk}`,
    ],
    highlight: `${name} 님의 부의 그릇은 월주에서 현실이 돼요.`,
    basis: num([{ pos: 'month', part: 'stem', n: 0 }, { pos: 'month', part: 'branch', n: 0 }, ...jaePos.slice(0, 1)]),
  };

  // 2장 돈 버는 구조
  const typeLine = sik + jae > gwan + inn
    ? '사업가 체질에 가까워요. 정해진 월급보다 내가 만든 결과에 따라 보상이 달라지는 구조에서 힘이 나요.'
    : gwan + inn > sik + jae
      ? '조직 안에서 자리를 키우는 직장인 체질에 가까워요. 직함·전문성·신뢰가 쌓일수록 수입이 안정돼요.'
      : '직장과 사업의 장점을 함께 쓰는 균형형이에요. 안정된 수입을 바탕으로 부업·프로젝트를 키우는 방식이 잘 맞아요.';
  const ch2: WealthChapter = {
    title: WEALTH_TITLES[1], points: ['어떤 일을 해야 인생이 필까', '사업가 체질 vs 직장인 체질', '커리어 하이를 맞이할 직무', '돈이 따라오는 산업군'],
    say: typeLine.split('.')[0] + '.',
    paras: [
      `일간 ${day.stem.kor}(${day.stem.han})은 ${map.dayMaster.image}의 기운이에요(①). ${map.dayMaster.work}`,
      `만들어 내는 힘(식상) ${sik}, 재물(재성) ${jae}, 책임과 자리(관성) ${gwan}, 배움과 문서(인성) ${inn}의 구성으로 보면 ${typeLine}`,
      `올해 사업의 흐름 — ${B.summary} 기운이 살아나는 달은 ${B.good.join('·')}월이에요.`,
      `돈이 따라오는 분야는 ${map.need} 기운을 채워 주는 일이에요. ${map.elementAdvice}`,
    ],
    highlight: typeLine.split('.')[0] + '.',
    basis: num([{ pos: 'day', part: 'stem', n: 0 }, { pos: 'month', part: 'stem', n: 0 }, { pos: 'month', part: 'branch', n: 0 }]),
  };

  // 3장 인생역전 타이밍
  const dw = saju.daewoon as any;
  const cur = dw?.current?.cycle ?? dw?.current ?? null;
  const nextCycle = dw?.cycles?.find((c: any) => cur && c.order === (cur.order ?? 0) + 1);
  const t1 = flow.top[0], t2 = flow.top[1], t3 = flow.top[2];
  const ch3: WealthChapter = {
    title: WEALTH_TITLES[2], points: ['평생 자산 흐름', '돈이 움직이는 결정적 타이밍', `향후 3년 재물운이 강한 시기 TOP 3`],
    say: t1 ? `${ym(t1)}이 앞으로 3년 중 재물 흐름이 가장 강한 때예요.` : '앞으로 3년의 재물 흐름을 차례로 짚어 볼게요.',
    paras: [
      cur?.text ? `지금 ${name} 님은 ${cur.text}(${cur.hanja}) 대운을 지나고 있어요(①). 대운은 10년 단위의 큰 계절이라, 같은 노력도 계절에 따라 결과의 크기가 달라져요.${nextCycle ? ` 다음 대운 ${nextCycle.text}(${nextCycle.hanja})은 ${nextCycle.fromAge}세부터 시작돼요.` : ''}` : `출생 시각 정보에 따라 대운 계산이 제한돼, 이번 리포트는 해마다·달마다의 흐름을 중심으로 읽어요.`,
      t1 ? `앞으로 3년 동안 재물 흐름이 가장 강한 시기는 ${ym(t1)}(${t1.score}점)이에요. 그동안 준비해 온 일이 수입으로 연결되거나, 계약·정산·성과급처럼 큰 금액이 움직이기 좋은 때예요.` : '',
      t2 && t3 ? `그다음으로 강한 시기는 ${ym(t2)}(${t2.score}점)과 ${ym(t3)}(${t3.score}점)이에요. 이 무렵에는 미뤄 둔 금전 협상이나 새로운 수입원을 시작해 보기 좋아요.` : '',
      `반대로 ${flow.low.map(ym).join(', ')} 무렵에는 흐름이 낮아져요. 이때는 확장보다 지출 점검과 현금 확보를 먼저 챙기면 다음 상승을 온전히 쓸 수 있어요.`,
    ].filter(Boolean),
    highlight: t1 ? `가장 강한 재물의 때 — ${ym(t1)}` : '흐름에 맞춰 움직이면 같은 노력도 결과가 달라져요.',
    basis: num([{ pos: 'day', part: 'pillar', n: 0 }]),
  };

  // 4장 투자와 자산 증식 — 예측·권유 없이 판단 습관만
  const ch4: WealthChapter = {
    title: WEALTH_TITLES[3], points: ['내 사주 맞춤 판단 습관', '나에게 맞는 자산 관리 방식', '자산을 갉아먹는 패턴'],
    say: `${name} 님의 판단 성향은 ${ieyo(style.style)}.`,
    paras: [
      `원국의 십성 분포로 보면 ${name} 님은 ${ieyo(style.style)}(신중함 ${style.carePct}%, 도전성 ${style.boldPct}%). ${style.text}`,
      counts['편재'] ? `편재(①)가 있어 큰 기회를 알아보는 눈이 있지만, 들어오는 만큼 움직임도 커요. 큰 결정은 손실을 감당할 수 있는 한도를 먼저 적고 들어가는 습관이 자산을 지켜 줘요.` : `정재·인성 쪽 힘이 상대적으로 커서 지키는 감각이 좋아요. 다만 기회 앞에서 너무 오래 망설이면 흐름을 놓칠 수 있으니 작은 금액으로 먼저 경험해 보세요.`,
      `자산을 갉아먹는 패턴은 ${(counts['겁재'] ?? 0) > 0 ? '주변의 권유나 경쟁심에 끌려 서두르는 결정' : '확인 없이 익숙한 방식만 고집하는 결정'}이에요. 결정 전에 ‘왜 지금인지·얼마까지 괜찮은지·언제 멈출지’ 세 가지를 글로 남겨 보세요.`,
      '이 장은 어떤 자산을 언제 사고팔지 권하거나 결과를 예측하지 않아요. 사주는 내 판단의 리듬을 살피는 참고이고, 실제 결정은 정보와 원칙으로 해 주세요.',
    ],
    highlight: `수익보다 먼저 원칙 — ${style.style}의 힘을 쓰는 법`,
    basis: num(cells.filter((c) => c.stem.sip === '편재' || c.branch.sip === '편재').slice(0, 1).map((c) => ({ pos: c.key, part: (c.stem.sip === '편재' ? 'stem' : 'branch') as 'stem' | 'branch', n: 0 }))),
  };

  // 5장 돈과 사람 — 귀인·비겁
  const gwCells = cells.filter((c) => c.gwiin.length);
  const ch5: WealthChapter = {
    title: WEALTH_TITLES[4], points: ['돈을 물어다 줄 귀인', '재물을 키워 줄 파트너'],
    say: gwCells.length ? `${name} 님 원국에는 ${[...new Set(gwCells.flatMap((c) => c.gwiin))].join('·')}이 자리하고 있어요.` : '귀인은 원국 밖, 만나는 사람 속에서 찾아와요.',
    paras: [
      ...gwCells.slice(0, 3).map((c, i) => `${c.label}의 ${c.gwiin.join('·')}(${'①②③'[i]}) — ${c.gwiin.map((g) => GW[g]).join(' ')}`),
      gwCells.length === 0 ? '원국에 뚜렷한 귀인 글자가 없는 사주는 스스로 신뢰를 쌓아 귀인을 만들어 가요. 약속을 지키는 작은 습관이 가장 큰 귀인을 부릅니다.' : '',
      bi > 0 ? `비견·겁재가 ${bi}개 있어 함께 일할 사람이 곧 경쟁자가 되기도 해요. 파트너와는 역할·지분·정산 기준을 시작 전에 글로 나눠 두면 좋은 인연이 오래가요.` : `비견·겁재가 없어 혼자 결정하는 데 익숙해요. 내가 약한 부분(${map.need} 기운)을 가진 사람과 손잡으면 재물의 판이 커져요.`,
    ].filter(Boolean),
    highlight: gwCells.length ? `${gwCells[0].gwiin[0]}이 ${name} 님의 길을 돕고 있어요.` : '약속을 지키는 습관이 귀인을 부릅니다.',
    basis: num(gwCells.slice(0, 3).map((c) => ({ pos: c.key, part: 'branch' as const, n: 0 }))),
  };

  // 6장 경고와 리스크 — 흉살·겁재·낮은 달
  const bad = cells.filter((c) => !SH[c.shinsal]?.good);
  const good = cells.filter((c) => SH[c.shinsal]?.good);
  const ch6: WealthChapter = {
    title: WEALTH_TITLES[5], points: ['내 사주 속 재물 흉살', '왜 이 시기를 조심해야 할까', '조심해야 할 행동과 패턴', '안전하게 넘어가기 위한 전략'],
    say: bad.length ? `${bad.map((c) => c.shinsal).join('·')}의 기운은 미리 알면 작게 지나가요.` : '원국에 크게 걱정할 재물 흉살은 드러나지 않아요.',
    paras: [
      ...bad.slice(0, 3).map((c, i) => `${c.label}의 ${c.shinsal}(${'①②③'[i]}) — ${SH[c.shinsal].money}`),
      good.length ? `반대로 ${good.map((c) => `${c.label}의 ${c.shinsal}`).join(', ')}은 재물에 힘을 보태는 기운이에요. ${SH[good[0].shinsal].money}` : '',
      `올해는 ${W.careful.join('·')}월, 앞으로 3년 중에는 ${flow.low.map(ym).join(', ')}이 흐름이 낮은 때예요. 이 시기의 보증·대출·큰 계약은 한 번 더 확인하고, 급하게 결정하지 않는 것이 가장 좋은 전략이에요.`,
      `조심할 행동 — ${mb.risk}`,
    ].filter(Boolean),
    highlight: '흉살은 겁낼 것이 아니라 미리 알고 피해 가는 표지판이에요.',
    basis: num(bad.slice(0, 3).map((c) => ({ pos: c.key, part: 'branch' as const, n: 0 }))),
  };

  // 7장 재물운 실천 지도 — 부족한 기운으로 행운 정리
  const L = (D.lucky as Record<string, { color: string; number: number[]; direction: string; shape: string; item: string; routine: string }>)[map.need] ?? D.lucky['토'];
  const ch7: WealthChapter = {
    title: WEALTH_TITLES[6], points: ['재물운 실전 개운법', '지출 전 이것만은', '재물운을 키우는 환경', '돈이 붙는 방향', '행운템과 상승 루틴'],
    say: `채우면 좋은 기운은 ${ieyo(map.need)}. 작은 습관으로 채워 보세요.`,
    paras: [
      `${name} 님 사주에서 가장 강한 기운은 ${map.strongest}, 채우면 좋은 기운은 ${ieyo(map.need)}. ${map.elementAdvice}`,
      `행운 색은 ${L.color}, 행운 숫자는 ${L.number.join('·')}, 돈이 붙는 방향은 ${L.direction}, 어울리는 모양은 ${L.shape}이에요. ${eul(L.item)} 가까이 두면 마음을 다잡는 표지가 돼요.`,
      `지출 전 이것만은 — ${W.tips[0]} ${W.tips[1] ?? ''}`.trim(),
      `상승 루틴 — ${L.routine}. 집과 자리의 흐름은 올해 ${E.good.join('·')}월이 밝으니, 이사·계약 같은 큰 결정은 이 무렵에 차분히 검토해 보세요.`,
    ],
    highlight: `행운 숫자 ${L.number.join('·')} · ${L.color} · ${L.direction}`,
    basis: [],
  };
  const lucky = { element: map.need, ...L, note: '재미로 보는 행운이에요. 결과를 보장하지 않아요.' };
  return { table, chapters: [ch1, ch2, ch3, ch4, ch5, ch6, ch7], flow, lucky, keywords: [ms.short, mb.short, style.style] };
}
export type WealthReport = ReturnType<typeof wealthReport>;
