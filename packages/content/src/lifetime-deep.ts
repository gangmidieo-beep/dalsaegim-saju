// 정통사주 A4 40장(10/23) — 장편 목차 + 장마다 넘겨줄 계산 자료. AI 가 이 자료와 9장 계산 초안을 바탕으로 장을 쓴다.
// 모든 숫자·간지·십성·연도는 여기서 계산한 값만 쓰게 한다(AI 가 새로 지어내지 않게).
import { sipsinOfStem, sipsinOfBranch, twelveStage, yearPillarOf, monthlyPillar, branchRelations, kstParts, STEMS, BRANCHES, STEMS_HANJA, BRANCHES_HANJA, BRANCH_ELEMENT, ELEMENTS, type Pillar } from '@dalsaegim/engine';
import { rawDims, toScore, type SajuResult } from './core';
import { sajuMap } from './map';
import { nextMonths } from './path';
import { moneyFlow } from './money';
import { lifetimeReport, LIFE_THEME, lifeScore } from './lifetime';
import OUT from '../data/lifetime-long.json' with { type: 'json' };
import L from '../data/lifetime.json' with { type: 'json' };
/** 마지막 글자 받침 여부(한글) — 이에요/예요, 은/는 */
const jb = (w: string) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0; };

export type LongChapter = { id: string; part: number; partTitle: string; title: string; brief: string; len: number; facts: string[]; draft: number | null };
export const LONG_OUTLINE: LongChapter[] = OUT.parts.flatMap((p, pi) => p.chapters.map((c) => ({ ...c, part: pi, partTitle: p.title })));
export const LONG_PARTS = OUT.parts.map((p) => p.title);

const POSL: Record<string, string> = { hour: '시주', day: '일주', month: '월주', year: '연주' };
const REL_KO: Record<string, string> = { combine: '육합', halfCombine: '삼합(반합)', clash: '충', punish: '형', break: '파', harm: '해' };
const EL_NAME: Record<string, string> = { 목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물' };
const GEN: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }; // 내가 낳는 기운
const CTRL: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }; // 내가 누르는 기운
const MOTHER: Record<string, string> = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' };
const CTRLD: Record<string, string> = { 목: '금', 화: '수', 토: '목', 금: '화', 수: '토' }; // 나를 누르는 기운
const elOfBranch = (b: number) => ELEMENTS[BRANCH_ELEMENT[b]] as string;
const gz = (p: { stem: number; branch: number }) => `${STEMS[p.stem]}${BRANCHES[p.branch]}(${STEMS_HANJA[p.stem]}${BRANCHES_HANJA[p.branch]})`;

