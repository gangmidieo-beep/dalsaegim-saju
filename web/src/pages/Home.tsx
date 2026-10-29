// 홈 — R5(10/21) 순서: 남색 머리·분류 탭 → 달새김 대표 운세 3가지(사랑·연애 / 프리미엄 재물사주 / 2027 신년운세, 자동 넘김 없이 세로로)
// → 매일의 운세(오늘·월간, 무료) → (지난 소망·고민 돌아보기) → 분야별 상품 → 서월·편지·부적·타임라인 → 고민 길잡이(떠 있는 창).
import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMain } from '../store/app';
import { useToday } from '../lib/fortune';
import { apiAuth, apiGet } from '../lib/api';
import { Foot, ProdPic, won, type PicName } from '../components/ui';
import { GuideWidget } from '../components/Guide';
import { kstMonth, next12 } from '../lib/dates';
import brand from '../../../brand.config.json';
import { I } from '../components/icons';
import { track } from '../lib/track';
import { charmOf } from '@dalsaegim/content';
import { type Saved } from './Charm';

type Mem = { id: string; title: string; category: string; happenedOn: string };
type P = { id: string; title: string; cardCopy: string; price: number; listPrice?: number | null; badge?: string | null; visible?: boolean; adult?: boolean };
const PRODUCTS = brand.products as P[];
const pOf = (id: string) => PRODUCTS.find((p) => p.id === id && p.visible !== false);
// 분야별 대표 상품(대표님 V88 구성: 사랑·인연 / 재물·사업 / 정통사주)
const SECTIONS: { id: string; title: string; sub: string; more: string; items: [string, PicName][] }[] = [
  { id: 'love', title: '사랑·인연', sub: '그 사람과 나, 인연의 흐름', more: '/love', items: [['love_flow', 'love'], ['reunion', 'moon'], ['gunghap', 'compat'], ['marriage', 'ring'], ['adult_gunghap', 'family'], ['tarot_some', 'tarot']] },
  { id: 'money', title: '재물·사업', sub: '돈과 일, 기회가 들어오는 시기', more: '/money', items: [['money_wealth', 'money'], ['money_business', 'work'], ['career', 'career'], ['money_invest', 'money'], ['money_estate', 'family'], ['money_pack', 'money']] },
  { id: 'saju', title: '정통사주', sub: '타고난 나를 깊이 읽는 풀이', more: '/map', items: [['lifetime', 'map'], ['mbti_deep', 'self'], ['path_deep', 'path']] },
];
// 달새김 대표 운세 — 홈 첫 화면에 고정(대표님 R5 S2). 신년운세는 10월~1월에만 '시즌 추천'
const SEASON = [10, 11, 12, 1].includes(kstMonth());
const REP: { id: string; eye: string; name: string; copy: string; cta: string; pic?: PicName; img?: string }[] = [
  { id: 'love_flow', eye: '달새김 대표 운세', name: '사랑·연애운', copy: '인연의 흐름과 마음이 닿는 시기', cta: '올해 나의 연애운 보기', pic: 'love' },
  { id: 'money_wealth', eye: 'PREMIUM', name: '프리미엄 재물사주', copy: '돈의 흐름을 깊게 읽는 나만의 기록', cta: '재물사주 구성 보기', pic: 'money' },
  { id: 'newyear_2027', eye: SEASON ? '시즌 추천' : '달새김 추천', name: '2027 신년운세', copy: '다가올 한 해의 재물·연애·일', cta: '신년운세 자세히 보기', img: '/img/ui/hero-newyear.webp' },
];
const TABS: [string, string][] = [['/', '홈'], ['/all', '운세'], ['/love', '사랑·인연'], ['/money', '재물·사업'], ['/map', '정통사주'], ['/friend', '달빛 상담']];

// 가격 표시(10/28 검수 19·20·부록 8) — 단품은 판매가만(판매 이력 없는 정가 취소선 금지), 묶음은 '개별 구매 합계'와 절약액
export function PriceLine({ id, price, listPrice }: { id: string; price: number; listPrice?: number | null }) {
  const pack = id === 'money_pack' && listPrice && listPrice > price;
  return (
    <span className="price-line">
      {pack && <small className="pl-sum">개별 구매 합계 <s>{won(listPrice!)}</s></small>}
      <b className="pl-price">{won(price)}</b>
      {pack && <small className="pl-save">개별 구매 대비 {won(listPrice! - price)} 절약</small>}
    </span>
  );
}

