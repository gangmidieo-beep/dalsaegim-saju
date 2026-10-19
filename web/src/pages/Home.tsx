// 홈 — 10/19 고급 야경 톤(대표님 V88): 남색 머리·분류 탭 → 2027 신년운세 큰 배너 → 월간운세 1~12월 → 오늘의 운세(무료)
// → (지난 소망·고민 돌아보기) → 사랑·인연 / 재물·사업 / 정통사주 상품 → 달새김만의 경험 → 고민 길잡이(떠 있는 창).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMain } from '../store/app';
import { useToday } from '../lib/fortune';
import { apiAuth, apiGet } from '../lib/api';
import { Foot, CAT_LABEL, Pic, useToast, won, type PicName } from '../components/ui';
import { GuideWidget } from '../components/Guide';
import { kstMonth, kstYear } from '../lib/dates';
import brand from '../../../brand.config.json';
import { I } from '../components/icons';
import { track } from '../lib/track';
import { charmOf } from '@dalsaegim/content';
import { imgOf, type Saved } from './Charm';

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
const TABS: [string, string][] = [['/', '홈'], ['/all', '운세'], ['/love', '사랑·인연'], ['/money', '재물·사업'], ['/map', '정통사주'], ['/friend', 'AI 상담']];
// 월간운세 — 1~12월 버튼, 지난 달은 내년 같은 달(=앞으로 12달)
const MONTHS = (() => { const y = kstYear(), m = kstMonth(); return Array.from({ length: 12 }, (_, i) => { const mm = i + 1; const yy = mm < m ? y + 1 : y; return { mm, yy, now: mm === m, ym: `${yy}-${String(mm).padStart(2, '0')}` }; }); })();

