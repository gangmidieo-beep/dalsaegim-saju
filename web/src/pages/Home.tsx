// 홈 — "오늘, 당신의 운명은?" + 시작 카드 + 4입구(오늘의 운세 / 연애·재회 운세 / AI 사주친구 / 나의 사주지도)
// + 사랑의 갈림길(연애 고민의 길) + 카테고리 바로가기. 안내 문구는 최소로.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp, useMain } from '../store/app';
import { useToday } from '../lib/fortune';
import { apiAuth } from '../lib/api';
import { Foot, CAT_LABEL, Pic, useToast, type PicName } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';

type Mem = { id: string; title: string; category: string; happenedOn: string };
const QUICK: [string, string, PicName][] = [
  ['/path?cat=work', '직장운', 'work'], ['/money', '재물운', 'money'], ['/product/gunghap', '궁합', 'family'],
  ['/today?tab=health', '건강운', 'health'], ['/product/newyear_2027', '신년운세', 'moon'], ['/all', '전체보기', 'today'],
];

export default function Home() {
  const { profile, isSample } = useMain();
  const accountName = useApp((s) => s.account?.name);
  const t = useToday(profile);
  const [due, setDue] = useState<Mem[]>([]);
  const [count, setCount] = useState(0);
  const toast = useToast();
  useEffect(() => {
    if (isSample) return;
    apiAuth<{ list: Mem[]; due: Mem[] }>('/memories').then((r) => { setDue(r.due); setCount(r.list.length); }).catch(() => {});
  }, [isSample]);
  const feedback = async (id: string, fb: 'good' | 'same' | 'changed') => {
    await apiAuth(`/memories/${id}`, { method: 'PATCH', json: { feedback: fb } }).catch(() => {});
    track('memory_feedback', { fb });
    setDue((d) => d.filter((x) => x.id !== id));
    toast('알려 줘서 고마워요. 타임라인에 새겼어요');
  };

  return (
    <>
      <section className="night home-hero v2" aria-label="달새김사주">
        <div className="night-top"><span className="brand" style={{ fontSize: 19 }}><I.moon size={20} />달새김사주</span><Link to="/me" className="icon-btn" aria-label="마이"><I.user /></Link></div>
        <div className="home-title2">
          <h1>오늘,<br />당신의 운명은?</h1>
          <p>사랑의 흐름부터 인생의 중요한 순간까지,<br />달새김이 함께 읽어 드릴게요.</p>
        </div>
        <div className="start-card">
          {isSample ? (
            <>
              <p className="row" style={{ gap: 8, margin: 0 }}><I.edit size={18} />생년월일·태어난 시간·성별만 알려 주세요</p>
              <Link to="/profile/new" className="btn blush mt12">내 사주 입력하고 시작하기 →</Link>
            </>
          ) : (
            <>
              <div className="between"><b style={{ fontSize: 17 }}>{accountName ?? profile.name} 님의 오늘</b><span className="score-pill">{t.total}<small>점</small></span></div>
              <p className="small" style={{ margin: '6px 0 0', color: '#4a4f6e' }}>{t.headline} · 연애 <b style={{ color: '#d0577f' }}>{t.fields.love.score}</b> · 직장 {t.fields.work.score} · 재물 {t.fields.wealth.score}</p>
              <Link to="/today" className="btn blush mt12">오늘의 운세 보기 →</Link>
            </>
          )}
        </div>
        <nav className="doors3" aria-label="핵심 입구">
          <Door to="/today" cls="y" pic="today" title="오늘의 운세" sub="오늘 하루의 흐름" />
          <Door to="/love" cls="p" pic="love" title="연애·재회 운세" sub="그 사람과 나의 흐름" />
          <Door to="/friend" cls="l" pic="friend" title="AI 사주친구" sub="고민을 말로 털어놓기" />
          <Door to="/map" cls="m" pic="map" title="나의 사주지도" sub="타고난 나와 큰 흐름" />
        </nav>
        <Link to="/path?cat=love" className="love-banner" aria-label="사랑의 갈림길 — 연애 고민의 길">
          <span><small>연애 고민의 길</small><b>사랑의 갈림길</b><span>지금 그 마음, 사주로 길을 찾아 드려요</span></span>
          <I.right />
        </Link>
        <nav className="quick" aria-label="운세 바로가기">
          {QUICK.map(([to, l, ic]) => <Link key={to} to={to}><Pic n={ic} size="s" /><span>{l}</span></Link>)}
        </nav>
      </section>

      {(due.length > 0 || count >= 3) && (
        <main className="home-more">
          {due.length > 0 && (
            <section className="card lav" aria-label="지난 고민 돌아보기">
              <h2 className="h3">지난 고민은 어떻게 됐나요?</h2>
              <p className="small mt4" style={{ margin: '4px 0 0' }}>{due[0].happenedOn.replace(/-/g, '.')} · {CAT_LABEL[due[0].category]} · {due[0].title}</p>
              <div className="row mt12" style={{ gap: 6 }}>
                {([['good', '잘 풀렸어요'], ['same', '비슷해요'], ['changed', '달라졌어요']] as const).map(([k, l]) => <button key={k} className="btn line sm" style={{ flex: 1, background: 'var(--paper)' }} onClick={() => feedback(due[0].id, k)}>{l}</button>)}
              </div>
            </section>
          )}
          {count >= 3 && (
            <Link to="/timeline" className="card mt16 between" style={{ display: 'flex' }}>
              <div className="row"><Pic n="moon" size="s" /><div><b>나의 인생 타임라인</b><div className="faint">기록 {count}개가 새겨졌어요</div></div></div><I.right />
            </Link>
          )}
        </main>
      )}
      <Foot />
    </>
  );
}

function Door({ to, cls, pic, title, sub }: { to: string; cls: string; pic: PicName; title: string; sub: string }) {
  return (
    <Link to={to} className={`door3 ${cls}`}>
      <Pic n={pic} />
      <span className="grow"><b>{title}</b><small>{sub}</small></span>
      <I.right size={16} />
    </Link>
  );
}
