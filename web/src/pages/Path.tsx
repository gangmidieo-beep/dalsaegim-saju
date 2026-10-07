// 내 고민의 길 — 고민 → 세부 상황 → 궁금한 핵심(3단계) → 사주 흐름 → AI 상담·기록·관련 운세.
// 선택할 때마다 달빛 길이 한 칸씩 이어진다(짧은 모션만).
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PATHS, pathResult, recommendPaths } from '@dalsaegim/content';
import { useMain } from '../store/app';
import { useSaju } from '../lib/fortune';
import { apiAuth, syncProfile } from '../lib/api';
import { FlowChart, FlowLegend, MemoryCard, Top, won, useToast } from '../components/ui';
import { I, Icon, type IconName } from '../components/icons';
import { track } from '../lib/track';
import brand from '../../../brand.config.json';

const price = (id: string) => brand.products.find((p) => p.id === id);

export default function PathPage() {
  const [sp, setSp] = useSearchParams();
  const { profile, isSample } = useMain();
  const saju = useSaju(profile);
  const cat = sp.get('cat');
  const sub = sp.get('sub');
  const q = sp.get('q');
  const step = q ? 3 : sub ? 2 : cat ? 1 : 0;
  const C = PATHS.find((c) => c.id === cat);
  const S = C?.sub.find((s) => s.id === sub);
  const picks = useMemo(() => (isSample ? [] : recommendPaths(saju, profile.id).map((p) => p.id)), [saju, profile.id, isSample]);
  const go = (p: Record<string, string>) => setSp(p);
  useEffect(() => { if (step === 1) track('path_start', { cat }); }, [step, cat]);

  return (
    <>
      <Top title="내 고민의 길" back={step > 0 ? undefined : true} />
      <main className="screen">
        <div className="path-line" aria-label={`${Math.min(step + 1, 4)}단계 중 ${Math.min(step + 1, 4)}`}>
          {[0, 1, 2, 3].map((i) => (
            <span key={i} style={{ display: 'contents' }}>
              <span className={`dot${step >= i ? ' on' : ''}`} />
              {i < 3 && <span className={`seg${step > i ? ' on' : ''}`}><i /></span>}
            </span>
          ))}
        </div>

        {step === 0 && (
          <section className="fade-in" key="s0">
            <h2 className="h2">지금, 어떤 고민으로 오셨나요?</h2>
            <p className="muted small mt4">고민을 따라가면 필요한 운세와 시기가 보여요.</p>
            <div className="stack mt16">
              {PATHS.map((c) => (
                <button key={c.id} className="opt" onClick={() => go({ cat: c.id })}>
                  <span className="ic"><Icon name={c.icon as IconName} /></span>
                  <span className="grow" style={{ flex: 1 }}><b>{c.label}</b><div className="faint">{c.sub.map((s) => s.label).join(' · ')}</div></span>
                  {picks.includes(c.id) && <span className="chip sm gold">지금 주목</span>}
                </button>
              ))}
            </div>
          </section>
        )}
        {step === 1 && C && (
          <section className="fade-in" key="s1">
            <p className="eyebrow">{C.label}</p>
            <h2 className="h2 mt4">조금 더 구체적으로 알려 주세요</h2>
            <div className="stack mt16">
              {C.sub.map((s) => <button key={s.id} className="opt" onClick={() => go({ cat: C.id, sub: s.id })}><b style={{ flex: 1 }}>{s.label}</b><I.right className="chev" /></button>)}
            </div>
          </section>
        )}
        {step === 2 && C && S && (
          <section className="fade-in" key="s2">
            <p className="eyebrow">{C.label} · {S.label}</p>
            <h2 className="h2 mt4">가장 궁금한 건 무엇인가요?</h2>
            <div className="stack mt16">
              {S.q.map((x) => <button key={x} className="opt" onClick={() => go({ cat: C.id, sub: S.id, q: x })}><b style={{ flex: 1 }}>{x}</b><I.right className="chev" /></button>)}
            </div>
          </section>
        )}
        {step === 3 && C && S && q && (isSample
          ? <NeedProfile next={`/path?${sp.toString()}`} />
          : <Result catId={C.id} subId={S.id} q={q} />)}
      </main>
    </>
  );
}

function NeedProfile({ next }: { next: string }) {
  return (
    <section className="card center fade-in">
      <h2 className="h2">사주를 알아야 길이 보여요</h2>
      <p className="muted small mt8">생년월일만 알려 주면 이 고민의 시기와 흐름을 바로 보여 드릴게요.</p>
      <Link to={`/profile/new?next=${encodeURIComponent(next)}`} className="btn primary mt16">사주 입력하기</Link>
    </section>
  );
}

function Result({ catId, subId, q }: { catId: string; subId: string; q: string }) {
  const { profile } = useMain();
  const saju = useSaju(profile);
  const r = useMemo(() => pathResult(saju, catId, subId, q, profile.id), [saju, catId, subId, q, profile.id]);
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
    <section className="fade-in" key="s3">
      <p className="eyebrow">{r.cat.label} · {r.sub.label}</p>
      <h2 className="h2 mt4">“{q}”</h2>
      <div className="card mt16">
        <p style={{ margin: 0, fontWeight: 600 }}>{r.headline}</p>
        <div className="mt12"><FlowChart points={r.flow.map((f) => f.score)} labels={r.flow.map((f) => `${f.month}월`)} good={r.goodIdx} careful={r.carefulIdx} current={0} /></div>
        <FlowLegend />
        <div className="grid2 mt12" style={{ gap: 8 }}>
          <div className="card lav" style={{ padding: 12 }}><div className="faint">기운이 살아나는 때</div><b className="hl-lav">{r.good}</b></div>
          <div className="card rose" style={{ padding: 12 }}><div className="faint">한 템포 쉬어 갈 때</div><b className="hl-rose">{r.careful}</b></div>
        </div>
      </div>
      <div className="card flat mt12">
        <div className="faint">사주가 말하는 나</div>
        <p className="small" style={{ margin: '4px 0 0' }}>{r.reason}</p>
        <div className="divider" />
        {r.hints.map((h) => <p key={h} className="small" style={{ margin: '6px 0' }}>· {h}</p>)}
      </div>
      <p className="notice mt8">사주는 결정을 대신하지 않아요. 지금의 리듬을 살피는 참고로 봐 주세요.</p>

      <div className="mt16">
        {saved === 'no' && <MemoryCard draft={{ category: r.memory.category, title: r.memory.title, summary: r.memory.summary }} onSave={save} onSkip={() => { setSaved('skip'); track('memory_skip', { kind: 'path' }); }} />}
        {saved === 'saved' && <MemoryCard draft={r.memory} saved onSave={() => {}} onSkip={() => {}} />}
      </div>

      <button className="btn primary mt16" onClick={() => nav(`/friend?topic=${catId === 'self' ? 'growth' : catId}&q=${encodeURIComponent(r.friendPrompt)}`)}><I.chat size={20} />AI 사주친구와 이어서 이야기하기</button>
      <Link to={`/product/path_deep?cat=${catId}&sub=${subId}&q=${encodeURIComponent(q)}`} className="btn line mt8">이 고민 심층분석 · {won(deep.price)}</Link>
      {rel && <Link to={`/product/${rel.id}`} className="card flat mt12 between" style={{ display: 'flex' }}><div><div className="faint">이 고민과 이어지는 운세</div><b>{rel.title}</b></div><I.right /></Link>}
      <Link to="/path" className="link mt16 center" style={{ display: 'block' }}>다른 고민 살펴보기</Link>
    </section>
  );
}
