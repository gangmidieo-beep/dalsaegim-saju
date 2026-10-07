// 선 아이콘(직접 그림) — currentColor, 1.6 선. 과한 장식 없이.
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 22) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true });

export const I = {
  home: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z" /></svg>,
  book: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v11.5H8.5A3.5 3.5 0 0 1 5 16z" /><path d="M5 16a3.5 3.5 0 0 1 3.5-3.5H19M9 8h6" /></svg>,
  timeline: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 4v16" /><circle cx="6" cy="7" r="1.8" /><circle cx="6" cy="17" r="1.8" /><path d="M10 7h9M10 12h6M10 17h8" /></svg>,
  user: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="12" cy="8.5" r="3.8" /><path d="M4.5 20c1.2-3.6 4.1-5.2 7.5-5.2s6.3 1.6 7.5 5.2" /></svg>,
  moon: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M19 14.5A7.5 7.5 0 1 1 9.5 5a6 6 0 0 0 9.5 9.5z" /></svg>,
  sunmoon: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M16.5 13.8A5.2 5.2 0 1 1 10.2 7.5a4.1 4.1 0 0 0 6.3 6.3z" /><path d="M18 3.5v2M21 6.5h-2M18.5 9.5l-1-1" /></svg>,
  path: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 20c0-4 3-5 7-5s7-1.5 7-5-3-5-7-5" /><circle cx="12" cy="5" r="1.6" /><circle cx="5" cy="20" r="1.6" /></svg>,
  chat: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M20 12a7.5 7.5 0 0 1-11 6.6L4.5 20l1.3-4A7.5 7.5 0 1 1 20 12z" /><path d="M9 11h.01M12 11h.01M15 11h.01" strokeWidth="2.4" /></svg>,
  map: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="m12 3 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" /></svg>,
  heart: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 19.5s-7.5-4.4-7.5-9.7A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4c0 5.3-7.5 9.7-7.5 9.7z" /></svg>,
  coin: ({ size, ...p }: P) => <svg {...base(size)} {...p}><ellipse cx="12" cy="7" rx="7" ry="3" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></svg>,
  briefcase: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="3.5" y="7.5" width="17" height="12" rx="2" /><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17" /></svg>,
  sprout: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 20v-8M12 12c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" /></svg>,
  chart: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 19h16" /><path d="m5 15 4-4 3 2.5L19 7" /></svg>,
  building: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 20V9l8-5 8 5v11" /><path d="M9.5 20v-6h5v6" /></svg>,
  store: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 9.5 5.5 5h13L20 9.5M4 9.5h16M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0M5.5 12v8h13v-8" /></svg>,
  gift: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="4" y="9" width="16" height="11" rx="1.5" /><path d="M3 9h18M12 9v11M12 9c-2.5 0-4.5-1-4.5-3S10 4 12 9zM12 9c2.5 0 4.5-1 4.5-3S14 4 12 9z" /></svg>,
  back: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="m15 5-7 7 7 7" /></svg>,
  right: ({ size, ...p }: P) => <svg {...base(size ?? 18)} {...p}><path d="m9 5 7 7-7 7" /></svg>,
  close: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M6 6l12 12M18 6 6 18" /></svg>,
  plus: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 5v14M5 12h14" /></svg>,
  send: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 12h13M12 5l7 7-7 7" /></svg>,
  mic: ({ size, ...p }: P) => <svg {...base(size)} {...p}><rect x="9" y="3.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v2.5" /></svg>,
  speaker: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M4 10v4h3.5L12 18V6L7.5 10z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></svg>,
  share: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 15V4M8 7.5 12 4l4 3.5" /><path d="M6 11v8h12v-8" /></svg>,
  download: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 4v11M8 11.5 12 15l4-3.5M5 19.5h14" /></svg>,
  edit: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M5 19h3.5L19 8.5 15.5 5 5 15.5z" /></svg>,
  sparkle: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 3.5c.6 4 2.4 5.9 6.5 6.5-4.1.6-5.9 2.5-6.5 6.5-.6-4-2.4-5.9-6.5-6.5 4.1-.6 5.9-2.5 6.5-6.5zM18.5 16c.2 1.3.8 1.9 2 2-1.2.2-1.8.8-2 2-.2-1.2-.8-1.8-2-2 1.2-.1 1.8-.7 2-2z" /></svg>,
  shield: ({ size, ...p }: P) => <svg {...base(size)} {...p}><path d="M12 3.5 19 6v5.5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6z" /><path d="m9 12 2 2 4-4" /></svg>,
  people: ({ size, ...p }: P) => <svg {...base(size)} {...p}><circle cx="9" cy="9" r="3.2" /><circle cx="16.5" cy="10" r="2.6" /><path d="M3.5 19c.9-3 3-4.4 5.5-4.4s4.6 1.4 5.5 4.4M14.5 15c2.4-.4 4.5.9 5.5 3.6" /></svg>,
};
export type IconName = keyof typeof I;
export const Icon = ({ name, ...p }: P & { name: IconName }) => I[name](p);
