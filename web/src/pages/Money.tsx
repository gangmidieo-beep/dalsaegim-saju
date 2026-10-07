// 돈의 흐름 — 달새김 시그니처. 재물·사업·투자·부동산을 "돈의 흐름" 하나로, 각각 간단명쾌하게.
// 무료 요약(지수·월별 흐름·좋은/신중한 달·키워드) → 상세 해석(유료) → 마지막에 오늘의 재물 보너스(행운번호, 재미 요소).
import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { MONEY_META, toRanges, type MoneyKind } from '@dalsaegim/content';
import { useApp, useMain } from '../store/app';
import { useLucky, useMoney } from '../lib/fortune';
import { apiGet } from '../lib/api';
import { kstMonth, kstToday, kstYear } from '../lib/dates';
import { Bars, FlowChart, FlowLegend, Moon, Ring, Top, won, useToast } from '../components/ui';
import { I, Icon, type IconName } from '../components/icons';
import { saveImage, shareLink, shortLink } from '../lib/share';
import { track } from '../lib/track';
import brand from '../../../brand.config.json';

const KINDS: { k: MoneyKind; icon: IconName; line: string }[] = [
  { k: 'wealth', icon: 'coin', line: '지금의 돈 흐름과 앞으로의 기회' },
  { k: 'business', icon: 'store', line: '사업의 흐름, 확장·동업, 적절한 시기' },
  { k: 'invest', icon: 'chart', line: '시장의 큰 흐름 × 나의 투자 리듬' },
  { k: 'estate', icon: 'building', line: '매매·전월세·이사, 좋은 시기와 주의할 시기' },
];
const PID: Record<MoneyKind, string> = { wealth: 'money_wealth', business: 'money_business', invest: 'money_invest', estate: 'money_estate' };
const prod = (id: string) => brand.products.find((p) => p.id === id)!;
type Market = { title: string; body: string; flow: number[] | null; updatedAt: string } | null;

function useYear() {
  const [sp, setSp] = useSearchParams();
  const now = kstYear();
  const year = +(sp.get('y') ?? (kstMonth() >= 11 ? now + 1 : now));
  return { year, years: [now, now + 1], setYear: (y: number) => setSp({ y: String(y) }, { replace: true }) };
}
function YearSeg({ year, years, setYear }: ReturnType<typeof useYear>) {
  return <div className="seg dark" style={{ width: 210 }}>{years.map((y) => <button key={y} className={y === year ? 'on' : ''} onClick={() => setYear(y)}>{y}년</button>)}</div>;
}

export function MoneyHub() {
  const { profile, isSample } = useMain();
  const Y = useYear();
  const pack = prod('money_pack');
  return (
    <>
      <Top title="돈의 흐름" dark />
      <section className="hero" style={{ paddingTop: 8 }}>
        <div className="stars" />
        <div style={{ position: 'absolute', right: 8, top: 0, opacity: 0.95 }}><Moon size={110} /></div>
        <div style={{ position: 'relative' }}>
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>달새김 재물 시리즈</div>
          <h1 className="h1 mt8">돈의 흐름을<br />한눈에</h1>
          <p className="muted small mt8">“좋은 기회는 흐름 속에서 보이고,<br />지키는 사람에게 더 크게 찾아와요.”</p>
          <div className="mt16"><YearSeg {...Y} /></div>
        </div>
      </section>
      <main className="screen pull-up">
        {isSample && <Link to="/profile/new?next=/money" className="btn primary">내 사주로 돈의 흐름 보기</Link>}
        <div className="stack mt12">{KINDS.map((x) => <HubCard key={x.k} kind={x.k} icon={x.icon} line={x.line} year={Y.year} profileId={profile.id} />)}</div>
        <Link to={`/product/money_pack`} className="card gold mt16 between" style={{ display: 'flex' }}>
          <div><b>{pack.title}</b><div className="small muted">{pack.cardCopy}</div></div>
          <div style={{ textAlign: 'right' }}>{pack.listPrice && <div className="faint" style={{ textDecoration: 'line-through' }}>{won(pack.listPrice)}</div>}<b className="hl-gold">{won(pack.price)}</b></div>
        </Link>
        <LuckyCard />
      </main>
    </>
  );
}
function HubCard({ kind, icon, line, year }: { kind: MoneyKind; icon: IconName; line: string; year: number; profileId: string }) {
  const { profile } = useMain();
  const f = useMoney(profile, kind, year);
  return (
    <Link to={`/money/${kind}?y=${year}`} className="opt" style={{ alignItems: 'center' }}>
      <span className="ic" style={{ background: 'var(--gold-soft)', color: 'var(--gold-2)' }}><Icon name={icon} /></span>
      <span style={{ flex: 1 }}><b>{MONEY_META[kind].title}</b><div className="faint">{line}</div></span>
      <span style={{ textAlign: 'right' }}><b className="serif" style={{ fontSize: 22 }}>{f.score}</b><div className="faint" style={{ fontSize: 11 }}>{year}</div></span>
    </Link>
  );
}