export default function Home() {
  const { profile, isSample } = useMain();
  const t = useToday(profile);
  const [due, setDue] = useState<Mem[]>([]);
  const [count, setCount] = useState(0);
  const [letter, setLetter] = useState<{ title: string; body: string } | null>(null);
  const [wish, setWish] = useState<Saved | null>(null); // 지난번 새긴 소망 — 7일이 지나면 진행 상황을 묻는다
  const toast = useToast();
  useEffect(() => { apiGet<{ title: string; body: string }>('/letters/today').then(setLetter).catch(() => {}); }, []);
  useEffect(() => {
    if (isSample) return;
    apiAuth<{ list: Mem[]; due: Mem[] }>('/memories').then((r) => { setDue(r.due); setCount(r.list.length); }).catch(() => {});
    const WEEK = 7 * 86400000;
    apiAuth<Saved[]>('/charms').then((l) => setWish(l.find((c) => c.status !== 'done' && Date.now() - +new Date(c.progressAt ?? c.createdAt) > WEEK) ?? null)).catch(() => {});
  }, [isSample]);
  const wishStep = async (st: 'doing' | 'done' | 'later') => {
    if (!wish) return;
    await apiAuth(`/charms/${wish.id}`, { method: 'PATCH', json: st === 'later' ? { snooze: true } : { status: st } }).catch(() => {});
    setWish(null);
    toast(st === 'done' ? '축하해요! 이룬 소망을 타임라인에 새겼어요' : st === 'doing' ? '응원할게요. 우체통에서 진행 상황을 더 적을 수 있어요' : '다음에 다시 여쭤볼게요');
  };
  const feedback = async (id: string, fb: 'good' | 'same' | 'changed') => {
    await apiAuth(`/memories/${id}`, { method: 'PATCH', json: { feedback: fb } }).catch(() => {});
    track('memory_feedback', { fb });
    setDue((d) => d.filter((x) => x.id !== id));
    toast('알려 줘서 고마워요. 타임라인에 새겼어요');
  };

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
        <Link to="/product/newyear_2027" className="nh-hero" aria-label="2027 신년운세 자세히 보기">
          <span className="kick">10월~1월 시즌 대표 상품 ✦</span>
          <h1><span>2027</span>신년운세</h1>
          <p>다가올 한 해의 재물·연애·일, 운세의 흐름을 살펴보세요.</p>
          <span className="gbtn">신년운세 자세히 보기 <I.send size={16} /></span>
        </Link>

        <section className="nh-month" aria-labelledby="nh-month-t">
          <div className="mh">
            <span className="art" aria-hidden />
            <div><small>MONTHLY FORTUNE</small><h2 id="nh-month-t">월간운세</h2><p>원하는 달을 선택해 운세를 살펴보세요.</p></div>
          </div>
          <div className="mgrid">
            {MONTHS.map((m) => <Link key={m.ym} to={`/product/month_detail?ym=${m.ym}`} className={m.now ? 'now' : ''} aria-label={`${m.yy}년 ${m.mm}월 운세`}>{m.now && <i>이번 달</i>}{m.mm}월</Link>)}
          </div>
        </section>

        <Link to={isSample ? '/profile/new' : '/today'} className="nh-today">
          {isSample ? <span className="sc"><I.sunmoon size={28} /></span> : <span className="sc"><b>{t.total}</b><small>점</small></span>}
          <span className="grow">
            <small className="k">DAILY FORTUNE</small>
            <h2>{isSample ? '오늘의 운세' : `${profile.name} 님의 오늘`}<em>무료</em></h2>
            <p>{isSample ? '생년월일만 넣으면 오늘 하루의 흐름을 바로 알려 드려요.' : t.headline}</p>
          </span>
          <I.right />
        </Link>

      {(due.length > 0 || count >= 3 || wish) && (
        <div className="stack mt16">
          {wish && (
            <section className="card wish-ask" aria-label="지난번 새긴 소망">
              <span className="ct-thumb" style={{ backgroundImage: `url(${imgOf(wish.type)})` }} />
              <div className="grow">
                <small>{charmOf(wish.type).name}</small>
                <h2 className="h3">지난번 새긴 소망은 어떻게 진행되고 있나요?</h2>
                <p className="small" style={{ margin: '4px 0 0' }}>“{wish.goal ?? wish.wish}”</p>
                <div className="row mt12" style={{ gap: 6 }}>
                  {([['doing', '진행 중이에요'], ['done', '이루었어요'], ['later', '다음에']] as const).map(([k, l]) => <button key={k} className="btn line sm" style={{ flex: 1, background: 'var(--paper)' }} onClick={() => wishStep(k)}>{l}</button>)}
                </div>
              </div>
            </section>
          )}
          {due.length > 0 && (
            <section className="card lav" aria-label="지난 고민 돌아보기">
              <h2 className="h3">지난 고민은 어떻게 됐나요?</h2>
              <p className="small mt4" style={{ margin: '4px 0 0' }}>{due[0].happenedOn.replace(/-/g, '.')} · {CAT_LABEL[due[0].category]} · {due[0].title}</p>
              <div className="row mt12" style={{ gap: 6 }}>
                {([['good', '잘 풀렸어요'], ['same', '비슷해요'], ['changed', '달라졌어요']] as const).map(([k, l]) => <button key={k} className="btn line sm" style={{ flex: 1, background: 'var(--paper)' }} onClick={() => feedback(due[0].id, k)}>{l}</button>)}
              </div>
            </section>
          )}
        </div>
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
                    <Pic n={pic} size="s" />
                    <span className="grow"><b>{p.title}{p.badge && <span className="badge">{p.badge}</span>}{p.adult && <span className="badge" style={{ background: '#3a2433', color: '#f3d3dc' }}>19</span>}</b><small>{p.cardCopy}</small></span>
                    <span className="pp">{p.listPrice ? <s>{won(p.listPrice)}</s> : null}{won(p.price)}</span>
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
            <Link to="/friend"><span className="si"><I.chat /></span><b>AI 사주친구</b><small>내 사주를 아는 상담 친구 · 하루 3번 무료</small></Link>
            <Link to="/letter" onClick={() => track('letter_today_open')}><span className="si"><I.mail /></span><b>달빛편지</b><small>{letter ? `오늘의 편지 · ${letter.title}` : '지금의 마음을 편지로 남기기'}</small></Link>
            <Link to="/charm"><span className="si"><I.charm /></span><b>나만의 황금부적</b><small>소망을 담아 완성하고 보관해요</small></Link>
            <Link to="/timeline"><span className="si"><I.timeline /></span><b>내 인생의 타임라인</b><small>{count >= 1 ? `새겨진 순간 ${count}개` : '중요한 순간과 선택을 기록'}</small></Link>
          </div>
        </section>
      </main>
      <GuideWidget />
      <Foot />
    </>
  );
}

