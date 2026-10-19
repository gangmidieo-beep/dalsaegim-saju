// 썸 타로 카드 그림 — 남색 바탕 + 샴페인 골드 선(직접 그린 상징). 이미지 파일 없이 SVG 로 78장을 모두 그린다.
import type { CSSProperties } from 'react';
import tarot from '@dalsaegim/content/data/tarot.json';

type Card = { id: number; name: string; arcana: string; num?: number; suit?: string; rank?: number; sym: string; kw: string; rkw: string };
export const CARDS = tarot.cards as Card[];
const ROMAN = ['0', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX', 'XXI'];
const COURT = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'P', 'N', 'Q', 'K'];

// 상징(24 단위 선 그림)
const SYM: Record<string, string> = {
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6M12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  wand: 'M6 18 17 7M15 5l4 4M17 7l2-2M5 13h3M11 19v-3M4 10l1.5.5M9 20l.5-1.5',
  moon2: 'M15 4a8 8 0 1 0 0 16 6.5 6.5 0 0 1 0-16zM7 9.5h3M7 14.5h3',
  flower: 'M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0M12 10c0-3 2-5 2-5s2 3-2 5M14 12c3 0 5 2 5 2s-3 2-5-2M12 14c0 3-2 5-2 5s-2-3 2-5M10 12c-3 0-5-2-5-2s3-2 5 2M12 15v6',
  crown: 'M4 17h16l1-9-5 4-4-7-4 7-5-4zM4 20h16',
  key: 'M8 14a4 4 0 1 1 3.5-6M11.5 8 20 16.5M16 12.5l2-2M18 14.5l2-2',
  heart2: 'M9 18s-6-3.6-6-8a3.4 3.4 0 0 1 6-2 3.4 3.4 0 0 1 6 2c0 4.4-6 8-6 8zM15 20s-4-2.4-4-5.3',
  chariot: 'M4 15h16l-2-6H6zM7 15v2M17 15v2M8 19a2 2 0 1 0 0-.01M16 19a2 2 0 1 0 0-.01M12 9V5M10 5h4',
  lion: 'M12 20c-4 0-7-3-7-7s3-8 7-8 7 4 7 8-3 7-7 7zM9.5 11h.01M14.5 11h.01M10 15c1.3 1 2.7 1 4 0M12 13v2',
  lantern: 'M10 3h4M12 3v2M8 7h8l-1 10H9zM8 17h8M12 10v4M11 20h2',
  wheel: 'M12 12m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0M12 12m-2.5 0a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0M12 4v5.5M12 14.5V20M4 12h5.5M14.5 12H20',
  scale: 'M12 4v16M8 20h8M5 7h14M5 7l-2.5 6a2.8 2.8 0 0 0 5 0zM19 7l-2.5 6a2.8 2.8 0 0 0 5 0z',
  hang: 'M5 4h14M12 4v6M12 10l-3 4M12 10l3 4M12 14v3M10 19.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0',
  gate: 'M5 21V9a7 7 0 0 1 14 0v12M5 21h14M12 21v-8M9 13h6M12 5.5v2',
  cup2: 'M5 5h6l-1 5a2 2 0 0 1-4 0zM13 5h6l-1 5a2 2 0 0 1-4 0zM8 12v6M16 12v6M6 18h4M14 18h4M10 8.5c1.3 1 2.7 1 4 0',
  chain: 'M8 8.5a3 3 0 0 1 4.2 0l1.3 1.3a3 3 0 0 1 0 4.2M16 15.5a3 3 0 0 1-4.2 0l-1.3-1.3a3 3 0 0 1 0-4.2M5 5l2 2M17 17l2 2',
  tower: 'M8 21V9l4-5 4 5v12M6 21h12M10.5 12h3M10.5 16h3M17 4l-2 3h3l-2 3',
  star: 'M12 3l2.4 6.3L21 9.6l-5.2 4.2 1.8 6.6L12 16.6l-5.6 3.8 1.8-6.6L3 9.6l6.6-.3z',
  moon: 'M16 4a8.5 8.5 0 1 0 4 12A7 7 0 0 1 16 4zM5 20h4M15 20h4',
  sun: 'M12 12m-4 0a4 4 0 1 0 8 0 4 4 0 1 0-8 0M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1',
  horn: 'M4 14l12-7v10zM16 9.5c2 .5 3 1.5 3 2.5s-1 2-3 2.5M7 15.5l1 4h3l-1-3.5',
  world: 'M12 12m-8.5 0a8.5 5.5 0 1 0 17 0 8.5 5.5 0 1 0-17 0M12 3.5v17M12 7.5a2 2 0 1 0 0 .01M8 12h8',
  wands: 'M7 20 17 4M15.5 4.5 18 5M6 13l2 .5M11 9l2 .3M8.5 19.5 6 19',
  cups: 'M6 4h12l-1.5 7a4.5 4.5 0 0 1-9 0zM12 15.5V19M8.5 20h7M8 7.5h8',
  swords: 'M12 3v13M9 16h6M12 16v4M10.5 20.5h3M12 3l1.2 2.5v8.5h-2.4V5.5z',
  pentacles: 'M12 12m-8 0a8 8 0 1 0 16 0 8 8 0 1 0-16 0M12 6l1.8 4.3 4.6.3-3.5 3 1.1 4.5L12 15.6 8 18.1l1.1-4.5-3.5-3 4.6-.3z',
};

