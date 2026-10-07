// 나의 사주지도 — 타고난 나(일간) · 오행 균형 · 5영역 · 중요 시기(대운). 모든 기능의 공통 기준.
import { Link } from 'react-router-dom';
import { useMain } from '../store/app';
import { useMap } from '../lib/fortune';
import { Top, won } from '../components/ui';
import { I } from '../components/icons';
import brand from '../../../brand.config.json';

const EL_COLOR: Record<string, string> = { 목: '#8DB38B', 화: '#E39B95', 토: '#D8B895', 금: '#B9B6CF', 수: '#5B6394' };
const LV: Record<string, string> = { strong: '강해요', normal: '고르게', soft: '천천히' };

export default function SajuMap() {
  const { profile, isSample } = useMain();
  const m = useMap(profile);
  const life = brand.products.find((p) => p.id === 'lifetime')!;
  const P = m.pillars;
  const pillars = [['시', P.hour], ['일', P.day], ['월', P.month], ['년', P.year]] as const;
  return (
    <>
      <Top title="나의 사주지도" />
      <main className="screen">
        <section className="card navy" aria-label="타고난 나">
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>{profile.name} 님의 일간 · {m.dayMaster.char}({m.dayMaster.hanja}) {m.dayMaster.image}{isSample && <span className="sample-tag">예시</span>}</div>
          <h2 className="h1 mt8" style={{ fontSize: 24 }}>{m.dayMaster.title}</h2>
          <p className="mt8" style={{ color: '#d9d6ea', margin: '8px 0 0' }}>{m.dayMaster.line}</p>
          <div className="chips mt12">{m.keywords.map((k) => <span key={k} className="chip sm" style={{ background: 'rgba(255,255,255,.08)', color: '#F2DCCB', borderColor: 'rgba(255,255,255,.15)' }}>{k}</span>)}</div>
        </section>
        {isSample && <Link to="/profile/new?next=/map" className="btn primary mt12">내 사주로 지도 그리기</Link>}

        <section className="card mt16" aria-label="사주 원국">
          <div className="card-title"><h3>사주 여덟 글자</h3><span className="faint">{m.zodiac}띠{m.timeUnknown ? ' · 시간 모름' : ''}</span></div>
          <div className="metrics">
            {pillars.map(([l, p]) => (
              <div key={l} className="metric"><small>{l}주</small><b className="serif" style={{ fontSize: 20, letterSpacing: 2 }}>{p ? p.hanja : '—'}</b><small>{p ? p.text : '모름'}</small></div>
            ))}
          </div>
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

        <section className="mt16" aria-label="한눈에 보는 나">
          <h2 className="h3">한눈에 보는 나</h2>
          <div className="list mt12">
            {m.areas.map((a) => (
              <div key={a.id} className="li" style={{ alignItems: 'flex-start' }}>
                <span className="chip sm lav" style={{ flex: 'none' }}>{a.label}</span>
                <div className="grow"><div className="small">{a.line}</div><div className="faint" style={{ fontSize: 12 }}>기운 {LV[a.level]}</div></div>
              </div>
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
      </main>
    </>
  );
}
