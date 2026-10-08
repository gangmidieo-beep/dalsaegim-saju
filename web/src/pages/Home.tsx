// 홈 — 4개 핵심 입구(오늘의 운세 / 내 고민의 길 / AI 사주친구 / 나의 사주지도) + 지금 주목해볼 길 + 돈의 흐름. 한 화면 한 행동.
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { recommendPaths } from '@dalsaegim/content';
import { useApp, useMain } from '../store/app';
import { useSaju, useToday } from '../lib/fortune';
import { apiAuth, apiGet } from '../lib/api';
import { Foot, Moon, CAT_LABEL, Pic, useToast, type PicName } from '../components/ui';
import { I, Icon, type IconName } from '../components/icons';
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
      <section className="night home-hero" aria-label="달새김사주">
        <div className="night-top"><span className="brand" style={{ fontSize: 16 }}><I.moon size={18} />운(運)새김</span><Link to="/me" className="icon-btn" aria-label="마이"><I.user /></Link></div>
        <div className="home-title">
          <h1>달새김사주</h1>
          <p>오늘의 고민이,<br />내 인생의 흐름이 됩니다.</p>
        </div>
        <Link to={isSample ? '/profile/new' : '/friend'} className="say">
          {isSample
            ? <>오늘, 무슨 일이 있으신가요?<br />당신의 이야기를 들려주세요.<div className="mt8" style={{ fontWeight: 700, color: 'var(--rose-2)' }}>내 사주 입력하고 시작하기 →</div></>
            : <><b>{accountName ?? profile.name} 님,</b> 오늘 무슨 일이 있으신가요?<br /><span className="small muted">오늘의 키워드 ‘{t.keyword}’ · 지수 <b style={{ color: '#d0577f' }}>{t.total}</b>점</span></>}
        </Link>
        <nav className="doors2" aria-label="핵심 입구">
          <Door to="/today" cls="y" pic="today" title="오늘의 운세" sub="오늘의 흐름과 키워드" />
          <Door to="/path" cls="p" pic="path" title="내 고민의 길" sub="고민을 따라가면 답이 보여요" />
          <Door to="/friend" cls="l" pic="friend" title="AI 사주친구" sub="내 사주를 아는 친구" />
          <Door to="/map" cls="m" pic="map" title="나의 사주지도" sub="타고난 나와 큰 흐름" />
        </nav>
      </section>

      <main className="home-more">
        {due.length > 0 && (
          <section className="card lav" aria-label="지난 고민 돌아보기">
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
                  <Pic n={p.icon as PicName} size="s" />
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

function Door({ to, cls, pic, title, sub }: { to: string; cls: string; pic: PicName; title: string; sub: string }) {
  return (
    <Link to={to} className={`door2 ${cls}`}>
      <Pic n={pic} />
      <b>{title}</b><span>{sub}</span>
    </Link>
  );
}
