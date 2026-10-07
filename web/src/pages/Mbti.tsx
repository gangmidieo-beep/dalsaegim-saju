// 사주 × MBTI — MBTI 고르기(모르면 12문항 간단 테스트) → 타고난 기운 × 지금의 성향
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MBTI_QUIZ, MBTI_TYPES, mbtiFromQuiz, mbtiInfo, sajuMbti } from '@dalsaegim/content';
import { useApp, useMain } from '../store/app';
import { useSaju } from '../lib/fortune';
import { syncProfile } from '../lib/api';
import { Ring, Top, won } from '../components/ui';
import brand from '../../../brand.config.json';

export default function Mbti() {
  const { profile, isSample } = useMain();
  const saveProfile = useApp((s) => s.saveProfile);
  const [type, setType] = useState<string | null>(profile.mbti ?? null);
  const [quiz, setQuiz] = useState<('a' | 'b')[] | null>(null);
  const saju = useSaju(profile);
  const r = useMemo(() => (type ? sajuMbti(saju, type, profile.id) : null), [saju, type, profile.id]);
  const deep = brand.products.find((p) => p.id === 'mbti_deep')!;
  const pick = (t: string) => {
    setType(t); setQuiz(null);
    if (!isSample) { const p = { ...profile, mbti: t }; saveProfile(p); void syncProfile(p); }
  };

  if (quiz) {
    const i = quiz.length;
    const q = MBTI_QUIZ[i];
    return (
      <>
        <Top title="간단 성향 테스트" />
        <main className="screen">
          <div className="steps">{MBTI_QUIZ.map((_, k) => <i key={k} className={k <= i ? 'on' : ''} />)}</div>
          <h2 className="h2 fade-in" key={i}>{q.q}</h2>
          <div className="stack mt20">{(['a', 'b'] as const).map((k) => <button key={k} className="opt" onClick={() => (i + 1 >= MBTI_QUIZ.length ? pick(mbtiFromQuiz([...quiz, k])) : setQuiz([...quiz, k]))}><b>{q[k]}</b></button>)}</div>
          <p className="faint mt16 center">{i + 1} / {MBTI_QUIZ.length}</p>
        </main>
      </>
    );
  }
  return (
    <>
      <Top title="사주 × MBTI" />
      <main className="screen">
        {!r ? (
          <section className="fade-in">
            <h2 className="h2">나의 MBTI를 골라 주세요</h2>
            <p className="muted small mt4">타고난 사주의 기운과 지금의 성향이 어떻게 만나는지 보여 드려요.</p>
            <div className="grid2 mt16" style={{ gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {MBTI_TYPES.map((t) => <button key={t} className="chip" style={{ justifyContent: 'center', padding: '12px 0' }} onClick={() => pick(t)}>{t}</button>)}
            </div>
            <button className="btn line mt16" onClick={() => setQuiz([])}>잘 모르겠어요 · 12문항으로 알아보기</button>
          </section>
        ) : (
          <section className="fade-in">
            <div className="card navy center">
              <div className="eyebrow" style={{ color: 'var(--gold)' }}>{profile.name} 님 · {r.mbti} · 일간 {r.dayMaster.char}{isSample && <span className="sample-tag">예시</span>}</div>
              <h2 className="h2 mt8" style={{ color: 'var(--ivory)' }}>{r.title}</h2>
              <div className="mt12" style={{ display: 'grid', placeItems: 'center' }}><div style={{ background: 'var(--paper)', borderRadius: '50%', padding: 6 }}><Ring value={r.match} size={110} label="결이 닮은 정도" /></div></div>
              <p className="small mt12" style={{ color: '#d9d6ea' }}>{r.line}</p>
              <p className="faint mt4">사주로 본 성향 {r.sajuType} · 지금의 성향 {r.mbti}</p>
            </div>
            <div className="chips mt16">{mbtiInfo(r.mbti).traits.map((t) => <span key={t} className="chip lav sm">{t}</span>)}</div>
            {([['연애에서의 나', r.love], ['일에서의 나', r.work], ['돈을 대하는 나', r.money]] as const).map(([h, t]) => (
              <section key={h} className="card flat mt12"><h3 className="h3">{h}</h3><p className="small mt4" style={{ margin: '4px 0 0' }}>{t}</p></section>
            ))}
            <Link to="/product/mbti_deep" className="btn primary mt16">사주 × MBTI 심층 · {won(deep.price)}</Link>
            <button className="btn line mt8" onClick={() => setType(null)}>다른 MBTI로 보기</button>
            {isSample && <Link to="/profile/new?next=/mbti" className="link center mt12" style={{ display: 'block' }}>내 사주로 보기</Link>}
          </section>
        )}
      </main>
    </>
  );
}
