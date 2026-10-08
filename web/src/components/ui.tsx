// 공통 화면 조각 — 헤더·하단 탭·점수 링·흐름 그래프·시트·토스트·달·기록 저장 시트
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { I } from './icons';
import brand from '../../../brand.config.json';

export const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;

// 3D 파스텔 아이콘(/img/ui/ic-*.webp)
export type PicName = 'today' | 'path' | 'friend' | 'map' | 'love' | 'work' | 'money' | 'family' | 'future' | 'self' | 'health' | 'moon';
export const Pic = ({ n, size, className = '' }: { n: PicName; size?: 's' | 'l'; className?: string }) => <img className={`pico${size ? ` ${size}` : ''} ${className}`} src={`/img/ui/ic-${n}.webp`} alt="" loading="lazy" decoding="async" />;
export const CAT_PIC: Record<string, PicName> = { love: 'love', work: 'work', money: 'money', family: 'family', growth: 'self', health: 'health', etc: 'moon', future: 'future', self: 'self' };

export function Top({ title, dark, back = true, right }: { title?: string; dark?: boolean; back?: boolean | string; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className={`top${dark ? ' dark' : ''}`}>
      {back ? (
        <button className="icon-btn" aria-label="뒤로" onClick={() => (typeof back === 'string' ? nav(back) : history.length > 1 ? nav(-1) : nav('/'))}><I.back /></button>
      ) : <span style={{ width: 40 }} />}
      <h1 style={right ? { paddingRight: 0 } : undefined}>{title}</h1>
      {right}
    </header>
  );
}

const TABS = [
  { to: '/', label: '홈', icon: I.home, end: true },
  { to: '/records', label: '기록', icon: I.book },
  { to: '/timeline', label: '타임라인', icon: I.timeline },
  { to: '/me', label: '마이', icon: I.user },
];
export function TabBar() {
  return (
    <nav className="tabbar" aria-label="메뉴">
      {TABS.map((t) => <NavLink key={t.to} to={t.to} end={t.end}><t.icon />{t.label}</NavLink>)}
    </nav>
  );
}

// 그려지는 달(이미지 없이) — 초승달 + 은은한 빛
export function Moon({ size = 120, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <defs>
        <radialGradient id="mg" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#FFF8EE" /><stop offset=".7" stopColor="#F2DCCB" /><stop offset="1" stopColor="#D8B895" /></radialGradient>
        <radialGradient id="mglow" cx="50%" cy="50%" r="50%"><stop offset="0" stopColor="#F7E7DC" stopOpacity=".35" /><stop offset="1" stopColor="#F7E7DC" stopOpacity="0" /></radialGradient>
        <mask id="mcut"><rect width="120" height="120" fill="#fff" /><circle cx="76" cy="46" r="34" fill="#000" /></mask>
      </defs>
      {glow && <circle cx="60" cy="60" r="60" fill="url(#mglow)" />}
      <circle cx="60" cy="60" r="36" fill="url(#mg)" mask="url(#mcut)" />
    </svg>
  );
}

export function Ring({ value, size = 128, stroke = 10, label, color = 'url(#rg)' }: { value: number; size?: number; stroke?: number; label?: string; color?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [v, setV] = useState(0);
  useEffect(() => { const t = setTimeout(() => setV(value), 60); return () => clearTimeout(t); }, [value]);
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={`${label ?? '지수'} ${value}점`}>
      <svg width={size} height={size}>
        <defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#C7B6FF" /><stop offset="1" stopColor="#D8B895" /></linearGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#ECE7F3" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="val"><b>{value}</b>{label && <small>{label}</small>}</div>
    </div>
  );
}

export const Stars = ({ n }: { n: number }) => (
  <span className="stars5" aria-label={`별 ${n}개`}>{[1, 2, 3, 4, 5].map((i) => <span key={i} className={i <= n ? '' : 'off'}>★</span>)}</span>
);

