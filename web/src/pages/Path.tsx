// 내 고민의 길 (시안 5·5-1·6-2) — 고민 고르기 → 한 화면 세 질문(어떤 고민 / 무엇이 궁금 / 언제쯤) → 사주 분석 결과(가장 좋은 시기·추천 행동)
// → 오늘의 새김(기록) → AI 사주친구로 이어서 상담.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS, PATH_WHEN, pathResult, recommendPaths, type Horizon } from '@dalsaegim/content';
import { useMain } from '../store/app';
import { useSaju } from '../lib/fortune';
import { apiAuth, syncProfile } from '../lib/api';
import { FlowChart, MemoryCard, Pic, Top, won, useToast, type PicName } from '../components/ui';
import { I } from '../components/icons';
import { track } from '../lib/track';
import brand from '../../../brand.config.json';

const price = (id: string) => brand.products.find((p) => p.id === id);
const HZ: Horizon[] = [3, 6, 12];

export default function PathPage() {
  const [sp, setSp] = useSearchParams();
  const { profile, isSample } = useMain();
  const saju = useSaju(profile);
  const cat = sp.get('cat');
  const done = sp.get('go') === '1';
  const C = PATHS.find((c) => c.id === cat);
  const picks = useMemo(() => (isSample ? ['love', 'work'] : recommendPaths(saju, profile.id).map((p) => p.id)), [saju, profile.id, isSample]);
  const [pick, setPick] = useState<string>(picks[0]);
  useEffect(() => { if (cat) track('path_start', { cat }); }, [cat]);

  if (!C) {
    const big = PATHS.filter((c) => picks.includes(c.id));
    const rest = PATHS.filter((c) => !picks.includes(c.id));
    return (
      <>
        <Top title="내 고민의 길" />
        <main className="screen">
          <h2 className="h2">지금, 어떤 고민으로<br />오셨나요?</h2>
          <p className="muted small mt8">당신의 사주 흐름을 바탕으로<br />가장 도움이 되는 길을 추천드려요.</p>
          <div className="stack mt20">
            {big.map((c) => (
              <button key={c.id} className={`path-big${pick === c.id ? ' on' : ''}`} onClick={() => setPick(c.id)} aria-pressed={pick === c.id}>
                <Pic n={c.icon as PicName} />
                <span><b>{c.label}</b><small>(지금 주목할 길)</small></span>
              </button>
            ))}
          </div>
          <div className="path-tiles mt12">
            {rest.map((c) => (
              <button key={c.id} className={`path-tile${pick === c.id ? ' on' : ''}`} onClick={() => setPick(c.id)} aria-pressed={pick === c.id}>
                <Pic n={c.icon as PicName} size="s" />{c.label}
              </button>
            ))}
          </div>
          <button className="btn blush mt24" onClick={() => setSp({ cat: pick })}>고민의 길 시작하기 →</button>
        </main>
      </>
    );
  }

  return done && !isSample
    ? <Result catId={C.id} subId={sp.get('sub')!} q={sp.get('q')!} h={(+(sp.get('h') ?? 6) as Horizon)} />
    : <Ask key={C.id} catId={C.id} initSub={sp.get('sub')} isSample={isSample} onGo={(p) => setSp({ cat: C.id, ...p, go: '1' })} />;
}

// 5-1 — 세 질문을 한 화면에
function Ask({ catId, initSub, isSample, onGo }: { catId: string; initSub: string | null; isSample: boolean; onGo: (p: { sub: string; q: string; h: string }) => void }) {
  const C = PATHS.find((c) => c.id === catId)!;
  const [sub, setSub] = useState(C.sub.some((s) => s.id === initSub) ? initSub! : C.sub[0].id);
  const S = C.sub.find((s) => s.id === sub)!;
  const [q, setQ] = useState(S.q[0]);
  const [h, setH] = useState<Horizon>(6);
  useEffect(() => setQ(S.q[0]), [sub]);
  return (
    <>
      <Top title="내 고민의 길" />
      <main className="screen">
        <div className="crumb row" style={{ gap: 6 }}><Pic n={C.icon as PicName} size="s" />{C.label} <I.right size={14} /> {S.label}</div>
        <div className="qblock"><h3>1. 어떤 고민인가요?</h3><div className="qchips">{C.sub.map((s) => <button key={s.id} className={sub === s.id ? 'on' : ''} onClick={() => setSub(s.id)}>{s.label}</button>)}</div></div>
        <div className="qblock"><h3>2. 무엇이 가장 궁금한가요?</h3><div className="qchips">{S.q.map((x) => <button key={x} className={q === x ? 'on' : ''} onClick={() => setQ(x)}>{x}</button>)}</div></div>
        <div className="qblock"><h3>3. {S.when ?? C.when}</h3><div className="qchips">{HZ.map((x) => <button key={x} className={h === x ? 'on' : ''} onClick={() => setH(x)}>{PATH_WHEN[String(x) as '3' | '6' | '12']}</button>)}</div></div>
        {isSample
          ? <Link to={`/profile/new?next=${encodeURIComponent(`/path?cat=${catId}&sub=${sub}&q=${q}&h=${h}&go=1`)}`} className="btn primary mt32">사주 입력하고 분석 보기 →</Link>
          : <button className="btn primary mt32" onClick={() => onGo({ sub, q, h: String(h) })}>사주 분석 시작하기 →</button>}
        <p className="notice mt12">사주는 결정을 대신하지 않아요. 지금의 리듬을 살피는 참고로 봐 주세요.</p>
      </main>
    </>
  );
}

