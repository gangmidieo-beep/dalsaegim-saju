// 운명의 갈림길 — 두 선택 비교(리뉴얼 시안 v29) + 분야별 고민의 길(시안 5·5-1·6-2) — 고민 고르기 → 한 화면 세 질문(어떤 고민 / 무엇이 궁금 / 언제쯤) → 사주 분석 결과(가장 좋은 시기·추천 행동)
// → 오늘의 새김(기록) → AI 사주친구로 이어서 상담.
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CHOICE_CRITERIA, PATHS, PATH_WHEN, compareChoices, pathResult, recommendPaths, type CriterionId, type Horizon } from '@dalsaegim/content';
import { useMain } from '../store/app';
import { useSaju } from '../lib/fortune';
import { apiAuth, syncProfile } from '../lib/api';
import { FlowChart, MemoryCard, Pic, Top, won, useToast, type PicName } from '../components/ui';
import { I } from '../components/icons';
import { CharmLink } from './Charm';
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

  if (sp.get('ab') === '1' && !isSample) return <ChoiceResultView />;
  if (!C) {
    const big = PATHS.filter((c) => picks.includes(c.id));
    const rest = PATHS.filter((c) => !picks.includes(c.id));
    return (
      <>
        <Top title="운명의 갈림길" />
        <main className="screen">
          <section className="fork-hero" aria-label="운명의 갈림길">
            <ForkArt />
            <small>TWO PATHS · ONE CHOICE</small>
            <h2>운명의 갈림길</h2>
            <p>두 갈래 길 앞에서, 나의 선택을 차분히 들여다보세요.</p>
          </section>
          <ChoiceForm isSample={isSample} defaultCat={picks[0]} />

          <section className="mt32" aria-labelledby="path-cats">
            <h2 className="h-sec" id="path-cats">분야별 고민의 길</h2>
            <p className="h-sub">선택지가 아직 정해지지 않았다면, 고민의 분야부터 골라 보세요.</p>
            <div className="stack mt12">
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
            <button className="btn line mt16" onClick={() => setSp({ cat: pick })}>이 분야 고민의 길 시작하기 →</button>
          </section>
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
      <Top title="운명의 갈림길" />
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
        {charmFor(catId, subId) && <CharmLink type={charmFor(catId, subId)!} />}
        <Link to="/path" className="link mt16 center" style={{ display: 'block' }}>운명의 갈림길로 돌아가기</Link>
      </main>
    </>
  );
}

// 고민 결과에서 이어지는 황금 부적(투자 고민에는 붙이지 않는다 — 수익 기원으로 읽히지 않게)
function charmFor(cat: string, sub: string): 'business' | 'wealth' | 'estate' | 'work' | 'goal' | null {
  if (cat === 'work') return sub === 'biz' ? 'business' : 'work';
  if (cat === 'money') return sub === 'home' ? 'estate' : sub === 'invest' ? null : 'wealth';
  if (cat === 'future') return 'goal';
  return null;
}

