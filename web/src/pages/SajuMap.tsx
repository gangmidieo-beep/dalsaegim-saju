// 나의 사주지도 (시안 3·3-1) — 전체/연애/직장/재물/가족/성장 탭 · 나의 성향 + 십성 원형 그림 · 핵심 키워드 · 운의 흐름 요약.
// 아래에 사주 여덟 글자 · 오행 균형 · 큰 흐름(대운) 상세. 모든 기능의 공통 기준.
import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { nextMonths, type Dim } from '@dalsaegim/content';
import { useMain } from '../store/app';
import { useMap, useSaju } from '../lib/fortune';
import { FlowChart, Pic, Top, won, type PicName } from '../components/ui';
import { I } from '../components/icons';
import brand from '../../../brand.config.json';

const EL_COLOR: Record<string, string> = { 목: '#8DB38B', 화: '#E39B95', 토: '#D8B895', 금: '#B9B6CF', 수: '#5B6394' };
const LV: Record<string, string> = { strong: '강하게 살아 있어요', normal: '고르게 흘러요', soft: '천천히 자라는 중이에요' };
const GOD_BG = ['#FFF1CC', '#D9F2EC', '#FFE0E9', '#E7E1FB', '#DCEBFB'];
const TABS = [['all', '전체'], ['love', '연애'], ['work', '직장'], ['money', '재물'], ['family', '가족'], ['growth', '성장']] as const;
type Tab = (typeof TABS)[number][0];
const DIM: Record<Exclude<Tab, 'all'>, Dim> = { love: 'love', work: 'work', money: 'wealth', family: 'family', growth: 'growth' };
const PIC: Record<Exclude<Tab, 'all'>, PicName> = { love: 'love', work: 'work', money: 'money', family: 'family', growth: 'future' };
const PATH_CAT: Record<Exclude<Tab, 'all'>, string> = { love: 'love', work: 'work', money: 'money', family: 'family', growth: 'self' };