export function Bars({ rows, tone }: { rows: { label: string; score: number }[]; tone?: 'gold' | 'rose' }) {
  return (
    <div className="stack">
      {rows.map((r) => (
        <div className="kv" key={r.label}><span>{r.label}</span><div className={`bar ${tone ?? ''}`}><i style={{ width: `${Math.max(6, (r.score - 40) / 0.56)}%` }} /></div><b>{r.score}</b></div>
      ))}
    </div>
  );
}

// 월별 흐름 그래프 — 나의 흐름(라벤더) + (선택) 시장 흐름(골드 점선). 좋은 달 ●, 신중한 달 ○
export function FlowChart({ points, market, good = [], careful = [], labels, current }: { points: number[]; market?: number[] | null; good?: number[]; careful?: number[]; labels?: string[]; current?: number | null }) {
  const W = 320, H = 150, P = 16, top = 14, bottom = 26;
  const n = points.length;
  const all = [...points, ...(market ?? [])];
  const min = Math.min(...all) - 4, max = Math.max(...all) + 4;
  const x = (i: number) => P + (i * (W - 2 * P)) / (n - 1);
  const y = (v: number) => top + (1 - (v - min) / (max - min)) * (H - top - bottom);
  const line = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line(points)} L${x(n - 1)},${H - bottom} L${x(0)},${H - bottom} Z`;
  const lab = labels ?? points.map((_, i) => `${i + 1}`);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="월별 흐름 그래프">
      <defs><linearGradient id="fa" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C7B6FF" stopOpacity=".35" /><stop offset="1" stopColor="#C7B6FF" stopOpacity="0" /></linearGradient></defs>
      {current != null && current >= 0 && <rect x={x(current) - 9} y={top - 6} width={18} height={H - top - bottom + 6} rx={9} fill="#F5ECE0" />}
      <path d={area} fill="url(#fa)" />
      {market && <path d={line(market)} fill="none" stroke="#D8B895" strokeWidth={2} strokeDasharray="4 4" />}
      <path d={line(points)} fill="none" stroke="#8F7AE6" strokeWidth={2.4} strokeLinejoin="round" />
      {points.map((v, i) => {
        const m = i + 1;
        const isG = good.includes(m), isC = careful.includes(m);
        return <circle key={i} cx={x(i)} cy={y(v)} r={isG || isC ? 4.5 : 2.5} fill={isG ? '#8F7AE6' : '#fff'} stroke={isC ? '#D98A9A' : '#8F7AE6'} strokeWidth={isC ? 2.2 : 1.6} />;
      })}
      {lab.map((l, i) => (n <= 12 && (i % 2 === 0 || n <= 6)) && <text key={i} x={x(i)} y={H - 8} fontSize="10" fill="#8A8CA0" textAnchor="middle">{l}</text>)}
    </svg>
  );
}
export function FlowLegend({ market }: { market?: boolean }) {
  return (
    <div className="row faint" style={{ gap: 14, fontSize: 12, marginTop: 4 }}>
      <span className="row" style={{ gap: 4 }}><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#8F7AE6" /></svg>좋은 달</span>
      <span className="row" style={{ gap: 4 }}><svg width="10" height="10"><circle cx="5" cy="5" r="3.5" fill="#fff" stroke="#D98A9A" strokeWidth="2" /></svg>신중한 달</span>
      {market && <span className="row" style={{ gap: 4 }}><svg width="16" height="4"><path d="M0 2h16" stroke="#D8B895" strokeWidth="2" strokeDasharray="4 3" /></svg>시장 흐름</span>}
    </div>
  );
}

export function Sheet({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: ReactNode; label: string }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet-bg" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}><div className="grab" />{children}</div>
    </div>
  );
}

const ToastCtx = createContext<(m: string) => void>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>();
  const show = (m: string) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(null), 2400); };
  return <ToastCtx.Provider value={show}>{children}{msg && <div className="toast" role="status">{msg}</div>}</ToastCtx.Provider>;
}
export const useToast = () => useContext(ToastCtx);

export const Skeleton = ({ h = 80 }: { h?: number }) => <div className="skeleton" style={{ height: h }} />;

export function Foot() {
  const b = brand.business;
  return (
    <footer className="foot">
      <div className="row" style={{ gap: 12, marginBottom: 8 }}>
        <Link to="/terms">이용약관</Link><Link to="/privacy"><b>개인정보처리방침</b></Link><Link to="/refund">환불정책</Link>
      </div>
      상호 {b.name} · 대표 {b.ceo}{b.regNo && ` · 사업자등록번호 ${b.regNo}`}{b.mailOrderNo && ` · 통신판매업 ${b.mailOrderNo}`}<br />
      {b.address && <>{b.address}<br /></>}
      {b.phone && <>고객센터 {b.phone} · </>}{b.email && <>{b.email}</>}<br />
      달새김사주의 풀이는 자기 이해를 돕는 참고 정보이며, 의료·법률·투자 판단을 대신하지 않습니다.
    </footer>
  );
}

export const CAT_LABEL: Record<string, string> = { love: '연애', work: '직장', money: '재물', family: '가족', growth: '성장', health: '건강', etc: '기타' };
export const CAT_LONG: Record<string, string> = { love: '연애·관계', work: '직장·이직', money: '돈·재물', family: '가족·관계', growth: '나·성장', health: '건강', etc: '기타' };
export const CAT_COLOR: Record<string, string> = { love: '#E7799C', work: '#7A86D6', money: '#C9A15E', family: '#E59A62', growth: '#9B7FE0', health: '#62B39C', etc: '#A7A3B5' };

// 오늘의 새김 — 요약을 [저장][수정][남기지 않기] (시안 7)
export function MemoryCard({ draft, onSave, onSkip, saved }: { draft: { category: string; title: string; summary?: string }; onSave: (d: { category: string; title: string; summary?: string }) => void; onSkip: () => void; saved?: boolean }) {
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState(draft);
  useEffect(() => setD(draft), [draft]);
  if (saved) return <div className="saegim"><div className="cat"><Pic n={CAT_PIC[d.category] ?? 'moon'} size="s" />달새김 기록에 새겼어요</div><p className="faint">타임라인에서 언제든 다시 볼 수 있어요. 몇 주 뒤 어떻게 됐는지 물어볼게요.</p></div>;
  return (
    <div className="saegim">
      <div className="between"><div className="cat"><Pic n={CAT_PIC[d.category] ?? 'moon'} size="s" />{CAT_LABEL[d.category] ?? '기타'}</div><span className="faint" style={{ fontSize: 13 }}>오늘의 새김</span></div>
      {edit ? (
        <>
          <input className="input mt8" value={d.title} maxLength={60} onChange={(e) => setD({ ...d, title: e.target.value })} aria-label="기록 제목" />
          <textarea className="input mt8" value={d.summary ?? ''} maxLength={200} onChange={(e) => setD({ ...d, summary: e.target.value })} aria-label="기록 내용" />
          <div className="chips mt8">{Object.entries(CAT_LABEL).map(([k, l]) => <button key={k} className={`chip sm${d.category === k ? ' on' : ''}`} onClick={() => setD({ ...d, category: k })}>{l}</button>)}</div>
        </>
      ) : (
        <p>{d.summary ?? d.title}</p>
      )}
      <div className="acts">
        <button className="save" onClick={() => onSave(d)}>저장</button>
        <button onClick={() => setEdit(!edit)}>{edit ? '완료' : '수정'}</button>
        <button onClick={onSkip}>남기지 않기</button>
      </div>
    </div>
  );
}

// 사진 1장 → 작게 줄인 webp data URL(서버 120KB 한도 안)
export async function shrinkPhoto(file: File, max = 640): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  for (const q of [0.78, 0.6, 0.45]) {
    const url = c.toDataURL('image/webp', q);
    if (url.startsWith('data:image/webp') && url.length < 150_000) return url;
    const j = c.toDataURL('image/jpeg', q);
    if (j.length < 150_000) return j;
  }
  throw new Error('사진이 너무 커요. 다른 사진을 골라 주세요');
}

export const fullDate = (d = new Date()) => {
  const k = new Date(d.getTime() + 9 * 3600000);
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 (${'일월화수목금토'[k.getUTCDay()]})`;
};
