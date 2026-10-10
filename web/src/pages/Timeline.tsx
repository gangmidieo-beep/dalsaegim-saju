// 나의 인생 타임라인 (시안 8·8-1) — 밤길 위에 빛나는 점으로 새겨진 순간들. "상세 보기"는 분야 표시·사진과 함께 목록으로.
// "그때 사주가 말한 흐름 VS 실제로 일어난 일"을 나란히.
import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiAuth } from '../lib/api';
import { CAT_COLOR, CAT_FILTER, CAT_LABEL, Skeleton, Top, inCat } from '../components/ui';
import { I } from '../components/icons';
import { EditSheet, type Memory } from './Records';
import { dotDate } from '../lib/dates';
import { monthFortune } from '@dalsaegim/content';
import { useMain } from '../store/app';
import { useSaju } from '../lib/fortune';

type Item = { type: 'memory' | 'reading'; id: string; date: string; kind: string; category: string; title: string; summary: string | null; sajuNote: string | null; feedback: string | null; photo?: string | null };
const FB: Record<string, [string, string]> = { good: ['잘 풀렸어요', '#6F9E8A'], same: ['비슷해요', '#8A8CA0'], changed: ['달라졌어요', '#C0687B'] };
const KIND: Record<string, string> = { consult: 'AI 상담', path: '사주 분석', reading: '받은 풀이', letter: '달빛 편지', wish: '새긴 소망', event: '내가 기록' };
// 소망 기록은 '실제' 결과를 소망 말로
const fbOf = (x: Item): [string, string] | null => (!x.feedback ? null : x.kind === 'wish' ? (x.feedback === 'good' ? ['이루었어요', '#C9A35F'] : ['진행 중이에요', '#8A8CA0']) : FB[x.feedback]);

// 미래 = 사주가 본 다가올 3달의 흐름(엔진 계산, 예측이 아닌 참고). 실제 기록과 모양을 다르게 그린다.
function useAhead() {
  const { profile, isSample } = useMain();
  const s = useSaju(profile);
  return useMemo(() => {
    if (isSample) return [];
    const now = new Date();
    return [1, 2, 3].map((k) => { const d = new Date(now.getFullYear(), now.getMonth() + k, 15, 12); return monthFortune(s, d, profile.id); });
  }, [s, profile.id, isSample]);
}

