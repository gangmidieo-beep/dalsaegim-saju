// 홈 — 4개 핵심 입구(오늘의 운세 / 내 고민의 길 / AI 사주친구 / 나의 사주지도) + 지금 주목해볼 길 + 돈의 흐름. 한 화면 한 행동.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { recommendPaths } from '@dalsaegim/content';
import { useApp, useMain } from '../store/app';
import { useSaju, useToday } from '../lib/fortune';
import { apiAuth, apiGet } from '../lib/api';
import { Foot, Moon, CAT_LABEL, useToast } from '../components/ui';
import { I, Icon, type IconName } from '../components/icons';
import { koDate, dow } from '../lib/dates';
import { track } from '../lib/track';

type Mem = { id: string; title: string; category: string; happenedOn: string };
type Banner = { id: string; title: string; copy: string | null; link: string | null };

export default function Home() {
  const { profile, isSample } = useMain();
  const accountName = useApp((s) => s.account?.name);
  const t = useToday(profile);
  const saju = useSaju(profile);
  const [due, setDue] = useState<Mem[]>([]);
  const [count, setCount] = useState(0);
  const [cats, setCats] = useState<string[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const toast = useToast();
  const nav = useNavigate();
  useEffect(() => {
    apiGet<Banner[]>('/banners?slot=home').then(setBanners).catch(() => {});
    if (isSample) return;
    apiAuth<{ list: Mem[]; due: Mem[] }>('/memories').then((r) => { setDue(r.due); setCount(r.list.length); setCats(r.list.slice(0, 10).map((m) => (m.category === 'growth' ? 'self' : m.category))); }).catch(() => {});
  }, [isSample]);
  const picks = useMemo(() => (isSample ? [] : recommendPaths(saju, profile.id, cats)), [saju, profile.id, cats, isSample]);
  const feedback = async (id: string, fb: 'good' | 'same' | 'changed') => {
    await apiAuth(`/memories/${id}`, { method: 'PATCH', json: { feedback: fb } }).catch(() => {});
    track('memory_feedback', { fb });
    setDue((d) => d.filter((x) => x.id !== id));
    toast('알려 줘서 고마워요. 타임라인에 새겼어요');
  };

  return (
    <>
      <section className="hero" aria-label="오늘">
        <div className="stars" />
        <div className="moon-wrap"><div className="moon-glow" /><div style={{ position: 'absolute', right: 30, top: 20 }}><Moon size={120} glow={false} /></div></div>
        <div className="between" style={{ position: 'relative' }}>
          <div className="brand"><I.moon size={20} />달새김사주</div>
          <Link to="/me" className="icon-btn" aria-label="마이"><I.user /></Link>
        </div>
        <div style={{ position: 'relative', marginTop: 28, maxWidth: 300 }}>
          <div className="faint" style={{ color: '#c9c5dd' }}>{koDate()} {dow()}요일</div>
          {isSample ? (
            <>
              <h1 className="h1 mt8">오늘의 운을 읽고,<br />나의 시간을 새기다.</h1>
              <p className="muted mt8 small">생년월일만 알려 주면 오늘의 흐름부터 고민의 길까지 함께 봐 드려요.</p>
            </>
          ) : (
            <>
              <h1 className="h1 mt8" style={{ fontSize: 23 }}>{accountName ?? profile.name} 님,<br />{t.headline}</h1>
              <p className="muted mt8 small">오늘의 키워드 <b style={{ color: '#F2DCCB' }}>‘{t.keyword}’</b></p>
            </>
          )}
        </div>
        <div style={{ position: 'relative', marginTop: 20 }}>
          {isSample
            ? <button className="btn moon" onClick={() => nav('/profile/new')}>내 사주 입력하고 시작하기</button>
            : <Link to="/today" className="btn ghost-light" style={{ justifyContent: 'space-between' }}><span>오늘의 지수 <b style={{ fontSize: 20, color: '#F2DCCB' }}>{t.total}</b>점</span><span className="row small">자세히 <I.right /></span></Link>}
        </div>
      </section>

      <main className="screen pull-up">
        <div className="doors">
          <Door to="/today" cls="d1" icon="sunmoon" title="오늘의 운세" sub="오늘의 흐름과 키워드" />
          <Door to="/path" cls="d2" icon="path" title="내 고민의 길" sub="고민을 따라가면 답이 보여요" />
          <Door to="/friend" cls="d3" icon="chat" title="AI 사주친구" sub="내 사주를 아는 친구와 대화" />
          <Door to="/map" cls="d4" icon="map" title="나의 사주지도" sub="타고난 나와 큰 흐름" />
        </div>

        {due.length > 0 && (
          <section className="card lav mt16" aria-label="지난 고민 돌아보기">
            <div className="eyebrow" style={{ color: 'var(--lav-2)' }}>달새김이 물어봐요</div>
            <h2 className="h3 mt4">지난 고민은 어떻게 됐나요?</h2>
            <p className="small mt4">{due[0].happenedOn.replace(/-/g, '.')} · {CAT_LABEL[due[0].category]} · {due[0].title}</p>
            <div className="row mt12" style={{ gap: 6 }}>
              {([['good', '잘 풀렸어요'], ['same', '비슷해요'], ['changed', '달라졌어요']] as const).map(([k, l]) => <button key={k} className="btn line sm" style={{ flex: 1, background: 'var(--paper)' }} onClick={() => feedback(due[0].id, k)}>{l}</button>)}
            </div>
          </section>
        )}

        {picks.length > 0 && (
          <section className="mt24" aria-label="지금 주목해볼 길">
            <div className="between"><h2 className="h3">지금 주목해볼 길</h2><Link to="/path" className="link">모든 고민</Link></div>
            <div className="grid2 mt12">
              {picks.map((p) => (
                <Link key={p.id} to={`/path?cat=${p.id}`} className="card flat row" style={{ padding: 14 }}>
                  <span className="door d2" style={{ minHeight: 0, padding: 0, boxShadow: 'none', background: 'none' }}><span className="ic" style={{ width: 36, height: 36 }}><Icon name={p.icon as IconName} size={20} /></span></span>
                  <b style={{ fontSize: 15 }}>{p.label}</b>
                </Link>
              ))}
            </div>
          </section>
        )}

        <Link to="/money" className="card navy mt24" style={{ display: 'block', position: 'relative', overflow: 'hidden' }} aria-label="돈의 흐름 시리즈">
          <div className="eyebrow" style={{ color: 'var(--gold)' }}>달새김 재물 시리즈</div>
          <h2 className="h2 mt4" style={{ color: 'var(--ivory)' }}>돈의 흐름을 한눈에</h2>
          <p className="small mt4" style={{ color: '#c9c5dd' }}>재물 · 사업 · 투자 · 부동산을 간단명쾌하게</p>
          <div className="row mt12" style={{ gap: 6 }}>{['재물', '사업', '투자', '부동산'].map((x) => <span key={x} className="chip sm" style={{ background: 'rgba(255,255,255,.08)', color: '#F2DCCB', borderColor: 'rgba(255,255,255,.15)' }}>{x}</span>)}</div>
          <span style={{ position: 'absolute', right: -6, top: -6, opacity: 0.9 }}><Moon size={96} /></span>
        </Link>

        {banners[0] && (
          <Link to={banners[0].link ?? '/'} className="card gold mt16 between" style={{ display: 'flex' }}>
            <div><b>{banners[0].title}</b><div className="small muted">{banners[0].copy}</div></div><I.right />
          </Link>
        )}

        {count >= 3 && (
          <Link to="/timeline" className="card mt16 between" style={{ display: 'flex' }}>
            <div className="row"><span className="ic" style={{ color: 'var(--lav-2)' }}><I.timeline /></span><div><b>나의 인생 타임라인</b><div className="faint">기록 {count}개가 새겨졌어요</div></div></div><I.right />
          </Link>
        )}

        <section className="mt24" aria-label="더 많은 운세">
          <h2 className="h3">더 깊이 보기</h2>
          <div className="list mt12">
            {[
              ['/product/newyear_2027', '2027 신년운세', '내년 열두 달의 흐름', 'sparkle'],
              ['/mbti', '사주 × MBTI', '타고난 기운과 지금의 성향', 'people'],
              ['/product/gunghap', '두 사람의 궁합', '연인·배우자와 함께하는 리듬', 'heart'],
            ].map(([to, t1, s1, ic]) => (
              <Link key={to} to={to} className="li"><span style={{ color: 'var(--lav-2)' }}><Icon name={ic as IconName} /></span><div className="grow"><div className="t">{t1}</div><div className="s">{s1}</div></div><I.right className="chev" /></Link>
            ))}
          </div>
        </section>
      </main>
      <Foot />
    </>
  );
}

function Door({ to, cls, icon, title, sub }: { to: string; cls: string; icon: IconName; title: string; sub: string }) {
  return (
    <Link to={to} className={`door ${cls}`}>
      <span className="ic"><Icon name={icon} /></span>
      <div><b>{title}</b><span>{sub}</span></div>
    </Link>
  );
}
