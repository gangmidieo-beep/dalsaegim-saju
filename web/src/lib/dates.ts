import { kstParts } from '@dalsaegim/engine';
export const koDate = (d = new Date()) => { const k = kstParts(d); return `${k.year}년 ${k.month}월 ${k.day}일`; };
export const kstToday = (d = new Date()) => { const k = kstParts(d); return `${k.year}-${String(k.month).padStart(2, '0')}-${String(k.day).padStart(2, '0')}`; };
export const kstYear = (d = new Date()) => kstParts(d).year;
export const kstMonth = (d = new Date()) => kstParts(d).month;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export const dow = (d = new Date()) => DOW[new Date(d.getTime() + 9 * 3600000).getUTCDay()];
export const dotDate = (s: string) => s.replace(/-/g, '.');

/** 앞으로 12달(이번 달부터) — 연도별로 묶어 보여 주려고 연도 경계에서 나눈다 */
export type YM = { yy: number; mm: number; ym: string; now: boolean };
export function next12(d = new Date()): { yy: number; months: YM[] }[] {
  const y = kstYear(d), m = kstMonth(d);
  const list: YM[] = Array.from({ length: 12 }, (_, i) => { const t = m - 1 + i; const yy = y + Math.floor(t / 12), mm = (t % 12) + 1; return { yy, mm, ym: `${yy}-${String(mm).padStart(2, '0')}`, now: i === 0 }; });
  return [...new Set(list.map((x) => x.yy))].map((yy) => ({ yy, months: list.filter((x) => x.yy === yy) }));
}
