// 홈 — 대표님 리뉴얼 시안(v29) 구조: 히어로(오늘 점수) → 바로가기 6 → 지금 가장 궁금한 이야기 4
// → (지난 소망·고민 돌아보기) → 달새김만의 특별한 경험 3 → 더 깊이 알고 싶은 나 4.
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
const QUICK: [string, string, keyof typeof I, string][] = [
  ['/today', '오늘의 운세', 'moon', 'q1'], ['/product/month_detail', '월간운세', 'calendar', 'q2'], ['/love', '연애·재회', 'heart', 'q3'],
  ['/friend', 'AI 사주친구', 'chat', 'q4'], ['/letter', '달빛편지', 'mail', 'q5'], ['/charm', '나의 황금부적', 'charm', 'q6'],
];
const CURIOUS: [string, string, string, PicName, string][] = [
  ['/love', '연애·재회운', '그 사람과 나의 흐름', 'love', 'c1'], ['/money', '재물·사업운', '돈과 기회의 방향', 'money', 'c2'],
  ['/product/gunghap', '두 사람의 궁합', '우리 관계의 가능성', 'family', 'c3'], ['/product/newyear_2027', '2027 신년운세', '새해의 중요한 시기', 'moon', 'c4'],
];
const DEEPER: [string, string, PicName, string][] = [
  ['/map', '나의 사주지도', 'map', 'c4'], ['/money', '재물운 심층', 'money', 'c2'], ['/mbti', '사주 × MBTI', 'self', 'c3'], ['/path', '운명의 갈림길', 'path', 'c1'],
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
      <header className="h-top"><span className="brand"><I.moon size={20} />달새김사주</span><Link to="/me" className="icon-btn" aria-label="마이"><I.user /></Link></header>
      <main className="screen h-main">
        <section className="h-hero" aria-label="달새김사주 시작">
          <span className="h-moon" aria-hidden />
          <small className="eyebrow">DALSAEGIM · MOONLIGHT STORY</small>
          {isSample ? (
            <>
              <h1>사주로 읽는<br />당신의 인생 이야기</h1>
              <p>나를 이해하고, 더 좋은 선택을 할 수 있도록.<br />달빛 아래 나만의 이야기를 시작하세요.</p>
              <Link to="/profile/new" className="btn primary mt16">내 사주 분석하기 →</Link>
            </>
          ) : (
            <>
              <h1>{profile.name} 님의<br />오늘은 <em>{t.total}점</em></h1>
              <p>{t.headline}</p>
              <div className="h-scores">{([['연애', t.fields.love.score], ['직장', t.fields.work.score], ['재물', t.fields.wealth.score]] as const).map(([l, v]) => <span key={l}>{l} <b>{v}</b></span>)}</div>
              <Link to="/today" className="btn primary mt16">오늘의 운세 자세히 보기 →</Link>
            </>
          )}
        </section>

        <nav className="h-quick mt16" aria-label="바로가기">
          {QUICK.map(([to, l, ic, c]) => { const Ic = I[ic]; return <Link key={to} to={to} className={c}><span className="qi"><Ic size={24} /></span><span>{l}</span></Link>; })}
        </nav>
      {(due.length > 0 || count >= 3 || wish) && (
        <div className="stack mt16">
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
          
        </div>
      )}

        <section className="mt28" aria-labelledby="h-curious">
          <h2 className="h-sec" id="h-curious">지금, 가장 궁금한 이야기</h2>
          <p className="h-sub">고민에 맞는 운세부터 가볍게 살펴보세요.</p>
          <div className="h-grid mt12">
            {CURIOUS.map(([to, t1, t2, pic, c]) => <Link key={t1} to={to} className={`h-card ${c}`}><Pic n={pic} /><b>{t1}</b><small>{t2}</small></Link>)}
          </div>
        </section>

        <section className="mt28" aria-labelledby="h-special">
          <h2 className="h-sec" id="h-special">달새김만의 특별한 경험</h2>
          <p className="h-sub">한 번의 풀이에서 끝나지 않는 나만의 기록</p>
          <div className="stack mt12">
            <Link to="/letter" className="h-row letter" onClick={() => track('letter_today_open')}>
              <span className="ri"><I.mail size={22} /></span>
              <span className="grow"><b>달빛편지</b><small>{letter ? `오늘의 편지 · ${letter.title}` : '지금의 마음을 편지로 남기고 시간이 흐른 뒤 다시 읽어보세요'}</small></span><I.right size={18} />
            </Link>
            <Link to="/charm" className="h-row charm">
              <span className="ri"><I.charm size={22} /></span>
              <span className="grow"><b>나만의 황금부적</b><small>건강·가족·합격·사업·인연의 소망을 담아 완성하고 부적함에 보관해요</small></span><I.right size={18} />
            </Link>
            <Link to="/timeline" className="h-row tline">
              <span className="ri"><I.timeline size={22} /></span>
              <span className="grow"><b>내 인생의 타임라인</b><small>{count >= 1 ? `새겨진 순간 ${count}개 · 시간에 따른 변화를 돌아보세요` : '중요한 순간과 선택을 기록하고 시간에 따른 변화를 돌아보세요'}</small></span><I.right size={18} />
            </Link>
          </div>
        </section>

        <section className="mt28" aria-labelledby="h-deeper">
          <h2 className="h-sec" id="h-deeper">더 깊이 알고 싶은 나</h2>
          <div className="h-grid mt12">
            {DEEPER.map(([to, t1, pic, c]) => <Link key={t1} to={to} className={`h-card ${c}`}><Pic n={pic} /><b>{t1}</b><small>자세히 살펴보기 ↗</small></Link>)}
          </div>
        </section>
      </main>
      <Foot />
    </>
  );
}

