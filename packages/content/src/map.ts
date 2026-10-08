// 나의 사주지도 — 일간 성향 · 오행 균형 · 5영역 요약 · 중요 시기(대운). 모든 기능의 공통 기준 데이터.
import { sipsinOfStem, kstParts, type SajuResult } from '@dalsaegim/engine';
import { pick, needElement, ELEMENT_KO } from './core';
import D from '../data/map.json' with { type: 'json' };

type Level = 'strong' | 'normal' | 'soft';
export const AREAS = ['love', 'money', 'work', 'family', 'growth'] as const;
export type Area = (typeof AREAS)[number];
const GODS = [['비겁', '비견', '겁재', '나다움·자립'], ['식상', '식신', '상관', '표현·재능'], ['재성', '편재', '정재', '재물·현실감'], ['관성', '정관', '편관', '책임·일'], ['인성', '정인', '편인', '배움·보살핌']] as const;
const lv = (n: number): Level => (n >= 2 ? 'strong' : n >= 1 ? 'normal' : 'soft');

export function sajuMap(saju: SajuResult, profileId: string, now = new Date()) {
  const c = saju.tenGods.counts as Record<string, number>;
  const g = (...k: string[]) => k.reduce((s, x) => s + (c[x] ?? 0), 0);
  const female = saju.gender === 'F';
  const level: Record<Area, Level> = {
    love: lv(g(...(female ? ['정관', '편관'] : ['정재', '편재'])) + g('식신') * 0.5),
    money: lv(g('정재', '편재') + g('식신', '상관') * 0.4),
    work: lv(g('정관', '편관') + g('정인') * 0.4),
    family: lv(g('정인', '편인') + g('비견') * 0.5),
    growth: lv(g('정인', '편인') + g('식신') * 0.5),
  };
  const A = D.areas as Record<Area, { label: string; lines: Record<Level, string[]> }>;
  const areas = AREAS.map((a) => ({ id: a, label: A[a].label, level: level[a], line: pick(A[a].lines[level[a]], `${profileId}:map:${a}`) }));
  const dm = (D.dayMaster as Record<string, { image: string; title: string; line: string; keywords: string[]; love: string; work: string }>)[saju.dayMaster.char];
  const ratio = saju.elementRatio.ratio as Record<string, number>;
  const need = needElement(saju);
  // 중요 시기 — 지금 대운과 다음 대운
  const age = kstParts(now).year - saju.solarDate.year + 1;
  const cycles = (saju.daewoon as any).available ? ((saju.daewoon as any).cycles as { text: string; hanja: string; stem: number; fromAge: number; toAge: number }[]) : [];
  const curIdx = cycles.findIndex((x) => age >= x.fromAge && age <= x.toAge);
  const period = (x: (typeof cycles)[number]) => ({
    text: x.text, hanja: x.hanja, fromAge: x.fromAge, toAge: x.toAge,
    fromYear: saju.solarDate.year + x.fromAge - 1, toYear: saju.solarDate.year + x.toAge - 1,
    theme: (D.daeun as Record<string, string>)[sipsinOfStem(saju.dayMaster.stem, x.stem) as string] ?? '',
  });
  return {
    dayMaster: { char: saju.dayMaster.char, hanja: saju.dayMaster.hanja, element: saju.dayMaster.element, ...dm },
    elements: ELEMENT_KO.map((e) => ({ el: e, pct: ratio[e] ?? 0 })),
    strongest: saju.elementRatio.strongest as string, need,
    elementAdvice: (D.element_advice as Record<string, string>)[need],
    areas,
    // 십성 5무리(사주지도 원형 그림) — 무리마다 더 많은 쪽 이름을 대표로
    gods: GODS.map(([group, a, b, mean]) => ({ group, label: g(b) > g(a) ? b : a, n: g(a, b), mean })),
    keywords: [...dm.keywords, ...areas.filter((a) => a.level === 'strong').map((a) => `${a.label} 기운`)].slice(0, 6),
    period: { now: curIdx >= 0 ? period(cycles[curIdx]) : null, next: curIdx >= 0 && cycles[curIdx + 1] ? period(cycles[curIdx + 1]) : null },
    pillars: saju.pillars, zodiac: saju.zodiacAnimal, timeUnknown: saju.timeUnknown,
  };
}
export type SajuMap = ReturnType<typeof sajuMap>;