export default function Timeline() {
  const [sp, setSp] = useSearchParams();
  const detail = sp.get('view') === 'detail';
  const [items, setItems] = useState<Item[] | null>(null);
  const [cat, setCat] = useState('all');
  const [edit, setEdit] = useState<Partial<Memory> | null>(null);
  const load = () => apiAuth<{ items: Item[] }>('/timeline').then((r) => setItems(r.items)).catch(() => setItems([]));
  useEffect(() => { void load(); }, []);
  const shown = (items ?? []).filter((x) => inCat(x.category, cat));
  const years = [...new Set(shown.map((x) => x.date.slice(0, 4)))];
  const compared = (items ?? []).filter((x) => x.sajuNote && x.feedback).length;
  const open = (x: Item) => (x.type === 'memory' ? setEdit(x as any) : undefined);
  const ahead = useAhead();
  const sheet = <EditSheet m={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); void load(); }} />;

  if (detail) return (
    <>
      <Top title={`${years[0] ?? new Date().getFullYear()}년 나의 인생 타임라인`} back="/timeline" />
      <main className="screen tl-detail">
        <div className="tabs" role="tablist">{CAT_FILTER.map(([k, l]) => <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{l}</button>)}</div>
        <div className="card mt12" style={{ padding: '4px 16px' }}>
          {shown.length === 0 && <p className="faint center" style={{ padding: 20 }}>아직 새겨진 순간이 없어요.</p>}
          {shown.map((x) => {
            const inner = (
              <>
                <span className="dot" style={{ ['--c' as any]: CAT_COLOR[x.category] }} />
                <div>
                  <div className="faint" style={{ fontSize: 13 }}>{dotDate(x.date)}{KIND[x.kind] ? ` · ${KIND[x.kind]}` : ''}</div>
                  <div><span className="cbadge" style={{ ['--c' as any]: CAT_COLOR[x.category] }}>{CAT_LABEL[x.category]}</span><b>{x.title}</b></div>
                  {x.summary && <div className="small muted">{x.summary}</div>}
                  {x.sajuNote && <div className="small" style={{ color: 'var(--lav-2)' }}>그때 사주 · {x.sajuNote}</div>}
                  {fbOf(x) && <div className="small" style={{ color: fbOf(x)![1], fontWeight: 700 }}>실제 · {fbOf(x)![0]}</div>}
                </div>
                {x.photo ? <img className="thumb" src={x.photo} alt="" /> : <span />}
              </>
            );
            return x.type === 'reading'
              ? <Link key={x.id} to={`/reading/${x.id}`} className="row-it">{inner}</Link>
              : <button key={x.id} className="row-it" style={{ width: '100%', textAlign: 'left' }} onClick={() => open(x)}>{inner}</button>;
          })}
        </div>
        <Link to="/product/lifetime" className="btn blush mt16">상세 분석 보기 →</Link>
        <p className="notice mt8">기록이 쌓일수록 "그때의 사주"와 "실제 인생"을 더 정확히 비교해 드려요.</p>
      </main>
      {sheet}
    </>
  );

  return (
    <div className="night tl-night">
      <div className="night-top"><span style={{ width: 40 }} /><h1>나의 인생 타임라인</h1><button className="icon-btn" aria-label="순간 추가" onClick={() => setEdit({})}><I.plus /></button></div>
      <main style={{ padding: '4px 20px 0' }}>
        <div className="tabs dark" role="tablist">{CAT_FILTER.map(([k, l]) => <button key={k} className={cat === k ? 'on' : ''} onClick={() => setCat(k)}>{l}</button>)}</div>
        <p className="faint center mt12" style={{ fontSize: 13 }}>새겨진 순간 <b style={{ color: '#F2D8E3' }}>{items?.length ?? 0}</b>개 · 사주와 실제를 비교한 순간 <b style={{ color: '#F2D8E3' }}>{compared}</b>개</p>
        {items === null && <div className="stack mt16"><Skeleton /><Skeleton /></div>}
        {items?.length === 0 && (
          <section className="card center mt16" style={{ color: 'var(--ink)' }}>
            <h2 className="h3">타임라인이 아직 비어 있어요</h2>
            <p className="small muted mt8">실제로 있었던 중요한 일을 한 줄로 남겨 보세요. 예) 이직, 이사, 새로운 만남</p>
            <button className="btn primary mt16" onClick={() => setEdit({})}>첫 순간 새기기</button>
          </section>
        )}
        {ahead.length > 0 && (
          <section className="tl-ahead" aria-label="다가올 흐름">
            <p className="tl-sec">다가올 흐름 <small>사주가 본 시기 · 예측이 아닌 참고</small></p>
            {[...ahead].reverse().map((m) => (
              <div key={m.month} className="ah"><span className="d">{m.year}.{String(m.month).padStart(2, '0')}</span><span className="t">{m.line.split(/(?<=요\.)\s/)[0].replace(/^이번 달은\s*/, '')}</span><span className="sc">{m.total}점</span></div>
            ))}
          </section>
        )}
        <p className="tl-now"><span>지금 · {dotDate(new Date().toISOString().slice(0, 10))}</span></p>
        {(items?.length ?? 0) > 0 && <p className="tl-sec" style={{ marginTop: 6 }}>지나온 순간 <small>내가 직접 새긴 실제 기록</small></p>}
        <div className="tl2">
          {years.map((y) => shown.filter((x) => x.date.startsWith(y)).map((x, i) => (
            <button key={x.id} className="it" onClick={() => (x.type === 'reading' ? setSp({ view: 'detail' }) : open(x))}>
              {i === 0 && <div className="y">{y}</div>}
              <div><span className="d">{x.date.slice(5).replace('-', '.')}</span><span className="t">{x.title}</span>{KIND[x.kind] && <span className="k"> ({KIND[x.kind]})</span>}</div>
              {fbOf(x) && <div className="k">실제 · {fbOf(x)![0]}</div>}
            </button>
          )))}
        </div>
        {items && items.length > 0 && <button className="btn blush mt16" onClick={() => setSp({ view: 'detail' })}>상세 보기 →</button>}
      </main>
      {sheet}
    </div>
  );
}