// 6-2 — 분석 결과
function Result({ catId, subId, q, h }: { catId: string; subId: string; q: string; h: Horizon }) {
  const { profile } = useMain();
  const saju = useSaju(profile);
  const r = useMemo(() => pathResult(saju, catId, subId, q, profile.id, new Date(), h), [saju, catId, subId, q, profile.id, h]);
  const [saved, setSaved] = useState<'no' | 'saved' | 'skip'>('no');
  const toast = useToast();
  const nav = useNavigate();
  useEffect(() => { track('path_done', { cat: catId, sub: subId }); }, [catId, subId, q]);
  const deep = price('path_deep')!;
  const rel = price(r.product);
  const save = async (d: { category: string; title: string; summary?: string }) => {
    try {
      await syncProfile(profile);
      await apiAuth('/memories', { method: 'POST', json: { kind: 'path', category: d.category, title: d.title, summary: d.summary, sajuNote: r.memory.sajuNote, profileId: profile.id } });
      setSaved('saved'); track('memory_save', { kind: 'path' });
    } catch (e: any) { toast(e.message); }
  };
  return (
    <>
      <Top title="사주 분석 결과" back={`/path?cat=${catId}`} />
      <main className="screen fade-in">
        <section className="card" aria-label="분석 결과">
          <div className="center faint">달새김 사주 분석 결과<br />({r.cat.label} · {r.sub.label} · {q})</div>
          <p className="verdict mt8">{r.verdict}</p>
          <div className="mt12"><FlowChart points={r.chart.map((f) => f.score)} labels={r.chart.map((f) => `${f.month}월`)} good={r.bestIdx} careful={r.carefulIdx.filter((x) => x <= r.chart.length)} current={0} /></div>
          <div className="best"><small>가장 좋은 시기</small><b>{r.best}</b></div>
          <div className="divider" />
          <h3 className="h3">추천 행동</h3>
          <ol className="todo">{r.hints.map((x) => <li key={x}>{x}</li>)}</ol>
          <p className="faint mt8" style={{ margin: '8px 0 0' }}>사주가 말하는 나 · {r.reason}</p>
        </section>
        <p className="notice mt8">사주는 결정을 대신하지 않아요. 지금의 리듬을 살피는 참고로 봐 주세요.</p>

        <div className="mt16">
          {saved === 'no' && <MemoryCard draft={{ category: r.memory.category, title: r.memory.title, summary: `${r.memory.summary}. 사주 흐름상 ${r.best}이 가장 좋은 시기.` }} onSave={save} onSkip={() => { setSaved('skip'); track('memory_skip', { kind: 'path' }); }} />}
          {saved === 'saved' && <MemoryCard draft={r.memory} saved onSave={() => {}} onSkip={() => {}} />}
        </div>

        <button className="btn primary mt16" onClick={() => nav(`/friend?topic=${r.memory.category}&q=${encodeURIComponent(r.friendPrompt)}`)}><I.chat size={20} />AI 사주친구와 이어서 이야기하기</button>
        <Link to={`/product/path_deep?cat=${catId}&sub=${subId}&q=${encodeURIComponent(q)}`} className="btn line mt8">이 고민 심층분석 · {won(deep.price)}</Link>
        {rel && <Link to={`/product/${rel.id}`} className="card flat mt12 between" style={{ display: 'flex' }}><div><div className="faint">이 고민과 이어지는 운세</div><b>{rel.title}</b></div><I.right /></Link>}
        <Link to="/path" className="link mt16 center" style={{ display: 'block' }}>다른 고민 살펴보기</Link>
      </main>
    </>
  );
}