export default function SajuMap() {
  const { profile, isSample } = useMain();
  const m = useMap(profile);
  const saju = useSaju(profile);
  const [tab, setTab] = useState<Tab>('all');
  const detail = useRef<HTMLDivElement>(null);
  const life = brand.products.find((p) => p.id === 'lifetime')!;
  const P = m.pillars;
  const pillars = [['시', P.hour], ['일', P.day], ['월', P.month], ['년', P.year]] as const;

  // 앞으로 4달 흐름 — 전체는 다섯 분야 평균
  const flow = useMemo(() => {
    const dims: Dim[] = tab === 'all' ? ['love', 'work', 'wealth', 'family', 'growth'] : [DIM[tab]];
    const rows = dims.map((d) => nextMonths(saju, d, profile.id).slice(0, 4));
    return rows[0].map((x, i) => ({ month: x.month, score: Math.round(rows.reduce((s, r) => s + r[i].score, 0) / rows.length) }));
  }, [saju, profile.id, tab]);
  const bi = flow.reduce((b, x, i) => (x.score > flow[b].score ? i : b), 0);
  const area = tab === 'all' ? null : m.areas.find((a) => a.id === tab)!;
  const yearKw = [...new Set([...m.areas.filter((a) => a.level === 'strong').map((a) => `${a.label} 상승`), ...m.dayMaster.keywords.slice(0, 2), `${flow[bi].month}월 주목`])].slice(0, 5);

  return (
    <>
      <Top title={`${profile.name} 님의 사주 지도`} />
      <main className="screen" style={{ paddingTop: 4 }}>
        <div className="tabs" role="tablist" aria-label="분야">
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>

        {tab === 'all' ? (
          <section className="card mt12" aria-label="나의 성향">
            <div className="center">
              <div className="faint">나의 성향 · {m.dayMaster.char}({m.dayMaster.hanja}) {m.dayMaster.image}{isSample && <span className="sample-tag">예시</span>}</div>
              <h2 className="h2 mt4">{m.dayMaster.title}</h2>
            </div>
            <GodMap gods={m.gods} />
            <h3 className="h3 mt8">한눈에 보는 핵심 키워드</h3>
            <div className="chips mt8">{m.keywords.map((k) => <span key={k} className="chip sm lav">{k}</span>)}<span className="chip sm rose">{flow[bi].month}월 주목</span></div>
          </section>
        ) : area && (
          <section className="card mt12" aria-label={area.label}>
            <div className="row"><Pic n={PIC[tab as Exclude<Tab, 'all'>]} /><div><div className="faint">{area.label} 기운</div><h2 className="h3">{LV[area.level]}</h2></div></div>
            <p className="mt12" style={{ margin: '12px 0 0' }}>{area.line}</p>
            <Link to={`/path?cat=${PATH_CAT[tab as Exclude<Tab, 'all'>]}`} className="link mt12" style={{ display: 'inline-block' }}>이 분야 고민의 길 걷기 →</Link>
          </section>
        )}
        {isSample && <Link to="/profile/new?next=/map" className="btn primary mt12">내 사주로 지도 그리기</Link>}

        <section className="card mt12" aria-label="운의 흐름 요약">
          <div className="row"><Pic n="today" size="s" /><h3 className="h3">운의 흐름 요약</h3></div>
          <div className="mt8"><FlowChart points={flow.map((x) => x.score)} labels={flow.map((x) => `${x.month}월`)} good={[bi + 1]} /></div>
          <p className="center" style={{ margin: '6px 0 0', padding: '10px 12px', borderRadius: 12, background: 'var(--ivory)', fontWeight: 600 }}>{flow[bi].month}월{bi === 0 ? '부터' : ' 이후'} 새로운 기회가 열려요.</p>
          {tab === 'all' && <><h3 className="h3 mt16">올해의 핵심 키워드</h3><div className="chips mt8">{yearKw.map((k) => <span key={k} className="chip sm">{k}</span>)}</div></>}
        </section>

        <button className="btn blush mt16" onClick={() => detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>상세 해석 보기 →</button>

        <div ref={detail} style={{ scrollMarginTop: 60 }}>
          <section className="card mt24" aria-label="사주 원국">
            <div className="card-title"><h3>사주 여덟 글자</h3><span className="faint">{m.zodiac}띠{m.timeUnknown ? ' · 시간 모름' : ''}</span></div>
            <div className="metrics">
              {pillars.map(([l, p]) => (
                <div key={l} className="metric"><small>{l}주</small><b className="serif" style={{ fontSize: 20, letterSpacing: 2 }}>{p ? p.hanja : '—'}</b><small>{p ? p.text : '모름'}</small></div>
              ))}
            </div>
            <p className="small muted mt12" style={{ margin: '12px 0 0' }}>{m.dayMaster.line}</p>
          </section>

          <section className="card mt16" aria-label="오행 균형">
            <div className="card-title"><h3>오행 균형</h3><span className="faint">강한 기운 {m.strongest} · 채울 기운 {m.need}</span></div>
            <div className="stack">
              {m.elements.map((e) => (
                <div key={e.el} className="kv"><span>{e.el}</span><div className="bar"><i style={{ width: `${Math.max(4, e.pct)}%`, background: EL_COLOR[e.el] }} /></div><b>{e.pct}%</b></div>
              ))}
            </div>
            <p className="small muted mt12" style={{ margin: '12px 0 0' }}>{m.elementAdvice}</p>
          </section>

          <section className="mt16" aria-label="분야별 나">
            <h2 className="h3">분야별로 보는 나</h2>
            <div className="list mt12">
              {m.areas.map((a) => (
                <button key={a.id} className="li" style={{ alignItems: 'flex-start', width: '100%', textAlign: 'left' }} onClick={() => { setTab(a.id as Tab); scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <Pic n={PIC[a.id as Exclude<Tab, 'all'>]} size="s" />
                  <div className="grow"><b className="small">{a.label}</b><div className="small">{a.line}</div></div>
                </button>
              ))}
            </div>
          </section>

          {m.period.now && (
            <section className="card lav mt16" aria-label="중요한 시기">
              <div className="eyebrow" style={{ color: 'var(--lav-2)' }}>지금 지나는 큰 흐름</div>
              <h3 className="h3 mt4">{m.period.now.fromYear}~{m.period.now.toYear} · {m.period.now.text}({m.period.now.hanja}) 대운</h3>
              <p className="small mt4" style={{ margin: '4px 0 0' }}>{m.period.now.theme}</p>
              {m.period.next && <p className="faint mt8">다음 {m.period.next.fromYear}년부터 · {m.period.next.theme}</p>}
            </section>
          )}

          <section className="card mt16" aria-label="전체 풀이">
            <h3 className="h3">{life.title}</h3>
            <p className="small muted mt4">{life.cardCopy}. 인생의 큰 흐름과 전성기까지 아홉 장으로 풀어 드려요.</p>
            <Link to="/product/lifetime" className="btn primary mt12">전체 풀이 보기 · {won(life.price)}</Link>
          </section>
          <div className="grid2 mt12">
            <Link to="/mbti" className="btn line sm" style={{ width: '100%' }}>사주 × MBTI</Link>
            <Link to="/path" className="btn line sm" style={{ width: '100%' }}><I.path size={18} />내 고민의 길</Link>
          </div>
        </div>
      </main>
    </>
  );
}

// 십성 다섯 무리를 오각형으로 — 많을수록 원이 커진다
function GodMap({ gods }: { gods: { group: string; label: string; n: number; mean: string }[] }) {
  const pos = gods.map((_, i) => { const a = (-90 + i * 72) * (Math.PI / 180); return { x: 50 + 34 * Math.cos(a), y: 50 + 34 * Math.sin(a) }; });
  return (
    <div className="godmap" role="img" aria-label={gods.map((g) => `${g.label} ${g.n}개`).join(', ')}>
      <svg viewBox="0 0 100 100" aria-hidden>
        <polygon points={pos.map((p) => `${p.x},${p.y}`).join(' ')} fill="#F6F2FD" stroke="#E2DAF5" strokeWidth=".6" />
        {pos.map((p, i) => <line key={i} x1="50" y1="50" x2={p.x} y2={p.y} stroke="#E2DAF5" strokeWidth=".6" />)}
      </svg>
      {gods.map((g, i) => {
        const size = Math.min(84, 58 + g.n * 7);
        return (
          <div key={g.group} className="g" style={{ left: `${pos[i].x}%`, top: `${pos[i].y}%`, width: size, height: size, background: GOD_BG[i], opacity: g.n ? 1 : 0.6 }}>
            <div>{g.label}<small>{g.n ? `${g.n}개` : '없음'}</small></div>
          </div>
        );
      })}
      <div className="c"><Pic n="moon" size="s" /></div>
    </div>
  );
}