// 갈림길 그림(이미지 없이) — 달 아래 두 갈래 길과 A·B 표지판
function ForkArt() {
  return (
    <svg className="fork-art" viewBox="0 0 320 170" aria-hidden>
      <defs><radialGradient id="fm" cx="40%" cy="38%" r="65%"><stop offset="0" stopColor="#fff6dc" /><stop offset=".75" stopColor="#f2d698" /><stop offset="1" stopColor="#d9b46a" /></radialGradient></defs>
      <circle cx="232" cy="40" r="22" fill="url(#fm)" />
      {[[30, 30], [70, 18], [120, 34], [282, 70], [180, 16]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.6" fill="#f6dc9c" opacity=".8" />)}
      <path d="M0 132 L70 92 L120 110 L170 84 L230 108 L320 80 L320 170 L0 170 Z" fill="#2b3a63" />
      <path d="M160 170 C160 150 150 136 120 124 C96 115 70 112 40 112" stroke="#e8cf98" strokeWidth="9" fill="none" strokeLinecap="round" opacity=".9" />
      <path d="M160 170 C162 150 176 136 208 124 C232 115 262 110 300 110" stroke="#e8cf98" strokeWidth="9" fill="none" strokeLinecap="round" opacity=".9" />
      <rect x="157" y="88" width="6" height="66" rx="2" fill="#c79a4a" />
      <path d="M156 96 L118 96 L108 104 L118 112 L156 112 Z" fill="#f6dc9c" /><text x="134" y="108" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1b2a55">A 선택</text>
      <path d="M164 116 L204 116 L214 124 L204 132 L164 132 Z" fill="#f6dc9c" /><text x="187" y="128" textAnchor="middle" fontSize="11" fontWeight="800" fill="#1b2a55">B 선택</text>
    </svg>
  );
}

function ChoiceForm({ isSample, defaultCat }: { isSample: boolean; defaultCat: string }) {
  const nav = useNavigate();
  const [cat, setCat] = useState(defaultCat);
  const [s, setS] = useState('');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [chg, setChg] = useState<'a' | 'b' | 'none'>('a');
  const [crit, setCrit] = useState<CriterionId>('stable');
  const ok = a.trim() && b.trim();
  const qs = new URLSearchParams({ ab: '1', c: cat, s: s.trim(), a: a.trim(), b: b.trim(), chg, k: crit }).toString();
  const go = () => { track('path_start', { cat, kind: 'fork', crit }); nav(isSample ? `/profile/new?next=${encodeURIComponent(`/path?${qs}`)}` : `/path?${qs}`); };
  return (
    <section className="card mt16" aria-labelledby="fork-q">
      <h3 className="h3" id="fork-q">지금 고민 중인 선택은 무엇인가요?</h3>
      <p className="faint mt4">정답을 예언하기보다, 두 선택과 내 사주의 리듬을 차분히 비교해 드려요.</p>
      <div className="field"><span>어떤 분야의 고민인가요?</span>
        <div className="qchips">{PATHS.map((c) => <button key={c.id} className={cat === c.id ? 'on' : ''} aria-pressed={cat === c.id} onClick={() => setCat(c.id)}>{c.label}</button>)}</div>
      </div>
      <label className="field"><span>고민하는 상황</span><input className="input" maxLength={60} value={s} onChange={(e) => setS(e.target.value)} placeholder="예) 이직할까, 지금 직장을 유지할까?" /></label>
      <div className="grid2">
        <label className="field ab-a"><span>선택 A</span><input className="input" maxLength={30} value={a} onChange={(e) => setA(e.target.value)} placeholder="예) 이직하기" /></label>
        <label className="field ab-b"><span>선택 B</span><input className="input" maxLength={30} value={b} onChange={(e) => setB(e.target.value)} placeholder="예) 지금 직장 유지" /></label>
      </div>
      <div className="field"><span>새로운 변화에 더 가까운 쪽은?</span>
        <div className="qchips">{([['a', 'A 쪽'], ['b', 'B 쪽'], ['none', '비슷해요']] as const).map(([k, l]) => <button key={k} className={chg === k ? 'on' : ''} aria-pressed={chg === k} onClick={() => setChg(k)}>{l}</button>)}</div>
      </div>
      <div className="field"><span>내가 가장 중요하게 생각하는 기준</span>
        <div className="qchips">{CHOICE_CRITERIA.map((c) => <button key={c.id} className={crit === c.id ? 'on' : ''} aria-pressed={crit === c.id} onClick={() => setCrit(c.id)}>{c.label}</button>)}</div>
      </div>
      <button className="btn primary mt16" disabled={!ok} onClick={go}>두 갈림길 비교하기 →</button>
      {!ok && <p className="faint center mt8">선택 A와 B를 적어 주세요</p>}
      <p className="notice mt12">비교 결과는 직접 적은 선택과 사주 흐름을 함께 놓고 보는 성찰 가이드예요. 결정을 대신하지 않아요.</p>
    </section>
  );
}

function ChoiceResultView() {
  const [sp] = useSearchParams();
  const { profile } = useMain();
  const saju = useSaju(profile);
  const nav = useNavigate();
  const toast = useToast();
  const o = { catId: sp.get('c') ?? 'work', situation: sp.get('s') ?? '', a: sp.get('a') ?? 'A', b: sp.get('b') ?? 'B', change: (sp.get('chg') ?? 'none') as 'a' | 'b' | 'none', criterion: (sp.get('k') ?? 'stable') as CriterionId };
  const r = useMemo(() => compareChoices(saju, o, profile.id), [saju, profile.id, sp.toString()]);
  const [saved, setSaved] = useState<'no' | 'saved' | 'skip'>('no');
  useEffect(() => { track('path_done', { cat: o.catId, kind: 'fork', rhythm: r.rhythm }); }, [sp.toString()]);
  const deep = price('path_deep')!;
  const save = async (d: { category: string; title: string; summary?: string }) => {
    try {
      await syncProfile(profile);
      await apiAuth('/memories', { method: 'POST', json: { kind: 'path', category: d.category, title: d.title, summary: d.summary, sajuNote: r.memory.sajuNote, profileId: profile.id } });
      setSaved('saved'); track('memory_save', { kind: 'fork' });
    } catch (e: any) { toast(e.message); }
  };
  return (
    <>
      <Top title="갈림길 비교 결과" back="/path" />
      <main className="screen fade-in">
        <section className="card" aria-label="사주 리듬">
          <div className="center faint">{profile.name} 님의 {r.cat.label} 흐름{o.situation ? ` · ${o.situation}` : ''}</div>
          <p className="verdict mt8">{r.rhythmTitle}</p>
          <p className="small mt8 center" style={{ margin: '8px 0 0' }}>{r.rhythmLine}</p>
          <div className="mt12"><FlowChart points={r.chart.map((f) => f.score)} labels={r.chart.map((f) => `${f.month}월`)} good={r.bestIdx} careful={r.carefulIdx.filter((x) => x <= r.chart.length)} current={0} /></div>
          <div className="best"><small>결정·실행하기 좋은 시기</small><b>{r.best}</b></div>
        </section>
        <div className="ab-cols mt12">
          {([['A', r.a], ['B', r.b]] as const).map(([k, x]) => (
            <section key={k} className={`ab-col ${k.toLowerCase()}`}>
              <small>선택 {k}</small><b>{x.label}</b>
              {x.fit && <span className="ab-fit">{x.fit}</span>}
            </section>
          ))}
        </div>
        <section className="card mt12">
          <h3 className="h3">‘{r.criterion}’ 기준으로 스스로 확인할 질문</h3>
          <ol className="todo">{r.questions.map((x) => <li key={x}>{x}</li>)}</ol>
          <p className="faint mt8" style={{ margin: '8px 0 0' }}>사주가 말하는 나 · {r.reason}</p>
        </section>
        <p className="notice mt8">사주는 결정을 대신하지 않아요. 두 선택의 현실 조건과 내 기준을 함께 놓고 보세요.</p>
        <div className="mt16">
          {saved === 'no' && <MemoryCard draft={{ category: r.memory.category, title: r.memory.title, summary: r.memory.summary }} onSave={save} onSkip={() => setSaved('skip')} />}
          {saved === 'saved' && <MemoryCard draft={r.memory} saved onSave={() => {}} onSkip={() => {}} />}
        </div>
        <button className="btn primary mt16" onClick={() => nav(`/friend?topic=${r.memory.category}&q=${encodeURIComponent(r.friendPrompt)}`)}><I.chat size={20} />AI 사주친구와 이 선택 정리하기</button>
        <Link to={`/product/path_deep?cat=${o.catId}&q=${encodeURIComponent(`${o.a} vs ${o.b}`)}`} className="btn line mt8">두 선택 심층분석 · {won(deep.price)}</Link>
        <Link to="/path" className="link mt16 center" style={{ display: 'block' }}>다른 갈림길 비교하기</Link>
      </main>
    </>
  );
}
