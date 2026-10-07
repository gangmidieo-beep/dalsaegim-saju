// 계산 훅 — 엔진 + 문구 DB (AI 호출 없음). 같은 사주·같은 날은 항상 같은 결과.
import { useMemo } from 'react';
import { sajuOf, todayFortune, monthFortune, sajuMap, moneyFlow, newYearPreview, luckyNumbers, type MoneyKind } from '@dalsaegim/content';
import type { Profile } from '../store/app';

export const useSaju = (p: Profile) => useMemo(() => sajuOf(p), [p.id, p.year, p.month, p.day, p.hour, p.calendar, p.leap, p.gender]);
export const useToday = (p: Profile) => { const s = useSaju(p); return useMemo(() => todayFortune(s, new Date(), p.id), [s, p.id]); };
export const useMonth = (p: Profile) => { const s = useSaju(p); return useMemo(() => monthFortune(s, new Date(), p.id), [s, p.id]); };
export const useMap = (p: Profile) => { const s = useSaju(p); return useMemo(() => sajuMap(s, p.id), [s, p.id]); };
export const useMoney = (p: Profile, kind: MoneyKind, year: number, market?: number[] | null) => {
  const s = useSaju(p);
  return useMemo(() => moneyFlow(s, kind, year, p.id, { market: market ?? null }), [s, p.id, kind, year, market]);
};
export const useNewYear = (p: Profile, year: number) => { const s = useSaju(p); return useMemo(() => newYearPreview(s, year, p.id), [s, p.id, year]); };
export const useLucky = (p: Profile, round: number) => { const s = useSaju(p); return useMemo(() => luckyNumbers(s, new Date(), p.id, round), [s, p.id, round]); };