export function lifetimeDeep(saju: SajuResult, name: string, profileId: string, now = new Date()) {
  const base = lifetimeReport(saju, name, profileId, now);
  const map = sajuMap(saju, profileId, now);
  const P = saju.pillars as Record<string, Pillar | null>;
  const ds = saju.pillars.day.stem, db = saju.pillars.day.branch;
  const dEl = map.dayMaster.element;
  const y0 = kstParts(now).year;
  const age = y0 - saju.solarDate.year + 1;
  const ratio = saju.elementRatio.ratio as Record<string, number>;
  const rows = ((saju.tenGods as any).rows ?? []) as { pillar: string; stem: { char: string; sipsin: string }; branch: { char: string; sipsin: string; hidden: { role: string; stem: string; days: number; sipsin: string }[] } }[];
  const cells = base.table.filter((c) => !c.empty) as Extract<typeof base.table[number], { empty: false }>[];
  const F: Record<string, string> = {};

  F.myeongsik = cells.map((c) => `${c.label}: 천간 ${c.stem.han}(${c.stem.kor}, ${c.stem.yy}${c.stem.el}, ${c.stem.sip}) / 지지 ${c.branch.han}(${c.branch.kor}, ${c.branch.yy}${c.branch.el}, ${c.branch.sip}) / 십이운성 ${c.stage} / 신살 ${c.shinsal}${c.gwiin.length ? ` / 귀인 ${c.gwiin.join('·')}` : ''}`).join('\n')
    + `\n띠: ${saju.zodiacAnimal ?? ''} / 성별 ${saju.gender === 'F' ? '여' : '남'} / 양력 ${saju.solarDate.year}.${saju.solarDate.month}.${saju.solarDate.day}${saju.timeUnknown ? ' / 태어난 시간 모름(시주 없음)' : ''}`;
  const st = (L.stem as Record<string, Record<string, string>>)[map.dayMaster.char];
  F.daymaster = `일간 ${map.dayMaster.char}(${map.dayMaster.hanja}) — ${map.dayMaster.title} / ${ds % 2 === 0 ? '양' : '음'}의 ${dEl}(${EL_NAME[dEl]}) / 이미지 ${map.dayMaster.image} / 키워드 ${map.dayMaster.keywords.join('·')}\n본성: ${st?.nature ?? ''} ${st?.strength ?? ''}\n보완: ${st?.shadow ?? ''}\n어울리는 환경: ${st?.env ?? ''}\n한 문장: ${st?.motto ?? ''}`;
  const dayRow = rows.find((r) => r.pillar === '일주');
  F.ilju = `일주 ${gz(saju.pillars.day)} / 일지 십성 ${sipsinOfBranch(ds, db)} / 일지 십이운성 ${twelveStage(ds, db)} / 일지 오행 ${elOfBranch(db)} / 일지 지장간 ${(dayRow?.branch.hidden ?? []).map((h) => `${h.stem}(${h.role}·${h.sipsin})`).join(', ')}`;
  F.jijanggan = rows.map((r) => `${r.pillar} 지지 ${r.branch.char}: ${r.branch.hidden.map((h) => `${h.role} ${h.stem}(${h.sipsin}, ${h.days}일)`).join(' · ')}`).join('\n');
  const yang = cells.reduce((n, c) => n + (c.stem.yy === '양' ? 1 : 0) + (c.branch.yy === '양' ? 1 : 0), 0);
  F.elements = `오행 비율: ${map.elements.map((e) => `${e.el}(${EL_NAME[e.el]}) ${e.pct}%`).join(' · ')} / 가장 강한 기운 ${saju.elementRatio.strongest} / 가장 약한 기운 ${saju.elementRatio.weakest} / 없는 기운 ${((saju.elementRatio.missing as string[]) ?? []).join('·') || '없음'} / 채우면 좋은 기운 ${base.need}\n음양: 양 ${yang}글자 · 음 ${cells.length * 2 - yang}글자\n상생: ${dEl}을 돕는 기운 ${MOTHER[dEl]}, ${dEl}이 낳는 기운 ${GEN[dEl]} / 상극: ${dEl}이 누르는 기운 ${CTRL[dEl]}, ${dEl}을 누르는 기운 ${CTRLD[dEl]}`;
  // 억부 용신 — 신강이면 내 힘을 빼 주는 기운(식상·재성·관성 중 가장 약한 것), 신약이면 돕는 기운(인성·비겁 중 약한 것)
  const strong = base.strength === 'strong', weak = base.strength === 'weak';
  const cand = strong || !weak ? [GEN[dEl], CTRL[dEl], CTRLD[dEl]] : [MOTHER[dEl], dEl];
  const sorted = [...cand].sort((a, b) => (ratio[a] ?? 0) - (ratio[b] ?? 0));
  const yong = sorted[0], hee = sorted[1];
  const gi = strong || !weak ? (ratio[MOTHER[dEl]] ?? 0) >= (ratio[dEl] ?? 0) ? MOTHER[dEl] : dEl : [GEN[dEl], CTRL[dEl], CTRLD[dEl]].sort((a, b) => (ratio[b] ?? 0) - (ratio[a] ?? 0))[0];
  F.strength = `내 기운(${dEl})+돕는 기운(${MOTHER[dEl]}) = ${base.self}% → ${strong ? '신강' : weak ? '신약' : '중화'}\n용신(가장 반가운 기운) ${yong}(${EL_NAME[yong]}) / 희신(함께 반가운 기운) ${hee}(${EL_NAME[hee]}) / 기신(넘치면 조심할 기운) ${gi}(${EL_NAME[gi]})\n(계산 방식: 억부 — 강하면 덜어 주는 기운, 약하면 보태 주는 기운. 생활 언어로 설명할 것)`;
  const counts = saju.tenGods.counts as Record<string, number>;
  F.sipsin = `십성 개수: ${Object.entries(counts).filter(([k]) => k !== '일간').map(([k, v]) => `${k} ${v}`).join(', ')}\n무리: ${base.groups.map((g) => `${g.g} ${g.n}개`).join(', ')}\n없는 십성: ${['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'].filter((k) => !counts[k]).join('·') || '없음'}`;
  F.stages = cells.map((c) => `${c.label} ${c.stage} — ${(L.stage as Record<string, string>)[c.stage] ?? ''}`).join('\n');
  F.shinsal = cells.map((c) => `${c.label} 지지 ${c.branch.han}: 신살 ${c.shinsal}(${(L.shinsal as Record<string, string>)[c.shinsal] ?? ''})${c.gwiin.length ? ` / 귀인 ${c.gwiin.map((g) => `${g}(${(L.gwiin as Record<string, string>)[g]})`).join(' ')}` : ''}`).join('\n');
  const keys = (['year', 'month', 'day', 'hour'] as const).filter((k) => P[k]);
  const rel: string[] = [];
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
    const a = P[keys[i]]!, b = P[keys[j]]!;
    const br = branchRelations(a.branch, b.branch).map((r) => REL_KO[r]);
    const sd = Math.abs(a.stem - b.stem);
    const sr = [sd === 5 ? '천간합' : '', sd === 6 ? '천간충' : ''].filter(Boolean);
    if (br.length || sr.length) rel.push(`${POSL[keys[i]]}·${POSL[keys[j]]}: ${[...sr, ...br.map((x) => `지지 ${x}`)].join(', ')}`);
  }
  F.relations = rel.length ? rel.join('\n') : '원국 안에 뚜렷한 합·충·형·파·해 없음(관계가 담백하고 안정적인 구조)';
  const ch = base.chapters;
  F.love = [ch[2].say, ...ch[2].paras].join(' ');
  F.money = [ch[3].say, ...ch[3].paras].join(' ');
  F.work = [ch[4].say, ...ch[4].paras].join(' ');
  F.family = [ch[5].say, ...ch[5].paras].join(' ');
  F.daeun = base.daeun.map((x) => {
    const c = ((saju.daewoon as any).cycles as { stem: number; branch: number; fromAge: number }[]).find((y) => y.fromAge === x.fromAge)!;
    const rr = branchRelations(db, c.branch).map((r) => REL_KO[r]);
    return `${x.fromAge}~${x.toAge}세(${x.fromYear}~${x.toYear}) ${x.text}(${x.hanja}) 대운: 천간 ${sipsinOfStem(ds, c.stem)}·지지 ${sipsinOfBranch(ds, c.branch)}·운성 ${twelveStage(ds, c.branch)}${rr.length ? `·일지와 ${rr.join('·')}` : ''} / 주제 '${x.theme}' / 지수 ${x.score}${x.now ? ' ← 지금' : ''}`;
  }).join('\n') + `\n지금 나이(한국식) ${age}세`;
  const seun = Array.from({ length: 10 }, (_, i) => {
    const y = y0 + i, yp = yearPillarOf(new Date(Date.UTC(y, 5, 15, 3)));
    const r = rawDims(saju, yp, `${profileId}:se:${y}`, 0.15);
    const rr = branchRelations(db, yp.branch).map((x) => REL_KO[x]);
    const sip = sipsinOfStem(ds, yp.stem) as string;
    return { y, gz: gz(yp), sip, bsip: sipsinOfBranch(ds, yp.branch) as string, stage: twelveStage(ds, yp.branch) as string, rel: rr, score: lifeScore(saju, yp, `${profileId}:yr:${y}`), love: toScore(r.love), work: toScore(r.work), wealth: moneyFlow(saju, 'wealth', y, profileId, { now }).score, theme: LIFE_THEME[sip] ?? '' };
  });
  F.seun = seun.map((s) => `${s.y}년 ${s.gz}: 천간 ${s.sip}·지지 ${s.bsip}·운성 ${s.stage}${s.rel.length ? `·일지와 ${s.rel.join('·')}` : ''} / '${s.theme}' / 종합 ${s.score} (연애 ${s.love}·일 ${s.work}·재물 ${s.wealth})`).join('\n');
  const love = nextMonths(saju, 'love', profileId, now), work = nextMonths(saju, 'work', profileId, now), wealth = nextMonths(saju, 'wealth', profileId, now);
  const wolun = love.map((m, i) => { const mp = monthlyPillar(new Date(Date.UTC(m.year, m.month - 1, 15, 3))); return { y: m.year, m: m.month, gz: gz(mp), sip: sipsinOfStem(ds, mp.stem) as string, love: m.score, work: work[i].score, wealth: wealth[i].score }; });
  F.wolun = wolun.map((w) => `${w.y}년 ${w.m}월 ${w.gz}: 천간 ${w.sip} / 연애 ${w.love}·일 ${w.work}·재물 ${w.wealth}`).join('\n');
  const prime = base.daeun.filter((x) => x.fromAge >= 17 && x.fromAge <= 65).sort((a, b) => b.score - a.score)[0];
  const top = [...seun].sort((a, b) => b.score - a.score).slice(0, 3).map((s) => s.y).sort();
  const low = [...seun].sort((a, b) => a.score - b.score).slice(0, 2).map((s) => s.y).sort();
  const nextTurn = base.daeun.find((x) => x.fromAge > age);
  F.prime = `전성기 대운(17~65세 중 최고): ${prime ? `${prime.fromYear}~${prime.toYear}년(${prime.fromAge}~${prime.toAge}세) '${prime.theme}' 지수 ${prime.score}` : '계산 불가'} / 앞으로 10년 빛나는 해 ${top.join(', ')} / 다지는 해 ${low.join(', ')} / 다음 대운 전환점 ${nextTurn ? `${nextTurn.fromYear}년(${nextTurn.fromAge}세)` : '없음'}`;
  F.lucky = `채울 기운 ${base.need} · 용신 ${yong} / 행운 색 ${base.lucky.color} / 숫자 ${base.lucky.number.join('·')} / 방향 ${base.lucky.direction} / 모양 ${base.lucky.shape} / 물건 ${base.lucky.item} / 습관 ${base.lucky.routine} / 음식·장소·계절은 오행 '${yong}'과 '${base.need}' 기준`;
  const wf = moneyFlow(saju, 'wealth', y0, profileId, { now });
  F.money += ` / (계산) 올해 재물 지수 ${wf.score}, 좋은 달 ${wf.good.join('·')}월`;
  // 장별 계산 초안(9장 리포트) — AI 가 없거나 실패한 장은 이 초안으로 채운다
  const drafts = base.chapters.map((c) => c.paras);
  const fallback = (c: LongChapter): string[] => {
    if (c.draft != null) return drafts[c.draft];
    const t = (k: string) => F[k] ?? '';
    // 계산 자료를 문장으로 풀어 쓴 간단한 대체 본문
    switch (c.id) {
      case 'L01': return [`${name} 님의 사주는 네 기둥, 여덟 글자로 이루어져 있어요. 연주는 뿌리, 월주는 사회, 일주는 나와 배우자, 시주는 자녀와 인생 후반을 보여 줘요.`, ...cells.map((x) => `${x.label}는 ${x.stem.kor}${x.branch.kor}(${x.stem.han}${x.branch.han})${jb(x.branch.kor) ? '이에요' : '예요'}. 천간 ${x.stem.kor}(${x.stem.han})${jb(x.stem.kor) ? '은' : '는'} ${x.stem.yy}의 ${x.stem.el} 기운(${x.stem.sip}), 지지 ${x.branch.kor}(${x.branch.han})${jb(x.branch.kor) ? '은' : '는'} ${x.branch.yy}의 ${x.branch.el} 기운(${x.branch.sip})이에요.`)];
      case 'L22': return seun.map((s) => `${s.y}년(${s.gz})은 '${s.theme}'의 결이 들어오는 해예요. 종합 지수는 ${s.score}점이고, 연애 ${s.love}·일 ${s.work}·재물 ${s.wealth}점이에요.`);
      case 'L23': return wolun.map((w) => `${w.y}년 ${w.m}월은 연애 ${w.love}·일 ${w.work}·재물 ${w.wealth}점이에요. ${[['연애', w.love], ['일', w.work], ['재물', w.wealth]].sort((a, b) => (b[1] as number) - (a[1] as number))[0][0]} 쪽 기운이 가장 밝아요.`);
      default: return [t(c.facts[0]).split('\n').join(' ')];
    }
  };
  const visualAt = (id: string) => LONG_OUTLINE.findIndex((c) => c.id === id);
  return {
    base, facts: F, outline: LONG_OUTLINE, parts: LONG_PARTS, fallback, seun, wolun,
    visual: { table: base.table, elements: base.elements, elementsAt: visualAt('L04'), daeun: base.daeun, daeunAt: visualAt('L20'), years: base.years, yearsAt: visualAt('L22'), lucky: base.lucky, luckyAt: visualAt('L25'), seun: seun.map((s) => ({ y: s.y, gz: s.gz, sip: s.sip, score: s.score, love: s.love, work: s.work, wealth: s.wealth })), seunAt: visualAt('L22'), wolun, wolunAt: visualAt('L23') },
    yong, hee, gi,
  };
}
export type LifetimeDeep = ReturnType<typeof lifetimeDeep>;
