// 나만의 황금 달빛 부적 — 소망 유형 고르기 → 이름·소망 → 3~5초 황금빛 완성 연출(건너뛰기 가능, 효과음은 기본 꺼짐) → 고화질 배경화면 저장.
// 실제 금전적 성과나 수익을 보장하지 않는다(행운을 비는 디지털 카드).
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CHARMS, charmOf, type CharmType } from '@dalsaegim/content';
import { useMain } from '../store/app';
import { apiAuth } from '../lib/api';
import { Top, useToast } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';

const W = 1080, H = 1920;
const imgOf = (t: CharmType) => `/img/ui/charm-${t}.jpg`;
type Saved = { id: string; type: CharmType; name: string; wish: string; createdAt: string };

// 부적 그리기(고화질 1080×1920) — 템플릿 위에 부적 이름·이름·소망·축원을 새긴다
export async function drawCharm(type: CharmType, name: string, wish: string): Promise<string> {
  const c = charmOf(type);
  const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = imgOf(type); });
  await Promise.all(['600 72px "Noto Serif KR"', '400 44px "Noto Serif KR"'].map((f) => document.fonts?.load(f).catch(() => null)));
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d')!;
  g.drawImage(img, 0, 0, W, H);
  const serif = '"Noto Serif KR", "Nanum Myeongjo", serif';
  const gold = g.createLinearGradient(0, 760, 0, 860); gold.addColorStop(0, '#fbe7b0'); gold.addColorStop(1, '#c99a45');
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = 'rgba(232, 190, 110, 0.55)'; g.shadowBlur = 24;
  g.fillStyle = gold; g.font = `600 78px ${serif}`;
  g.fillText(`[${c.name}]`, W / 2, 820);
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(217, 184, 116, 0.6)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(W / 2 - 160, 900); g.lineTo(W / 2 + 160, 900); g.stroke();
  g.fillStyle = '#f6ecd6'; g.font = `600 52px ${serif}`;
  g.fillText(`${name}님의 소망`, W / 2, 990);
  // 소망 문장 — 한 줄 15자 안팎으로 나눠 가운데 정렬
  g.font = `400 46px ${serif}`; g.fillStyle = '#efe3c8';
  const quote = `“${wish.replace(/[.。]$/, '')}${/기를$/.test(wish) ? ' 기원합니다.' : '.'}”`;
  const lines: string[] = []; let cur = '';
  for (const w of quote.split(' ')) { if ((cur + ' ' + w).trim().length > 15) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  if (cur.trim()) lines.push(cur.trim());
  lines.slice(0, 5).forEach((l, i) => g.fillText(l, W / 2, 1110 + i * 74));
  g.font = `400 36px ${serif}`; g.fillStyle = '#d9b874';
  g.fillText(c.bless, W / 2, 1110 + Math.min(lines.length, 5) * 74 + 70);
  g.font = `600 40px ${serif}`; g.fillStyle = '#e8cf98';
  g.fillText('달새김사주', W / 2, 1590);
  g.font = `400 26px ${serif}`; g.fillStyle = 'rgba(239, 227, 200, 0.7)';
  g.fillText('행운을 비는 마음을 담은 디지털 부적이에요', W / 2, 1640);
  return cv.toDataURL('image/png');
}

// 효과음 — 파일 없이 브라우저에서 만든다: 금빛 입자가 모일 때 은은한 반짝임, 완성될 때 맑은 차임
function useSound() {
  const ctx = useRef<AudioContext | null>(null);
  const ac = () => (ctx.current ??= new (window.AudioContext ?? (window as any).webkitAudioContext)());
  const tone = (f: number, t0: number, dur: number, vol: number, type: OscillatorType = 'sine') => {
    const a = ac(); const o = a.createOscillator(); const g = a.createGain();
    o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, a.currentTime + t0);
    g.gain.linearRampToValueAtTime(vol, a.currentTime + t0 + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
    o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
  };
  return {
    shimmer: () => { for (let i = 0; i < 14; i++) tone(1400 + Math.random() * 1800, 0.25 + i * 0.12, 0.6, 0.025); },
    chime: (at = 0) => { [1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(f, at + i * 0.07, 2.2, 0.06)); },
    stop: () => { ctx.current?.close().catch(() => {}); ctx.current = null; },
  };
}

