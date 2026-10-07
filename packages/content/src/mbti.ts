// 사주 × MBTI — 일간(타고난 기운)과 MBTI(지금의 성향)를 네 축으로 겹쳐 본다. 재미·자기이해 콘텐츠.
// 축 대응: E/I ↔ 일간 양/음 · N/S ↔ 목·화·수(상상) vs 토·금(현실) · F/T ↔ 목·화·수(감성) vs 금·토(판단) · J/P ↔ 정관·정인·정재(계획) vs 식상·편재(유연)
import type { SajuResult } from '@dalsaegim/engine';
import { pick } from './core';
import { sajuMap } from './map';
import D from '../data/mbti.json' with { type: 'json' };

export const MBTI_TYPES = Object.keys(D.types);
export const MBTI_QUIZ = D.quiz as { axis: 'EI' | 'SN' | 'TF' | 'JP'; q: string; a: string; b: string }[];
export type MbtiType = { nick: string; traits: string[]; love: string; work: string; money: string };
export const mbtiInfo = (t: string) => (D.types as Record<string, MbtiType>)[t.toUpperCase()];

// 간단 테스트 — answers[i] = 'a' | 'b' (a = 앞 글자)
export function mbtiFromQuiz(answers: ('a' | 'b')[]) {
  const axes = ['EI', 'SN', 'TF', 'JP'] as const;
  return axes.map((ax) => {
    const qs = MBTI_QUIZ.map((q, i) => ({ q, i })).filter((x) => x.q.axis === ax);
    const a = qs.filter((x) => answers[x.i] === 'a').length;
    return a >= Math.ceil(qs.length / 2) ? ax[0] : ax[1];
  }).join('');
}

export function sajuMbti(saju: SajuResult, mbti: string, profileId: string) {
  const t = mbti.toUpperCase();
  const info = mbtiInfo(t);
  const map = sajuMap(saju, profileId);
  const el = saju.dayMaster.element;
  const c = saju.tenGods.counts as Record<string, number>;
  const plan = (c['정관'] ?? 0) + (c['정인'] ?? 0) + (c['정재'] ?? 0);
  const flex = (c['식신'] ?? 0) + (c['상관'] ?? 0) + (c['편재'] ?? 0);
  const saju4 = [
    saju.dayMaster.polarity === '양' ? 'E' : 'I',
    ['목', '화', '수'].includes(el) ? 'N' : 'S',
    ['금', '토'].includes(el) ? 'T' : 'F',
    plan >= flex ? 'J' : 'P',
  ].join('');
  const same = [...t].filter((ch, i) => ch === saju4[i]).length;
  const match = 40 + same * 15;
  const kind = same >= 3 ? 'same' : same === 2 ? 'mixed' : 'diff';
  return {
    mbti: t, info, sajuType: saju4, match, kind,
    dayMaster: map.dayMaster,
    title: `${map.dayMaster.title} × ${info.nick}`,
    line: pick((D.combo as Record<string, string[]>)[kind], `${profileId}:${t}`),
    love: `${map.dayMaster.love} ${info.love}`,
    work: `${map.dayMaster.work} ${info.work}`,
    money: info.money,
  };
}