export default function Home() {
  const { profile, isSample } = useMain();
  const t = useToday(profile);
  const [due, setDue] = useState<Mem[]>([]);
  const [count, setCount] = useState(0);
  const [letter, setLetter] = useState<{ title: string; body: string } | null>(null);
  const [wish, setWish] = useState<Saved | null>(null); // 지난번 새긴 소망 — 7일이 지나면 진행 상황을 묻는다
  useEffect(() => { apiGet<{ title: string; body: string }>('/letters/today').then(setLetter).catch(() => {}); }, []);
  useEffect(() => {
    if (isSample) return;
    apiAuth<{ list: Mem[]; due: Mem[] }>('/memories').then((r) => { setDue(r.due); setCount(r.list.length); }).catch(() => {});
    const WEEK = 7 * 86400000;
    apiAuth<Saved[]>('/charms').then((l) => setWish(l.find((c) => c.status !== 'done' && Date.now() - +new Date(c.progressAt ?? c.createdAt) > WEEK) ?? null)).catch(() => {});
  }, [isSample]);
  return (
    <>
      <header className="nh-top">
        <div className="nh-bar">
          <Link to="/" className="nh-logo" aria-label="달새김사주 홈"><img src="/img/ui/logo-moon.webp" alt="" /><span><b>달<em>새김</em>사주</b><small>기록할수록, 더 선명한 나의 운명</small></span></Link>
          <Link to="/me" className="icon-btn" aria-label="마이"><I.user /></Link>
        </div>
        <nav className="nh-tabs" aria-label="분류">{TABS.map(([to, l]) => <Link key={to} to={to} className={to === '/' ? 'on' : ''}>{l}</Link>)}</nav>
      </header>
      <main className="screen nh-main">
        <section aria-labelledby="rep-t">
          <div className="nh-sec"><h2 id="rep-t">달새김 대표 운세</h2></div>
          <p className="nh-sub">지금 궁금한 이야기부터 골라 보세요</p>
          <div className="rep-list">
            {REP.map((r) => {
              const p = pOf(r.id);
              if (!p) return null;
              return (
                <Link key={r.id} to={`/product/${r.id}`} className="rep-card v2" onClick={() => track('content_view', { content: 'home_rep', product: r.id })}>
                  <span className="rep-top">
                    <ProdPic id={r.id} fallback={r.pic ?? 'moon'} size="l" />
                    <span className="rep-body">
                      <b>{r.name}</b>
                      <span className="rep-copy">{r.copy}</span>
                      <PriceLine id={r.id} price={p.price} listPrice={p.listPrice} />
                    </span>
                  </span>
                  <span className="rep-cta">자세히 보기 ›</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt28" aria-labelledby="daily-t">
          <div className="nh-sec"><h2 id="daily-t">매일의 운세</h2></div>
          <p className="nh-sub">오늘 하루와 이번 달의 흐름을 먼저 살펴보세요</p>
          <Link to={isSample ? '/profile/new' : '/today'} className="nh-today">
            {isSample ? <span className="sc"><I.sunmoon size={28} /></span> : <span className="sc score" style={{ ['--p' as string]: t.total }} aria-label={`오늘 ${t.total}점`}><small>오늘</small><b>{t.total}<i>점</i></b></span>}
            <span className="grow">
              <small className="k">DAILY FORTUNE</small>
              <h2>{isSample ? '오늘의 운세' : `${profile.name} 님의 오늘`}<em>무료</em></h2>
              <p>{isSample ? '생년월일만 넣으면 오늘 하루의 흐름을 바로 알려 드려요.' : t.headline}</p>
            </span>
            <I.right />
          </Link>
          <div className="nh-month" role="group" aria-labelledby="nh-month-t">
            <div className="mh">
              <span className="art" aria-hidden />
              <div><small>MONTHLY FORTUNE</small><h2 id="nh-month-t">월간운세 <em className="paid-tag">월별 {won(pOf('month_detail')?.price ?? 4900)}</em></h2><p>원하는 달을 골라 상세운세를 볼 수 있어요 · 월별 단건 구매, 정기결제 없음</p></div>
            </div>
            <div className="mgrid">
              {next12().map((g) => <Fragment key={g.yy}><span className="myr">{g.yy}년</span>{g.months.map((m) => <Link key={m.ym} to={`/product/month_detail?ym=${m.ym}`} className={m.now ? 'now' : ''} aria-label={`${m.yy}년 ${m.mm}월 운세${m.now ? ' (이번 달)' : ''}`}><b>{m.mm}월</b>{m.now && <i>이번 달</i>}</Link>)}</Fragment>)}
            </div>
          </div>
        </section>

      {(due.length > 0 || wish) && (
        // 소망·고민 질문을 홈에서 연달아 묻지 않고, 차분한 안내 카드 하나로(10/28 검수 25) — 답은 기록 화면에서
        <section className="card recall mt16" aria-label="내 기록 돌아보기">
          <h2 className="h3">내 기록 돌아보기</h2>
          <p className="small muted mt4" style={{ margin: '4px 0 0' }}>{due.length > 0 && wish ? '남겨 둔 소망과 고민을 천천히 돌아보세요.' : due.length > 0 ? `${due[0].happenedOn.replace(/-/g, '.')}에 남긴 고민, 지금은 어떤가요?` : `${charmOf(wish!.type).name}에 새긴 소망, 지금은 어떤가요?`}</p>
          <Link to={due.length > 0 ? '/records' : '/box?tab=charm'} className="btn soft mt12">내 기록 확인하기 ›</Link>
        </section>
      )}

        {SECTIONS.map((sec) => {
          const rows = sec.items.map(([id, pic]) => [pOf(id), pic] as const).filter(([p]) => !!p) as [P, PicName][];
          if (!rows.length) return null;
          return (
            <section key={sec.id} className="mt28" aria-labelledby={`nh-${sec.id}`}>
              <div className="nh-sec"><h2 id={`nh-${sec.id}`}>{sec.title}</h2><Link to={sec.more}>무료로 먼저 보기 ›</Link></div>
              <p className="nh-sub">{sec.sub}</p>
              <div className="plist">
                {rows.map(([p, pic]) => (
                  <Link key={p.id} to={`/product/${p.id}`} className="prow">
                    <ProdPic id={p.id} fallback={pic} />
                    <span className="grow">{p.adult ? <em className="pbadge adult">19세 이상</em> : p.badge ? <em className="pbadge">{p.badge}</em> : null}<b>{p.title}</b><small>{p.cardCopy}</small></span>
                    <span className="pp">{p.id === 'money_pack' && p.listPrice ? <s>{won(p.listPrice)}</s> : null}{won(p.price)}</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="mt28" aria-labelledby="h-special">
          <div className="nh-sec"><h2 id="h-special">달새김만의 특별한 경험</h2></div>
          <p className="nh-sub">한 번의 풀이로 끝나지 않는, 나만의 기록</p>
          <div className="nh-sig">
            <Link to="/friend"><span className="si"><I.chat /></span><b>달빛 상담사 서월</b><small>내 사주를 아는 상담사 · 하루 3번 무료</small></Link>
            <Link to="/letter" onClick={() => track('letter_today_open')}><span className="si"><I.mail /></span><b>달빛편지</b><small>{letter ? `오늘의 편지 · ${letter.title}` : '지금의 마음을 편지로 남기기'}</small></Link>
            <Link to="/charm"><span className="si"><I.charm /></span><b>나만의 황금부적</b><small>소망을 담아 완성하고 보관해요</small></Link>
            <Link to="/gift"><span className="si"><I.share /></span><b>마음 보내기</b><small>부적·편지를 소중한 사람에게 이미지로</small></Link>
            <Link to="/timeline"><span className="si"><I.timeline /></span><b>내 인생의 타임라인</b><small>{count >= 1 ? `새겨진 순간 ${count}개` : '중요한 순간과 선택을 기록'}</small></Link>
          </div>
        </section>
      </main>
      <GuideWidget />
      <Foot />
    </>
  );
}

