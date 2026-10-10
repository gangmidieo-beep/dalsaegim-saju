// 홈 — "오늘, 당신의 운명은?" + 시작 카드 + 4입구(오늘의 운세 / 연애·재회 운세 / AI 사주친구 / 나의 사주지도)
// + 사랑의 갈림길(연애 고민의 길) + 카테고리 바로가기. 안내 문구는 최소로.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMain } from '../store/app';
import { useToday } from '../lib/fortune';
import { apiAuth, apiGet } from '../lib/api';
import { Foot, CAT_LABEL, Pic, useToast, type PicName } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';
import { charmOf } from '@dalsaegim/content';
import type { Saved } from './Charm';

type Mem = { id: string; title: string; category: string; happenedOn: string };
const QUICK: [string, string, PicName][] = [
  ['/path?cat=work', '직장운', 'work'], ['/money', '재물운', 'money'], ['/product/gunghap', '궁합', 'family'],
  ['/today?tab=health', '건강운', 'health'], ['/product/newyear_2027', '신년운세', 'moon'], ['/all', '전체보기', 'today'],
];

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
              <div className="between"><b style={{ fontSize: 17 }}>{profile.name} 님의 오늘</b><span className="score-pill">{t.total}<small>점</small></span></div>
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
        <Link to="/letter" className="home-letter mt16" aria-label="오늘의 달빛 편지 읽기" onClick={() => track('letter_today_open')}>
          <small>오늘의 달빛 편지</small>
          <b>{letter?.title ?? '오늘 밤, 당신에게 온 편지'}</b>
          <p>{letter?.body ?? '달빛이 조용히 전하는 한 통의 편지를 열어 보세요.'}</p>
          <span className="go">편지 열어보기 →</span>
        </Link>
        <Link to="/path?cat=love" className="love-banner" aria-label="사랑의 갈림길 — 연애 고민의 길">
          <span><small>연애 고민의 길</small><b>사랑의 갈림길</b><span>지금 그 마음, 사주로 길을 찾아 드려요</span></span>
          <I.right />
        </Link>
        <nav className="quick" aria-label="운세 바로가기">
          {QUICK.map(([to, l, ic]) => <Link key={to} to={to}><Pic n={ic} size="s" /><span>{l}</span></Link>)}
        </nav>
        <Link to="/charm" className="home-charm mt12" aria-label="나만의 황금 달빛 부적 만들기">
          <span className="ct-thumb" style={{ backgroundImage: 'url(/img/ui/charm-wealth.jpg)' }} />
          <span className="grow"><b>나만의 황금 달빛 부적</b><span>이름과 소망을 새긴 배경화면 만들기</span></span>
          <I.right />
        </Link>
      </section>

      {(due.length > 0 || count >= 3 || wish) && (
        <main className="home-more">
          {wish && (
            <section className="card wish-ask" aria-label="지난번 새긴 소망">
              <span className="ct-thumb" style={{ backgroundImage: `url(/img/ui/charm-${wish.type}.jpg)` }} />
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