export function MoneyResult() {
  const { kind = 'wealth' } = useParams() as { kind: MoneyKind };
  const { profile, isSample } = useMain();
  const Y = useYear();
  const [market, setMarket] = useState<Market>(null);
  useEffect(() => { if (kind === 'invest') apiGet<Market>('/market').then(setMarket).catch(() => {}); track('content_view', { content: `money_${kind}` }); }, [kind]);
  const marketFlow = market?.flow && Y.year === kstYear() ? market.flow : null;
  const f = useMoney(profile, kind, Y.year, marketFlow);
  const p = prod(PID[kind]);
  const curIdx = Y.year === kstYear() ? kstMonth() - 1 : null;
  const inv = f.invest;
  const T = inv?.titles;
  return (
    <>
      <Top title={f.title} />
      <main className="screen">
        <section className="card navy center" style={{ position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -18, top: -18, opacity: 0.35 }}><Moon size={80} /></div>
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>{Y.year} {T ? T[0] : f.series}{isSample && <span className="sample-tag">예시</span>}</div>
          <h2 className="h2 mt8" style={{ color: 'var(--ivory)' }}>{f.headline}</h2>
          <p className="small mt8" style={{ color: '#d9d6ea' }}>{f.summary}</p>
          <div className="mt12" style={{ display: 'flex', justifyContent: 'center' }}><YearSeg {...Y} /></div>
        </section>

        <section className="card mt16" aria-label="요약">
          <div className="card-title"><h3>{Y.year} {f.title} 요약</h3></div>
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <Ring value={f.score} size={104} stroke={9} label={f.title} />
            <div style={{ flex: 1 }}><Bars rows={f.subs} tone="gold" /></div>
          </div>
          <div className="chips mt16">{f.keywords.map((k) => <span key={k} className="chip sm gold">{k}</span>)}</div>
        </section>

        {inv && (
          <section className="card mt16" aria-label="투자 성향">
            <div className="card-title"><h3>나의 투자 성향</h3><span className="chip sm lav">{inv.style.style}</span></div>
            <Bars rows={[{ label: '신중함', score: Math.round(40 + inv.style.carePct * 0.56) }, { label: '도전성', score: Math.round(40 + inv.style.boldPct * 0.56) }]} />
            <p className="small muted mt12" style={{ margin: '12px 0 0' }}>{inv.style.text}</p>
          </section>
        )}
        {inv && T && (
          <section className="card flat mt16" aria-label={T[1]}>
            <h3 className="h3">{T[1]}</h3>
            {market ? <><p className="small mt8" style={{ margin: '8px 0 0' }}>{market.body}</p><p className="faint mt8">{market.title} · 운영팀이 최신 정보를 바탕으로 정리해요</p></>
              : <p className="small muted mt8" style={{ margin: '8px 0 0' }}>올해 시장 이야기를 준비하고 있어요. 시장의 큰 흐름은 공식 자료와 뉴스로 꼭 함께 확인해 주세요.</p>}
          </section>
        )}

        <section className="card mt16" aria-label="월별 흐름">
          <div className="card-title"><h3>{inv && T ? T[2] : '월별 흐름'}</h3><span className="faint">{Y.year}년</span></div>
          <FlowChart points={f.flow.map((x) => x.score)} market={inv ? marketFlow : null} good={f.good} careful={f.careful} current={curIdx} />
          <FlowLegend market={!!(inv && marketFlow)} />
          <div className="grid2 mt12" style={{ gap: 8 }}>
            <div className="card lav" style={{ padding: 12 }}><div className="faint">{inv ? '만나는 시기' : '좋은 흐름'}</div><b className="hl-lav">{inv ? inv.meet : toRanges(f.good)}</b></div>
            <div className="card rose" style={{ padding: 12 }}><div className="faint">신중한 시기</div><b className="hl-rose">{toRanges(f.careful)}</b></div>
          </div>
        </section>

        {inv && T && inv.curMonth && (
          <section className={`card mt16 ${inv.mood === 'careful' ? 'rose' : 'lav'}`} aria-label={T[3]}>
            <h3 className="h3">{T[3]}</h3>
            <p className="small mt8" style={{ margin: '8px 0 0' }}>{inv.thisMonth}</p>
          </section>
        )}

        <section className="card flat mt16" aria-label={T ? T[4] : '나에게 맞는 돈 관리'}>
          <h3 className="h3">{T ? T[4] : '나에게 맞는 조언'}</h3>
          {f.tips.map((t) => <p key={t} className="small" style={{ margin: '8px 0 0' }}>· {t}</p>)}
        </section>
        <section className="card navy mt16"><div className="eyebrow" style={{ color: 'var(--gold)' }}>달새김 한마디</div><p className="serif mt8" style={{ margin: '8px 0 0', fontSize: 17 }}>“{f.word}”</p></section>
        {kind === 'invest' && <p className="notice mt8">사주로 투자 결과를 예측하지 않아요. 시장 정보와 나의 흐름을 함께 보는 참고 콘텐츠예요.</p>}

        <Link to={`/product/${p.id}?y=${Y.year}`} className="btn primary mt16">상세 해석 보기 · {won(p.price)}</Link>
        <Link to="/money" className="btn line mt8">다른 돈의 흐름 보기</Link>
        <LuckyCard />
      </main>
    </>
  );
}