export function TarotCard({ id, rev, size = 104, back, style }: { id: number; rev?: boolean; size?: number; back?: boolean; style?: CSSProperties }) {
  const c = CARDS[id];
  const w = size, h = Math.round(size * 1.62);
  if (back || !c) {
    return (
      <svg width={w} height={h} viewBox="0 0 100 162" role="img" aria-label="뒤집힌 타로 카드" style={style}>
        <defs><linearGradient id="tb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1d2f55" /><stop offset="1" stopColor="#0c1a33" /></linearGradient></defs>
        <rect x="1" y="1" width="98" height="160" rx="9" fill="url(#tb)" stroke="#d8b878" strokeWidth="1.4" />
        <rect x="6" y="6" width="88" height="150" rx="6" fill="none" stroke="#d8b878" strokeOpacity=".55" />
        <g stroke="#e8c98f" strokeOpacity=".35" fill="none">{[0, 1, 2, 3].map((i) => <path key={i} d={`M50 ${18 + i * 34}l12 12-12 12-12-12z`} />)}</g>
        <path d="M58 70a14 14 0 1 0 0 22 11 11 0 0 1 0-22z" fill="#e8c98f" />
        <circle cx="30" cy="40" r="1.2" fill="#f3dcaa" /><circle cx="72" cy="120" r="1.2" fill="#f3dcaa" /><circle cx="70" cy="34" r=".9" fill="#f3dcaa" /><circle cx="28" cy="128" r=".9" fill="#f3dcaa" />
      </svg>
    );
  }
  const top = c.arcana === 'major' ? ROMAN[c.num ?? 0] : COURT[c.rank ?? 1];
  const d = SYM[c.sym] ?? SYM.star;
  const tone = c.arcana === 'major' ? ['#22355f', '#0e1c38'] : ({ wands: ['#3a2a3f', '#1a1630'], cups: ['#1f3557', '#0d1b36'], swords: ['#2a3550', '#121a2e'], pentacles: ['#2f3a3a', '#141f24'] } as Record<string, string[]>)[c.suit ?? 'cups'];
  return (
    <svg width={w} height={h} viewBox="0 0 100 162" role="img" aria-label={`${c.name}${rev ? ' 역방향' : ''}`} style={{ transform: rev ? 'rotate(180deg)' : undefined, ...style }}>
      <defs><linearGradient id={`tf${id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={tone[0]} /><stop offset="1" stopColor={tone[1]} /></linearGradient></defs>
      <rect x="1" y="1" width="98" height="160" rx="9" fill={`url(#tf${id})`} stroke="#d8b878" strokeWidth="1.4" />
      <rect x="6" y="6" width="88" height="150" rx="6" fill="none" stroke="#d8b878" strokeOpacity=".5" />
      <text x="50" y="24" textAnchor="middle" fontSize="11" fontFamily="'Noto Serif KR', serif" fill="#f3dcaa" letterSpacing="1">{top}</text>
      <circle cx="50" cy="78" r="30" fill="none" stroke="#e8c98f" strokeOpacity=".28" />
      <g transform="translate(26 54) scale(2)" fill="none" stroke="#f0d49b" strokeWidth=".9" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></g>
      <path d="M22 128h56" stroke="#d8b878" strokeOpacity=".45" />
      <text x="50" y="145" textAnchor="middle" fontSize={c.name.length > 5 ? 9.5 : 11} fontWeight="700" fill="#fff6e2">{c.name}</text>
    </svg>
  );
}
