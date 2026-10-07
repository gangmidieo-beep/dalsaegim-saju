import { kstParts } from '@dalsaegim/engine';
export const koDate = (d = new Date()) => { const k = kstParts(d); return `${k.year}년 ${k.month}월 ${k.day}일`; };
export const kstToday = (d = new Date()) => { const k = kstParts(d); return `${k.year}-${String(k.month).padStart(2, '0')}-${String(k.day).padStart(2, '0')}`; };
export const kstYear = (d = new Date()) => kstParts(d).year;
export const kstMonth = (d = new Date()) => kstParts(d).month;
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
export const dow = (d = new Date()) => DOW[new Date(d.getTime() + 9 * 3600000).getUTCDay()];
export const dotDate = (s: string) => s.replace(/-/g, '.');