// 오늘의 재물 보너스 — 행운번호 6개(하루 1회 다시 받기). 재미 요소, 당첨 예측·보장 아님.
export function LuckyCard() {
  const { profile, isSample } = useMain();
  const { lucky, rerollLucky } = useApp();
  const today = kstToday();
  const round = lucky.date === today ? lucky.round : 0;
  const l = useLucky(profile, round);
  const card = useRef<HTMLDivElement>(null);
  const toast = useToast();
  const reroll = () => { if (round >= 1) return toast('다른 번호는 하루에 한 번만 받을 수 있어요'); rerollLucky(today); track('lucky_reroll'); };
  const share = async () => {
    const url = await shortLink('/money', 'lucky', '달새김 오늘의 재물 보너스', `오늘의 행운번호 ${l.numbers.join(' · ')}`);
    if ((await shareLink({ title: '달새김 오늘의 재물 보너스', text: `오늘의 행운번호 ${l.numbers.join(' · ')} (재미로!)`, url })) === 'copied') toast('링크를 복사했어요');
  };
  return (
    <section className="card mt24" aria-label="오늘의 재물 보너스" style={{ background: 'linear-gradient(180deg,#fffdfa,#f7efe6)' }}>
      <div ref={card} style={{ padding: 4, background: 'transparent' }}>
        <div className="row"><span style={{ color: 'var(--gold-2)' }}><I.gift /></span><h3 className="h3">오늘의 재물 보너스</h3></div>
        <p className="faint mt4">달새김이 드리는 작은 행운 선물이에요{isSample ? ' (예시)' : ''}.</p>
        <div className="balls mt16">{l.numbers.map((n, i) => <span key={`${round}-${n}`} className={`ball c${(Math.ceil(n / 10) % 5) + 1}`} style={{ animationDelay: `${i * 0.07}s` }}>{n}</span>)}</div>
        <div className="chips mt16" style={{ justifyContent: 'center' }}>{l.keywords.map((k) => <span key={k} className="chip sm gold">{k}</span>)}</div>
        <p className="serif center mt12" style={{ fontSize: 15.5 }}>“{l.word}”</p>
        <p className="notice mt8">{l.notice}</p>
      </div>
      <div className="row mt12" style={{ gap: 6 }}>
        <button className="btn line sm" style={{ flex: 1.4 }} onClick={reroll} disabled={round >= 1}>다른 번호 받기 (1일 1회)</button>
        <button className="btn line sm" style={{ flex: 1 }} onClick={() => card.current && saveImage(card.current, `lucky_${today}`)} aria-label="이미지 저장"><I.download size={18} /></button>
        <button className="btn line sm" style={{ flex: 1 }} onClick={share} aria-label="공유"><I.share size={18} /></button>
      </div>
    </section>
  );
}