export default function CharmPage() {
  const [sp] = useSearchParams();
  const { profile, isSample } = useMain();
  const toast = useToast();
  const [type, setType] = useState<CharmType>((CHARMS.find((c) => c.id === sp.get('type'))?.id ?? 'wealth') as CharmType);
  const c = charmOf(type);
  const [name, setName] = useState(isSample ? '' : profile.name);
  const [wi, setWi] = useState(0);
  const [wish, setWish] = useState(c.wishes[0]);
  const [sound, setSound] = useState(false);
  const [phase, setPhase] = useState<'form' | 'anim' | 'done'>('form');
  const [png, setPng] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const snd = useSound();
  useEffect(() => { setWi(0); setWish(charmOf(type).wishes[0]); }, [type]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); snd.stop(); }, []);

  const start = async () => {
    const n = name.trim(), w = wish.trim();
    if (!n || !w) return;
    setPhase('anim'); scrollTo({ top: 0 });
    track('charm_make', { type, sound });
    const p = drawCharm(type, n, w).then((u) => { setPng(u); return u; });
    if (sound) { snd.shimmer(); snd.chime(3.2); }
    timers.current.push(window.setTimeout(async () => { await p; setPhase('done'); }, 4300));
    if (!isSample) apiAuth('/charms', { method: 'POST', json: { type, name: n, wish: w } }).catch(() => {});
  };
  const skip = async () => { timers.current.forEach(clearTimeout); snd.stop(); if (!png) setPng(await drawCharm(type, name.trim(), wish.trim())); setPhase('done'); };
  const save = () => { if (!png) return; track('charm_save', { type }); const a = document.createElement('a'); a.href = png; a.download = `달새김_${c.name}_${name.trim()}.png`; a.click(); };
  const share = async () => {
    if (!png) return;
    try {
      const blob = await (await fetch(png)).blob();
      const file = new File([blob], `달새김_${c.name}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: c.name, text: '달새김사주에서 받은 나만의 황금 달빛 부적' });
      else { save(); toast('이미지를 저장했어요'); }
    } catch { /* 공유 취소 */ }
  };

  if (phase === 'anim') return (
    <main className="charm-anim" aria-label="부적을 새기는 중">
      <div className="ca-moon" />
      <div className="ca-dust">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ ['--a' as any]: `${(i * 360) / 28}deg`, ['--d' as any]: `${0.2 + (i % 7) * 0.12}s` }} />)}</div>
      <div className="ca-card" style={{ backgroundImage: `url(${imgOf(type)})` }}>
        <div className="ca-text">
          <b>[{c.name}]</b>
          <span className="n">{name.trim()}님의 소망</span>
          <span className="w">“{wish.trim()}”</span>
          <span className="bl">{c.bless}</span>
        </div>
      </div>
      <div className="ca-flash" />
      <button className="ca-skip" onClick={skip}>건너뛰기</button>
    </main>
  );

  if (phase === 'done' && png) return (
    <>
      <Top title="나만의 황금 달빛 부적" />
      <main className="screen charm-bg">
        <img className="charm-result fade-in" src={png} alt={`${name}님의 ${c.name}`} />
        <button className="btn gold-lux mt16" onClick={save}><I.download size={20} />배경화면으로 저장하기</button>
        <div className="grid2 mt8">
          <button className="btn line sm on-dark" style={{ width: '100%' }} onClick={share}><I.share size={18} />공유하기</button>
          <button className="btn line sm on-dark" style={{ width: '100%' }} onClick={() => { setPhase('form'); setPng(null); }}>다른 소망 새기기</button>
        </div>
        <p className="notice mt12" style={{ color: '#a99f8c' }}>{isSample ? '사주를 입력하면 우체통에 보관돼요.' : '나의 달빛 우체통 › 황금 부적에서 다시 저장할 수 있어요.'} 이 부적은 행운을 비는 마음을 담은 디지털 카드이며, 금전적 결과를 보장하지 않아요.</p>
      </main>
    </>
  );

  return (
    <>
      <Top title="나만의 황금 달빛 부적" />
      <main className="screen charm-bg">
        <p className="pick-eyebrow">달새김 황금 부적</p>
        <h2 className="pick-title">이름과 소망을<br />황금빛 달에 새겨 드려요</h2>
        <section className="qblock">
          <h3 className="gold-h">1. 어떤 소망인가요?</h3>
          <div className="charm-types">
            {CHARMS.map((x) => (
              <button key={x.id} className={type === x.id ? 'on' : ''} onClick={() => setType(x.id)} aria-pressed={type === x.id}>
                <span className="ct-img" style={{ backgroundImage: `url(${imgOf(x.id)})` }} />
                <b>{x.label}</b><small>{x.name.replace('황금 ', '')}</small>
              </button>
            ))}
          </div>
          <p className="charm-sym">{c.name} · {c.symbol}</p>
        </section>
        <section className="qblock">
          <h3 className="gold-h">2. 새길 이름</h3>
          <input className="input dark" maxLength={12} value={name} onChange={(e) => setName(e.target.value)} placeholder="예) 김민수" />
        </section>
        <section className="qblock">
          <h3 className="gold-h">3. 나의 소망</h3>
          <div className="wish-list">
            {c.wishes.map((w, i) => <button key={w} className={wi === i ? 'on' : ''} onClick={() => { setWi(i); setWish(w); }}>“{w}”</button>)}
          </div>
          <textarea className="input dark mt8" rows={2} maxLength={40} value={wish} onChange={(e) => { setWish(e.target.value); setWi(-1); }} aria-label="소망 직접 고치기" />
          <p className="faint mt4" style={{ color: '#a99f8c' }}>골라도 되고, 직접 고쳐도 돼요(40자 이내).</p>
        </section>
        <div className="sound-row mt16"><span><I.speaker size={18} /> 완성 효과음</span><button className={`switch${sound ? ' on' : ''}`} role="switch" aria-checked={sound} onClick={() => setSound(!sound)}><i /></button></div>
        <button className="btn gold-lux mt20" disabled={!name.trim() || !wish.trim()} onClick={start}>나만의 부적 받기</button>
        <p className="notice mt8" style={{ color: '#a99f8c' }}>무료 · 휴대폰 배경화면 크기(1080×1920)로 저장돼요</p>
      </main>
    </>
  );
}

// 우체통 › 황금 부적 — 받은 부적 다시 저장
export function CharmList() {
  const [list, setList] = useState<Saved[] | null>(null);
  const toast = useToast();
  useEffect(() => { apiAuth<Saved[]>('/charms').then(setList).catch(() => setList([])); }, []);
  const again = async (s: Saved) => { const u = await drawCharm(s.type, s.name, s.wish); const a = document.createElement('a'); a.href = u; a.download = `달새김_${charmOf(s.type).name}_${s.name}.png`; a.click(); toast('다시 저장했어요'); };
  const del = async (id: string) => { try { await apiAuth(`/charms/${id}`, { method: 'DELETE' }); setList((l) => l?.filter((x) => x.id !== id) ?? null); } catch (e: any) { toast(e.message); } };
  if (list && list.length === 0) return (
    <section className="card center mt16">
      <h3 className="h3">아직 받은 부적이 없어요</h3>
      <p className="muted mt8">이름과 소망을 황금빛 달에 새겨 보세요.</p>
      <Link to="/charm" className="btn gold-lux mt12">나만의 황금 부적 받기</Link>
    </section>
  );
  return (
    <div className="stack mt16">
      {list?.map((s) => (
        <div key={s.id} className="mail-row">
          <span className="ct-thumb" style={{ backgroundImage: `url(${imgOf(s.type)})` }} />
          <span className="grow"><small>{s.createdAt.slice(0, 10).replace(/-/g, '.')}</small><b>{charmOf(s.type).name}</b><span>{s.name}님 · “{s.wish}”</span></span>
          <button className="icon-btn" aria-label="다시 저장" onClick={() => again(s)}><I.download size={18} /></button>
          <button className="icon-btn" aria-label="지우기" onClick={() => del(s.id)}><I.close size={18} /></button>
        </div>
      ))}
      {list && list.length > 0 && <Link to="/charm" className="btn gold-lux mt8">새 부적 받기</Link>}
    </div>
  );
}

// 재물·사업·부동산·직장·성취 결과 화면에서 이어지는 작은 부적 카드
export function CharmLink({ type }: { type: CharmType }) {
  const c = charmOf(type);
  return (
    <Link to={`/charm?type=${type}`} className="home-charm mt12" onClick={() => track('content_view', { content: 'charm_link', type })}>
      <span className="ct-thumb" style={{ backgroundImage: `url(${imgOf(type)})` }} />
      <span className="grow"><b>{c.name}</b><span>이 소망을 이름과 함께 황금 부적에 새기기 · 무료</span></span>
      <I.right />
    </Link>
  );
}
